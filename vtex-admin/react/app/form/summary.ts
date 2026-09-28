/**
 * Resumo de uma section pro card fechado da lista ("Em destaque · 3 cards").
 * Heurística genérica (título → chamada → texto) + casos especiais por $componentKey.
 */
import { isDict, plainText, truncate } from './schema'

type Data = Record<string, unknown>

const MAX = 64

function str(v: unknown): string {
  return plainText(v)
}

function get(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (isDict(acc) ? acc[k] : undefined), data)
}

function count(v: unknown, singular: string, plural: string): string {
  const n = Array.isArray(v) ? v.length : 0
  if (!n) return ''
  return n + ' ' + (n === 1 ? singular : plural)
}

function join(parts: string[]): string {
  return truncate(parts.filter(Boolean).join(' · '), MAX)
}

/** Primeiro texto de uma lista de caminhos candidatos. */
function firstOf(data: Data, paths: string[]): string {
  for (let i = 0; i < paths.length; i++) {
    const t = str(get(data, paths[i]))
    if (t) return t
  }
  return ''
}

const SPECIAL: Record<string, (d: Data) => string> = {
  SwtchrTheme: (d) =>
    join([
      str(get(d, 'colors.primary')),
      str(get(d, 'typography.display.preset')),
      str(get(d, 'typography.body.preset')),
    ]),
  SwtchrHeader: (d) =>
    join([
      str(get(d, 'logo.light')) + str(get(d, 'logo.strong')) || (get(d, 'logo.image') ? 'logo em imagem' : ''),
      count(d.menu, 'item de menu', 'itens de menu'),
    ]),
  SwtchrFooter: (d) =>
    join([str(get(d, 'brand.light')) + str(get(d, 'brand.strong')), count(d.columns, 'coluna', 'colunas')]),
  SwtchrMarquee: (d) => {
    const items = Array.isArray(d.items) ? d.items : []
    const texts = items
      .map((it) => (isDict(it) ? str(it.text) || str(it.label) || str(it.title) : str(it)))
      .filter(Boolean)
    return join([texts.slice(0, 3).join(' — ')])
  },
  SwtchrProductShelf: (d) => {
    const src = str(d.source)
    const detail =
      src === 'collection' ? 'coleção ' + str(d.collectionId) : src === 'category' ? str(d.categoryPath) : src === 'brand' ? str(d.brand) : src === 'search' ? '"' + str(d.term) + '"' : ''
    return join([str(d.title), detail.trim()])
  },
  SwtchrProductHero: () => 'Produto da PDP',
  SwtchrProductSpecs: (d) => join([firstOf(d, ['specs.title', 'title']) || 'Ficha técnica']),
}

/** Contagem da primeira lista relevante da section (cards, items, images...). */
function listCount(d: Data): string {
  const labels: Array<[string, string, string]> = [
    ['cards', 'card', 'cards'],
    ['items', 'item', 'itens'],
    ['images', 'foto', 'fotos'],
    ['reviews', 'depoimento', 'depoimentos'],
    ['members', 'pessoa', 'pessoas'],
    ['buttons', 'botão', 'botões'],
    ['highlights', 'destaque', 'destaques'],
  ]
  for (let i = 0; i < labels.length; i++) {
    const c = count(d[labels[i][0]], labels[i][1], labels[i][2])
    if (c) return c
  }
  return ''
}

export function sectionSummary(key: string, data: unknown): string {
  const d: Data = isDict(data) ? data : {}
  const special = SPECIAL[key]
  if (special) {
    const s = special(d)
    if (s) return s
  }
  const head = firstOf(d, ['title', 'eyebrow', 'heading', 'text', 'subtitle', 'intro', 'caption', 'meta'])
  return join([head, listCount(d)])
}
