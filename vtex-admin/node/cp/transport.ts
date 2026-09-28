/**
 * Transporte HTTP abstrato do Content Platform.
 * No IO: implementado com ExternalClient (node/clients/cp.ts).
 * Fora do IO (scripts/smoke.ts): implementado com fetch.
 * Assim a lógica de node/cp/ roda igual nos dois lugares.
 */

/** Qual host do CP. */
export type CpHost =
  | 'manage' // https://api.vtexcommercestable.com.br
  | 'data' // https://{account}.vtexcommercestable.com.br (leitura pública)
  | 'upload' // https://content-platform-ui.vercel.admin.vtex.com (file manager)

export type CpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface CpRequest {
  host: CpHost
  method: CpMethod
  /** caminho absoluto no host, com query já montada */
  path: string
  headers?: Record<string, string>
  /** JSON (objeto) ou binário (Buffer) */
  body?: unknown
  /** 'json' (padrão) ou 'text' */
  responseType?: 'json' | 'text'
  /** rótulo p/ métricas */
  metric?: string
  /** false = não repetir (POST não idempotente) */
  retry?: boolean
}

export interface CpTransport {
  request<T = unknown>(req: CpRequest): Promise<T>
}

/** Erro normalizado vindo do CP (status HTTP + mensagem). */
export class CpError extends Error {
  public status: number
  public detail?: string
  public code?: string

  constructor(status: number, message: string, detail?: string, code?: string) {
    super(message)
    this.name = 'CpError'
    this.status = status
    this.detail = detail
    this.code = code
  }
}

/** Extrai {code,message} do corpo de erro do CP ({"error":{"code","message"}}). */
export function cpErrorFrom(status: number, body: unknown, fallback: string): CpError {
  let message = fallback
  let code: string | undefined
  let detail: string | undefined

  if (typeof body === 'string') {
    detail = body.slice(0, 600)
    try {
      body = JSON.parse(body)
    } catch {
      // texto puro
    }
  }

  if (body && typeof body === 'object') {
    const err = (body as { error?: unknown }).error
    if (err && typeof err === 'object') {
      const e = err as { code?: string; message?: string }
      code = e.code
      if (e.message) message = e.message
    } else if (typeof err === 'string') {
      message = err
    } else if (typeof (body as { message?: unknown }).message === 'string') {
      message = (body as { message: string }).message
    }
    if (!detail) detail = JSON.stringify(body).slice(0, 600)
  }

  return new CpError(status, message, detail, code)
}
