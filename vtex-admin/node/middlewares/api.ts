/**
 * /_v/swtchr/api/*path — mini-router do painel swtchr.
 * Contrato: react/app/api/types.ts (espelhado em node/cp/types.ts).
 *
 * Auth: exige o token do admin (ctx.vtex.adminUserAuthToken; fallback cookie VtexIdclientAutCookie).
 * Sem token → 401. Todo acesso ao CP usa o token do próprio usuário (o CP valida permissão).
 * O token nunca é logado nem devolvido.
 */

import { json } from 'co-body'

import { ioTransport } from '../clients/cp'
import { decodeToken, isExpired } from '../cp/auth'
import { isPageType } from '../cp/schema'
import { ContentPlatform, DEFAULTS } from '../cp/service'
import { CpError } from '../cp/transport'
import type { ApiError, CreatePageBody, PageType, SavePageBody } from '../cp/types'

type Handler = (cp: ContentPlatform, ctx: Context, params: string[]) => Promise<unknown>

interface Route {
  method: string
  /** segmentos; ":x" = parâmetro */
  pattern: string[]
  handler: Handler
}

const ALLOWED_UPLOAD = /^(image\/(png|jpe?g|gif|svg\+xml|webp|avif)|video\/(mp4|webm)|font\/(woff2?|ttf|otf)|application\/(font-woff2?|x-font-ttf|x-font-otf))$/i

const r = (method: string, path: string, handler: Handler): Route => ({
  method,
  pattern: path.split('/').filter(Boolean),
  handler,
})

function requirePageType(value: string | undefined) {
  if (!isPageType(value)) throw new CpError(400, `type inválido: ${value ?? '(vazio)'}`)
  return value
}

const SCOPED_TYPES: PageType[] = ['pdp', 'plp', 'search', 'landingPage']

function requireScopedType(value: string | undefined): PageType {
  const t = requirePageType(value)
  if (!SCOPED_TYPES.includes(t)) throw new CpError(400, `type sem escopo: ${t}`, 'Use pdp, plp, search ou landingPage.')
  return t
}

function queryParam(ctx: Context, name: string): string | undefined {
  const v = ctx.query[name]
  return Array.isArray(v) ? v[0] : v
}

const routes: Route[] = [
  r('GET', 'session', (cp) => cp.getSession()),
  r('GET', 'schema', (cp) => cp.getSchema()),
  r('GET', 'pages', (cp, ctx) => cp.listPages(requirePageType(queryParam(ctx, 'type')))),
  r('GET', 'pages/:type/:id', (cp, _ctx, [type, id]) => cp.getPage(requirePageType(type), id)),
  r('PUT', 'pages/:type/:id', async (cp, ctx, [type, id]) => {
    const body = (await json(ctx.req, { limit: '5mb' })) as SavePageBody
    return cp.savePage(requirePageType(type), id, body)
  }),
  r('POST', 'pages/:type', async (cp, ctx, [type]) => {
    const body = (await json(ctx.req, { limit: '1mb' })) as CreatePageBody
    return cp.createPage(requirePageType(type), body)
  }),
  r('DELETE', 'pages/:type/:id', (cp, _ctx, [type, id]) => cp.deletePage(requirePageType(type), id)),
  // v0.2 — escopo de PDP/PLP (catálogo) e institucionais
  r('GET', 'catalog/categories', (cp) => cp.catalog.getCategoryTree()),
  r('GET', 'catalog/products', (cp, ctx) => cp.catalog.searchProducts(queryParam(ctx, 'q'))),
  r('GET', 'scoped-pages', (cp, ctx) => cp.listScopedPages(requireScopedType(queryParam(ctx, 'type')))),
  r('GET', 'slug-check', (cp, ctx) => cp.checkSlug(queryParam(ctx, 'slug') ?? '')),
  r('GET', 'draft', (cp) => cp.getDraft()),
  r('DELETE', 'draft', (cp) => cp.discardDraft()),
  r('POST', 'draft/publish', (cp) => cp.publishDraft()),
  r('POST', 'upload', async (cp, ctx) => {
    const mime = String(ctx.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_UPLOAD.test(mime)) {
      throw new CpError(415, `Tipo de arquivo não suportado: ${mime || '(vazio)'}`, 'Aceitos: png, jpg, gif, svg, webp, avif, mp4, webm, woff2, woff, ttf, otf')
    }
    const file = await readRaw(ctx, DEFAULTS.uploadMaxBytes)
    return cp.upload(file, mime, safeFilename(ctx.get('x-filename'), mime))
  }),
  r('GET', 'preview-url', (cp, ctx) =>
    cp.getPreviewUrl(requirePageType(queryParam(ctx, 'type')), queryParam(ctx, 'id') ?? '', queryParam(ctx, 'path'))
  ),
  r('GET', 'status', (cp) => cp.getStatus()),
  // portabilidade: campo global swtchr_data (catálogo) e export completo do CMS
  r('GET', 'setup', (cp) => cp.setup()),
  r('GET', 'export', (cp) => cp.exportAll()),
]

