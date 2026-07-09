// Cliente da Admin API da Nuvemshop (zero deps, Node >= 18).
// Particularidades cobertas aqui (fontes em poc-plano-e-descobertas.md §4.4):
// - header histórico `Authentication: bearer` + o padrão atual `Authorization: Bearer` (manda os dois)
// - `User-Agent` obrigatório (a API devolve 400 sem ele)
// - rate limit leaky bucket 2 req/s burst 40 → retry simples em 429 usando x-rate-limit-reset

const TOKEN_URL = 'https://www.nuvemshop.com.br/apps/authorize/token'
const API_BASE = 'https://api.nuvemshop.com.br/v1'

export async function exchangeCode({ appId, clientSecret, code }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Troca de token falhou (HTTP ${res.status}): ${JSON.stringify(data)}. ` +
        'Lembrete: o code expira em 5 minutos e é de uso único — se perdeu, desinstala e reinstala o app na loja demo.'
    )
  }
  return data // { access_token, token_type, scope, user_id }  — user_id === store_id
}

export function createClient({ accessToken, storeId, userAgent }) {
  async function request(path, { method = 'GET', body, attempt = 1 } = {}) {
    const res = await fetch(`${API_BASE}/${storeId}${path}`, {
      method,
      headers: {
        Authentication: `bearer ${accessToken}`,
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': userAgent,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (res.status === 429 && attempt <= 3) {
      const resetMs = Number(res.headers.get('x-rate-limit-reset')) || 1000
      await new Promise((r) => setTimeout(r, resetMs))
      return request(path, { method, body, attempt: attempt + 1 })
    }

    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    if (!res.ok) {
      const err = new Error(`Nuvemshop API ${method} ${path} → HTTP ${res.status}: ${text.slice(0, 500)}`)
      err.status = res.status
      throw err
    }
    return data
  }

  return { request }
}
