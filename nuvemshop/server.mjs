// POC SWTCHR × Nuvemshop — servidor local zero-deps (Node >= 18).
// Sobe o painel + API na porta 8787, que bate com a Redirect URL configurada
// no app do portal de parceiros: http://localhost:8787/auth/callback
//
// Rodar: node server.mjs

import http from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exchangeCode, createClient } from './lib/nuvemshop.mjs'
import { validateBlock, getBlock, saveBlock, ensureHomeHolder } from './lib/blocks.mjs'
import { createAssetStore, extractCdnUrls, replaceUrls } from './lib/assets.mjs'
import {
  buildSave, validateConfig, normalizeConfig, emptyConfig,
  BLOCK_TYPES, NAMESPACE, KEY_CONFIG, KEY_HTML, METAFIELD_MAX,
} from './lib/pdp.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(ROOT, '.data')
const TOKEN_FILE = path.join(DATA_DIR, 'token.json')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const assetStore = createAssetStore(DATA_DIR)

loadDotEnv()
const PORT = Number(process.env.PORT || 8787)
const APP_ID = process.env.NUVEMSHOP_APP_ID || ''
const CLIENT_SECRET = process.env.NUVEMSHOP_CLIENT_SECRET || ''
const USER_AGENT = `SWTCHR POC (${process.env.CONTACT_EMAIL || 'hi@brunodup.com'})`

function loadDotEnv() {
  const file = path.join(ROOT, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function saveJson(file, data) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2))
}

function getToken() {
  return readJson(TOKEN_FILE, null)
}

function getConfig() {
  return readJson(CONFIG_FILE, {})
}

function client() {
  const token = getToken()
  if (!token) {
    const err = new Error('App ainda não instalado — instala o app na loja demo pra gerar o token.')
    err.status = 401
    throw err
  }
  return createClient({ accessToken: token.access_token, storeId: token.user_id, userAgent: USER_AGENT })
}

// name/title dos recursos vem como objeto i18n ({"pt": "..."}) ou string, dependendo do recurso
function localName(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return Object.values(value).find(Boolean) || ''
  return String(value)
}

// ---------- rotas ----------

async function handleCallback(url, res) {
  const code = url.searchParams.get('code')
  if (!code) return sendJson(res, 400, { error: 'callback sem ?code=' })
  if (!APP_ID || !CLIENT_SECRET) {
    return sendJson(res, 500, { error: 'NUVEMSHOP_APP_ID / NUVEMSHOP_CLIENT_SECRET faltando no .env' })
  }
  const token = await exchangeCode({ appId: APP_ID, clientSecret: CLIENT_SECRET, code })
  saveJson(TOKEN_FILE, token)
  console.log(`✓ Token salvo — loja #${token.user_id}, escopos: ${token.scope}`)
  res.writeHead(302, { Location: '/?connected=1' })
  res.end()
}

function status() {
  const token = getToken()
  return {
    hasCredentials: Boolean(APP_ID && CLIENT_SECRET),
    connected: Boolean(token),
    storeId: token?.user_id || null,
    scope: token?.scope || null,
    homeProductId: getConfig().homeProductId || null,
    installUrl: APP_ID ? `https://www.nuvemshop.com.br/apps/${APP_ID}/authorize` : null,
  }
}

const TARGET_KINDS = { product: 'products', category: 'categories', page: 'pages' }

async function listTargets(type) {
  const kind = TARGET_KINDS[type]
  if (!kind) {
    const err = new Error(`type inválido: ${type} (esperado: product | category | page)`)
    err.status = 400
    throw err
  }
  const rows = (await client().request(`/${kind}?per_page=${kind === 'products' ? 50 : 100}`)) || []
  const config = getConfig()
  return rows
    .filter((r) => r.id !== config.homeProductId) // porta-dados da home não é destino editável
    .map((r) => ({ id: r.id, name: localName(r.name) || localName(r.title) || `#${r.id}` }))
}

