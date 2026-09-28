/**
 * Leitura do JSON Schema do CMS: detecção de padrões (mídia, CTA, cor) e defaults.
 * Puro (sem React) — usado pelo SchemaForm, pelo validate e por quem cria sections novas.
 */
import { FieldSchema } from '../api/types'
import { UiHint, WidgetName } from './hints'

/** Tokens do tema (SwtchrTheme.colors) aceitos nos campos de cor das sections. */
export const THEME_TOKENS = ['primary', 'secondary', 'ink', 'inverse', 'background', 'surface']

export type Dict = Record<string, unknown>

export function isDict(v: unknown): v is Dict {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T)
}

function uiWidget(s: FieldSchema): string | undefined {
  return s.widget ? s.widget['ui:widget'] : undefined
}

/** Objeto no formato media() dos fragments: tem src + alt. */
export function isMediaObject(s: FieldSchema): boolean {
  const p = s.properties
  return s.type === 'object' && !!p && !!p.src && !!p.alt
}

/** Objeto no formato cta() dos fragments: tem label + url + variant. */
export function isCtaObject(s: FieldSchema): boolean {
  const p = s.properties
  return s.type === 'object' && !!p && !!p.label && !!p.url && !!p.variant
}

export function isMediaString(s: FieldSchema): boolean {
  return s.type === 'string' && uiWidget(s) === 'media-gallery'
}

/**
 * Campo de cor: string cujo nome termina em Color/color, ou cuja descrição fala em hex,
 * ou que mora em colors.* com default hex (paleta do Tema).
 */
export function isColorField(s: FieldSchema, key: string, path: string): boolean {
  if (s.type !== 'string' || s.enum || uiWidget(s)) return false
  if (/color$/i.test(key)) return true
  if (/\bhex\b/i.test(s.description || '')) return true
  return /^colors\.[^.]+$/.test(path) && typeof s.default === 'string' && s.default.charAt(0) === '#'
}

/** Cor aceita token do tema? (A paleta do próprio Tema não pode apontar pra si mesma.) */
export function colorAllowsTokens(s: FieldSchema, path: string): boolean {
  if (/token/i.test(s.description || '')) return true
  return !/^colors\./.test(path)
}

/** restrictMediaTypes do fragment: video como lista de extensões = aceita vídeo; `video: true` = restrito. */
export function allowsVideo(s: FieldSchema): boolean {
  const r = s.widget && (s.widget.restrictMediaTypes as { video?: unknown } | undefined)
  if (!r || typeof r !== 'object') return true
  return Array.isArray(r.video)
}

/**
 * `accept` do Dropzone. `image/*` já cobre SVG (image/svg+xml); `.svg` entra junto porque alguns sistemas
 * mandam o arquivo sem mime. Com restrictMediaTypes.image = ['png','svg',…] o seletor mostra só esses formatos.
 */
export function mediaAccept(s: FieldSchema): string {
  const r = s.widget && (s.widget.restrictMediaTypes as { image?: unknown } | undefined)
  const exts = r && typeof r === 'object' && Array.isArray(r.image) ? (r.image as unknown[]).map(String) : []
  const image = exts.length
    ? exts
        .map((e) => e.replace(/^\./, '').toLowerCase())
        .map((e) => '.' + e + ',' + (e === 'svg' ? 'image/svg+xml' : e === 'jpg' ? 'image/jpeg' : 'image/' + e))
        .join(',')
    : 'image/*,.svg'
  return allowsVideo(s) ? image + ',video/mp4,video/webm' : image
}

export interface EnumOption {
  value: string
  label: string
}

export function enumOptions(s: FieldSchema): EnumOption[] {
  const vals = s.enum || []
  return vals.map((v, i) => ({
    value: String(v),
    label: (s.enumNames && s.enumNames[i]) || String(v),
  }))
}

/** Segmented quando cabe: até 4 opções com rótulo curto. */
export function fitsSegmented(opts: EnumOption[]): boolean {
  return opts.length > 1 && opts.length <= 4 && opts.every((o) => o.label.length <= 14)
}

