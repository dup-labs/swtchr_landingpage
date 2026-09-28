/**
 * Smoke test de node/cp/ FORA do IO (fetch direto, token de `vtex local token`).
 *
 *   cd node && npx tsc -p scripts/tsconfig.json && node .smoke/scripts/smoke.js
 *
 * Faz: session, schema, listPages(home), getPage(home), round-trip de formato (offline) em todos
 * os tipos, e UM commit (globalSections, sem mudanças) na branch de teste "swtchr-agent-test" —
 * NUNCA na main, NUNCA merge — e apaga a branch no fim.
 * v0.2: catálogo (categorias/produtos), scoped-pages, slug-check e UM create+delete de landingPage
 * na mesma branch de teste (apagada no fim).
 * Não faz upload (não suja o file manager).
 *
 * Portabilidade (só isto: `node .smoke/scripts/smoke.js portability`):
 * setup 2x (cria grupo "swtchr" + campo global "swtchr_data" na 1ª vez; não duplica),
 * escreve ~30KB no swtchr_data de UM produto de teste (kit-moletom), relê, mede tamanhos
 * maiores, LIMPA (Value [""]) e confere que as outras specs do produto ficaram intactas;
 * export completo (tamanho). Não faz merge nem mexe em outros produtos/specs.
 */

import { execSync } from 'child_process'
import { deepStrictEqual } from 'assert'

import { decodeToken } from '../cp/auth'
import { flattenTree } from '../cp/catalog'
import { buildPageData, normalizePageData } from '../cp/format'
import { PAGE_TYPES } from '../cp/schema'
import { ContentPlatform, linkTextOfTemplate } from '../cp/service'
import { clearSpecsCache, DATA_FIELD_NAME } from '../cp/specs'
import { CpError, CpRequest, CpTransport, cpErrorFrom } from '../cp/transport'
import type { PageType, SlugCheck } from '../cp/types'

const ACCOUNT = process.env.ACCOUNT || 'dupagencypartnerbr'
const TEST_USER = 'agent-test@swtchr.local' // → branch "swtchr-agent-test"

const HOSTS = {
  manage: 'https://api.vtexcommercestable.com.br',
  data: `https://${ACCOUNT}.vtexcommercestable.com.br`,
  upload: 'https://content-platform-ui.vercel.admin.vtex.com',
}

const fetchTransport: CpTransport = {
  async request<T>(req: CpRequest): Promise<T> {
    const isBuf = Buffer.isBuffer(req.body)
    const res = await fetch(HOSTS[req.host] + req.path, {
      method: req.method,
      headers: req.headers,
      body: req.body === undefined ? undefined : isBuf ? (req.body as Buffer) : JSON.stringify(req.body),
    })
    const text = await res.text()
    if (!res.ok) throw cpErrorFrom(res.status, text, `CP ${res.status} em ${req.method} ${req.path.split('?')[0]}`)
    if (req.responseType === 'text') return text as unknown as T
    return (text ? JSON.parse(text) : null) as T
  },
}

const ok = (msg: string) => console.log(`  ✓ ${msg}`)

const TEST_LINKTEXT = process.env.TEST_LINKTEXT || 'kit-moletom'

