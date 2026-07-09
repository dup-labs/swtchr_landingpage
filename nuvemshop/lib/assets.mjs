// Protocolo de backup dos assets do SWTCHR (imagens hospedadas no Asset Host).
//
// Problema: as imagens dos blocos vivem como fotos de um produto fantasma no CDN
// da Nuvemshop. Se uma integração (ERP etc.) excluir esse produto, todas as URLs
// morrem e não há como recuperar — a plataforma não tem lixeira nem API de mídia.
//
// Proteção em três partes:
//   1. cópia local  — todo upload é persistido em .data/assets/<hash>.<ext>
//   2. manifesto    — .data/assets.json mapeia hash → arquivo, URL publicada e
//                     onde cada URL está em uso (owner/metafield), via varredura
//   3. restauração  — server.mjs usa o manifesto pra re-subir o que morreu e
//                     reescrever os metafields trocando URL velha por nova
//
// Zero-deps, como o resto do POC.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }

// URLs de CDN da Nuvemshop: imagens de produto saem por *.cloudfront.net,
// estáticos de tema por *.mitiendanube.com — o backup cobre os dois
const CDN_URL_RE = /https?:\/\/[a-z0-9.-]*(?:mitiendanube\.com|cloudfront\.net)\/[^\s"'\\)]+/gi

export function createAssetStore(dataDir) {
  const assetsDir = path.join(dataDir, 'assets')
  const manifestFile = path.join(dataDir, 'assets.json')

  function load() {
    try {
      return JSON.parse(readFileSync(manifestFile, 'utf8'))
    } catch {
      return { updatedAt: null, assets: {}, usage: {} }
    }
  }

  function save(manifest) {
    mkdirSync(dataDir, { recursive: true })
    manifest.updatedAt = new Date().toISOString()
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2))
    return manifest
  }

  function extFor(filename, mime) {
    const fromName = (filename || '').split('.').pop()?.toLowerCase()
    if (fromName && fromName.length <= 4 && /^[a-z0-9]+$/.test(fromName)) return fromName
    return EXT_BY_MIME[mime] || 'jpg'
  }

  // grava a cópia local + entrada no manifesto (dedupe por hash do conteúdo)
  function record({ buffer, filename, mime, imageId, src }) {
    const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 16)
    const manifest = load()
    const ext = extFor(filename, mime)
    const file = `assets/${hash}.${ext}`
    const abs = path.join(dataDir, file)
    if (!existsSync(abs)) {
      mkdirSync(assetsDir, { recursive: true })
      writeFileSync(abs, buffer)
    }
    const prev = manifest.assets[hash] || {}
    // mesmo conteúdo pode ter sido publicado várias vezes → guarda TODAS as URLs
    const srcs = [...new Set([...(prev.srcs || []), ...(prev.src ? [prev.src] : []), ...(src ? [src] : [])])]
    manifest.assets[hash] = {
      ...prev,
      file,
      filename: filename || prev.filename || `${hash}.${ext}`,
      bytes: buffer.length,
      imageId: imageId ?? prev.imageId ?? null,
      src: src || prev.src || null,
      srcs,
      uploadedAt: prev.uploadedAt || new Date().toISOString(),
    }
    save(manifest)
    return { hash, file }
  }

  function readLocal(entry) {
    const abs = path.join(dataDir, entry.file)
    return existsSync(abs) ? readFileSync(abs) : null
  }

  return { load, save, record, readLocal, manifestFile, assetsDir }
}

// extrai toda URL de CDN presente num valor de metafield (string, JSON, HTML...)
export function extractCdnUrls(value) {
  if (typeof value !== 'string' || !value) return []
  return [...new Set(value.match(CDN_URL_RE) || [])]
}

// troca URLs num valor cru de metafield; retorna null se nada mudou
export function replaceUrls(value, urlMap) {
  if (typeof value !== 'string' || !value) return null
  let out = value
  for (const [oldUrl, newUrl] of Object.entries(urlMap)) {
    out = out.split(oldUrl).join(newUrl)
    // metafields JSON guardam a URL com barras escapadas
    out = out.split(oldUrl.replaceAll('/', '\\/')).join(newUrl.replaceAll('/', '\\/'))
  }
  return out === value ? null : out
}
