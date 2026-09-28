/**
 * Cliente tipado das rotas do backend (/_v/swtchr/api/*).
 * Contrato em ./types.ts. Mesma origem: o cookie do admin vai junto (credentials 'same-origin').
 * TS 3.9: sem template literal types / satisfies.
 */

import {
  ApiError as ApiErrorBody,
  CategoryNode,
  CreatePageBody,
  DraftInfo,
  ExportBundle,
  PageDocument,
  PageSummary,
  PageType,
  PreviewUrl,
  ProductHit,
  PublishResult,
  SavePageBody,
  SchemaResponse,
  ScopedPagesResponse,
  Session,
  SetupResult,
  SlugCheck,
  StoreStatus,
  UploadResult,
} from './types'

const BASE = '/_v/swtchr/api'

/** Erro de chamada da API (status HTTP + corpo { error, detail }). */
export class ApiError extends Error {
  status: number
  detail?: string

  constructor(status: number, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    // mantém instanceof mesmo com transpilação ES5
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /** sessão ausente/expirada */
  get isAuth() {
    return this.status === 401
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  json?: unknown
  body?: Blob | ArrayBuffer
  headers?: Record<string, string>
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined

  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  } else if (opts.body !== undefined) {
    body = opts.body
  }
  if (opts.headers) {
    Object.keys(opts.headers).forEach((k) => {
      headers[k] = (opts.headers as Record<string, string>)[k]
    })
  }

  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers,
      body,
    })
  } catch (e) {
    throw new ApiError(0, 'Sem conexão com o servidor', e instanceof Error ? e.message : String(e))
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = text
    }
  }

  if (!res.ok) {
    const err = (data && typeof data === 'object' ? data : {}) as Partial<ApiErrorBody>
    throw new ApiError(
      res.status,
      err.error || (typeof data === 'string' && data) || res.statusText || 'Erro ' + res.status,
      err.detail
    )
  }

  return data as T
}

const q = (params: Record<string, string>) =>
  Object.keys(params)
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')

const seg = (s: string) => encodeURIComponent(s)

// ---------- rotas ----------

export function getSession() {
  return request<Session>('/session')
}

export function getSchema() {
  return request<SchemaResponse>('/schema')
}

export function listPages(type: PageType) {
  return request<PageSummary[]>('/pages?' + q({ type }))
}

/** Lê do rascunho do usuário se existir, senão da main. id 'new' → documento vazio. */
export function getPage(type: PageType, id: string) {
  return request<PageDocument>('/pages/' + seg(type) + '/' + seg(id))
}

/**
 * Salva no rascunho do usuário (cria a branch no primeiro save). Devolve a página relida.
 * id 'new' cria uma entrada nova (ex.: landingPage) — use o `id` devolvido dali em diante.
 */
export function savePage(type: PageType, id: string, body: SavePageBody) {
  return request<PageDocument>('/pages/' + seg(type) + '/' + seg(id), { method: 'PUT', json: body })
}

export function getDraft() {
  return request<DraftInfo>('/draft')
}

/** Merge do rascunho na main (publica na loja). */
export function publishDraft() {
  return request<PublishResult>('/draft/publish', { method: 'POST' })
}

/** Apaga a branch de rascunho do usuário. */
export function discardDraft() {
  return request<PublishResult>('/draft', { method: 'DELETE' })
}

/**
 * Sobe imagem/vídeo (≤ 20MB; png, jpg, gif, svg, webp, avif, mp4, webm) → URL pública.
 * Obs.: vtexassets NÃO redimensiona WebP — para fotos grandes prefira JPG/PNG.
 */
export function upload(file: File | Blob, filename?: string) {
  const name = filename || (file as File).name || 'upload'
  return request<UploadResult>('/upload', {
    method: 'POST',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'x-filename': encodeURIComponent(name),
    },
  })
}

/** URL da loja com o preview do rascunho ligado (ou a página publicada, se não houver rascunho). */
/** `path` opcional: abre um produto/categoria/página específica no preview (ex: "/moletom-x-22/p"). */
export function getPreviewUrl(type: PageType, id: string, path?: string) {
  return request<PreviewUrl>('/preview-url?' + q(path ? { type, id, path } : { type, id }))
}

export function getStatus() {
  return request<StoreStatus>('/status')
}

// ---------- v0.2: escopo (PDP/PLP), catálogo e institucionais ----------

/** Árvore de categorias da loja (cache de 5 min no node). */
export function getCategories() {
  return request<CategoryNode[]>('/catalog/categories')
}

/** Busca no catálogo (máx 20). q vazio → primeiros produtos. */
export function searchProducts(query: string) {
  return request<ProductHit[]>('/catalog/products?' + q({ q: query }))
}

/** Entradas do tipo com escopo (default | product | category | page) e alvo. */
export function listScopedPages(type: PageType) {
  return request<ScopedPagesResponse>('/scoped-pages?' + q({ type }))
}

/**
 * Cria entrada nova (pdp/plp/landingPage) no rascunho do usuário. Devolve a página criada (id real).
 * pdp/plp: target = "/<linkText>/p" ou caminho de categoria. landingPage: target = slug sem barra inicial.
 */
export function createPage(type: PageType, body: CreatePageBody) {
  return request<PageDocument>('/pages/' + seg(type), { method: 'POST', json: body })
}

/** Marca a entrada para exclusão no merge (só some da loja ao publicar o rascunho). */
export function deletePage(type: PageType, id: string) {
  return request<PublishResult>('/pages/' + seg(type) + '/' + seg(id), { method: 'DELETE' })
}

/** Confere se o slug de uma landing page está livre (formato, categoria, outra página). */
export function checkSlug(slug: string) {
  return request<SlugCheck>('/slug-check?' + q({ slug }))
}

// ---------- portabilidade: swtchr_data (catálogo) e export ----------

/** Garante o campo global "swtchr_data" no catálogo (cria na 1ª vez). Precisa de permissão no catálogo. */
export function getSetup() {
  return request<SetupResult>('/setup')
}

/** Todas as páginas do CMS (versão publicada), formato plano + URLs de mídia. */
export function exportAll() {
  return request<ExportBundle>('/export')
}
