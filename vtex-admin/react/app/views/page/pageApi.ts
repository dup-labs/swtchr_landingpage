/**
 * Ponte fina entre o editor de página (PageEditor) e api/client.ts — o único lugar que conhece os nomes do client.
 * Se o client mudar de assinatura, ajuste só aqui.
 */
import * as client from '../../api/client'
import type {
  DraftInfo,
  PageDocument,
  PageSummary,
  PageType,
  PreviewUrl,
  PublishResult,
  SavePageBody,
  SchemaResponse,
} from '../../api/types'

export const getSchema = (): Promise<SchemaResponse> => client.getSchema()
export const listPages = (type: PageType): Promise<PageSummary[]> => client.listPages(type)
export const getPage = (type: PageType, id: string): Promise<PageDocument> => client.getPage(type, id)
export const savePage = (type: PageType, id: string, body: SavePageBody): Promise<PageDocument> =>
  client.savePage(type, id, body)
export const getDraft = (): Promise<DraftInfo> => client.getDraft()
export const publishDraft = (): Promise<PublishResult> => client.publishDraft()
export const discardDraft = (): Promise<unknown> => client.discardDraft()
export const getPreviewUrl = (type: PageType, id: string, path?: string): Promise<PreviewUrl> =>
  client.getPreviewUrl(type, id, path)

/** SchemaForm/Dropzone querem a URL direta; o client devolve UploadResult ({ url }). */
export async function upload(file: File): Promise<string> {
  const r = await client.upload(file)
  if (!r || !r.url) throw new Error('upload sem URL na resposta')
  return r.url
}
