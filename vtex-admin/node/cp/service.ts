/**
 * Serviço do Content Platform (CMS novo da VTEX) usado pelo painel swtchr.
 * Independe do runtime IO: recebe um CpTransport (IO ou fetch) e o token do usuário.
 *
 * Modelo "git" do CP: main = publicado; cada usuário edita numa branch própria
 * ("swtchr-<parte local do e-mail>"), criada sob demanda no primeiro save.
 * Publicar = merge da branch na main.
 */

import { draftBranchName, DRAFT_PREFIX } from './auth'
import { Catalog, flattenTree } from './catalog'
import { buildPageData, isCpArray, isObj, normalizePageData } from './format'
import { summarizeSchema, SchemaSummary, isPageType, PAGE_TYPES } from './schema'
import { CatalogSpecs, DATA_WARN_BYTES } from './specs'
import { CpError, CpTransport } from './transport'
import type {
  CategoryNode,
  CreatePageBody,
  DraftInfo,
  ExportBundle,
  ExportPage,
  MirrorResult,
  PageDocument,
  PageSection,
  PageSummary,
  PageType,
  PortableSection,
  PreviewUrl,
  ProductDataDocument,
  PublishResult,
  SavePageBody,
  SchemaResponse,
  ScopedPageSummary,
  Session,
  SetupResult,
  SlugCheck,
  StoreStatus,
  UploadResult,
} from './types'

type Obj = Record<string, unknown>

export const DEFAULTS = {
  store: 'swtchr',
  /** usados só quando não há schemaBinding anterior para reaproveitar (entrada nova) */
  baseSchema: 'vtex.faststore@4.5.0',
  requestedBaseSchema: 'vtex.faststore@4',
  schemaTtlMs: 5 * 60 * 1000,
  storeTtlMs: 10 * 60 * 1000,
  uploadMaxBytes: 20 * 1024 * 1024,
}

export interface CpBranch {
  id: string
  name: string
  description?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  mergedAt?: string
  latestCommitId?: string
}

interface BranchEntry {
  id: string
  name: string
  contentTypeId: string
  updatedAt?: string
  tag?: string
  search_keywords?: string[]
}

interface PublishedEntry {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
  search_keywords?: string[]
}

interface SchemaBinding {
  schemaId: string
  dependencies?: Array<{ parentSchemaId: string; resolvedSchemaId: string; requestedSchemaId: string }>
  bindingVersion?: number
}

export interface LastVersion {
  entryId: string
  contentType: string
  branchId: string
  data: Obj
  schemaBinding?: SchemaBinding
  identifierKeys?: string[]
  searchKeywords?: string[] | null
  entryName?: string
  baseHash?: string
  updatedAt?: string
  /** true = marcada para exclusão no merge (delete-on-merge) */
  isDeleteFromMainOnMerge?: boolean
}

interface StoreInfo {
  storeUrl: string
  previewUrl: string
}

// ---------- caches por processo (pod) ----------
interface CacheSlot<T> {
  at: number
  value: Promise<T>
}
const schemaCache = new Map<string, CacheSlot<SchemaSummary>>()
const storeCache = new Map<string, CacheSlot<StoreInfo>>()

function cached<T>(map: Map<string, CacheSlot<T>>, key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = map.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  const value = load()
  map.set(key, { at: Date.now(), value })
  value.catch(() => map.delete(key))
  return value
}

/** Limpa caches (testes / forçar releitura do schema). */
export function clearCaches() {
  schemaCache.clear()
  storeCache.clear()
}

export interface ContentPlatformOptions {
  transport: CpTransport
  account: string
  /** token do usuário do admin (JWT, sem "Bearer") */
  token: string
  /** e-mail do usuário (author dos commits) */
  user: string
  store?: string
  workspace?: string
}

export class ContentPlatform {
  private t: CpTransport
  public readonly account: string
  public readonly store: string
  public readonly workspace: string
  public readonly user: string
  private token: string
  /** resposta crua do último commit (diagnóstico) */
  public lastCommitResponse?: unknown
  /** catálogo público da loja (categorias/produtos) */
  public readonly catalog: Catalog
  /** especificações do catálogo (campo global swtchr_data) */
  public readonly specs: CatalogSpecs

  constructor(opts: ContentPlatformOptions) {
    this.t = opts.transport
    this.account = opts.account
    this.store = opts.store ?? DEFAULTS.store
    this.workspace = opts.workspace ?? 'master'
    this.user = opts.user
    this.token = opts.token
    this.catalog = new Catalog(opts.transport, opts.account)
    this.specs = new CatalogSpecs(opts.transport, opts.account, opts.token, this.catalog)
  }

  // ---------- HTTP helpers ----------
  private get auth() {
    return { Authorization: `Bearer ${this.token}` }
  }

  private manage(path: string) {
    return `/api/content-platform/manage/${this.account}/${this.store}${path}`
  }

  private get<T>(path: string, metric: string) {
    return this.t.request<T>({ host: 'manage', method: 'GET', path, headers: this.auth, metric })
  }

