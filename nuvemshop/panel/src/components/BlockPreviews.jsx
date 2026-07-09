import React from 'react'

// mini-composições wireframe dos tipos de bloco (modal picker + thumb das rows)
const L = 'var(--line)'
const S = 'var(--sky)'
const SU = 'var(--subtle)'
const B = 'var(--brand)'
const W = 'var(--white)'

const ART = {
  hero_image_text: (
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
  ),
  carousel: (
    <>
      <rect x="2" y="18" width="22" height="32" rx="3" fill={L} />
      <rect x="96" y="18" width="22" height="32" rx="3" fill={L} />
      <rect x="30" y="13" width="60" height="42" rx="4" fill={S} />
      <path d="M44 47l9-10 6 6 5-5 8 9" stroke={W} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="52" cy="64" r="2.4" fill={SU} />
      <circle cx="60" cy="64" r="2.4" fill={B} />
      <circle cx="68" cy="64" r="2.4" fill={SU} />
    </>
  ),
  tabela_nutricional: (
    <>
      <rect x="18" y="10" width="84" height="9" rx="2" fill={SU} />
      <rect x="18" y="23" width="84" height="6" rx="1.5" fill={L} />
      <rect x="18" y="33" width="84" height="6" rx="1.5" fill={S} />
      <rect x="18" y="43" width="84" height="6" rx="1.5" fill={L} />
      <rect x="18" y="53" width="84" height="6" rx="1.5" fill={S} />
    </>
  ),
  texto_seo: (
    <>
      <rect x="14" y="13" width="58" height="6" rx="2" fill={SU} />
      <rect x="14" y="27" width="92" height="3" rx="1.5" fill={L} />
      <rect x="14" y="34" width="88" height="3" rx="1.5" fill={L} />
      <rect x="14" y="41" width="90" height="3" rx="1.5" fill={L} />
      <rect x="14" y="48" width="62" height="3" rx="1.5" fill={L} />
      <rect x="14" y="57" width="26" height="3" rx="1.5" fill={B} />
    </>
  ),
  accordion_perguntas: (
    <>
      <rect x="14" y="10" width="92" height="12" rx="3" fill={L} />
      <circle cx="99" cy="16" r="2.2" fill={SU} />
      <rect x="14" y="27" width="92" height="12" rx="3" fill={S} />
      <circle cx="99" cy="33" r="2.2" fill={B} />
      <rect x="18" y="44" width="70" height="3" rx="1.5" fill={L} />
      <rect x="18" y="51" width="54" height="3" rx="1.5" fill={L} />
      <rect x="14" y="59" width="92" height="10" rx="3" fill={L} />
    </>
  ),
  tabela_medidas: (
    <>
      <rect x="14" y="12" width="92" height="8" rx="2" fill={SU} />
      {[26, 36, 46, 56].map((y) =>
        [14, 38, 62, 86].map((x) => <rect key={x + '-' + y} x={x} y={y} width="20" height="6" rx="1.5" fill={x === 14 ? S : L} />)
      )}
    </>
  ),
  vitrine_produtos: (
    <>
      {[14, 52, 90].map((x, i) => (
        <g key={x}>
          <rect x={x} y="14" width="26" height="24" rx="2.5" fill={i === 1 ? S : L} />
          <rect x={x} y="43" width="20" height="3" rx="1.5" fill={L} />
          <rect x={x} y="50" width="13" height="3.5" rx="1.5" fill={B} />
        </g>
      ))}
    </>
  ),
  grid_imagens: (
    <>
      <rect x="24" y="9" width="34" height="25" rx="3" fill={S} />
      <rect x="62" y="9" width="34" height="25" rx="3" fill={L} />
      <rect x="24" y="38" width="34" height="25" rx="3" fill={L} />
      <rect x="62" y="38" width="34" height="25" rx="3" fill={S} />
    </>
  ),
  banner_full: (
    <>
      <rect x="6" y="12" width="108" height="48" rx="4" fill={S} />
      <rect x="34" y="27" width="52" height="5" rx="2" fill={W} />
      <rect x="42" y="36" width="36" height="3" rx="1.5" fill={W} opacity="0.7" />
      <rect x="50" y="44" width="20" height="6" rx="3" fill={B} />
    </>
  ),
}

const FALLBACK = (
  <>
    <rect x="14" y="14" width="92" height="30" rx="3" fill={L} />
    <rect x="14" y="50" width="60" height="4" rx="2" fill={SU} />
  </>
)

export default function BlockPreview({ type }) {
  return (
    <svg viewBox="0 0 120 72" style={{ width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {ART[type] || FALLBACK}
    </svg>
  )
}
