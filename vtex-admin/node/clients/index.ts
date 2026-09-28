import { IOClients } from '@vtex/api'

import { CpDataClient, CpManageClient, CpUploadClient } from './cp'

export class Clients extends IOClients {
  public get cpManage() {
    return this.getOrSet('cpManage', CpManageClient)
  }

  public get cpData() {
    return this.getOrSet('cpData', CpDataClient)
  }

  public get cpUpload() {
    return this.getOrSet('cpUpload', CpUploadClient)
  }
}
