/**
 * Cópia do contrato front ↔ back (react/app/api/types.ts — FONTE DA VERDADE).
 * Os builders node e react não compartilham código: ao mudar lá, espelhe aqui.
 */

export type PageType = 'home' | 'plp' | 'pdp' | 'search' | 'landingPage' | 'globalSections'

/** GET /api/session */
export interface Session {
  account: string
  workspace: string
  /** e-mail do usuário do admin (vira o author dos commits) */
  user: string
  /** store do Content Platform (ex: "swtchr") */
  store: string
  /** schema usado nos commits (ex: "dupagencypartnerbr.swtchr@1.1.0") */
  schemaId: string
  /** URL pública da loja (ex: https://dupagencypartnerbr.vtex.app) */
  storeUrl: string
}

/** JSON Schema simplificado de um campo (subset do que o CMS usa). */
export interface FieldSchema {
  title?: string
  description?: string
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array'
  default?: unknown
  enum?: Array<string | number>
  enumNames?: string[]
  minimum?: number
  maximum?: number
  properties?: Record<string, FieldSchema>
  items?: FieldSchema
  required?: string[]
  widget?: { 'ui:widget'?: string; restrictMediaTypes?: unknown }
}

/** Uma section disponível na paleta (vem do schema do CMS). */
export interface ComponentDef {
  key: string // $componentKey, ex: "SwtchrHero"
  title: string // $componentTitle, ex: "swtchr · Hero"
  description?: string
  schema: FieldSchema // type: object, com properties
  /** true = section swtchr (editável no painel); false = nativa da FastStore */
  swtchr: boolean
}

/** GET /api/schema */
export interface SchemaResponse {
  schemaId: string
  components: ComponentDef[]
}

/** GET /api/pages?type=home */
export interface PageSummary {
  id: string
  type: PageType
  name: string
  /** slug/keywords (landingPage, pdp/plp específicos) */
  slug?: string
  updatedAt?: string
}

/** Section dentro de uma página, já normalizada (arrays planos, sem $fnType/$position). */
export interface PageSection {
  /** id estável no painel (vem do id do CMS; seções novas: gerado no front) */
  uid: string
  key: string // $componentKey
  title?: string // $componentTitle
  /** true = nativa (CartSidebar, Children, ProductGallery...) → travada no painel */
  native: boolean
  data: Record<string, unknown>
}

/** GET /api/pages/:type/:id  (lê do rascunho do usuário se existir, senão da main) */
export interface PageDocument {
  id: string
  type: PageType
  name: string
  /** campos da página fora de sections (seo, slug, template...) — plano */
  fields: Record<string, unknown>
  sections: PageSection[]
  /** de onde veio: 'draft' (branch do usuário) ou 'main' */
  source: 'draft' | 'main'
}

/**
 * PUT /api/pages/:type/:id  body → responde PageDocument (relido do rascunho).
 * id 'new' cria entrada nova (ex.: landingPage); o id real vem na resposta.
 */
export interface SavePageBody {
  name?: string
  fields: Record<string, unknown>
  sections: PageSection[]
}

/** GET /api/draft */
export interface DraftInfo {
  /** null = usuário não tem rascunho aberto */
  branchId: string | null
  branchName: string | null
  /** entradas alteradas no rascunho (quando o CMS informar) */
  changes: Array<{ type: PageType; id: string; name: string }>
}

/** POST /api/draft/publish → merge do rascunho na main. DELETE /api/draft → descarta. */
export interface PublishResult {
  ok: boolean
  mergedAt?: string
  /**
   * Espelho no catálogo (só no POST /draft/publish): uma linha por PDP de produto publicada.
   * Falha aqui NÃO desfaz a publicação — só é reportada.
   */
  mirror?: MirrorResult[]
}

/** Resultado do espelho de uma PDP de produto no campo "swtchr_data" do catálogo. */
export interface MirrorResult {
  productId?: string
  linkText: string
  ok: boolean
  error?: string
  /** tamanho do JSON gravado (UTF-8) */
  bytes?: number
  /** true = valor limpo (entrada excluída ou saiu do produto) */
  cleared?: boolean
  /** aviso não fatal (ex.: JSON acima de 60KB) */
  warning?: string
}

/** POST /api/upload (body = arquivo binário; headers: Content-Type + x-filename) */
export interface UploadResult {
  url: string
}