async function portability(reader: ContentPlatform) {
  console.log('\n[portabilidade: setup (campo global swtchr_data)]')
  const s1 = await reader.setup()
  ok(`setup #1: ${JSON.stringify(s1)}`)
  clearSpecsCache() // força nova busca na conta (simula outro pod)
  const s2 = await reader.setup()
  ok(`setup #2 (sem cache): ${JSON.stringify(s2)}`)
  if (s2.dataField.created || s2.dataField.id !== s1.dataField.id) throw new Error('setup duplicou/mudou o campo')
  const s3 = await reader.setup()
  ok(`setup #3 (cache): ${JSON.stringify(s3)}`)
  const tree = await reader.catalog.getCategoryTree()
  for (const cat of flattenTree(tree).slice(0, 3)) {
    const token = (reader as unknown as { token: string }).token
    const rows = (await (await fetch(`https://${ACCOUNT}.vtexcommercestable.com.br/api/catalog_system/pub/specification/field/listTreeByCategoryId/${cat.id}?_=${Date.now()}`, { headers: { VtexIdclientAutCookie: token } })).json()) as Array<{ Name: string; FieldId: number; CategoryId: number | null }>
    const hits = rows.filter((r) => r.Name === DATA_FIELD_NAME)
    ok(`categoria ${cat.id}: ${hits.length} campo(s) ${DATA_FIELD_NAME} → ${JSON.stringify(hits)}`)
    if (hits.length !== 1) throw new Error(`esperado 1 ${DATA_FIELD_NAME}, veio ${hits.length}`)
  }

  console.log(`\n[portabilidade: gravação no produto de teste (${TEST_LINKTEXT})]`)
  const fieldId = s1.dataField.id
  const productId = await reader.specs.productIdByLinkText(TEST_LINKTEXT)
  if (!productId) throw new Error(`produto ${TEST_LINKTEXT} não encontrado`)
  ok(`productId(${TEST_LINKTEXT}) = ${productId}`)
  const token = (reader as unknown as { token: string }).token
  const allSpecs = async () =>
    (await (await fetch(`https://${ACCOUNT}.vtexcommercestable.com.br/api/catalog/pvt/product/${productId}/specification`, { headers: { VtexIdclientAutCookie: token } })).json()) as Array<{ Id: number; FieldId: number; Text: string }>
  const others = (rows: Array<{ Id: number; FieldId: number; Text: string }>) => rows.filter((r) => r.FieldId !== fieldId)
  const mine = (rows: Array<{ Id: number; FieldId: number; Text: string }>) => rows.filter((r) => r.FieldId === fieldId)
  const before = await allSpecs()
  ok(`specs antes: ${before.length} associações (swtchr_data = ${JSON.stringify(mine(before).map((r) => r.Text.slice(0, 40)))})`)

  // documento real: PDP de produto publicada (se houver) → formato do espelho, inchado até ~30KB
  const pdps = await reader.listScopedPages('pdp')
  const prodPdp = pdps.find((p) => p.scope === 'product') || pdps[0]
  const v = prodPdp ? await reader.lastVersion('pdp', prodPdp.id, 'main') : null
  const doc = v
    ? reader.productDataFor(prodPdp.id, v, new Date().toISOString(), prodPdp.name)
    : { swtchr: 1, type: 'pdp', store: reader.store, template: `/${TEST_LINKTEXT}/p`, entryId: 'smoke', name: 'smoke', publishedAt: new Date().toISOString(), author: reader.user, sections: [] as Array<Record<string, unknown>> }
  ok(`doc real (${prodPdp ? prodPdp.name + ' ' + (prodPdp.target || '') : 'sintético'}): ${Buffer.byteLength(JSON.stringify(doc))} bytes, linkText do template = "${linkTextOfTemplate(doc.template)}"`)
  const inflate = (target: number) => {
    const d = JSON.parse(JSON.stringify(doc)) as { sections: Array<Record<string, unknown>> }
    let i = 0
    while (Buffer.byteLength(JSON.stringify(d)) < target) {
      d.sections.push({ key: 'SwtchrRichText', native: false, data: { title: `Bloco ${i++} — acentuação ç ã é`, html: '<p>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20) + '</p>' } })
    }
    return JSON.stringify(d)
  }

  const results: string[] = []
  try {
    for (const size of [30 * 1024, 64 * 1024, 200 * 1024, 1024 * 1024]) {
      const value = inflate(size)
      const bytes = Buffer.byteLength(value)
      try {
        await reader.specs.writeProductData(productId, fieldId, value)
        const back = await reader.specs.readProductData(productId, fieldId)
        const same = back === value
        results.push(`${Math.round(bytes / 1024)}KB: gravou, releitura ${same ? 'idêntica' : `DIFERENTE (${Buffer.byteLength(back)} bytes)`}`)
        ok(results[results.length - 1])
        if (size === 30 * 1024 && !same) throw new Error('releitura de 30KB diferente')
        if (size === 30 * 1024) JSON.parse(back)
      } catch (e) {
        const msg = e instanceof CpError ? `${e.status} ${e.message} ${(e.detail || '').slice(0, 200)}` : String(e)
        results.push(`${Math.round(bytes / 1024)}KB: FALHOU → ${msg}`)
        ok(results[results.length - 1])
        if (size === 30 * 1024) throw e
        break
      }
    }
  } finally {
    await reader.specs.writeProductData(productId, fieldId, '')
    const cleared = await reader.specs.readProductData(productId, fieldId)
    ok(`limpo (Value [""]): releitura = ${JSON.stringify(cleared)}`)
    if (cleared !== '') throw new Error('não limpou')
    const after = await allSpecs()
    deepStrictEqual(others(after), others(before))
    ok(`outras specs intactas (${others(after).length} associações iguais antes/depois)`)
    ok(`swtchr_data no produto: ${mine(after).length} associação(ões) ${JSON.stringify(mine(after))}`)
    if (mine(after).length > 1) throw new Error('gravação duplicou a associação')
  }

  console.log('\n[portabilidade: export]')
  const t0 = Date.now()
  const bundle = await reader.exportAll()
  const json = JSON.stringify(bundle)
  ok(`export: ${bundle.pages.length} páginas, ${bundle.media.length} mídias, ${Math.round(Buffer.byteLength(json) / 1024)}KB, ${Date.now() - t0}ms`)
  const byType: Record<string, number> = {}
  bundle.pages.forEach((p) => (byType[p.type] = (byType[p.type] || 0) + 1))
  ok(`por tipo: ${JSON.stringify(byType)}`)
  ok(`escopos: ${JSON.stringify(bundle.pages.filter((p) => p.scope).map((p) => `${p.type}:${p.scope}:${p.target || ''}`))}`)
  ok(`mídia (3 primeiras): ${JSON.stringify(bundle.media.slice(0, 3))}`)
}

async function main() {
  const token = execSync('vtex local token', { encoding: 'utf8' }).trim().split('\n').pop() as string
  const me = decodeToken(token)
  if (!me) throw new Error('token sem e-mail')
  ok(`token decodificado (sub = ${me.email}, account = ${me.account})`)

  // Instância "real" (do usuário) só para leituras.
  const reader = new ContentPlatform({ transport: fetchTransport, account: ACCOUNT, token, user: me.email })
  if (process.argv.includes('portability')) {
    await portability(reader)
    console.log('\nsmoke (portabilidade) OK')
    return
  }
  // Instância de teste: author/branch de teste.
  const cp = new ContentPlatform({ transport: fetchTransport, account: ACCOUNT, token, user: TEST_USER })
  if (cp.draftName !== 'swtchr-agent-test') throw new Error(`branch de teste inesperada: ${cp.draftName}`)

  console.log('\n[leitura]')
  const session = await reader.getSession()
  ok(`session: ${JSON.stringify(session)}`)
  const schema = await reader.getSchema()
  const sw = schema.components.filter((c) => c.swtchr)
  ok(`schema ${schema.schemaId}: ${schema.components.length} componentes (${sw.length} swtchr)`)
  ok(`ex.: ${sw[0].key} "${sw[0].title}" props=${Object.keys(sw[0].schema.properties ?? {}).join(',')}`)
  const pages = await reader.listPages('home')
  ok(`listPages(home): ${JSON.stringify(pages)}`)
  const home = await reader.getPage('home', pages[0].id)
  ok(`getPage(home): source=${home.source} fields=${Object.keys(home.fields).join(',')} sections=${home.sections.map((s) => s.key).join(' > ')}`)
  const marquee = home.sections.find((s) => s.key === 'SwtchrMarquee')
  if (marquee) ok(`array plano ok: SwtchrMarquee.items = ${JSON.stringify(marquee.data.items)}`)
  ok(`status: ${JSON.stringify(await reader.getStatus())}`)
  ok(`draft do usuário real: ${JSON.stringify(await reader.getDraft())}`)


  console.log('\n[v0.2 leitura: catálogo, scoped-pages, slug-check]')
  const tree = await reader.catalog.getCategoryTree()
  ok(`categories: ${JSON.stringify(tree)}`)
  const t0 = Date.now()
  await reader.catalog.getCategoryTree()
  ok(`categories (cache): ${Date.now() - t0}ms`)
  const all = await reader.catalog.searchProducts('')
  ok(`products(q=''): ${all.length} → ${JSON.stringify(all[0])}`)
  const hits = await reader.catalog.searchProducts('moletom')
  ok(`products(q='moletom'): ${hits.map((h) => `${h.pdpTemplate} [${h.categoryPath}]`).join(' | ')}`)
  const paths = new Set(flattenTree(tree).map((n) => n.path))
  const orphan = all.filter((h) => h.categoryPath && !paths.has(h.categoryPath))
  if (orphan.length) throw new Error(`categoryPath fora da árvore: ${orphan.map((h) => h.categoryPath).join(',')}`)
  ok('todo categoryPath bate com um path da árvore')
  for (const type of ['pdp', 'plp', 'search', 'landingPage'] as PageType[]) {
    ok(`scoped-pages(${type}): ${JSON.stringify((await reader.listScopedPages(type)).map((p) => ({ id: p.id, name: p.name, scope: p.scope, target: p.target })))}`)
  }
  const expect: Array<[string, SlugCheck['conflict'] | 'ok']> = [
    ['vestuario', 'categoria'],
    ['vestuario/casacos-e-jaquetas', 'categoria'],
    ['vestuario/trocas', 'categoria'],
    ['quem-somos', 'pagina'],
    ['/quem-somos', 'invalido'],
    ['a//b', 'invalido'],
    ['Trocas', 'invalido'],
    ['institucional/trocas', 'ok'],
  ]
  for (const [slug, want] of expect) {
    const c = await reader.checkSlug(slug)
    const got = c.ok ? 'ok' : c.conflict
    if (got !== want) throw new Error(`slug-check(${slug}): esperado ${want}, veio ${JSON.stringify(c)}`)
    ok(`slug-check(${slug}) → ${got}${c.detail ? ` (${c.detail})` : ''}`)
  }

  console.log('\n[round-trip de formato, offline]')
  for (const type of PAGE_TYPES) {
    for (const entry of await reader.listPublishedEntries(type)) {
      const v = await reader.lastVersion(type, entry.id, 'main')
      if (!v) continue
      const a = normalizePageData(v.data)
      const rebuilt = buildPageData({ currentData: v.data, fields: a.fields, sections: a.sections })
      const b = normalizePageData(rebuilt)
      deepStrictEqual(b, a)
      // nativas intactas (byte a byte, exceto $position)
      for (const s of a.sections.filter((x) => x.native)) {
        const orig: unknown = (v.data.sections as { values: Record<string, unknown> }).values[s.uid]
        const now: unknown = (rebuilt.sections as { values: Record<string, unknown> }).values[s.uid]
        deepStrictEqual(now, orig)
      }
      ok(`${type}/${entry.name}: ${a.sections.length} sections (${a.sections.filter((x) => x.native).length} nativas)`)
    }
  }

  console.log('\n[commit na branch de teste]')
  const pre = await cp.findDraft()
  if (pre) {
    ok(`branch de teste já existia (${pre.id}) — apagando antes`)
    await cp.discardDraft()
  }
  let branchId: string | null = null
  try {
    const gsList = await cp.listPublishedEntries('globalSections')
    const before = await cp.getPage('globalSections', gsList[0].id)
    const saved = await cp.savePage('globalSections', before.id, {
      name: before.name,
      fields: before.fields,
      sections: before.sections,
    })
    const draft = await cp.getDraft()
    branchId = draft.branchId
    if (!branchId || draft.branchName !== 'swtchr-agent-test') throw new Error(`draft inesperado: ${JSON.stringify(draft)}`)
    ok(`resposta do commit: ${JSON.stringify(cp.lastCommitResponse).slice(0, 400)}`)
    ok(`commit ok em ${draft.branchName} (${branchId}); source=${saved.source}`)
    deepStrictEqual(saved.sections, before.sections)
    deepStrictEqual(saved.fields, before.fields)
    ok('página relida do rascunho == original (sections + fields)')
    ok(`changes: ${JSON.stringify(draft.changes)}`)
    const reread = await cp.getPage('globalSections', before.id)
    ok(`getPage agora lê de: ${reread.source}`)
    ok(`preview: ${(await cp.getPreviewUrl('globalSections', before.id)).url}`)
    const mainAfter = await cp.lastVersion('globalSections', before.id, 'main')
    ok(`main intacta: branchId=${mainAfter && mainAfter.branchId}`)
  } finally {
    const d = await cp.findDraft()
    if (d) {
      if (d.name !== 'swtchr-agent-test' && !d.name.startsWith('swtchr-agent-test--')) {
        throw new Error(`recusando apagar ${d.name}`)
      }
      await cp.discardDraft()
      ok(`branch ${d.name} apagada`)
    }
    const left = await cp.findDraft()
    ok(`branch de teste após limpeza: ${left ? 'AINDA EXISTE ' + left.id : 'nenhuma'}`)
  }

  console.log('\n[v0.2: create + delete de landingPage na branch de teste]')
  const pre2 = await cp.findDraft()
  if (pre2) await cp.discardDraft()
  try {
    const slug = `swtchr-agent-test-${Date.now().toString(36)}`
    const quem = (await cp.listScopedPages('landingPage')).find((p) => p.target === 'quem-somos')
    const created = await cp.createPage('landingPage', {
      name: 'Teste agente',
      target: slug,
      copyFrom: quem ? quem.id : undefined,
      seo: { title: 'Teste', description: 'smoke' },
    })
    ok(`resposta do commit: ${JSON.stringify(cp.lastCommitResponse).slice(0, 300)}`)
    ok(`criada: id=${created.id} source=${created.source} fields=${JSON.stringify(created.fields)}`)
    ok(`sections copiadas: ${created.sections.map((x) => x.key).join(' > ')}`)
    const draft = await cp.findDraft()
    if (!draft || draft.name !== 'swtchr-agent-test') throw new Error(`draft inesperado: ${JSON.stringify(draft)}`)
    const scopedAfter = await cp.listScopedPages('landingPage')
    const mine = scopedAfter.find((p) => p.id === created.id)
    ok(`scoped-pages vê a nova: ${JSON.stringify(mine)}`)
    if (!mine || mine.target !== slug) throw new Error('nova landing não apareceu no scoped-pages')
    const again = await cp.checkSlug(slug)
    ok(`slug-check da nova → ${JSON.stringify(again)}`)
    if (again.conflict !== 'pagina') throw new Error('slug-check não viu a landing do rascunho')
    try {
      await cp.createPage('landingPage', { name: 'dup', target: slug })
      throw new Error('create duplicado deveria falhar')
    } catch (e) {
      if (!(e instanceof CpError) || e.status !== 409) throw e
      ok('create com slug repetido → 409')
    }
    const pdpDefault = (await cp.listScopedPages('pdp')).find((p) => p.scope === 'default')
    if (pdpDefault) {
      try {
        await cp.deletePage('pdp', pdpDefault.id)
        throw new Error('delete da PDP padrão deveria falhar')
      } catch (e) {
        if (!(e instanceof CpError) || e.status !== 400) throw e
        ok('delete da PDP padrão → 400 (recusado)')
      }
    }
    ok(`delete: ${JSON.stringify(await cp.deletePage('landingPage', created.id))}`)
    const lv = await cp.lastVersion('landingPage', created.id, draft.id)
    ok(`last-version após delete: isDeleteFromMainOnMerge=${lv && lv.isDeleteFromMainOnMerge}`)
    const entries = await cp.listBranchEntries(draft.id)
    ok(`branch entries: ${JSON.stringify(entries.map((e) => ({ id: e.id, type: e.contentTypeId, tag: e.tag })))}`)
    const gone = (await cp.listScopedPages('landingPage')).find((p) => p.id === created.id)
    ok(`scoped-pages após delete: ${gone ? 'AINDA LISTA' : 'sumiu'}`)
    const mainLp = await cp.listPublishedEntries('landingPage')
    ok(`main intacta: ${mainLp.map((e) => e.name).join(', ')}`)
  } finally {
    const d = await cp.findDraft()
    if (d) {
      if (d.name !== 'swtchr-agent-test' && !d.name.startsWith('swtchr-agent-test--')) throw new Error(`recusando apagar ${d.name}`)
      await cp.discardDraft()
      ok(`branch ${d.name} apagada`)
    }
    const left = await cp.findDraft()
    ok(`branch de teste após limpeza: ${left ? 'AINDA EXISTE ' + left.id : 'nenhuma'}`)
  }
  console.log('\nsmoke OK')
}

main().catch((e) => {
  if (e instanceof CpError) console.error(`\nFALHOU: CpError ${e.status} ${e.message}\n${e.detail ?? ''}`)
  else console.error('\nFALHOU:', e)
  process.exit(1)
})