  private send<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body: unknown, metric: string) {
    return this.t.request<T>({
      host: 'manage',
      method,
      path,
      body,
      headers: { ...this.auth, 'Content-Type': 'application/json' },
      metric,
      retry: false,
    })
  }

  // ---------- schema / store ----------
  getSchemaSummary(): Promise<SchemaSummary> {
    const id = `${this.account}.${this.store}`
    return cached(schemaCache, id, DEFAULTS.schemaTtlMs, async () => {
      const doc = await this.get<unknown>(`/api/content-platform/schemas/${id}`, 'cp-schema')
      const summary = summarizeSchema(doc)
      if (!summary.schemaId) throw new CpError(502, 'Schema da store sem $id', id)
      return summary
    })
  }

  async getSchema(): Promise<SchemaResponse> {
    const { schemaId, components } = await this.getSchemaSummary()
    return { schemaId, components }
  }

  getStoreInfo(): Promise<StoreInfo> {
    const key = `${this.account}.${this.store}`
    return cached(storeCache, key, DEFAULTS.storeTtlMs, async () => {
      const fallback = `https://${this.account}.vtex.app`
      let previewUrl = ''
      try {
        const info = await this.get<Obj>(
          `/api/content-platform/manage/${this.account}/stores/${this.store}`,
          'cp-store'
        )
        const bs = isObj(info.buildSettings) ? info.buildSettings : {}
        if (typeof bs.previewUrl === 'string') previewUrl = bs.previewUrl
      } catch {
        // sem info da store → fallback
      }
      let storeUrl = fallback
      if (previewUrl) {
        const m = /^(https?:\/\/[^/]+)/.exec(previewUrl)
        if (m) storeUrl = m[1]
      }
      return { storeUrl, previewUrl: previewUrl || `${storeUrl}/api/preview` }
    })
  }

  async getSession(): Promise<Session> {
    const [schema, store] = await Promise.all([this.getSchemaSummary(), this.getStoreInfo()])
    return {
      account: this.account,
      workspace: this.workspace,
      user: this.user,
      store: this.store,
      schemaId: schema.schemaId,
      storeUrl: store.storeUrl,
    }
  }

  async getStatus(): Promise<StoreStatus> {
    const r = await this.get<Obj>(`/api/content-platform/manage/${this.account}/stores/status`, 'cp-status')
    return { status: typeof r.status === 'string' ? r.status : JSON.stringify(r) }
  }

  // ---------- branches ----------
  get draftName() {
    return draftBranchName(this.user)
  }

  listBranches(): Promise<CpBranch[]> {
    return this.get<CpBranch[]>(this.manage('/branches'), 'cp-branches')
  }

  /** Branch de rascunho aberta do usuário (nome exato ou "<nome>--<sufixo>"), ou null. */
  async findDraft(): Promise<CpBranch | null> {
    const name = this.draftName
    const branches = await this.listBranches()
    const mine = branches.filter(
      (b) => b.id !== 'main' && !b.mergedAt && (b.name === name || b.name.startsWith(`${name}--`))
    )
    if (!mine.length) return null
    mine.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    return mine[0]
  }

  /** Rascunho do usuário; cria se não existir. */
  async ensureDraft(): Promise<CpBranch> {
    const found = await this.findDraft()
    if (found) return found
    const body = {
      name: this.draftName,
      description: `swtchr: rascunho de ${this.user}`,
      author: this.user,
      isDev: false,
    }
    let created: Obj
    try {
      created = await this.send<Obj>('POST', this.manage('/branches'), body, 'cp-branch-create')
    } catch (e) {
      // nome ocupado (ex.: branch antiga já mergeada) → sufixo
      if (!(e instanceof CpError) || e.status >= 500) throw e
      const alt = { ...body, name: `${this.draftName}--${Date.now().toString(36)}` }
      created = await this.send<Obj>('POST', this.manage('/branches'), alt, 'cp-branch-create')
      body.name = alt.name
    }
    const id = String(created.id ?? created.branchId ?? '')
    if (!id) throw new CpError(502, 'CP não devolveu o id da branch criada', JSON.stringify(created).slice(0, 300))
    return { id, name: String(created.name ?? body.name) }
  }

  async deleteBranch(branchId: string): Promise<void> {
    if (!branchId || branchId === 'main') throw new CpError(400, 'Recusado: não apago a main')
    await this.send('DELETE', this.manage(`/branches/${encodeURIComponent(branchId)}`), { author: this.user }, 'cp-branch-delete')
  }

  /**
   * Entradas alteradas numa branch (paginado). O CP devolve TODAS as entradas da store com
   * tag "changed" | "new" | ... | "main" (= intocada na branch); filtramos as "main".
   */
  async listBranchEntries(branchId: string): Promise<BranchEntry[]> {
    const out: BranchEntry[] = []
    const pageSize = 50
    for (let page = 1; page <= 20; page++) {
      const r = await this.get<{ entries?: BranchEntry[] }>(
        this.manage(`/branches/${encodeURIComponent(branchId)}/entries?page=${page}&pageSize=${pageSize}`),
        'cp-branch-entries'
      )
      const entries = r.entries ?? []
      out.push(...entries.filter((e) => e.tag !== 'main'))
      if (entries.length < pageSize) break
    }
    return out
  }

  // ---------- entradas ----------
  /** Entradas publicadas (API pública de dados). */
  async listPublishedEntries(type: PageType): Promise<PublishedEntry[]> {
    const r = await this.t.request<{ entries?: PublishedEntry[] }>({
      host: 'data',
      method: 'GET',
      path: `/api/content-platform/data/${this.account}/${this.store}/${type}/entries`,
      metric: 'cp-data-entries',
    })
    return r.entries ?? []
  }

  /** Última versão da entrada na branch; null se não existe (404). */
  async lastVersion(type: PageType, entryId: string, branchId: string): Promise<LastVersion | null> {
    try {
      return await this.get<LastVersion>(
        this.manage(
          `/${type}/entries/${encodeURIComponent(entryId)}/last-version?branchId=${encodeURIComponent(branchId)}`
        ),
        'cp-last-version'
      )
    } catch (e) {
      if (e instanceof CpError && e.status === 404) return null
      throw e
    }
  }

  /** Versão atual para o usuário: rascunho (se a entrada existir nele) senão main. */
  async currentVersion(
    type: PageType,
    entryId: string,
    draft?: CpBranch | null
  ): Promise<{ version: LastVersion | null; source: 'draft' | 'main' }> {
    const d = draft === undefined ? await this.findDraft() : draft
    if (d) {
      const v = await this.lastVersion(type, entryId, d.id)
      if (v) return { version: v, source: v.branchId === 'main' ? 'main' : 'draft' }
    }
    return { version: await this.lastVersion(type, entryId, 'main'), source: 'main' }
  }

  async listPages(type: PageType, knownDraft?: CpBranch | null): Promise<PageSummary[]> {
    const [published, draft] = await Promise.all([
      this.listPublishedEntries(type),
      knownDraft === undefined ? this.findDraft() : Promise.resolve(knownDraft),
    ])
    const byId = new Map<string, PageSummary>()
    for (const e of published) {
      byId.set(e.id, { id: e.id, type, name: e.name, slug: slugOf(e.search_keywords), updatedAt: e.updatedAt })
    }
    if (draft) {
      // entradas criadas/alteradas no rascunho (ainda não publicadas)
      const changed = await this.listBranchEntries(draft.id).catch(() => [] as BranchEntry[])
      for (const e of changed) {
        if (e.contentTypeId !== type) continue
        byId.set(e.id, {
          ...(byId.get(e.id) ?? { id: e.id, type }),
          name: e.name,
          slug: slugOf(e.search_keywords) ?? byId.get(e.id)?.slug,
          updatedAt: e.updatedAt,
        })
      }
    }
    return Array.from(byId.values())
  }

  async getPage(type: PageType, entryId: string): Promise<PageDocument> {
    if (entryId === 'new') {
      return { id: 'new', type, name: '', fields: {}, sections: [], source: 'draft' }
    }
    const { version, source } = await this.currentVersion(type, entryId)
    if (!version) throw new CpError(404, `Entrada ${type}/${entryId} não encontrada`)
    return toDocument(type, entryId, version, source)
  }

  /** Salva no rascunho do usuário (cria a branch se preciso). Devolve a página relida. */
  async savePage(type: PageType, entryId: string, body: SavePageBody): Promise<PageDocument> {
    if (!isPageType(type)) throw new CpError(400, `Tipo inválido: ${type}`)
    if (!body || !Array.isArray(body.sections) || !isObj(body.fields)) {
      throw new CpError(400, 'Body inválido: esperado { fields: {}, sections: [] }')
    }

    const isNew = entryId === 'new'
    const [schema, draft] = await Promise.all([this.getSchemaSummary(), this.ensureDraft()])
    const ct = schema.contentTypes[type]

    // Seções: só chaves conhecidas do schema.
    const known = new Set(schema.components.map((c) => c.key))
    const unknown = body.sections.filter((s) => !s.native && !known.has(s.key)).map((s) => s.key)
    if (unknown.length) throw new CpError(400, `Section desconhecida no schema: ${unknown.join(', ')}`)

    const current = isNew ? null : (await this.currentVersion(type, entryId, draft)).version
    if (!isNew && !current) throw new CpError(404, `Entrada ${type}/${entryId} não encontrada`)

    const titles = new Map(schema.components.map((c) => [c.key, c.title] as [string, string]))
    const data = buildPageData({
      currentData: current?.data ?? {},
      fields: body.fields,
      sections: body.sections,
      titleOf: (k) => titles.get(k),
    })

    const entryName = (body.name && body.name.trim()) || current?.entryName || defaultName(type)
    const identifierKeys = current?.identifierKeys ?? ct?.identifierKeys ?? []
    const searchKeywords = await this.searchKeywordsFor(type, entryId, data, current)

    const commitBody: Obj = {
      author: this.user,
      contentTypeId: type,
      message: `swtchr: ${entryName}`,
      data,
      schemaBinding: this.bindingFor(schema.schemaId, current?.schemaBinding),
      entryName,
      identifierKeys,
      search_keywords: searchKeywords,
    }
    if (!isNew) commitBody.entryId = entryId

    const res = await this.send<Obj | null>(
      'POST',
      this.manage(`/branches/${encodeURIComponent(draft.id)}/commits`),
      commitBody,
      'cp-commit'
    )
    this.lastCommitResponse = res

    const newId = isNew ? pickEntryId(res) : entryId
    if (!newId) throw new CpError(502, 'Commit feito mas o CP não devolveu o id da entrada', JSON.stringify(res).slice(0, 300))

    const saved = await this.lastVersion(type, newId, draft.id)
    if (saved) return toDocument(type, newId, saved, 'draft')
    // fallback: o que acabamos de mandar
    return toDocument(type, newId, { entryId: newId, contentType: type, branchId: draft.id, data, entryName }, 'draft')
  }

  // ---------- v0.2: páginas com escopo (pdp/plp/landing) ----------

  /**
   * Entradas do tipo + escopo. Lê a versão de cada uma (rascunho do usuário senão main),
   * em paralelo com limite, para extrair template.value (pdp/plp) ou slug (landingPage).
   * Entradas marcadas para exclusão no rascunho (delete-on-merge) saem da lista.
   */
  async listScopedPages(type: PageType): Promise<ScopedPageSummary[]> {
    const draft = await this.findDraft()
    const pages = await this.listPages(type, draft)
    const rows = await mapLimit(pages, 5, async (p) => {
      const { version } = await this.currentVersion(type, p.id, draft).catch(() => ({ version: null as LastVersion | null }))
      if (version && version.isDeleteFromMainOnMerge) return null
      const data = version ? version.data : {}
      const row: ScopedPageSummary = { ...p, name: (version && version.entryName) || p.name, scope: 'default' }
      if (type === 'landingPage') {
        const slug = landingSlugOf(data) || (p.slug ? p.slug.replace(/^\/+/, '') : '')
        row.scope = 'page'
        if (slug) {
          row.target = slug
          row.slug = slug
        }
      } else if (type === 'pdp' || type === 'plp') {
        const tv = templateValueOf(data)
        if (tv) {
          row.target = tv
          row.scope = /\/p\/?$/.test(tv) ? 'product' : 'category'
        }
      }
      return row
    })
    return rows.filter((r): r is ScopedPageSummary => !!r)
  }

  /** POST /pages/:type — cria entrada nova (pdp/plp/landingPage) no rascunho do usuário. */
  async createPage(type: PageType, body: CreatePageBody): Promise<PageDocument> {
    if (type !== 'pdp' && type !== 'plp' && type !== 'landingPage') {
      throw new CpError(400, `Criação não suportada para ${type}`, 'Só pdp, plp e landingPage aceitam entradas novas.')
    }
    if (!body || typeof body.name !== 'string' || !body.name.trim()) throw new CpError(400, 'Informe o nome da página')
    const name = body.name.trim()

    // ---- valida o alvo ----
    let target = ''
    if (type === 'landingPage') {
      target = String(body.target ?? '').trim()
      const check = await this.checkSlug(target)
      if (!check.ok) {
        throw new CpError(check.conflict === 'invalido' ? 400 : 409, `Slug indisponível: ${check.detail ?? check.conflict}`, check.detail)
      }
    } else {
      target = normalizeTarget(String(body.target ?? ''))
      if (!target) throw new CpError(400, 'Informe o alvo (produto ou categoria)')
      const isProduct = PDP_PRODUCT_RE.test(target)
      if (type === 'plp' && isProduct) throw new CpError(400, 'PLP aceita só caminho de categoria', target)
      if (!isProduct) {
        if (!CATEGORY_RE.test(target)) throw new CpError(400, `Alvo inválido: ${target}`, 'Use "/<linkText>/p" (produto) ou "/departamento/categoria".')
        const paths = await this.categoryPaths().catch(() => null)
        if (paths && !paths.has(target)) throw new CpError(400, `Categoria não encontrada no catálogo: ${target}`)
      }
      const existing = await this.listScopedPages(type)
      const dup = existing.find((e) => e.target && normalizeTarget(e.target) === target)
      if (dup) throw new CpError(409, `Já existe uma página para ${target}`, `"${dup.name}" (${dup.id})`)
    }

    const [schema, draft] = await Promise.all([this.getSchemaSummary(), this.ensureDraft()])
    const ct = schema.contentTypes[type]

    // ---- base: entrada de origem (copyFrom) ----
    const source = body.copyFrom ? (await this.currentVersion(type, body.copyFrom, draft)).version : null
    if (body.copyFrom && !source) throw new CpError(404, `Entrada de origem ${type}/${body.copyFrom} não encontrada`)
    const src = source ? source.data : {}

    const data: Obj = {}
    // campos de página extras da origem (ex.: productGallery da PLP), sem os que identificam a página
    for (const [k, v] of Object.entries(src)) {
      if (['sections', 'locale_metadata', 'template', 'slug', 'seo', 'siteMap'].includes(k)) continue
      data[k] = v
    }

    if (type === 'landingPage') {
      const srcSeo = isObj(src.seo) ? src.seo : {}
      const titleTemplate =
        typeof srcSeo.titleTemplate === 'string' ? srcSeo.titleTemplate : await this.landingTitleTemplate()
      data.slug = target
      data.siteMap = true
      data.seo = {
        slug: `/${target}`,
        title: (body.seo && body.seo.title && body.seo.title.trim()) || name,
        description: (body.seo && body.seo.description && body.seo.description.trim()) || '',
        titleTemplate,
        canonical: '',
        $componentTitle: 'SEO',
      }
    } else {
      data.template = { value: target, $componentTitle: 'Template' }
      if (isObj(src.seo)) data.seo = src.seo
      else if (type === 'pdp') data.seo = { id: '', mainEntityOfPage: '', $componentTitle: 'SEO' }
    }

    // sections: cópia crua da origem (nativas intactas) ou vazio
    data.sections = isCpArray(src.sections) ? src.sections : { values: {}, $fnType: 'array' }

    const commitBody: Obj = {
      author: this.user,
      contentTypeId: type,
      message: `swtchr: nova página ${name}`,
      data,
      schemaBinding: this.bindingFor(schema.schemaId, source ? source.schemaBinding : undefined),
      entryName: name,
      identifierKeys: (ct && ct.identifierKeys) || [],
      search_keywords: type === 'landingPage' ? [target, `/${target}`] : [target],
    }
    const res = await this.send<Obj | null>(
      'POST',
      this.manage(`/branches/${encodeURIComponent(draft.id)}/commits`),
      commitBody,
      'cp-commit'
    )
    this.lastCommitResponse = res
    const newId = pickEntryId(res)
    if (!newId) throw new CpError(502, 'Commit feito mas o CP não devolveu o id da entrada', JSON.stringify(res).slice(0, 300))

    const saved = await this.lastVersion(type, newId, draft.id)
    if (saved) return toDocument(type, newId, saved, 'draft')
    return toDocument(type, newId, { entryId: newId, contentType: type, branchId: draft.id, data, entryName: name }, 'draft')
  }

  /**
   * DELETE /pages/:type/:id — exclusão pelo rascunho do usuário.
   * Entrada publicada → delete-on-merge (sai da main no merge). Entrada só do rascunho → undo (some já).
   */
  async deletePage(type: PageType, entryId: string): Promise<PublishResult> {
    if (type === 'home' || type === 'globalSections' || type === 'search') {
      throw new CpError(400, `Recusado: ${type} não pode ser excluída`)
    }
    const draft = await this.ensureDraft()
    const { version } = await this.currentVersion(type, entryId, draft)
    if (!version) throw new CpError(404, `Entrada ${type}/${entryId} não encontrada`)
    if ((type === 'pdp' || type === 'plp') && !templateValueOf(version.data)) {
      throw new CpError(400, 'Recusado: esta é a página padrão (sem escopo) — não pode ser excluída')
    }
    const e = encodeURIComponent(entryId)
    const b = encodeURIComponent(draft.id)
    const inMain = await this.lastVersion(type, entryId, 'main')
    if (inMain) {
      // publicada: marca para exclusão; some da loja quando o rascunho for publicado
      await this.send(
        'POST',
        this.manage(`/branches/${b}/entries/${e}/delete-on-merge`),
        { author: this.user, message: 'Marked for delete from main on merge' },
        'cp-delete-on-merge'
      )
    } else {
      // só existe no rascunho (nova): delete-on-merge não se aplica (ENTRY_NOT_PUBLISHED_ON_MAIN);
      // desfaz a entrada na branch (mesmo endpoint "undo" do admin do CMS)
      await this.send('DELETE', this.manage(`/branches/${b}/entries/${e}/undo`), undefined, 'cp-entry-undo')
    }
    return { ok: true }
  }

  /** GET /slug-check — formato, conflito com categoria e com outra landing page. */
  async checkSlug(input: string): Promise<SlugCheck> {
    const slug = String(input ?? '').trim()
    const invalid = (detail: string): SlugCheck => ({ slug, ok: false, conflict: 'invalido', detail })
    if (!slug) return invalid('Slug vazio')
    if (!SLUG_RE.test(slug)) return invalid('Use só a-z, 0-9, "-" e "/" (sem barra no início/fim e sem "//")')
    const segs = slug.split('/')
    if (RESERVED_ROOTS.includes(segs[0])) return invalid(`"/${segs[0]}" é rota reservada da loja`)
    if (segs[segs.length - 1] === 'p') return invalid('Terminar em "/p" colide com página de produto')

    const tree = await this.catalog.getCategoryTree().catch(() => null)
    if (tree) {
      const path = `/${slug}`
      const hit = flattenTree(tree).find((n) => n.path === path)
      if (hit) return { slug, ok: false, conflict: 'categoria', detail: `Mesmo endereço da categoria "${hit.name}"` }
      const dep = tree.find((n) => n.path === `/${segs[0]}`)
      if (dep) return { slug, ok: false, conflict: 'categoria', detail: `Fica dentro do departamento "${dep.name}" (/${segs[0]})` }
    }

    // versões (rascunho senão main): pega também landing criada só no rascunho
    const scoped = await this.listScopedPages('landingPage')
    const dup = scoped.find((p) => p.target === slug)
    if (dup) return { slug, ok: false, conflict: 'pagina', detail: `Já usado por "${dup.name}"` }
    return { slug, ok: true }
  }

  private async categoryPaths(): Promise<Set<string>> {
    return new Set(flattenTree(await this.catalog.getCategoryTree()).map((n: CategoryNode) => n.path))
  }

  /** titleTemplate de uma landing existente (mantém o padrão da loja); fallback "%s". */
  private async landingTitleTemplate(): Promise<string> {
    try {
      const published = await this.listPublishedEntries('landingPage')
      for (const e of published.slice(0, 3)) {
        const v = await this.lastVersion('landingPage', e.id, 'main')
        const seo = v && isObj(v.data.seo) ? v.data.seo : null
        if (seo && typeof seo.titleTemplate === 'string' && seo.titleTemplate) return seo.titleTemplate
      }
    } catch {
      // fallback
    }
    return '%s'
  }

  /** Reaproveita o binding anterior trocando só o schemaId pelo mais recente. */
  private bindingFor(schemaId: string, prev?: SchemaBinding): SchemaBinding {
    if (prev && Array.isArray(prev.dependencies) && prev.dependencies.length) {
      return {
        ...prev,
        schemaId,
        dependencies: prev.dependencies.map((d) =>
          d.parentSchemaId === prev.schemaId ? { ...d, parentSchemaId: schemaId } : d
        ),
        bindingVersion: prev.bindingVersion ?? 1,
      }
    }
    return {
      schemaId,
      dependencies: [
        { parentSchemaId: schemaId, resolvedSchemaId: DEFAULTS.baseSchema, requestedSchemaId: DEFAULTS.requestedBaseSchema },
      ],
      bindingVersion: 1,
    }
  }

  private async searchKeywordsFor(
    type: PageType,
    entryId: string,
    data: Obj,
    current: LastVersion | null
  ): Promise<string[] | undefined> {
    if (type === 'landingPage') {
      const raw = typeof data.slug === 'string' ? data.slug : isObj(data.seo) && typeof data.seo.slug === 'string' ? data.seo.slug : ''
      const slug = raw.replace(/^\/+/, '').trim()
      if (slug) return [slug, `/${slug}`]
    }
    if (type === 'pdp' || type === 'plp') {
      // escopo (template.value) vira keyword: lista/busca no CMS sem ler cada versão
      const tv = templateValueOf(data)
      if (tv) return [tv]
    }
    if (current && Array.isArray(current.searchKeywords) && current.searchKeywords.length) return current.searchKeywords
    if (entryId === 'new') return type === 'home' ? ['/'] : []
    const published = await this.listPublishedEntries(type).catch(() => [] as PublishedEntry[])
    const found = published.find((e) => e.id === entryId)
    return found?.search_keywords ?? []
  }

  // ---------- rascunho ----------
  async getDraft(): Promise<DraftInfo> {
    const draft = await this.findDraft()
    if (!draft) return { branchId: null, branchName: null, changes: [] }
    const entries = await this.listBranchEntries(draft.id).catch(() => [] as BranchEntry[])
    return {
      branchId: draft.id,
      branchName: draft.name,
      changes: entries
        .filter((e) => isPageType(e.contentTypeId))
        .map((e) => ({ type: e.contentTypeId as PageType, id: e.id, name: e.name })),
    }
  }

  /**
   * Merge do rascunho na main (publica). Depois do merge, espelha no catálogo (swtchr_data)
   * o conteúdo das PDPs de produto alteradas — falha no espelho só é reportada em `mirror`.
   */
  async publishDraft(): Promise<PublishResult> {
    const draft = await this.findDraft()
    if (!draft) throw new CpError(409, 'Não há rascunho para publicar')
    const v = await this.get<{ hasValidationErrors?: boolean; invalidEntries?: unknown[] }>(
      this.manage(`/branches/${encodeURIComponent(draft.id)}/validate`),
      'cp-branch-validate'
    )
    if (v && v.hasValidationErrors) {
      throw new CpError(422, 'O rascunho tem entradas inválidas', JSON.stringify(v.invalidEntries ?? []).slice(0, 1000))
    }
    // ANTES do merge: PDPs alteradas no rascunho (+ versão do rascunho e da main, p/ exclusões e troca de alvo)
    const pending = await this.pdpChangesBeforeMerge(draft.id).catch(() => [] as PdpChange[])

    await this.send('POST', this.manage('/merges'), { sourceBranch: draft.id, targetBranch: 'main', author: this.user }, 'cp-merge')
    const mergedAt = new Date().toISOString()
    const result: PublishResult = { ok: true, mergedAt }
    if (pending.length) {
      try {
        const mirror = await this.mirrorPdps(pending, mergedAt)
        if (mirror.length) result.mirror = mirror
      } catch (e) {
        result.mirror = [{ linkText: '*', ok: false, error: errText(e) }]
      }
    }
    return result
  }

  /** PDPs alteradas no rascunho, com a versão do rascunho e a da main (antes do merge). */
  private async pdpChangesBeforeMerge(branchId: string): Promise<PdpChange[]> {
    const entries = (await this.listBranchEntries(branchId)).filter((e) => e.contentTypeId === 'pdp')
    return mapLimit(entries, 5, async (e) => {
      const [draftV, mainV] = await Promise.all([
        this.lastVersion('pdp', e.id, branchId).catch(() => null),
        this.lastVersion('pdp', e.id, 'main').catch(() => null),
      ])
      return { entryId: e.id, name: e.name, draft: draftV, main: mainV }
    })
  }

  /** GET /setup — garante o campo global swtchr_data no catálogo. */
  async setup(): Promise<SetupResult> {
    return { dataField: await this.specs.ensureDataField() }
  }

  /**
   * Grava/limpa o swtchr_data de cada produto afetado pelas PDPs publicadas.
   * - excluída (delete-on-merge) → limpa o produto do alvo antigo
   * - alvo mudou de produto → limpa o antigo
   * - alvo atual "/<linkText>/p" → grava o JSON da versão agora na main
   */
  private async mirrorPdps(changes: PdpChange[], publishedAt: string): Promise<MirrorResult[]> {
    // linkText → conteúdo (null = limpar). Gravação vence limpeza do mesmo produto.
    const plan = new Map<string, ProductDataDocument | null>()
    const setClear = (lt: string) => {
      if (!plan.has(lt)) plan.set(lt, null)
    }
    const after = await mapLimit(changes, 5, async (c) => {
      if (c.draft && c.draft.isDeleteFromMainOnMerge) return { c, now: null as LastVersion | null }
      const now = (await this.lastVersion('pdp', c.entryId, 'main').catch(() => null)) || c.draft
      return { c, now }
    })
    for (const { c, now } of after) {
      const before = linkTextOfTemplate(templateValueOf(c.main ? c.main.data : null))
      if (!now) {
        const lt = before || linkTextOfTemplate(templateValueOf(c.draft ? c.draft.data : null))
        if (lt) setClear(lt)
        continue
      }
      const template = templateValueOf(now.data)
      const lt = linkTextOfTemplate(template)
      if (before && before !== lt) setClear(before)
      if (!lt) continue
      plan.set(lt, this.productDataFor(c.entryId, now, publishedAt, c.name))
    }
    if (!plan.size) return []

    const field = await this.specs.ensureDataField()
    return mapLimit(Array.from(plan.entries()), 3, async ([linkText, doc]) => {
      const row: MirrorResult = { linkText, ok: false }
      try {
        const productId = await this.specs.productIdByLinkText(linkText)
        if (!productId) throw new CpError(404, `Produto não encontrado no catálogo: ${linkText}`)
        row.productId = productId
        const value = doc ? JSON.stringify(doc) : ''
        row.bytes = Buffer.byteLength(value, 'utf8')
        await this.specs.writeProductData(productId, field.id, value)
        if (!doc) row.cleared = true
        if (row.bytes > DATA_WARN_BYTES) row.warning = `JSON com ${Math.round(row.bytes / 1024)}KB (acima de 60KB)`
        row.ok = true
      } catch (e) {
        row.error = errText(e)
      }
      return row
    })
  }

  /** JSON do swtchr_data de uma PDP de produto (formato plano; nativas só key + native). */
  productDataFor(entryId: string, v: LastVersion, publishedAt: string, fallbackName = ''): ProductDataDocument {
    const { sections } = normalizePageData(v.data)
    return {
      swtchr: 1,
      type: 'pdp',
      store: this.store,
      template: templateValueOf(v.data),
      entryId,
      name: v.entryName || fallbackName,
      publishedAt,
      author: this.user,
      sections: portableSections(sections, false),
    }
  }

  // ---------- export ----------
  /** GET /export — todas as páginas do CMS (versão da main), formato plano, + URLs de mídia. */
  async exportAll(): Promise<ExportBundle> {
    const schema = await this.getSchemaSummary()
    const pages: ExportPage[] = []
    for (const type of PAGE_TYPES) {
      const published = await this.listPublishedEntries(type)
      const rows = await mapLimit(published, 5, async (e) => {
        const v = await this.lastVersion(type, e.id, 'main')
        if (!v) return null
        const { fields, sections } = normalizePageData(v.data)
        const page: ExportPage = { type, id: e.id, name: v.entryName || e.name, fields, sections: portableSections(sections, true) }
        if (type === 'landingPage') {
          page.scope = 'page'
          const slug = landingSlugOf(v.data)
          if (slug) page.target = slug
        } else if (type === 'pdp' || type === 'plp') {
          const tv = templateValueOf(v.data)
          page.scope = tv ? (/\/p\/?$/.test(tv) ? 'product' : 'category') : 'default'
          if (tv) page.target = tv
        }
        return page
      })
      rows.forEach((p) => {
        if (p) pages.push(p)
      })
    }
    const media = new Set<string>()
    pages.forEach((p) => collectMedia(p, media))
    return {
      swtchr: 1,
      exportedAt: new Date().toISOString(),
      account: this.account,
      store: this.store,
      schemaId: schema.schemaId,
      pages,
      media: Array.from(media).sort(),
    }
  }

  async discardDraft(): Promise<PublishResult> {
    const draft = await this.findDraft()
    if (!draft) return { ok: true }
    if (!draft.name.startsWith(DRAFT_PREFIX)) throw new CpError(400, 'Recusado: branch fora do padrão swtchr')
    await this.deleteBranch(draft.id)
    return { ok: true }
  }

  // ---------- mídia ----------
  /**
   * Sobe arquivo no file manager (mesmo proxy que o admin do CMS usa) → URL pública.
   * Obs.: vtexassets NÃO redimensiona WebP (serve no tamanho original); prefira JPG/PNG
   * para fotos grandes se o front depender de resize por querystring.
   */
  async upload(file: Buffer, mime: string, filename: string): Promise<UploadResult> {
    if (!file.length) throw new CpError(400, 'Arquivo vazio')
    if (file.length > DEFAULTS.uploadMaxBytes) throw new CpError(413, 'Arquivo maior que 20MB')
    const text = await this.t.request<string>({
      host: 'upload',
      method: 'PUT',
      path: '/api/proxy/file-manager',
      body: file,
      responseType: 'text',
      metric: 'cp-upload',
      retry: false,
      headers: {
        'Content-Type': mime,
        'Content-Encoding': '7bit',
        Authorization: this.token, // sem "Bearer" neste endpoint
        account: this.account,
        workspace: 'master',
        filename,
      },
    })
    const url = extractUrl(text)
    if (!url) throw new CpError(502, 'Upload sem URL na resposta', String(text).slice(0, 300))
    return { url }
  }

  // ---------- preview ----------
  /**
   * URL de preview. `path` (opcional) abre uma página específica — ex: um produto (/link-sku/p)
   * na PDP ou uma categoria (/dep/cat) na PLP. A FastStore redireciona o /api/preview pro `slug`
   * quando o contentType é pdp/plp/landingPage.
   */
  async getPreviewUrl(type: PageType, entryId: string, path?: string): Promise<PreviewUrl> {
    const [store, draft] = await Promise.all([this.getStoreInfo(), this.findDraft()])
    const safePath = path && /^\/[A-Za-z0-9\-._~/%]*$/.test(path) && !path.startsWith('//') ? path : undefined
    if (draft && entryId && entryId !== 'new') {
      let q = `contentType=${encodeURIComponent(type)}&documentId=${encodeURIComponent(entryId)}&versionId=${encodeURIComponent(draft.id)}`
      if (safePath && (type === 'pdp' || type === 'plp' || type === 'landingPage')) q += `&slug=${encodeURIComponent(safePath)}`
      return { url: `${store.previewUrl}${store.previewUrl.includes('?') ? '&' : '?'}${q}` }
    }
    let target = safePath ?? '/'
    if (!safePath && type === 'landingPage' && entryId && entryId !== 'new') {
      const v = await this.lastVersion(type, entryId, 'main').catch(() => null)
      const slug = v && typeof v.data.slug === 'string' ? v.data.slug.replace(/^\/+/, '') : ''
      if (slug) target = `/${slug}`
    }
    return { url: `${store.storeUrl}${target}` }
  }
}