function match(method: string, segments: string[]): { route?: Route; params: string[]; methodMismatch: boolean } {
  let methodMismatch = false
  for (const route of routes) {
    if (route.pattern.length !== segments.length) continue
    const params: string[] = []
    const ok = route.pattern.every((p, i) => {
      if (p.startsWith(':')) {
        params.push(decodeURIComponent(segments[i]))
        return true
      }
      return p === segments[i]
    })
    if (!ok) continue
    if (route.method !== method) {
      methodMismatch = true
      continue
    }
    return { route, params, methodMismatch: false }
  }
  return { params: [], methodMismatch }
}

function readRaw(ctx: Context, limit: number): Promise<Buffer> {
  const declared = Number(ctx.get('content-length') || 0)
  if (declared > limit) return Promise.reject(new CpError(413, 'Arquivo maior que 20MB'))
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    ctx.req.on('data', (chunk: Buffer) => {
      if (done) return
      size += chunk.length
      if (size > limit) {
        done = true
        reject(new CpError(413, 'Arquivo maior que 20MB'))
        ctx.req.resume()
        return
      }
      chunks.push(chunk)
    })
    ctx.req.on('end', () => {
      if (done) return
      done = true
      resolve(Buffer.concat(chunks))
    })
    ctx.req.on('error', (e: Error) => {
      if (done) return
      done = true
      reject(e)
    })
  })
}

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'font/ttf': 'ttf',
  'font/otf': 'otf',
  'application/font-woff2': 'woff2',
  'application/font-woff': 'woff',
  'application/x-font-ttf': 'ttf',
  'application/x-font-otf': 'otf',
}

function safeFilename(header: string, mime: string): string {
  let name = header || ''
  try {
    name = decodeURIComponent(name)
  } catch {
    // mantém cru
  }
  name = name
    .split(/[\\/]/)
    .pop()!
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 100)
  const ext = EXT[mime] ?? 'bin'
  if (!name) name = `swtchr-${Date.now()}.${ext}`
  if (!/\.[a-z0-9]{2,5}$/i.test(name)) name = `${name}.${ext}`
  return name
}

function sendError(ctx: Context, status: number, error: string, detail?: string) {
  const body: ApiError = { error }
  if (detail) body.detail = detail
  ctx.status = status
  ctx.body = body
}

export async function api(ctx: Context) {
  ctx.set('Cache-Control', 'no-store')

  const raw = ctx.vtex.route.params.path
  const path = Array.isArray(raw) ? raw.join('/') : String(raw ?? '')
  const segments = path.split('?')[0].split('/').filter(Boolean)
  const method = ctx.method.toUpperCase()

  const { route, params, methodMismatch } = match(method, segments)
  if (!route) {
    if (methodMismatch) return sendError(ctx, 405, `Método ${method} não permitido em /${segments.join('/')}`)
    return sendError(ctx, 404, `Rota não encontrada: /${segments.join('/')}`)
  }

  const token = ctx.vtex.adminUserAuthToken || ctx.cookies.get('VtexIdclientAutCookie')
  if (!token) return sendError(ctx, 401, 'Não autenticado', 'Abra o painel pelo admin da VTEX.')
  const user = decodeToken(token)
  if (!user) return sendError(ctx, 401, 'Token inválido')
  if (isExpired(user)) return sendError(ctx, 401, 'Sessão expirada', 'Faça login novamente no admin.')
  if (user.account && user.account !== ctx.vtex.account) {
    return sendError(ctx, 403, 'Token de outra conta')
  }

  const cp = new ContentPlatform({
    transport: ioTransport(ctx.clients),
    account: ctx.vtex.account,
    workspace: ctx.vtex.workspace,
    token,
    user: user.email,
  })

  try {
    const result = await route.handler(cp, ctx, params)
    ctx.status = 200
    ctx.body = result
  } catch (e) {
    if (e instanceof CpError) {
      // 4xx do CP repassa; 5xx vira 502 (falha a jusante)
      const status = e.status >= 400 && e.status < 500 ? e.status : e.status === 504 ? 504 : 502
      ctx.vtex.logger.warn({ message: 'swtchr api: erro do CP', route: `${method} /${segments.join('/')}`, status: e.status, error: e.message })
      return sendError(ctx, status, e.message, e.detail)
    }
    const err = e as { status?: number; statusCode?: number; message?: string; type?: string }
    const status = err.status || err.statusCode
    if (status && status >= 400 && status < 500) {
      // erros do co-body (JSON inválido, payload grande)
      return sendError(ctx, status, err.message || 'Requisição inválida')
    }
    ctx.vtex.logger.error({ message: 'swtchr api: erro interno', route: `${method} /${segments.join('/')}`, error: err.message })
    return sendError(ctx, 500, 'Erro interno', err.message)
  }
}
