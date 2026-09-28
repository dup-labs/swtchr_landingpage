import type { InstanceOptions, IOContext, RequestConfig } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import { CpHost, CpRequest, CpTransport, cpErrorFrom, CpError } from '../cp/transport'

/**
 * Um ExternalClient por host do CP (outbound-access declarado no manifest).
 * Padrão IO: http:// + X-Vtex-Use-Https (o proxy de saída faz o TLS).
 */
abstract class CpHostClient extends ExternalClient {
  public call<T>(req: CpRequest): Promise<T> {
    const config: RequestConfig = {
      headers: { ...(req.headers ?? {}) },
      metric: req.metric ?? 'cp',
      responseType: req.responseType === 'text' ? 'text' : 'json',
      // POST/PUT não idempotentes: sem retry (evita commit/merge duplicado)
      ...(req.retry === false ? { retries: 0 } : {}),
      ...(Buffer.isBuffer(req.body) ? { maxBodyLength: Infinity, maxContentLength: Infinity } : {}),
    }
    const url = req.path
    let pending: Promise<{ data: unknown }>
    switch (req.method) {
      case 'GET':
        pending = this.http.getRaw(url, config)
        break
      case 'POST':
        pending = this.http.postRaw(url, req.body, config)
        break
      case 'PUT':
        pending = this.http.putRaw(url, req.body, config)
        break
      case 'DELETE':
        pending = this.http.delete(url, { ...config, data: req.body })
        break
      default:
        return Promise.reject(new CpError(500, `Método não suportado: ${req.method}`))
    }
    return pending.then(
      (res) => res.data as T,
      (err: unknown) => {
        throw toCpError(err, `${req.method} ${req.host}${req.path.split('?')[0]}`)
      }
    )
  }
}

function toCpError(err: unknown, where: string): CpError {
  const e = err as { response?: { status?: number; data?: unknown }; message?: string; code?: string }
  if (e && e.response && typeof e.response.status === 'number') {
    return cpErrorFrom(e.response.status, e.response.data, `CP ${e.response.status} em ${where}`)
  }
  const timeout = e && (e.code === 'ECONNABORTED' || /timeout/i.test(String(e.message)))
  return new CpError(timeout ? 504 : 502, `Falha ao falar com o CP (${where})`, e && e.message ? e.message : undefined)
}

const useHttps = (options?: InstanceOptions): InstanceOptions => ({
  ...options,
  headers: { ...(options && options.headers), 'X-Vtex-Use-Https': 'true' },
})

export class CpManageClient extends CpHostClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('http://api.vtexcommercestable.com.br', context, useHttps(options))
  }
}

export class CpDataClient extends CpHostClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://${context.account}.vtexcommercestable.com.br`, context, useHttps(options))
  }
}

export class CpUploadClient extends CpHostClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('http://content-platform-ui.vercel.admin.vtex.com', context, useHttps({ ...options, timeout: 60000 }))
  }
}

/** Transporte do CP usando os clients IO. */
export function ioTransport(clients: { cpManage: CpManageClient; cpData: CpDataClient; cpUpload: CpUploadClient }): CpTransport {
  const byHost: Record<CpHost, CpHostClient> = {
    manage: clients.cpManage,
    data: clients.cpData,
    upload: clients.cpUpload,
  }
  return {
    request: <T>(req: CpRequest) => byHost[req.host].call<T>(req),
  }
}