/** GET /api/preview-url?type=home&id=... */
export interface PreviewUrl {
  /** URL da loja que liga o preview do rascunho (ou a página publicada, se não houver rascunho) */
  url: string
}

/** GET /api/status */
export interface StoreStatus {
  /** status de build/publicação reportado pelo CMS (texto livre) */
  status: string
}

export interface ApiError {
  error: string
  detail?: string
}

// ============================================================================
// v0.2 — PDP, Categorias (PLP/busca) e Institucional
// ============================================================================

/** GET /api/catalog/categories → árvore de categorias da loja */
export interface CategoryNode {
  id: number
  name: string
  /** caminho normalizado da PLP, ex: "/vestuario/casacos-e-jaquetas" */
  path: string
  children: CategoryNode[]
}

/** GET /api/catalog/products?q=termo → busca no catálogo (máx 20) */
export interface ProductHit {
  id: string
  name: string
  /** linkText do produto, ex: "moletom-com-capuz-dup-agency-cinza" */
  linkText: string
  /** template de PDP por produto (todas as SKUs): "/<linkText>/p" */
  pdpTemplate: string
  /** URL de uma SKU pra preview, ex: "/moletom-...-22/p" */
  url: string
  image?: string
  /** caminho da categoria mais específica, ex: "/vestuario/casacos-e-jaquetas" */
  categoryPath?: string
}

/**
 * Resumo de entrada com o "escopo" que ela cobre.
 * pdp: template.value vazio = padrão; "/link/p" = produto; "/dep/cat" = categoria.
 * plp: template.value vazio = padrão; "/dep/cat" = categoria.
 * landingPage: slug.
 */
export interface ScopedPageSummary extends PageSummary {
  scope: 'default' | 'product' | 'category' | 'page'
  /** template.value (pdp/plp) ou slug (landingPage) */
  target?: string
}

/** GET /api/scoped-pages?type=pdp|plp|landingPage */
export type ScopedPagesResponse = ScopedPageSummary[]

/**
 * POST /api/pages/:type  → cria entrada nova no rascunho do usuário.
 * pdp/plp: `target` vira template.value (e seções iniciais copiadas do padrão, se copyFrom).
 * landingPage: `target` = slug (sem barra inicial; pode ter "/" interna), + seo.
 */
export interface CreatePageBody {
  name: string
  target?: string
  /** id de uma entrada existente do mesmo tipo pra copiar as sections (ex: o padrão) */
  copyFrom?: string
  seo?: { title?: string; description?: string }
}

/** DELETE /api/pages/:type/:id → marca para exclusão no merge (delete-on-merge) no rascunho */

/** GET /api/slug-check?slug=institucional/trocas → conflitos com categorias/páginas existentes */
export interface SlugCheck {
  slug: string
  ok: boolean
  /** motivo quando não ok: "categoria" | "pagina" | "invalido" */
  conflict?: 'categoria' | 'pagina' | 'invalido'
  detail?: string
}

// ============================================================================
// Portabilidade: swtchr_data (catálogo) e export
// ============================================================================

/** GET /api/setup → garante o campo global "swtchr_data" (cria na 1ª vez). */
export interface SetupResult {
  dataField: { id: number; created: boolean }
}

/** Seção no export/espelho: formato plano (nativas só com key + native, sem data). */
export interface PortableSection {
  key: string
  native: boolean
  data?: Record<string, unknown>
}

/** JSON gravado no swtchr_data de um produto (PDP com escopo de produto). */
export interface ProductDataDocument {
  swtchr: 1
  type: 'pdp'
  store: string
  template: string
  entryId: string
  name: string
  publishedAt: string
  author: string
  sections: PortableSection[]
}

/** Uma página no export (versão da main). */
export interface ExportPage {
  type: PageType
  id: string
  name: string
  scope?: 'default' | 'product' | 'category' | 'page'
  target?: string
  fields: Record<string, unknown>
  sections: PortableSection[]
}

/** GET /api/export → todas as páginas do CMS (main) + URLs de mídia. */
export interface ExportBundle {
  swtchr: 1
  exportedAt: string
  account: string
  store: string
  schemaId: string
  pages: ExportPage[]
  /** URLs http(s) de mídia encontradas nos dados (únicas) */
  media: string[]
}