// ---------- portabilidade ----------
interface PdpChange {
  entryId: string
  name: string
  /** versão no rascunho antes do merge */
  draft: LastVersion | null
  /** versão na main antes do merge (null = entrada nova) */
  main: LastVersion | null
}

/** "/kit-moletom/p" → "kit-moletom"; qualquer outra coisa → ''. */
export function linkTextOfTemplate(template: string): string {
  const m = /^\/?([^/\s]+)\/p\/?$/.exec(String(template || '').trim())
  return m ? m[1] : ''
}

/** Formato plano portátil. Nativas: só key + native (withNativeData = true mantém o data). */
function portableSections(sections: PageSection[], withNativeData: boolean): PortableSection[] {
  return sections.map((s) => (s.native && !withNativeData ? { key: s.key, native: true } : { key: s.key, native: s.native, data: s.data }))
}

const MEDIA_EXT_RE = /\.(png|jpe?g|gif|svg|webp|avif|mp4|webm|mov|woff2?|ttf|otf|pdf)(\?|#|$)/i
const MEDIA_HOST_RE = /(vtexassets\.com|vteximg\.com\.br|\/arquivos\/|file-manager|\/assets\/)/i

/** Junta URLs http(s) de mídia de qualquer string dentro do valor (recursivo). */
function collectMedia(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    const re = /https?:\/\/[^\s"'<>()]+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(value))) {
      const url = m[0].replace(/[.,;]+$/, '')
      if (MEDIA_EXT_RE.test(url) || MEDIA_HOST_RE.test(url)) out.add(url)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v) => collectMedia(v, out))
    return
  }
  if (isObj(value)) Object.keys(value).forEach((k) => collectMedia(value[k], out))
}