/** Decide o widget de um campo. */
export function pickWidget(s: FieldSchema, key: string, path: string, hint?: UiHint): WidgetName {
  if (hint && hint.widget) return hint.widget
  const w = uiWidget(s)
  switch (s.type) {
    case 'boolean':
      return 'toggle'
    case 'integer':
    case 'number':
      return 'number'
    case 'array':
      return 'items'
    case 'object':
      if (isMediaObject(s)) return 'mediaObject'
      if (isCtaObject(s)) return 'cta'
      return 'group'
    default:
      break
  }
  if (w === 'media-gallery') return 'media'
  if (s.enum && s.enum.length) return fitsSegmented(enumOptions(s)) ? 'segmented' : 'select'
  if (w === 'draftjs-rich-text') return 'richtext'
  if (w === 'date-time') return 'date'
  if (w === 'slug') return 'slug'
  if (isColorField(s, key, path)) return 'color'
  if (w === 'text-area') return 'textarea'
  return 'text'
}

/** Widgets que ocupam a linha inteira do grid. */
export function isFullWidth(widget: WidgetName): boolean {
  return (
    widget === 'group' ||
    widget === 'items' ||
    widget === 'mediaObject' ||
    widget === 'cta' ||
    widget === 'richtext' ||
    widget === 'textarea'
  )
}

/**
 * Preenche defaults do schema onde o valor é undefined (recursivo).
 * - valor definido é mantido (inclusive '' e false);
 * - objetos sempre existem ({}), mesmo sem default;
 * - arrays: default do schema, ou o que veio; cada item recebe os defaults do item.
 */
export function fillDefaults(schema: FieldSchema, value: unknown): unknown {
  let v = value === undefined ? clone(schema.default) : value
  if (schema.type === 'object') {
    const src: Dict = isDict(v) ? v : {}
    const out: Dict = Object.assign({}, src)
    const props = schema.properties || {}
    Object.keys(props).forEach((k) => {
      const filled = fillDefaults(props[k], src[k])
      if (filled !== undefined) out[k] = filled
    })
    return out
  }
  if (schema.type === 'array') {
    if (!Array.isArray(v)) return v
    const item = schema.items
    return item ? v.map((it) => fillDefaults(item, it)) : v
  }
  return v
}

/** Valor inicial de um schema (section nova, item novo de lista). */
export function initFromSchema(schema: FieldSchema): Record<string, unknown> {
  const v = fillDefaults(schema, undefined)
  return isDict(v) ? v : {}
}

/** Valor inicial de um item de array (objeto ou primitivo). */
export function initItem(schema: FieldSchema | undefined): unknown {
  if (!schema) return ''
  if (schema.type === 'object') return initFromSchema(schema)
  if (schema.default !== undefined) return clone(schema.default)
  if (schema.type === 'boolean') return false
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum !== undefined ? schema.minimum : 0
  return ''
}

/** Remove a marcação *destaque* e quebras de linha (pra resumos). */
export function plainText(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).replace(/\s+$/, '') + '…' : s
}

/** Primeiro texto não vazio de um item (percorre o schema em ordem; ignora enum, mídia e cor). */
export function firstText(schema: FieldSchema | undefined, value: unknown, depth = 0): string {
  if (typeof value === 'string') return plainText(value)
  if (!isDict(value) || depth > 2) return ''
  const props = (schema && schema.properties) || {}
  const keys = Object.keys(props).length ? Object.keys(props) : Object.keys(value)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const s = props[k] || {}
    const v = value[k]
    if (s.type === 'object' && !isMediaObject(s) && !isCtaObject(s)) {
      const t = firstText(s, v, depth + 1)
      if (t) return t
      continue
    }
    if (typeof v !== 'string' || s.enum || isMediaString(s) || isColorField(s, k, k)) continue
    if (/url$|^url|src$|position$|^alt$/i.test(k)) continue
    const t = plainText(v)
    if (t) return t
  }
  // CTA dentro do item (ex: botões): usa o texto do botão
  for (let i = 0; i < keys.length; i++) {
    const v = value[keys[i]]
    if (isDict(v) && typeof v.label === 'string' && v.label.trim()) return plainText(v.label)
  }
  return ''
}

/** Tem alguma mídia preenchida no item? (pra resumo "(imagem)") */
export function hasMedia(value: unknown, depth = 0): boolean {
  if (!isDict(value) || depth > 2) return false
  return Object.keys(value).some((k) => {
    const v = value[k]
    if (/src$|^image$/i.test(k) && typeof v === 'string' && v) return true
    return isDict(v) && hasMedia(v, depth + 1)
  })
}