async function readBlock(params) {
  const type = params.get('type')
  if (type === 'home') {
    const holderId = getConfig().homeProductId
    if (!holderId) return { image: '', text: '' }
    return getBlock(client(), 'product', holderId)
  }
  if (!TARGET_KINDS[type]) {
    const err = new Error(`type inválido: ${type}`)
    err.status = 400
    throw err
  }
  const id = params.get('id')
  if (!id) {
    const err = new Error('id é obrigatório pra esse destino')
    err.status = 400
    throw err
  }
  return getBlock(client(), type, id)
}

async function writeBlock(body) {
  const { type, id, image, text } = body || {}
  const errors = validateBlock({ image, text })
  if (errors.length) {
    const err = new Error(errors.join('; '))
    err.status = 400
    throw err
  }

  const api = client()
  if (type === 'home') {
    const config = getConfig()
    const hadHolder = Boolean(config.homeProductId)
    const holderId = await ensureHomeHolder(api, config, (c) => saveJson(CONFIG_FILE, c))
    const target = await saveBlock(api, 'product', holderId, { image, text })
    return {
      ok: true,
      target,
      homeProductId: holderId,
      holderCreated: !hadHolder,
      hint: hadHolder
        ? null
        : `Produto porta-dados criado (#${holderId}). Cola esse ID no home.tpl conforme theme/INSTALL.md — uma vez só.`,
    }
  }

  if (!TARGET_KINDS[type]) {
    const err = new Error(`type inválido: ${type}`)
    err.status = 400
    throw err
  }
  if (!id) {
    const err = new Error('id é obrigatório pra esse destino')
    err.status = 400
    throw err
  }
  const target = await saveBlock(api, type, id, { image, text })
  return { ok: true, target }
}

// ---------- PDP builder (Fase 1) ----------

function badReq(msg) {
  const e = new Error(msg)
  e.status = 400
  return e
}

async function upsertMetafield(api, ownerId, key, value) {
  const rows = (await api.request(`/metafields/products?owner_id=${ownerId}&namespace=${NAMESPACE}&key=${key}`)) || []
  if (rows[0]) {
    if (rows[0].value !== value) await api.request(`/metafields/${rows[0].id}`, { method: 'PUT', body: { value } })
  } else {
    await api.request('/metafields', {
      method: 'POST',
      body: { namespace: NAMESPACE, key, value, owner_resource: 'Product', owner_id: Number(ownerId) },
    })
  }
}

async function readMetafield(api, ownerId, key) {
  const rows = (await api.request(`/metafields/products?owner_id=${ownerId}&namespace=${NAMESPACE}&key=${key}`)) || []
  return rows[0]?.value ?? null
}

// produto oculto que hospeda as imagens (CDN da loja). Criado uma vez, id em .data/config.json.
async function ensureAssetsProduct(api) {
  const config = getConfig()
  if (config.assetsProductId) return config.assetsProductId
  const p = await api.request('/products', {
    method: 'POST',
    body: { name: { pt: '[SWTCHR] Asset Host — não excluir' }, published: false },
  })
  config.assetsProductId = p.id
  saveJson(CONFIG_FILE, config)
  return p.id
}

// metadata do registry de blocos, pro component picker do painel
function blockTypesMeta() {
  return Object.entries(BLOCK_TYPES).map(([type, def]) => ({ type, label: def.label, fields: def.fields }))
}

async function pdpRead(params) {
  const productId = params.get('productId')
  if (!productId) throw badReq('productId é obrigatório')
  const raw = await readMetafield(client(), productId, KEY_CONFIG)
  let config = emptyConfig()
  if (raw) {
    try {
      config = normalizeConfig(JSON.parse(raw))
    } catch {
      /* config corrompido → começa vazio */
    }
  }
  return { productId: Number(productId), config, blockTypes: blockTypesMeta() }
}

async function pdpWrite(body) {
  const { productId, config } = body || {}
  if (!productId) throw badReq('productId é obrigatório')
  const errors = validateConfig(config)
  if (errors.length) throw badReq(errors.join('; '))
  const { normalized, html, configStr, overLimit, htmlBytes, configBytes } = buildSave(config)
  if (overLimit) {
    throw badReq(`config/html passou do teto de ${METAFIELD_MAX}B (html=${htmlBytes}B, config=${configBytes}B). Reduz os blocos.`)
  }
  const api = client()
  await upsertMetafield(api, productId, KEY_CONFIG, configStr)
  await upsertMetafield(api, productId, KEY_HTML, html)
  return { ok: true, productId: Number(productId), htmlBytes, configBytes, config: normalized }
}