function errText(e: unknown): string {
  if (e instanceof CpError) return e.detail ? `${e.message} — ${e.detail.slice(0, 200)}` : e.message
  return e instanceof Error ? e.message : String(e)
}

// ---------- v0.2 helpers ----------
const SLUG_RE = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/
const CATEGORY_RE = /^(\/[a-z0-9-]+)+$/
const PDP_PRODUCT_RE = /^\/[^/\s]+\/p$/
const RESERVED_ROOTS = ['api', 's', 'p', 'account', 'login', 'logout', 'checkout', 'cart', 'pvt', '_v', '404', '500']

/** template.value normalizado ou '' (padrão). */
function templateValueOf(data: unknown): string {
  const d = isObj(data) ? data : {}
  const t = d.template
  if (isObj(t) && typeof t.value === 'string') return t.value.trim()
  return ''
}

function landingSlugOf(data: unknown): string {
  const d = isObj(data) ? data : {}
  if (typeof d.slug === 'string' && d.slug.trim()) return d.slug.trim().replace(/^\/+/, '')
  if (isObj(d.seo) && typeof d.seo.slug === 'string') return d.seo.slug.trim().replace(/^\/+/, '')
  return ''
}

/** "/Vestuario//Casacos/ " → "/vestuario/casacos"; "/x/p/" → "/x/p". */
function normalizeTarget(v: string): string {
  let t = v.trim().toLowerCase().replace(/\s+/g, '').replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (t && !t.startsWith('/')) t = `/${t}`
  return t
}

