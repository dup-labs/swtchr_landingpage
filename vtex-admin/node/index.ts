import type { ClientsConfig, ServiceContext, RecorderState } from '@vtex/api'
import { method, Service } from '@vtex/api'

import { Clients } from './clients'
import { api } from './middlewares/api'
import { health } from './middlewares/health'

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: { retries: 2, timeout: 20000 },
    // upload de mídia pode demorar mais
    cpUpload: { retries: 0, timeout: 60000 },
  },
}

declare global {
  type Context = ServiceContext<Clients, State>
  type State = RecorderState
}

export default new Service({
  clients,
  routes: {
    health: method({ GET: [health] }),
    // roteamento por método+path fica dentro do middleware (mini-router)
    api,
  },
})
