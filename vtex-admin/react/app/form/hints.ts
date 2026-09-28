/**
 * UiHints — ajustes de apresentação por cima do JSON Schema do CMS.
 *
 * O schema diz O QUE é o dado; os hints dizem COMO mostrar (widget, rótulo, grupo, ordem).
 * Dois jeitos de mirar um campo:
 *  - `paths`: caminho normalizado, índices de array viram `*` → "cards.*.media", "appearance.tone"
 *  - `keys`:  nome da chave em qualquer profundidade → "skipLazyLoadingSection"
 * Precedência: paths do chamador > keys do chamador > paths padrão > keys padrão.
 */

export type WidgetName =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'toggle'
  | 'select'
  | 'segmented'
  | 'color'
  | 'media'
  | 'mediaObject'
  | 'cta'
  | 'group'
  | 'items'
  | 'date'
  | 'slug'

/** Onde o campo aparece na raiz da section. */
export type FieldGroup = 'content' | 'appearance' | 'advanced'

export interface UiHint {
  widget?: WidgetName
  label?: string
  /** '' esconde a descrição do schema */
  description?: string
  placeholder?: string
  hidden?: boolean
  /** menor vem antes; sem order = ordem do schema (depois dos que têm order) */
  order?: number
  /** só vale para chaves da raiz da section */
  group?: FieldGroup
  /** ocupa a linha inteira do grid */
  full?: boolean
}

export interface UiHints {
  paths?: Record<string, UiHint>
  keys?: Record<string, UiHint>
}

const COLOR_DESC = 'Vazio = cor do tom. Use um token do tema ou um hex.'
const URL_PLACEHOLDER = '/caminho ou https://…'

export const DEFAULT_HINTS: UiHints = {
  keys: {
    appearance: { group: 'appearance' },
    skipLazyLoadingSection: {
      group: 'advanced',
      label: 'Renderizar no servidor (SEO / acima da dobra)',
    },
    sendViewItem: { group: 'advanced' },
    structuredData: { group: 'advanced' },
    url: { placeholder: URL_PLACEHOLDER },
    accountUrl: { placeholder: URL_PLACEHOLDER },
    customUrl: { placeholder: 'https://…/fonte.woff2' },
    anchorId: { placeholder: 'colecoes' },
    position: { placeholder: '50% 50%' },
  },
  paths: {
    'appearance.tone': { label: 'Tom' },
    'appearance.backgroundColor': { label: 'Cor de fundo', description: COLOR_DESC },
    'appearance.textColor': { label: 'Cor do texto', description: COLOR_DESC },
    'appearance.accentColor': { label: 'Cor de destaque', description: COLOR_DESC },
    'appearance.anchorId': { label: 'Âncora (id)' },
    'appearance.hideOn': { label: 'Esconder em' },
  },
}

/** "cards.0.media.src" → "cards.*.media.src" */
export function normalizePath(path: string): string {
  return path
    .split('.')
    .map((s) => (/^\d+$/.test(s) ? '*' : s))
    .join('.')
}

export function joinPath(base: string, key: string | number): string {
  return base ? base + '.' + key : String(key)
}

export function lastKey(path: string): string {
  const parts = path.split('.')
  return parts[parts.length - 1] || ''
}

/** Hint efetivo de um campo (mescla padrão + chamador). */
export function resolveHint(path: string, hints?: UiHints): UiHint {
  const norm = normalizePath(path)
  const key = lastKey(path)
  const pick = (h: UiHints | undefined, kind: 'paths' | 'keys', k: string): UiHint | undefined => {
    const m = h && h[kind]
    return m ? m[k] : undefined
  }
  return Object.assign(
    {},
    pick(DEFAULT_HINTS, 'keys', key),
    pick(DEFAULT_HINTS, 'paths', norm),
    pick(hints, 'keys', key),
    pick(hints, 'paths', norm)
  )
}