async function uploadImage(body) {
  const { dataBase64, filename, src } = body || {}
  const api = client()
  const assetsId = await ensureAssetsProduct(api)
  let payload
  if (dataBase64) payload = { attachment: dataBase64, filename: filename || 'swtchr-upload.jpg' }
  else if (src) payload = { src }
  else throw badReq('mande dataBase64 (arquivo) ou src (url)')
  const img = await api.request(`/products/${assetsId}/images`, { method: 'POST', body: payload })
  // protocolo de backup: persiste a cópia local + manifesto antes de responder
  try {
    const buffer = dataBase64
      ? Buffer.from(dataBase64, 'base64')
      : Buffer.from(await (await fetch(img.src)).arrayBuffer())
    assetStore.record({ buffer, filename: filename || path.basename(new URL(img.src).pathname), imageId: img.id, src: img.src })
  } catch (err) {
    console.error('⚠ backup local do upload falhou (upload na loja ok):', err.message)
  }
  return { ok: true, src: img.src, id: img.id }
}

// ---------- protocolo de backup dos assets ----------

// varre TODOS os metafields do namespace swtchr (products/categories/pages) — é
// onde as URLs de imagem aparecem (pdp_config, pdp_html e os campos flat de bloco)
async function scanSwtchrMetafields(api) {
  const rows = []
  for (const kind of ['products', 'categories', 'pages']) {
    for (let page = 1; ; page++) {
      let batch
      try {
        batch = (await api.request(`/metafields/${kind}?namespace=${NAMESPACE}&per_page=100&page=${page}`)) || []
      } catch (err) {
        if (err.status === 404) break // recurso sem metafields
        throw err
      }
      for (const m of batch) rows.push({ ...m, _kind: kind })
      if (batch.length < 100) break
    }
  }
  return rows
}

// backfill + mapa de uso: baixa pro disco o que ainda não tem cópia e regrava o manifesto
async function assetsBackup() {
  const api = client()
  const assetsId = await ensureAssetsProduct(api)
  const manifest = assetStore.load()
  const known = new Set(Object.values(manifest.assets).flatMap((a) => a.srcs || (a.src ? [a.src] : [])))
  let downloaded = 0

  const images = (await api.request(`/products/${assetsId}/images`)) || []
  for (const img of images) {
    if (known.has(img.src)) continue
    const buffer = Buffer.from(await (await fetch(img.src)).arrayBuffer())
    assetStore.record({ buffer, filename: path.basename(new URL(img.src).pathname), imageId: img.id, src: img.src })
    downloaded++
  }

  // mapa de uso: URL → onde ela aparece (owner + metafield)
  const usage = {}
  const rows = await scanSwtchrMetafields(api)
  for (const m of rows) {
    for (const url of extractCdnUrls(m.value)) {
      usage[url] = usage[url] || []
      usage[url].push({ kind: m._kind, ownerId: m.owner_id, key: m.key, metafieldId: m.id })
    }
  }
  const fresh = assetStore.load()
  fresh.usage = usage
  assetStore.save(fresh)

  return {
    ok: true,
    assetHost: assetsId,
    imagensNoHost: images.length,
    baixadasAgora: downloaded,
    copiasLocais: Object.keys(fresh.assets).length,
    urlsEmUso: Object.keys(usage).length,
    manifesto: '.data/assets.json',
  }
}

