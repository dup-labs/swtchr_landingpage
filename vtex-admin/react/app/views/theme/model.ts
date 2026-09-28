/**
 * Modelo da view Tema: estado normalizado da section SwtchrTheme (globalSections),
 * defaults do schema, conversão de/para o `data` do CMS e utilitários de cor.
 * Puro (sem React).
 *
 * Espelha cms/swtchr/sections/theme.mjs e SwtchrTheme.tsx do faststore-template.
 */
export const THEME_KEY = 'SwtchrTheme'

export type ColorKey =
  | 'primary'
  | 'secondary'
  | 'ink'
  | 'inverse'
  | 'background'
  | 'surface'
  | 'onPrimary'
  | 'onSecondary'
  | 'highlightFrom'
  | 'highlightTo'

export const COLOR_KEYS: ColorKey[] = [
  'primary',
  'secondary',
  'ink',
  'inverse',
  'background',
  'surface',
  'onPrimary',
  'onSecondary',
  'highlightFrom',
  'highlightTo',
]

export type TitleTransform = 'uppercase' | 'none'
export type ButtonShape = 'pill' | 'rounded' | 'square'
export type Spacing = 'compact' | 'normal' | 'airy'
export type HighlightMode = 'gradient' | 'solid' | 'none'

export interface FontValue {
  preset: string
  customName: string
  customUrl: string
}

export interface ThemeState {
  /** '' = usa o default do schema */
  colors: Record<ColorKey, string>
  typography: {
    display: FontValue
    body: FontValue
    titleWeight: number
    titleTransform: TitleTransform
  }
  shape: { radius: number; buttonShape: ButtonShape }
  layout: { spacing: Spacing; containerWidth: number }
  motion: { reveal: boolean; highlight: HighlightMode }
}

export const LIMITS = {
  titleWeight: { min: 300, max: 900 },
  radius: { min: 0, max: 40 },
  containerWidth: { min: 960, max: 1920 },
}

/** Defaults do theme.mjs (usados se o schema do CMS não vier). */
export const FALLBACK_DEFAULTS: ThemeState = {
  colors: {
    primary: '#AD61C2',
    secondary: '#897BBC',
    ink: '#0D0D0D',
    inverse: '#FFFFFF',
    background: '#F9F9F9',
    surface: '#ECEBE7',
    onPrimary: '#FFFFFF',
    onSecondary: '#0D0D0D',
    highlightFrom: '#AFD7D0',
    highlightTo: '#897BBC',
  },
  typography: {
    display: { preset: 'chillax', customName: '', customUrl: '' },
    body: { preset: 'synonym', customName: '', customUrl: '' },
    titleWeight: 700,
    titleTransform: 'uppercase',
  },
  shape: { radius: 16, buttonShape: 'pill' },
  layout: { spacing: 'normal', containerWidth: 1440 },
  motion: { reveal: true, highlight: 'gradient' },
}

type Dict = Record<string, unknown>

