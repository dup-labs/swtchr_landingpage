import React from 'react'

// Mini-composições wireframe por section (picker + thumb das rows). viewBox 120×72.
// Porte de nuvemshop/panel/src/components/BlockPreviews.jsx, remapeado para as keys do swtchr FastStore.
const L = 'var(--line)'
const S = 'var(--sky)'
const SU = 'var(--subtle)'
const B = 'var(--brand)'
const W = 'var(--white)'
const INK = '#2A2E39'

const ART: Record<string, React.ReactNode> = {}

// Hero: imagem cheia com título, subtítulo e CTA centralizados
ART.SwtchrHero = (
  <>
    <rect x="6" y="10" width="108" height="52" rx="4" fill={S} />
    <path d="M14 56l14-14 9 9 8-8 12 13" stroke={W} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <rect x="34" y="24" width="52" height="6" rx="2" fill={W} />
    <rect x="42" y="34" width="36" height="3" rx="1.5" fill={W} opacity="0.75" />
    <rect x="50" y="43" width="20" height="7" rx="3.5" fill={B} />
  </>
)

// Marquee: faixa com textos repetidos rolando
ART.SwtchrMarquee = (
  <>
    <rect x="0" y="27" width="120" height="18" fill={INK} />
    {[4, 34, 64, 94].map((x) => (
      <g key={x}>
        <rect x={x} y="34" width="20" height="4" rx="2" fill={W} opacity="0.9" />
        <circle cx={x + 26} cy="36" r="1.6" fill={B} />
      </g>
    ))}
    <path d="M104 18l6 0M107 15l3 3-3 3" stroke={SU} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
)

// Lista de features: fundo escuro, bullets + imagem
ART.SwtchrFeatureList = (
  <>
    <rect x="4" y="4" width="112" height="64" rx="4" fill={INK} />
    <rect x="12" y="12" width="52" height="6" rx="2" fill={W} />
    {[26, 40, 54].map((y) => (
      <g key={y}>
        <circle cx="16" cy={y + 3} r="2.5" fill={B} />
        <rect x="24" y={y} width="34" height="3" rx="1.5" fill={W} opacity="0.85" />
        <rect x="24" y={y + 6} width="44" height="2.5" rx="1" fill={W} opacity="0.4" />
      </g>
    ))}
    <rect x="76" y="14" width="34" height="46" rx="3" fill={SU} opacity="0.5" />
  </>
)

// Bento: grid assimétrico
ART.SwtchrBento = (
  <>
    <rect x="10" y="8" width="50" height="56" rx="4" fill={S} />
    <rect x="64" y="8" width="46" height="26" rx="4" fill={L} />
    <rect x="64" y="38" width="21" height="26" rx="4" fill={L} />
    <rect x="89" y="38" width="21" height="26" rx="4" fill={S} opacity="0.7" />
    <rect x="16" y="52" width="24" height="4" rx="2" fill={W} />
    <rect x="70" y="14" width="20" height="3.5" rx="1.5" fill={SU} />
  </>
)

// Cards de categoria: 4 cards com imagem + rótulo
ART.SwtchrCategoryCards = (
  <>
    <rect x="8" y="9" width="40" height="5" rx="2" fill={SU} />
    {[8, 35, 62, 89].map((x, i) => (
      <g key={x}>
        <rect x={x} y="20" width="23" height="32" rx="3" fill={i === 1 ? S : L} />
        <rect x={x + 3} y="56" width="16" height="3.5" rx="1.5" fill={i === 1 ? B : SU} />
      </g>
    ))}
  </>
)

// Editorial: imagem + texto lado a lado
ART.SwtchrEditorial = (
  <>
    <rect x="10" y="14" width="45" height="44" rx="3" fill={S} />
    <path d="M16 50l10-11 7 7 6-6 8 8" stroke={W} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="26" r="3.4" fill={W} />
    <rect x="62" y="19" width="44" height="5" rx="2" fill={SU} />
    <rect x="62" y="31" width="40" height="3" rx="1.5" fill={L} />
    <rect x="62" y="38" width="36" height="3" rx="1.5" fill={L} />
    <rect x="62" y="45" width="30" height="3" rx="1.5" fill={L} />
    <rect x="62" y="53" width="20" height="6" rx="3" fill={B} />
  </>
)

// Newsletter: título + campo pill + botão
ART.SwtchrNewsletter = (
  <>
    <rect x="6" y="10" width="108" height="52" rx="4" fill={S} opacity="0.55" />
    <rect x="30" y="20" width="60" height="6" rx="2" fill={SU} />
    <rect x="38" y="30" width="44" height="3" rx="1.5" fill={L} />
    <rect x="22" y="40" width="56" height="11" rx="5.5" fill={W} stroke={L} strokeWidth="1" />
    <rect x="28" y="44.5" width="22" height="2.5" rx="1" fill={L} />
    <rect x="80" y="40" width="20" height="11" rx="5.5" fill={B} />
  </>
)

