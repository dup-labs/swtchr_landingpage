/**
 * Catálogo da loja (APIs públicas do catalog_system, sem auth) — usado para escolher o
 * "escopo" de PDP/PLP (produto/categoria) e checar conflito de slug das landing pages.
 *
 * Host: https://{account}.vtexcommercestable.com.br (mesmo host "data" do transporte;
 * policy outbound {{account}}.vtexcommercestable.com.br /api/* já cobre).
 */

import { isObj } from './format'
import { CpTransport } from './transport'
import type { CategoryNode, ProductHit } from './types'

type Obj = Record<string, unknown>

const TREE_TTL_MS = 5 * 60 * 1000
const treeCache = new Map<string, { at: number; value: Promise<CategoryNode[]> }>()

export function clearCatalogCache() {
  treeCache.clear()
}

/**
 * URL/caminho de categoria → caminho normalizado da PLP.
 * "https://x.vtexcommercestable.com.br/Vestuario/Casacos-e-jaquetas/" → "/vestuario/casacos-e-jaquetas"
 */
export function normalizeCategoryPath(url: string): string {
  let p = String(url || '').trim()
  p = p.replace(/^[a-z]+:\/\/[^/]+/i, '') // sem domínio
  p = p.split(/[?#]/)[0]
  try {
    p = decodeURIComponent(p)
  } catch {
    // mantém cru
  }
  p = p.toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (!p.startsWith('/')) p = `/${p}`
  return p === '/' ? '' : p
}

/** "Casacos e jaquetas" → "casacos-e-jaquetas" (fallback quando não achamos a categoria na árvore). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toNode(raw: unknown): CategoryNode | null {
  if (!isObj(raw)) return null
  const id = Number(raw.id)
  const name = typeof raw.name === 'string' ? raw.name : ''
  const path = normalizeCategoryPath(typeof raw.url === 'string' ? raw.url : '')
  if (!Number.isFinite(id) || !path) return null
  const children = (Array.isArray(raw.children) ? raw.children : []).map(toNode).filter((n): n is CategoryNode => !!n)
  return { id, name, path, children }
}

/** Achata a árvore (pré-ordem). */
export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (list: CategoryNode[]) =>
    list.forEach((n) => {
      out.push(n)
      walk(n.children)
    })
  walk(nodes)
  return out
}

export class Catalog {
  constructor(private t: CpTransport, private account: string) {}

  private get<T>(path: string, metric: string) {
    return this.t.request<T>({ host: 'data', method: 'GET', path, metric })
  }

  /** Árvore de categorias (3 níveis), cache em memória de 5 min por conta. */
  getCategoryTree(): Promise<CategoryNode[]> {
    const hit = treeCache.get(this.account)
    if (hit && Date.now() - hit.at < TREE_TTL_MS) return hit.value
    const value = this.get<unknown>('/api/catalog_system/pub/category/tree/3', 'catalog-tree').then((raw) =>
      (Array.isArray(raw) ? raw : []).map(toNode).filter((n): n is CategoryNode => !!n)
    )
    treeCache.set(this.account, { at: Date.now(), value })
    value.catch(() => treeCache.delete(this.account))
    return value
  }

  /** Busca full-text no catálogo (máx 20). q vazio → primeiros 20 produtos. */
  async searchProducts(q?: string): Promise<ProductHit[]> {
    const term = (q ?? '').trim()
    const qs = `${term ? `ft=${encodeURIComponent(term)}&` : ''}_from=0&_to=19`
    const [raw, tree] = await Promise.all([
      this.get<unknown>(`/api/catalog_system/pub/products/search?${qs}`, 'catalog-search'),
      this.getCategoryTree().catch(() => [] as CategoryNode[]),
    ])
    const byId = new Map<number, string>()
    flattenTree(tree).forEach((n) => byId.set(n.id, n.path))

    return (Array.isArray(raw) ? raw : [])
      .filter(isObj)
      .slice(0, 20)
      .map((p) => toHit(p, byId))
      .filter((h): h is ProductHit => !!h)
  }
}

function toHit(p: Obj, pathById: Map<number, string>): ProductHit | null {
  const linkText = typeof p.linkText === 'string' ? p.linkText : ''
  if (!linkText) return null
  const items = Array.isArray(p.items) ? p.items.filter(isObj) : []
  const first = items[0]
  const itemId = first && first.itemId !== undefined ? String(first.itemId) : ''
  const images = first && Array.isArray(first.images) ? first.images.filter(isObj) : []
  const image = images[0] && typeof images[0].imageUrl === 'string' ? (images[0].imageUrl as string) : undefined

  return {
    id: String(p.productId ?? ''),
    name: typeof p.productName === 'string' ? p.productName : linkText,
    linkText,
    pdpTemplate: `/${linkText}/p`,
    url: itemId ? `/${linkText}-${itemId}/p` : `/${linkText}/p`,
    image,
    categoryPath: categoryPathOf(p, pathById),
  }
}

/**
 * Categoria mais específica do produto, no mesmo formato do path da árvore.
 * 1º: categoriesIds ("/1/2/") → último id → path da árvore (bate exatamente).
 * 2º: categories ("/Vestuário/Casacos e jaquetas/") slugificado.
 */
function categoryPathOf(p: Obj, pathById: Map<number, string>): string | undefined {
  const ids = (Array.isArray(p.categoriesIds) ? p.categoriesIds : []).filter((x): x is string => typeof x === 'string')
  const deepestIds = ids
    .map((s) => s.split('/').filter(Boolean))
    .sort((a, b) => b.length - a.length)[0]
  if (deepestIds && deepestIds.length) {
    const path = pathById.get(Number(deepestIds[deepestIds.length - 1]))
    if (path) return path
  }
  const names = (Array.isArray(p.categories) ? p.categories : []).filter((x): x is string => typeof x === 'string')
  const deepest = names
    .map((s) => s.split('/').filter(Boolean))
    .sort((a, b) => b.length - a.length)[0]
  if (deepest && deepest.length) return `/${deepest.map(slugify).join('/')}`
  return undefined
}
