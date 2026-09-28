/**
 * Portabilidade do conteúdo: campo de especificação GLOBAL de produto "swtchr_data".
 *
 * - ensureDataField(): acha (ou cria, uma vez) o grupo global "swtchr" e o campo "swtchr_data"
 *   (texto multilinha, CategoryId null, de produto). Sempre procura antes de criar → idempotente.
 * - writeProductData(): grava o JSON do conteúdo da PDP no produto (Value [""] limpa).
 *
 * Host: https://{account}.vtexcommercestable.com.br (host "data" do transporte), auth
 * VtexIdclientAutCookie = token do usuário do admin (precisa de permissão no catálogo).
 */

import { Catalog, flattenTree } from './catalog'
import { isObj } from './format'
import { CpError, CpTransport } from './transport'

export const DATA_FIELD_NAME = 'swtchr_data'
export const DATA_GROUP_NAME = 'swtchr'
/** acima disso o campo ainda aceita, mas registramos aviso (conteúdo grande pra spec) */
export const DATA_WARN_BYTES = 60 * 1024

type Obj = Record<string, unknown>

interface FieldRow {
  Name: string
  CategoryId: number | null
  FieldId: number
  IsActive: boolean
  IsStockKeepingUnit: boolean
}

interface GroupRow {
  CategoryId: number | null
  Id: number
  Name: string
  Position?: number
}

/** cache por conta (processo/pod): FieldId já resolvido */
const fieldCache = new Map<string, Promise<number>>()

export function clearSpecsCache() {
  fieldCache.clear()
}

export class CatalogSpecs {
  constructor(private t: CpTransport, private account: string, private token: string, private catalog: Catalog) {}

  private req<T>(method: 'GET' | 'POST' | 'PUT', path: string, metric: string, body?: unknown) {
    return this.t.request<T>({
      host: 'data',
      method,
      path,
      body,
      metric,
      headers: {
        VtexIdclientAutCookie: this.token,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'GET' ? {} : { retry: false }),
    })
  }

  /** Uma categoria qualquer da árvore (as listagens "por categoria" incluem os globais). */
  private async anyCategoryId(): Promise<number> {
    const tree = await this.catalog.getCategoryTree()
    const first = flattenTree(tree)[0]
    if (!first) throw new CpError(409, 'Catálogo sem categorias', 'Crie ao menos uma categoria para o swtchr criar o campo global.')
    return first.id
  }

  private async findField(categoryId: number): Promise<number | null> {
    const rows = await this.req<FieldRow[]>(
      'GET',
      // endpoint pub tem cache de CDN (campo recém-criado some por minutos) → cache-busting
      `/api/catalog_system/pub/specification/field/listTreeByCategoryId/${categoryId}?_=${Date.now()}`,
      'catalog-spec-fields'
    )
    const hits = (Array.isArray(rows) ? rows : [])
      .filter((r) => isObj(r) && r.Name === DATA_FIELD_NAME && r.CategoryId === null && !r.IsStockKeepingUnit)
      .map((r) => r.FieldId)
      .sort((a, b) => a - b)
    return hits.length ? hits[0] : null
  }

  private async ensureGroup(categoryId: number): Promise<number> {
    const groups = await this.req<GroupRow[]>(
      'GET',
      `/api/catalog_system/pvt/specification/groupbycategory/${categoryId}`,
      'catalog-spec-groups'
    )
    const found = (Array.isArray(groups) ? groups : []).find((g) => isObj(g) && g.Name === DATA_GROUP_NAME && g.CategoryId === null)
    if (found) return found.Id
    const created = await this.req<Obj>('POST', '/api/catalog/pvt/specificationgroup', 'catalog-spec-group-create', {
      CategoryId: null,
      Name: DATA_GROUP_NAME,
    })
    const id = Number(created && created.Id)
    if (!Number.isFinite(id) || id <= 0) throw new CpError(502, 'Catálogo não devolveu o Id do grupo criado', JSON.stringify(created).slice(0, 300))
    return id
  }

