// Cliente da API do backend SWTCHR (localhost:8787). Quando embarcar no admin,
// o header Authorization (session token do Nexo) entra aqui num único ponto.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

let getAuthHeader = async () => ({}) // sobrescrito por nexo.js quando embedado
export function setAuthProvider(fn) {
  getAuthHeader = fn
}

async function req(path, opts = {}) {
  const auth = await getAuthHeader()
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...auth },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  status: () => req('/api/status'),
  history: () => req('/api/history'),
  search: (q) => req('/api/search?q=' + encodeURIComponent(q)),
  getPdp: (productId) => req('/api/pdp?productId=' + productId),
  savePdp: (productId, config) => req('/api/pdp', { method: 'PUT', body: JSON.stringify({ productId, config }) }),
  upload: (dataBase64, filename) => req('/api/upload', { method: 'POST', body: JSON.stringify({ dataBase64, filename }) }),
}