// saúde: host existe? URLs vivas? cópias locais presentes?
async function assetsStatus() {
  const api = client()
  const config = getConfig()
  const manifest = assetStore.load()
  let hostOk = false
  if (config.assetsProductId) {
    try {
      await api.request(`/products/${config.assetsProductId}?fields=id`)
      hostOk = true
    } catch (err) {
      if (err.status !== 404) throw err
    }
  }
  const entries = Object.entries(manifest.assets)
  const deadUrls = []
  const semCopiaLocal = []
  for (const [hash, a] of entries) {
    if (!assetStore.readLocal(a)) semCopiaLocal.push(a.file)
    for (const src of a.srcs || (a.src ? [a.src] : [])) {
      const r = await fetch(src, { method: 'HEAD' }).catch(() => null)
      if (!r || !r.ok) deadUrls.push({ hash, src })
    }
  }
  // URLs em uso nos metafields (podem ser do asset host OU estáticos do tema)
  const emUsoMortas = []
  for (const [url, locais] of Object.entries(manifest.usage || {})) {
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null)
    if (r && r.ok) continue
    const origem = url.includes('/templates/') ? 'tema (restaurar via FTP do theme-ftp-mirror)' : 'asset host'
    emUsoMortas.push({ url, origem, usadaEm: locais })
  }
  return {
    ok: hostOk && deadUrls.length === 0 && semCopiaLocal.length === 0 && emUsoMortas.length === 0,
    assetHostVivo: hostOk,
    copiasLocais: entries.length,
    urlsMortas: deadUrls,
    urlsEmUsoMortas: emUsoMortas,
    semCopiaLocal,
    ultimoBackup: manifest.updatedAt,
  }
}

// restauração: recria o host se sumiu, re-sobe o que morreu e reescreve os metafields
async function assetsRestore(body) {
  const dryRun = Boolean(body?.dryRun)
  const api = client()
  const config = getConfig()
  const manifest = assetStore.load()
  const acoes = []

  // 1. host vivo? se foi excluído, esquece o id antigo e recria
  let hostOk = false
  if (config.assetsProductId) {
    try {
      await api.request(`/products/${config.assetsProductId}?fields=id`)
      hostOk = true
    } catch (err) {
      if (err.status !== 404) throw err
    }
  }
  if (!hostOk) {
    acoes.push('recriar asset host')
    if (!dryRun) {
      config.assetsProductId = null
      saveJson(CONFIG_FILE, config)
      await ensureAssetsProduct(api)
    }
  }

  // 2. re-sobe cada asset com URL morta (uma subida por conteúdo, mesmo com N URLs mortas)
  const urlMap = {}
  for (const [hash, a] of Object.entries(manifest.assets)) {
    const srcs = a.srcs || (a.src ? [a.src] : [])
    const dead = []
    for (const src of srcs) {
      const alive = await fetch(src, { method: 'HEAD' }).then((r) => r.ok).catch(() => false)
      if (!alive) dead.push(src)
    }
    if (!dead.length) continue
    const buffer = assetStore.readLocal(a)
    if (!buffer) {
      acoes.push(`SEM CÓPIA LOCAL de ${a.filename} (${dead.length} URL morta) — irrecuperável`)
      continue
    }
    acoes.push(`re-subir ${a.filename} (${dead.length} URL morta)`)
    if (!dryRun) {
      const assetsId = getConfig().assetsProductId
      const img = await api.request(`/products/${assetsId}/images`, {
        method: 'POST',
        body: { attachment: buffer.toString('base64'), filename: a.filename },
      })
      for (const src of dead) urlMap[src] = img.src
      const vivos = srcs.filter((s) => !dead.includes(s))
      manifest.assets[hash] = { ...a, src: img.src, imageId: img.id, srcs: [...vivos, img.src] }
    }
  }

  // 3. reescreve metafields que apontavam pras URLs mortas
  let metafieldsCorrigidos = 0
  if (Object.keys(urlMap).length) {
    const rows = await scanSwtchrMetafields(api)
    for (const m of rows) {
      const novo = replaceUrls(m.value, urlMap)
      if (novo === null) continue
      metafieldsCorrigidos++
      await api.request(`/metafields/${m.id}`, { method: 'PUT', body: { value: novo } })
    }
    assetStore.save(manifest)
  }

  return { ok: true, dryRun, acoes, urlsTrocadas: urlMap, metafieldsCorrigidos }
}

