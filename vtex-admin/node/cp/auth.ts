/**
 * Identidade do usuário a partir do token do admin (JWT do VTEX ID).
 * O payload tem { sub: "<email>", account, audience: "admin", type: "user", exp, ... }.
 * NÃO validamos assinatura aqui: todo acesso ao CP usa o próprio token, e o CP valida.
 * O e-mail serve só para author dos commits e nome da branch de rascunho.
 */

export interface TokenUser {
  email: string
  account?: string
  exp?: number
}

export function decodeToken(token: string): TokenUser | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    const payload = JSON.parse(json) as Record<string, unknown>
    const email = [payload.sub, payload.email, payload.user].find(
      (v): v is string => typeof v === 'string' && v.length > 0
    )
    if (!email) return null
    return {
      email,
      account: typeof payload.account === 'string' ? payload.account : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    }
  } catch {
    return null
  }
}

export function isExpired(user: TokenUser, nowMs = Date.now()): boolean {
  return typeof user.exp === 'number' && user.exp * 1000 < nowMs
}

export const DRAFT_PREFIX = 'swtchr-'

/** "Bruno.Dup+x@foo.com" → "swtchr-bruno-dup-x". Nunca contém "--" (reservado p/ sufixo). */
export function draftBranchName(email: string): string {
  const local =
    email
      .split('@')[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'user'
  return `${DRAFT_PREFIX}${local}`
}