/** map com concorrência limitada, preservando a ordem. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

// ---------- helpers ----------
function slugOf(keywords?: string[] | null): string | undefined {
  if (!keywords || !keywords.length) return undefined
  return keywords.find((k) => k.startsWith('/')) ?? keywords[0]
}

function defaultName(type: PageType): string {
  return type === 'landingPage' ? 'Nova página' : type
}

function pickEntryId(res: unknown): string | undefined {
  if (!isObj(res)) return undefined
  // resposta do commit: { id: <commitId>, entryId, branchId, hash, ... } — "id" é do commit, não da entrada
  if (typeof res.entryId === 'string') return res.entryId
  for (const k of ['entry', 'data', 'commit']) {
    const inner = res[k]
    if (isObj(inner)) {
      const id = pickEntryId(inner)
      if (id) return id
    }
  }
  return undefined
}

function extractUrl(text: unknown): string | undefined {
  if (typeof text !== 'string') {
    if (isObj(text)) {
      for (const k of ['url', 'fileUrl', 'location']) if (typeof text[k] === 'string') return text[k] as string
    }
    return undefined
  }
  const t = text.trim().replace(/^"|"$/g, '')
  if (/^https?:\/\//.test(t)) return t
  try {
    return extractUrl(JSON.parse(text))
  } catch {
    const m = /https?:\/\/[^\s"']+/.exec(text)
    return m ? m[0] : undefined
  }
}

function toDocument(type: PageType, entryId: string, v: LastVersion, source: 'draft' | 'main'): PageDocument {
  const { fields, sections } = normalizePageData(v.data)
  return { id: entryId, type, name: v.entryName ?? '', fields, sections, source }
}