  /**
   * FieldId do "swtchr_data" global; cria grupo + campo se não existirem.
   * created = true só na chamada que efetivamente criou.
   */
  async ensureDataField(): Promise<{ id: number; created: boolean }> {
    const cached = fieldCache.get(this.account)
    if (cached) {
      try {
        return { id: await cached, created: false }
      } catch {
        // falhou antes → tenta de novo abaixo
      }
    }
    let created = false
    const pending = (async () => {
      const categoryId = await this.anyCategoryId()
      const existing = await this.findField(categoryId)
      if (existing) return existing
      const groupId = await this.ensureGroup(categoryId)
      const res = await this.createField(groupId).catch(async (e: unknown) => {
        // corrida com outro pod/aba: o catálogo recusa nome repetido no grupo → relê
        if (e instanceof CpError && e.status === 400 && /duplicated field name/i.test(`${e.message} ${e.detail ?? ''}`)) {
          const again = await this.findField(categoryId)
          if (again) return { Id: again, existed: true } as Obj
        }
        throw e
      })
      created = !res.existed
      const id = Number(res && res.Id)
      if (Number.isFinite(id) && id > 0) return id
      // sem Id na resposta → relê
      const again = await this.findField(categoryId)
      if (!again) throw new CpError(502, 'Campo criado mas não encontrado na releitura', JSON.stringify(res).slice(0, 300))
      return again
    })()
    fieldCache.set(this.account, pending)
    pending.catch(() => fieldCache.delete(this.account))
    return { id: await pending, created }
  }

  private createField(groupId: number) {
    return this.req<Obj>('POST', '/api/catalog/pvt/specification', 'catalog-spec-create', {
      FieldTypeId: 2, // texto multilinha
      CategoryId: null,
      FieldGroupId: groupId,
      Name: DATA_FIELD_NAME,
      Description: 'Conteúdo do swtchr (JSON) — gerado pelo painel, não editar à mão.',
      Position: 99,
      IsFilter: false,
      IsRequired: false,
      IsOnProductDetails: false,
      IsStockKeepingUnit: false,
      IsActive: true,
      IsTopMenuLinkActive: false,
      IsSideMenuLinkActive: false,
    })
  }

  /** productId pelo linkText (API pública de busca); null se não achar. */
  async productIdByLinkText(linkText: string): Promise<string | null> {
    const raw = await this.req<unknown>(
      'GET',
      `/api/catalog_system/pub/products/search/${encodeURIComponent(linkText)}/p`,
      'catalog-product-by-link'
    )
    const first = Array.isArray(raw) ? raw.find(isObj) : null
    return first && first.productId !== undefined ? String(first.productId) : null
  }

  /**
   * Valor atual do swtchr_data no produto ('' se vazio/ausente).
   * Usa a API nova (catalog/pvt/product/{id}/specification): a legada (catalog_system) não
   * lista campo global recém-associado.
   */
  async readProductData(productId: string, fieldId: number): Promise<string> {
    const rows = await this.req<Array<{ FieldId: number; Text?: string | null }>>(
      'GET',
      `/api/catalog/pvt/product/${encodeURIComponent(productId)}/specification`,
      'catalog-product-specs'
    )
    const row = (Array.isArray(rows) ? rows : []).find((r) => isObj(r) && r.FieldId === fieldId)
    return row && typeof row.Text === 'string' ? row.Text : ''
  }

  /**
   * Grava (upsert) o swtchr_data do produto. value '' limpa.
   * POST /api/catalog_system/pvt/products/{id}/specification — só mexe nos campos enviados.
   */
  async writeProductData(productId: string, fieldId: number, value: string): Promise<void> {
    await this.req<unknown>(
      'POST',
      `/api/catalog_system/pvt/products/${encodeURIComponent(productId)}/specification`,
      'catalog-product-spec-write',
      [{ Value: [value], Id: fieldId, Name: DATA_FIELD_NAME }]
    )
  }
}