function isDict(v: unknown): v is Dict {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function dict(v: unknown): Dict {
  return isDict(v) ? v : {}
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return isFinite(n) ? n : fallback
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  return typeof v === 'string' && (allowed as string[]).indexOf(v) !== -1 ? (v as T) : fallback
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function cloneState(s: ThemeState): ThemeState {
  return JSON.parse(JSON.stringify(s)) as ThemeState
}

// ------------------------------------------------------------------ cor

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(v: string): boolean {
  return HEX.test(v.trim())
}

/** #abc → #AABBCC */
export function normalizeHex(v: string): string {
  const h = v.trim()
  if (h.length === 4) return ('#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]).toUpperCase()
  return h.toUpperCase()
}

/** Cor efetiva: valor válido ou default. */
export function effColor(state: ThemeState, defaults: ThemeState, key: ColorKey): string {
  const v = state.colors[key]
  return v && isHexColor(v) ? normalizeHex(v) : defaults.colors[key]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const h = normalizeHex(hex)
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Razão de contraste WCAG 2.x (1–21). */
export function contrastRatio(a: string, b: string): number {
  if (!isHexColor(a) || !isHexColor(b)) return 1
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

// ------------------------------------------------------------------ fontes

const SAFE_NAME = /^[\w\s-]{1,60}$/
const SAFE_URL = /^(https:\/\/|\/)[^\s"'()<>]+\.(woff2?|ttf|otf)(\?[^\s"'()<>]*)?$/i

export function isSafeFontName(v: string): boolean {
  return SAFE_NAME.test(v.trim())
}

export function isSafeFontUrl(v: string): boolean {
  return SAFE_URL.test(v.trim())
}

// ------------------------------------------------------------------ conversão

function readFont(v: unknown, def: FontValue): FontValue {
  const d = dict(v)
  return {
    preset: str(d.preset, def.preset) || def.preset,
    customName: str(d.customName, ''),
    customUrl: str(d.customUrl, ''),
  }
}

/** data do CMS (qualquer formato) → estado completo, com defaults onde faltar. */
export function fromData(data: unknown, defaults: ThemeState): ThemeState {
  const d = dict(data)
  const c = dict(d.colors)
  const t = dict(d.typography)
  const sh = dict(d.shape)
  const l = dict(d.layout)
  const m = dict(d.motion)

  const colors = {} as Record<ColorKey, string>
  COLOR_KEYS.forEach((k) => {
    colors[k] = str(c[k], defaults.colors[k])
  })

  return {
    colors,
    typography: {
      display: readFont(t.display, defaults.typography.display),
      body: readFont(t.body, defaults.typography.body),
      titleWeight: num(t.titleWeight, defaults.typography.titleWeight),
      titleTransform: oneOf<TitleTransform>(t.titleTransform, ['uppercase', 'none'], defaults.typography.titleTransform),
    },
    shape: {
      radius: num(sh.radius, defaults.shape.radius),
      buttonShape: oneOf<ButtonShape>(sh.buttonShape, ['pill', 'rounded', 'square'], defaults.shape.buttonShape),
    },
    layout: {
      spacing: oneOf<Spacing>(l.spacing, ['compact', 'normal', 'airy'], defaults.layout.spacing),
      containerWidth: num(l.containerWidth, defaults.layout.containerWidth),
    },
    motion: {
      reveal: typeof m.reveal === 'boolean' ? m.reveal : defaults.motion.reveal,
      highlight: oneOf<HighlightMode>(m.highlight, ['gradient', 'solid', 'none'], defaults.motion.highlight),
    },
  }
}

/** Defaults a partir do JSON Schema da section (initFromSchema), com fallback no theme.mjs. */
export function defaultsFromSchema(initial: Record<string, unknown> | null): ThemeState {
  return initial ? fromData(initial, FALLBACK_DEFAULTS) : cloneState(FALLBACK_DEFAULTS)
}

export type ThemeErrors = Partial<Record<string, string>>

/** Valida o estado; chaves: "colors.primary", "typography.display.customName", "typography.titleWeight"... */
export function validateTheme(s: ThemeState): ThemeErrors {
  const e: ThemeErrors = {}
  COLOR_KEYS.forEach((k) => {
    const v = s.colors[k].trim()
    if (v && !isHexColor(v)) e['colors.' + k] = 'Hex inválido. Use #RRGGBB, ex: #AD61C2.'
  })
  ;(['display', 'body'] as Array<'display' | 'body'>).forEach((which) => {
    const f = s.typography[which]
    if (f.preset !== 'custom') return
    if (!f.customName.trim()) e['typography.' + which + '.customName'] = 'Dê um nome à fonte.'
    else if (!isSafeFontName(f.customName)) e['typography.' + which + '.customName'] = 'Use só letras, números, espaço e hífen.'
    if (!f.customUrl.trim()) e['typography.' + which + '.customUrl'] = 'Envie o arquivo da fonte.'
    else if (!isSafeFontUrl(f.customUrl)) e['typography.' + which + '.customUrl'] = 'URL precisa ser https e terminar em .woff2, .woff, .ttf ou .otf.'
  })
  const w = s.typography.titleWeight
  if (w < LIMITS.titleWeight.min || w > LIMITS.titleWeight.max) e['typography.titleWeight'] = 'Entre 300 e 900.'
  const r = s.shape.radius
  if (r < LIMITS.radius.min || r > LIMITS.radius.max) e['shape.radius'] = 'Entre 0 e 40.'
  const cw = s.layout.containerWidth
  if (cw < LIMITS.containerWidth.min || cw > LIMITS.containerWidth.max) e['layout.containerWidth'] = 'Entre 960 e 1920.'
  return e
}

export function errorCount(e: ThemeErrors): number {
  return Object.keys(e).filter((k) => !!e[k]).length
}

function writeFont(orig: unknown, f: FontValue): Dict {
  const out: Dict = Object.assign({}, dict(orig), { preset: f.preset })
  if (f.preset === 'custom') {
    out.customName = f.customName.trim()
    out.customUrl = f.customUrl.trim()
  } else {
    // mantém os campos "custom" como estavam só se o usuário os preencheu (não suja o CMS)
    out.customName = f.customName.trim() || undefined
    out.customUrl = f.customUrl.trim() || undefined
    if (out.customName === undefined) delete out.customName
    if (out.customUrl === undefined) delete out.customUrl
  }
  return out
}

/**
 * Estado → data do CMS. Mescla por cima do data original (preserva chaves que a view não conhece,
 * ex.: skipLazyLoadingSection). Cor vazia = default do schema; hex normalizado (#RRGGBB).
 */
export function toData(s: ThemeState, defaults: ThemeState, original: Record<string, unknown>): Record<string, unknown> {
  const o = dict(original)
  const colors: Dict = Object.assign({}, dict(o.colors))
  COLOR_KEYS.forEach((k) => {
    colors[k] = effColor(s, defaults, k)
  })
  const t = dict(o.typography)
  return Object.assign({}, o, {
    colors,
    typography: Object.assign({}, t, {
      display: writeFont(t.display, s.typography.display),
      body: writeFont(t.body, s.typography.body),
      titleWeight: clamp(s.typography.titleWeight, LIMITS.titleWeight.min, LIMITS.titleWeight.max),
      titleTransform: s.typography.titleTransform,
    }),
    shape: Object.assign({}, dict(o.shape), {
      radius: clamp(s.shape.radius, LIMITS.radius.min, LIMITS.radius.max),
      buttonShape: s.shape.buttonShape,
    }),
    layout: Object.assign({}, dict(o.layout), {
      spacing: s.layout.spacing,
      containerWidth: clamp(s.layout.containerWidth, LIMITS.containerWidth.min, LIMITS.containerWidth.max),
    }),
    motion: Object.assign({}, dict(o.motion), {
      reveal: s.motion.reveal,
      highlight: s.motion.highlight,
    }),
  })
}

/** Igualdade estrutural simples (pra saber se está "sujo"). */
export function sameState(a: ThemeState, b: ThemeState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Divide "Peças que *viajam* com você" em partes normais/destacadas. */
export function splitHighlight(text: string): Array<{ text: string; hl: boolean }> {
  const out: Array<{ text: string; hl: boolean }> = []
  text.split('*').forEach((part, i) => {
    if (part) out.push({ text: part, hl: i % 2 === 1 })
  })
  return out
}
