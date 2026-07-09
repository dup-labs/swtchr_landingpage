// Nexo — handshake não-bloqueante. Se estiver embedado no admin, conecta e
// passa a mandar o session token nas chamadas de API. Se estiver standalone
// (aba normal / dev), o app funciona igual, sem token.
import nexo from '@tiendanube/nexo'
import { setAuthProvider } from './api.js'

const CLIENT_ID = '36078'

let instance = null
try {
  instance = nexo.create({ clientId: CLIENT_ID, log: false })
} catch {
  instance = null
}

export function initNexo(onMode) {
  if (!instance) {
    onMode('standalone')
    return
  }
  nexo
    .connect(instance)
    .then(() => {
      nexo.iAmReady(instance)
      // embedado: manda o session token JWT em toda chamada
      setAuthProvider(async () => {
        try {
          const t = await nexo.getSessionToken(instance)
          return { Authorization: `Bearer ${t}` }
        } catch {
          return {}
        }
      })
      onMode('embedded')
    })
    .catch(() => onMode('standalone'))
}
