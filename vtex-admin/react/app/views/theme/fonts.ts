/**
 * Catálogo de fontes do tema (espelho de faststore-template/src/components/swtchr/core/fonts.ts)
 * + carregamento sob demanda no painel pra renderizar as amostras.
 *
 * - google: <link> do Google Fonts injetado uma vez por família
 * - local (Chillax/Synonym): moram no /public/fonts da loja → @font-face com a URL absoluta
 * - custom: @font-face com o nome + URL enviados pelo usuário
 */
import { useEffect } from 'react'

import type { FontValue } from './model'
import { isSafeFontName, isSafeFontUrl } from './model'

export const STORE_FONTS_BASE = 'https://dupagencypartnerbr.vtex.app/fonts/'

export interface FontPreset {
  key: string
  label: string
  family: string
  fallback: string
  local?: { url: string; weight: string }
  google?: string
  /** rótulo curto da categoria (mostrado no tile) */
  kind: string
}

export const FONT_PRESETS: FontPreset[] = [
  {
    key: 'chillax',
    label: 'Chillax',
    family: 'Chillax',
    fallback: 'system-ui, sans-serif',
    local: { url: STORE_FONTS_BASE + 'Chillax-Variable.woff2', weight: '200 700' },
    kind: 'display',
  },
  {
    key: 'synonym',
    label: 'Synonym',
    family: 'Synonym',
    fallback: 'system-ui, sans-serif',
    local: { url: STORE_FONTS_BASE + 'Synonym-Variable.woff2', weight: '100 700' },
    kind: 'sans',
  },
  { key: 'inter', label: 'Inter', family: 'Inter', fallback: 'system-ui, sans-serif', google: 'Inter:wght@300..800', kind: 'sans' },
  {
    key: 'space-grotesk',
    label: 'Space Grotesk',
    family: 'Space Grotesk',
    fallback: 'system-ui, sans-serif',
    google: 'Space+Grotesk:wght@300..700',
    kind: 'grotesk',
  },
  {
    key: 'dm-sans',
    label: 'DM Sans',
    family: 'DM Sans',
    fallback: 'system-ui, sans-serif',
    google: 'DM+Sans:opsz,wght@9..40,300..800',
    kind: 'sans',
  },
  { key: 'manrope', label: 'Manrope', family: 'Manrope', fallback: 'system-ui, sans-serif', google: 'Manrope:wght@300..800', kind: 'sans' },
  {
    key: 'bricolage-grotesque',
    label: 'Bricolage Grotesque',
    family: 'Bricolage Grotesque',
    fallback: 'system-ui, sans-serif',
    google: 'Bricolage+Grotesque:opsz,wght@12..96,300..800',
    kind: 'grotesk',
  },
  { key: 'syne', label: 'Syne', family: 'Syne', fallback: 'system-ui, sans-serif', google: 'Syne:wght@400..800', kind: 'display' },
  { key: 'archivo', label: 'Archivo', family: 'Archivo', fallback: 'system-ui, sans-serif', google: 'Archivo:wght@300..900', kind: 'sans' },
  {
    key: 'playfair-display',
    label: 'Playfair Display',
    family: 'Playfair Display',
    fallback: 'Georgia, serif',
    google: 'Playfair+Display:wght@400..900',
    kind: 'serif',
  },
  {
    key: 'instrument-serif',
    label: 'Instrument Serif',
    family: 'Instrument Serif',
    fallback: 'Georgia, serif',
    google: 'Instrument+Serif',
    kind: 'serif',
  },
  {
    key: 'system',
    label: 'Fonte do sistema',
    family: 'system-ui',
    fallback: '-apple-system, BlinkMacSystemFont, sans-serif',
    kind: 'sistema',
  },
]

export function findPreset(key: string): FontPreset | undefined {
  for (let i = 0; i < FONT_PRESETS.length; i++) if (FONT_PRESETS[i].key === key) return FONT_PRESETS[i]
  return undefined
}

function quote(family: string): string {
  return family === 'system-ui' ? family : '"' + family + '"'
}

/** font-family CSS da escolha (mesma lógica do resolveFont da loja). */
export function fontStack(f: FontValue, fallbackKey: string): string {
  if (f.preset === 'custom' && f.customName && isSafeFontName(f.customName)) {
    return '"' + f.customName.trim() + '", system-ui, sans-serif'
  }
  const p = findPreset(f.preset) || findPreset(fallbackKey) || FONT_PRESETS[0]
  return quote(p.family) + ', ' + p.fallback
}

// ------------------------------------------------------------------ loader

const loaded: Record<string, true> = {}

function injectOnce(id: string, make: () => HTMLElement) {
  if (loaded[id] || typeof document === 'undefined') return
  loaded[id] = true
  if (document.getElementById(id)) return
  const el = make()
  el.id = id
  document.head.appendChild(el)
}

function safeId(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

/** Carrega um preset (idempotente). */
export function loadPreset(p: FontPreset) {
  if (p.google) {
    const google = p.google
    injectOnce('sw-font-g-' + p.key, () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=' + google + '&display=swap'
      return link
    })
  } else if (p.local) {
    const local = p.local
    injectOnce('sw-font-l-' + p.key, () => {
      const style = document.createElement('style')
      style.textContent =
        '@font-face{font-family:"' +
        p.family +
        '";src:url("' +
        local.url +
        '") format("woff2");font-weight:' +
        local.weight +
        ';font-style:normal;font-display:swap;}'
      return style
    })
  }
}

/** Carrega uma fonte personalizada (nome + URL já validados). */
export function loadCustom(name: string, url: string) {
  if (!isSafeFontName(name) || !isSafeFontUrl(url)) return
  injectOnce('sw-font-c-' + safeId(name + '-' + url), () => {
    const style = document.createElement('style')
    style.textContent =
      '@font-face{font-family:"' + name.trim() + '";src:url("' + url.trim() + '");font-weight:100 900;font-display:swap;}'
    return style
  })
}

/** Garante que todos os presets e as fontes personalizadas em uso estejam carregadas. */
export function useThemeFonts(fonts: FontValue[]) {
  const sig = fonts.map((f) => f.preset + '|' + f.customName + '|' + f.customUrl).join('#')
  useEffect(() => {
    FONT_PRESETS.forEach(loadPreset)
  }, [])
  useEffect(() => {
    fonts.forEach((f) => {
      if (f.preset === 'custom') loadCustom(f.customName, f.customUrl)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
}