async function history() {
  const api = client()
  const rows = (await api.request(`/metafields/products?namespace=${NAMESPACE}&key=${KEY_CONFIG}&per_page=200`)) || []
  const ids = [...new Set(rows.map((m) => m.owner_id))]
  const out = []
  for (const id of ids) {
    try {
      const p = await api.request(`/products/${id}?fields=id,name`)
      out.push({ id, name: localName(p.name) || `#${id}` })
    } catch {
      out.push({ id, name: `#${id}` })
    }
  }
  return out
}

async function search(params) {
  const q = (params.get('q') || '').trim()
  const rows = (await client().request(`/products?q=${encodeURIComponent(q)}&fields=id,name&per_page=20`)) || []
  const config = getConfig()
  const skip = new Set([config.assetsProductId, config.homeProductId].filter(Boolean))
  return rows.filter((r) => !skip.has(r.id)).map((r) => ({ id: r.id, name: localName(r.name) || `#${r.id}` }))
}

// ---------- infra http ----------

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 12e6) reject(Object.assign(new Error('payload grande demais'), { status: 413 }))
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function setCors(req, res) {
  const origin = req.headers.origin
  if (!origin) return
  // dev: espelha a origem (Vite em :5173, ou o túnel HTTPS quando embarcar no admin)
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  setCors(req, res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(readFileSync(path.join(ROOT, 'public', 'index.html')))
    }
    if (url.pathname === '/favicon.ico') {
      res.writeHead(204)
      return res.end()
    }
    if (url.pathname === '/auth/callback') return await handleCallback(url, res)
    if (url.pathname === '/api/status') return sendJson(res, 200, status())
    if (url.pathname === '/api/targets') return sendJson(res, 200, await listTargets(url.searchParams.get('type')))
    if (url.pathname === '/api/block' && req.method === 'GET') return sendJson(res, 200, await readBlock(url.searchParams))
    if (url.pathname === '/api/block' && req.method === 'PUT') return sendJson(res, 200, await writeBlock(await readBody(req)))
    // PDP builder (Fase 1)
    if (url.pathname === '/api/pdp' && req.method === 'GET') return sendJson(res, 200, await pdpRead(url.searchParams))
    if (url.pathname === '/api/pdp' && req.method === 'PUT') return sendJson(res, 200, await pdpWrite(await readBody(req)))
    if (url.pathname === '/api/upload' && req.method === 'POST') return sendJson(res, 200, await uploadImage(await readBody(req)))
    // protocolo de backup dos assets
    if (url.pathname === '/api/assets/backup' && req.method === 'POST') return sendJson(res, 200, await assetsBackup())
    if (url.pathname === '/api/assets/status' && req.method === 'GET') return sendJson(res, 200, await assetsStatus())
    if (url.pathname === '/api/assets/restore' && req.method === 'POST') return sendJson(res, 200, await assetsRestore(await readBody(req)))
    if (url.pathname === '/api/history' && req.method === 'GET') return sendJson(res, 200, await history())
    if (url.pathname === '/api/search' && req.method === 'GET') return sendJson(res, 200, await search(url.searchParams))
    sendJson(res, 404, { error: `rota não existe: ${req.method} ${url.pathname}` })
  } catch (err) {
    console.error(err)
    sendJson(res, typeof err.status === 'number' ? err.status : 500, { error: String(err.message || err) })
  }
})

server.listen(PORT, () => {
  const s = status()
  console.log(`\nSWTCHR × Nuvemshop POC — http://localhost:${PORT}\n`)
  if (!s.hasCredentials) {
    console.log('⚠ Falta credencial: cria o .env com NUVEMSHOP_APP_ID e NUVEMSHOP_CLIENT_SECRET (ver .env.example)')
  } else if (!s.connected) {
    console.log('→ Backend pronto. Agora sim: instala o app na loja demo pra gerar o token:')
    console.log(`  ${s.installUrl}`)
  } else {
    console.log(`✓ Conectado à loja #${s.storeId} (escopos: ${s.scope})`)
    if (s.homeProductId) console.log(`✓ Porta-dados da home: produto #${s.homeProductId}`)
  }
  console.log()
})