// CTA: faixa com título e botão
ART.SwtchrCta = (
  <>
    <rect x="6" y="16" width="108" height="40" rx="4" fill={INK} />
    <rect x="16" y="26" width="48" height="6" rx="2" fill={W} />
    <rect x="16" y="36" width="36" height="3" rx="1.5" fill={W} opacity="0.5" />
    <rect x="80" y="29" width="26" height="12" rx="6" fill={B} />
  </>
)

// Vitrine de produtos
ART.SwtchrProductShelf = (
  <>
    <rect x="14" y="6" width="36" height="4" rx="2" fill={SU} />
    {[14, 52, 90].map((x, i) => (
      <g key={x}>
        <rect x={x} y="16" width="26" height="26" rx="2.5" fill={i === 1 ? S : L} />
        <rect x={x} y="47" width="20" height="3" rx="1.5" fill={L} />
        <rect x={x} y="54" width="13" height="3.5" rx="1.5" fill={B} />
      </g>
    ))}
    <circle cx="8" cy="29" r="3" fill={W} stroke={L} strokeWidth="1" />
    <circle cx="112" cy="29" r="3" fill={W} stroke={L} strokeWidth="1" />
  </>
)

// Avaliações
ART.SwtchrReviews = (
  <>
    <rect x="10" y="8" width="44" height="7" rx="2" fill={SU} />
    {[0, 1, 2, 3, 4].map((i) => (
      <circle key={i} cx={86 + i * 6} cy="11" r="2.2" fill={B} />
    ))}
    {[10, 48, 86].map((x) => (
      <g key={x}>
        <rect x={x} y="22" width="24" height="40" rx="3" fill={W} stroke={L} strokeWidth="1" />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={x + 5 + i * 5} cy="28" r="1.6" fill={B} />
        ))}
        <rect x={x + 4} y="34" width="16" height="2.5" rx="1" fill={L} />
        <rect x={x + 4} y="39" width="14" height="2.5" rx="1" fill={L} />
        <rect x={x + 4} y="47" width="10" height="2.5" rx="1" fill={SU} />
      </g>
    ))}
  </>
)

// Full bleed: imagem borda a borda, texto no canto
ART.SwtchrFullBleed = (
  <>
    <rect x="0" y="6" width="120" height="60" fill={S} />
    <path d="M0 58l24-22 16 14 14-12 26 24" stroke={W} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <circle cx="94" cy="22" r="5" fill={W} opacity="0.8" />
    <rect x="10" y="44" width="40" height="6" rx="2" fill={W} />
    <rect x="10" y="54" width="18" height="5" rx="2.5" fill={B} />
  </>
)

// Especificações do produto: tabela chave/valor
ART.SwtchrProductSpecs = (
  <>
    <rect x="14" y="8" width="44" height="6" rx="2" fill={SU} />
    {[20, 30, 40, 50, 60].map((y, i) => (
      <g key={y}>
        <rect x="14" y={y} width="92" height="8" rx="1.5" fill={i % 2 ? W : S} opacity={i % 2 ? 1 : 0.55} />
        <rect x="18" y={y + 3} width="24" height="2.5" rx="1" fill={SU} />
        <rect x="64" y={y + 3} width="30" height="2.5" rx="1" fill={L} />
      </g>
    ))}
  </>
)

// Hero de produto: galeria + info + comprar
ART.SwtchrProductHero = (
  <>
    <rect x="8" y="10" width="12" height="12" rx="2" fill={L} />
    <rect x="8" y="26" width="12" height="12" rx="2" fill={S} />
    <rect x="8" y="42" width="12" height="12" rx="2" fill={L} />
    <rect x="24" y="10" width="44" height="52" rx="3" fill={S} />
    <rect x="74" y="12" width="36" height="5" rx="2" fill={SU} />
    <rect x="74" y="21" width="28" height="3" rx="1.5" fill={L} />
    <rect x="74" y="30" width="18" height="5" rx="2" fill={INK} />
    {[74, 84, 94].map((x) => (
      <rect key={x} x={x} y="40" width="8" height="7" rx="2" fill={W} stroke={L} strokeWidth="1" />
    ))}
    <rect x="74" y="52" width="36" height="8" rx="4" fill={B} />
  </>
)

