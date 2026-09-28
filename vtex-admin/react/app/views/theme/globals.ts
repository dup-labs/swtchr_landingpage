/**
 * Header e Rodapé na aba Tema: sections SwtchrHeader / SwtchrFooter da página globalSections.
 * O formulário é GENÉRICO (SchemaForm sobre o schema do getSchema()); aqui só mora a apresentação:
 * rótulos das abas, hints de ordem/grupo e onde inserir a section quando ela ainda não existe.
 */
import type { ComponentDef, PageSection } from '../../api/types'
import type { UiHint, UiHints } from '../../form'
import { normalizePath } from '../../form/hints'

export const HEADER_KEY = 'SwtchrHeader'
export const FOOTER_KEY = 'SwtchrFooter'

export type GlobalKey = 'SwtchrHeader' | 'SwtchrFooter'
export const GLOBAL_KEYS: GlobalKey[] = [HEADER_KEY, FOOTER_KEY]

export type GlobalData = Record<GlobalKey, Record<string, unknown> | null>

export const EMPTY_GLOBALS: GlobalData = { SwtchrHeader: null, SwtchrFooter: null }

export interface GlobalMeta {
  /** "Header" / "Rodapé" */
  label: string
  /** artigo + nome, pra frases ("o header", "o rodapé") */
  noun: string
  fallbackTitle: string
}

export const GLOBAL_META: Record<GlobalKey, GlobalMeta> = {
  SwtchrHeader: { label: 'Header', noun: 'header', fallbackTitle: 'swtchr · Header' },
  SwtchrFooter: { label: 'Rodapé', noun: 'rodapé', fallbackTitle: 'swtchr · Footer' },
}

const LOGO_LABEL = 'Logo (SVG recomendado)'
const LOGO_DESC = 'SVG fica nítido em qualquer tela. PNG ou WEBP com fundo transparente também servem.'

/**
 * Hints por caminho (paths) — não usamos `keys` pra não afetar campos homônimos aninhados.
 * `variant` some do formulário: o seletor visual de estilo cuida dele.
 * Chaves que ainda não existem no schema são simplesmente ignoradas (o schema manda).
 *
 * Logo: schema novo = header `logo { image, text, alt, height }` · footer `brand { logo, logoHeight, text, description }`.
 * A imagem vem primeiro e com destaque. `light`/`strong` (schema antigo, "parte leve/forte") ficam escondidos.
 */
export const HEADER_HINTS: UiHints = {
  paths: {
    variant: { hidden: true },
    logo: { order: 1, label: 'Logo' },
    'logo.image': { order: 1, label: LOGO_LABEL, description: LOGO_DESC, full: true },
    'logo.text': { order: 2 },
    'logo.alt': { order: 3 },
    'logo.height': { order: 4 },
    'logo.light': { hidden: true },
    'logo.strong': { hidden: true },
    menu: { order: 2, label: 'Menu' },
    // "Estilo Clássico" (cor de fundo, posição…) logo abaixo de logo/menu — só aparece no Clássico
    classic: { order: 3 },
    actions: { order: 4 },
    announcement: { order: 5 },
    announcementBar: { order: 5 },
    topBar: { order: 5 },
    // aparência do header
    position: { group: 'appearance', order: 10 },
    placement: { group: 'appearance', order: 10 },
    overlay: { group: 'appearance', order: 10 },
    background: { group: 'appearance', order: 11 },
    defaultMode: { group: 'appearance', order: 12 },
    sticky: { group: 'appearance', order: 13 },
    skipLazyLoadingSection: { group: 'advanced' },
  },
}

export const FOOTER_HINTS: UiHints = {
  paths: {
    variant: { hidden: true },
    brand: { order: 1, label: 'Marca' },
    'brand.logo': { order: 1, label: LOGO_LABEL, description: LOGO_DESC, full: true },
    'brand.logoHeight': { order: 2 },
    'brand.text': { order: 3 },
    'brand.description': { order: 4 },
    'brand.light': { hidden: true },
    'brand.strong': { hidden: true },
    editorial: { order: 2 },
    'editorial.wordmark.image': { label: 'Imagem da marca gigante (SVG recomendado)' },
    wordmark: { order: 2 },
    columns: { order: 3 },
    newsletter: { order: 4 },
    social: { order: 5 },
    payments: { order: 6 },
    paymentMethods: { order: 6 },
    seals: { order: 7 },
    badges: { order: 7 },
    bottom: { order: 8 },
    skipLazyLoadingSection: { group: 'advanced' },
  },
}

export const GLOBAL_HINTS: Record<GlobalKey, UiHints> = {
  SwtchrHeader: HEADER_HINTS,
  SwtchrFooter: FOOTER_HINTS,
}

/**
 * Campos que só valem para UM estilo (variant). Fora dele ficam escondidos no formulário — os valores
 * continuam no `data` e são salvos (o SchemaForm só mescla; nada é apagado), então voltar ao estilo
 * recupera tudo.
 */
const VARIANT_ONLY: Record<GlobalKey, Array<{ path: string; variant: string }>> = {
  SwtchrHeader: [
    { path: 'classic', variant: 'classic' },
    { path: 'menu.*.children', variant: 'classic' },
  ],
  SwtchrFooter: [{ path: 'editorial', variant: 'editorial' }],
}

/** Estilo efetivo: `data.variant`, senão o default do schema, senão a 1ª opção do enum. */
export function currentVariant(def: ComponentDef | null, data: Record<string, unknown> | null): string {
  if (data && typeof data.variant === 'string' && data.variant) return data.variant
  const props = (def && def.schema.properties) || {}
  const v = props.variant
  if (v && typeof v.default === 'string') return v.default
  return v && v.enum && v.enum.length ? String(v.enum[0]) : ''
}

/** Caminhos (normalizados, com `*`) escondidos no estilo atual. */
export function variantHiddenPaths(key: GlobalKey, variant: string): string[] {
  return VARIANT_ONLY[key].filter((r) => r.variant !== variant).map((r) => r.path)
}

/**
 * Nº de erros de validação só nos campos VISÍVEIS no estilo atual — um erro num campo escondido
 * (ex.: cor inválida no grupo Clássico com o header em Pílulas) não pode travar o salvar sem o usuário ver.
 */
export function visibleErrorCount(errors: Record<string, string>, key: GlobalKey, variant: string): number {
  const hidden = variantHiddenPaths(key, variant)
  return Object.keys(errors).filter((p) => {
    const n = normalizePath(p)
    return !hidden.some((h) => n === h || n.indexOf(h + '.') === 0)
  }).length
}

/** Hints do formulário para o estilo escolhido: base (GLOBAL_HINTS) + `hidden` nos campos de outros estilos. */
export function globalHintsFor(key: GlobalKey, variant: string): UiHints {
  const base = GLOBAL_HINTS[key]
  const paths: Record<string, UiHint> = Object.assign({}, base.paths)
  VARIANT_ONLY[key].forEach((r) => {
    if (r.variant !== variant) paths[r.path] = Object.assign({}, paths[r.path], { hidden: true })
  })
  return { paths, keys: base.keys }
}

/**
 * Insere uma section global nova na posição certa:
 * header logo depois da SwtchrTheme (ou no início, sem tema); rodapé por último.
 */
export function insertGlobal(sections: PageSection[], sec: PageSection, themeUid: string): PageSection[] {
  if (sec.key === FOOTER_KEY) return sections.concat([sec])
  const i = sections.findIndex((s) => s.uid === themeUid)
  const at = i >= 0 ? i + 1 : 0
  return sections.slice(0, at).concat([sec], sections.slice(at))
}

export function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch (e) {
    return false
  }
}