// Hero de coleção: breadcrumb + título grande + descrição
ART.SwtchrCollectionHero = (
  <>
    <rect x="6" y="8" width="108" height="56" rx="4" fill={S} opacity="0.45" />
    <rect x="14" y="16" width="8" height="2.5" rx="1" fill={SU} />
    <rect x="25" y="16" width="12" height="2.5" rx="1" fill={SU} />
    <rect x="14" y="26" width="62" height="9" rx="2" fill={INK} />
    <rect x="14" y="41" width="56" height="3" rx="1.5" fill={L} />
    <rect x="14" y="48" width="44" height="3" rx="1.5" fill={L} />
    <rect x="86" y="18" width="22" height="38" rx="3" fill={S} />
  </>
)

// Hero editorial: manchete grande + imagem alta
ART.SwtchrHeroEditorial = (
  <>
    <rect x="10" y="10" width="10" height="3" rx="1.5" fill={B} />
    <rect x="10" y="18" width="56" height="9" rx="2" fill={INK} />
    <rect x="10" y="30" width="48" height="9" rx="2" fill={INK} />
    <rect x="10" y="46" width="44" height="3" rx="1.5" fill={L} />
    <rect x="10" y="53" width="36" height="3" rx="1.5" fill={L} />
    <rect x="74" y="6" width="38" height="60" rx="3" fill={S} />
    <path d="M78 58l9-10 6 6 5-5 10 10" stroke={W} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
)

// Time: avatares redondos com nome e cargo
ART.SwtchrTeam = (
  <>
    <rect x="38" y="6" width="44" height="5" rx="2" fill={SU} />
    {[20, 47, 74, 101].map((cx, i) => (
      <g key={cx}>
        <circle cx={cx} cy="32" r="11" fill={i % 2 ? L : S} />
        <circle cx={cx} cy="29" r="4" fill={W} opacity="0.85" />
        <path d={'M' + (cx - 7) + ' 40 q7 -8 14 0'} fill={W} opacity="0.85" />
        <rect x={cx - 9} y="49" width="18" height="3" rx="1.5" fill={SU} />
        <rect x={cx - 6} y="55" width="12" height="2.5" rx="1" fill={L} />
      </g>
    ))}
  </>
)

// Galeria: grid de imagens (masonry)
ART.SwtchrGallery = (
  <>
    <rect x="12" y="8" width="30" height="34" rx="3" fill={S} />
    <rect x="12" y="46" width="30" height="18" rx="3" fill={L} />
    <rect x="45" y="8" width="30" height="20" rx="3" fill={L} />
    <rect x="45" y="32" width="30" height="32" rx="3" fill={S} opacity="0.7" />
    <rect x="78" y="8" width="30" height="28" rx="3" fill={S} />
    <rect x="78" y="40" width="30" height="24" rx="3" fill={L} />
  </>
)

// ---- legado Nuvemshop (mantidos como aliases úteis) ----
ART.hero_image_text = ART.SwtchrEditorial
ART.feature_list = ART.SwtchrFeatureList
ART.reviews = ART.SwtchrReviews
ART.vitrine_produtos = ART.SwtchrProductShelf
ART.banner_full = ART.SwtchrHero
ART.grid_imagens = ART.SwtchrGallery
ART.tabela_medidas = ART.SwtchrProductSpecs

// Section nativa da FastStore (travada): bloco cinza com cadeado
const NATIVE = (
  <>
    <rect x="14" y="12" width="92" height="48" rx="4" fill={W} stroke={L} strokeWidth="1.2" strokeDasharray="3 3" />
    <rect x="50" y="34" width="20" height="16" rx="3" fill={SU} />
    <path d="M54 34v-5a6 6 0 0 1 12 0v5" stroke={SU} strokeWidth="2.4" fill="none" />
    <circle cx="60" cy="42" r="2" fill={W} />
  </>
)

const FALLBACK = (
  <>
    <rect x="14" y="14" width="92" height="30" rx="3" fill={L} />
    <rect x="14" y="50" width="60" height="4" rx="2" fill={SU} />
  </>
)

/** Keys com preview próprio. */
export const PREVIEW_KEYS = Object.keys(ART)

export interface BlockPreviewProps {
  /** $componentKey (ex.: "SwtchrHero") */
  type: string
  /** section nativa da FastStore → desenho de cadeado */
  native?: boolean
}

/** Wireframe SVG da section (preenche o container). */
export function BlockPreview({ type, native }: BlockPreviewProps) {
  const art = native ? NATIVE : ART[type] || FALLBACK
  return (
    <svg
      viewBox="0 0 120 72"
      style={{ width: '100%', height: '100%', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {art}
    </svg>
  )
}
