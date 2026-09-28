import React from 'react'

/**
 * CSS da view Tema (classes sw-th-*). Complementa styles/css.ts sem editá-lo:
 * injetado por <ThemeViewStyles /> só enquanto a view está montada.
 */
export const THEME_CSS = `
/* ---------- cabeçalho ---------- */
.sw-th-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 4px 2px 16px; }
.sw-th-head__text { min-width: 0; }
.sw-th-head .sw-title { margin-top: 6px; }
.sw-th-head .sw-meta { margin-top: 6px; max-width: 520px; line-height: 1.5; }

.sw-th-stack { display: flex; flex-direction: column; gap: 14px; }
.sw-th-stack > .sw-card { margin: 0; }
.sw-th-stack > * { scroll-margin-top: 96px; }
.sw-th-card__lead { font-size: 13px; color: var(--muted); line-height: 1.5; margin: -4px 0 18px; }

/* ---------- grupos ---------- */
.sw-th-group + .sw-th-group { margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--divider); }
.sw-th-group__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.sw-th-group__title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: var(--brand); }
.sw-th-group__hint { font-size: 11px; color: var(--muted); letter-spacing: 0.02em; }

/* ---------- cores ---------- */
.sw-th-colors { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
.sw-th-color {
  background: var(--row); border-radius: var(--r-row); padding: 4px 14px 14px;
  transition: background 0.15s;
}
.sw-th-color:hover { background: var(--row-hover); }
.sw-th-color .sw-label { margin-top: 10px; color: var(--ink); opacity: 0.72; }
.sw-th-color .sw-color { gap: 10px; }
.sw-th-color .sw-color__swatch {
  width: 58px; height: 48px; border-radius: 12px; border-color: rgba(13, 16, 21, 0.1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.sw-th-color .sw-color__hex { height: 48px; font-size: 14px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; background: var(--white); }
.sw-th-color__err { font-size: 11px; color: var(--danger); margin-top: 6px; }
.sw-th-color__default { font-size: 11px; color: var(--muted); margin-top: 6px; }

/* paleta resumida (faixa no topo do card) */
.sw-th-strip { display: flex; height: 44px; border-radius: var(--r-row); overflow: hidden; margin-bottom: 20px; border: 1px solid var(--divider); }
.sw-th-strip span { flex: 1; transition: background 0.2s; }
.sw-th-strip span:first-child, .sw-th-strip span:nth-child(2) { flex: 2; }

/* destaque em gradiente */
.sw-th-hl {
  display: inline;
  -webkit-box-decoration-break: clone; box-decoration-break: clone;
}
.sw-th-hl--gradient, .sw-th-hl--solid { -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
.sw-th-hl-demo {
  margin-top: 12px; border-radius: var(--r-row); padding: 22px 20px;
  font-size: 30px; line-height: 1.1; letter-spacing: -0.01em; word-break: break-word;
  border: 1px solid var(--divider); transition: background 0.2s, color 0.2s;
}

/* contraste */
.sw-th-contrast { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.sw-th-pair {
  border-radius: var(--r-row); padding: 14px 14px 12px; border: 1px solid var(--divider);
  display: flex; flex-direction: column; gap: 10px; min-height: 108px; transition: background 0.2s, color 0.2s;
}
.sw-th-pair__sample { font-size: 22px; font-weight: 700; line-height: 1; }
.sw-th-pair__name { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.75; }
.sw-th-pair__foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.sw-th-pair__ratio {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.9); color: var(--ink); border-radius: var(--r-pill); padding: 4px 9px;
}
.sw-th-pair__flag {
  font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  border-radius: var(--r-pill); padding: 4px 8px; background: rgba(255, 255, 255, 0.9);
}
.sw-th-pair__flag--ok { color: #1e8a4c; }
.sw-th-pair__flag--warn { color: #b2560d; }
.sw-th-warn {
  margin-top: 12px; display: flex; gap: 10px; align-items: flex-start;
  background: #fff6ec; border: 1px solid #f6dcc0; color: #8a4a12; border-radius: var(--r-row);
  padding: 11px 14px; font-size: 12px; line-height: 1.5;
}
.sw-th-warn b { font-weight: 700; }

/* ---------- tipografia ---------- */
.sw-th-fonts { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 8px; }
.sw-th-font {
  position: relative; text-align: left; cursor: pointer; font: inherit; color: var(--ink);
  background: var(--row); border: 1px solid transparent; border-radius: var(--r-row);
  padding: 12px 12px 10px; display: flex; flex-direction: column; gap: 8px; min-height: 92px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.sw-th-font:hover { background: var(--row-hover); transform: translateY(-1px); }
.sw-th-font--on { background: var(--white); border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand); }
.sw-th-font__aa { font-size: 30px; line-height: 1; letter-spacing: -0.01em; }
.sw-th-font__name { font-size: 12px; line-height: 1.25; margin-top: auto; }
.sw-th-font__kind { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); font-family: 'Space Grotesk', system-ui, sans-serif; }
.sw-th-font__check {
  position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%;
  background: var(--brand); color: var(--white); font-size: 11px; display: flex; align-items: center; justify-content: center;
}
.sw-th-font--custom .sw-th-font__aa { font-family: 'Space Grotesk', system-ui, sans-serif; font-weight: 300; }

.sw-th-custom {
  margin-top: 12px; padding: 4px 16px 16px; border-radius: var(--r-row); border: 1px dashed var(--subtle);
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 18px; align-items: start;
}
@media (max-width: 760px) { .sw-th-custom { grid-template-columns: 1fr; } }
.sw-th-file {
  margin-top: 8px; display: flex; align-items: center; gap: 10px; background: var(--row);
  border-radius: var(--r-ctl); padding: 8px 10px 8px 12px; font-size: 12px; min-width: 0;
}
.sw-th-file__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-th-custom .sw-drop { min-height: 96px !important; aspect-ratio: auto; }

.sw-th-specimen {
  border-radius: var(--r-row); padding: 28px 24px; margin-top: 4px; border: 1px solid var(--divider);
  transition: background 0.2s, color 0.2s;
}
.sw-th-specimen__eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.6; margin-bottom: 12px; }
.sw-th-specimen__title { font-size: 34px; line-height: 1.05; margin: 0 0 12px; letter-spacing: -0.005em; word-break: break-word; }
.sw-th-specimen__body { font-size: 15px; line-height: 1.55; margin: 0; max-width: 460px; opacity: 0.85; }
.sw-th-specimen__btn {
  display: inline-block; margin-top: 18px; padding: 12px 22px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
  border: none; cursor: default;
}

.sw-th-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 22px; align-items: start; }
@media (max-width: 760px) { .sw-th-row { grid-template-columns: 1fr; } }

/* ---------- slider + número ---------- */
.sw-th-range { display: flex; align-items: center; gap: 12px; }
.sw-th-range input[type='range'] {
  flex: 1; min-width: 0; accent-color: var(--brand); height: 4px; cursor: pointer;
}
.sw-th-range .sw-input { width: 86px; flex-shrink: 0; text-align: center; font-variant-numeric: tabular-nums; }
.sw-th-range__unit { font-size: 11px; color: var(--muted); letter-spacing: 0.06em; margin-left: -6px; }

/* ---------- formas ---------- */
.sw-th-shape { display: grid; grid-template-columns: minmax(0, 1fr) 190px; gap: 22px; align-items: center; }
@media (max-width: 760px) { .sw-th-shape { grid-template-columns: 1fr; } }
.sw-th-stage {
  border-radius: var(--r-row); background: var(--surface); border: 1px solid var(--divider);
  padding: 18px; display: flex; align-items: center; justify-content: center; min-height: 150px;
  transition: background 0.2s;
}
.sw-th-mock { width: 150px; overflow: hidden; box-shadow: var(--shadow-card); transition: border-radius 0.2s; }
.sw-th-mock__img { height: 92px; }
.sw-th-mock__body { padding: 10px 12px 12px; }
.sw-th-mock__line { height: 7px; border-radius: 4px; opacity: 0.85; }
.sw-th-mock__line + .sw-th-mock__line { margin-top: 6px; width: 55%; opacity: 0.4; }
.sw-th-btn-demo { padding: 13px 26px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; border: none; transition: border-radius 0.2s; cursor: default; }

/* ---------- layout ---------- */
.sw-th-spacing { display: flex; flex-direction: column; width: 120px; padding: 10px; border-radius: 12px; background: var(--surface); border: 1px solid var(--divider); transition: gap 0.2s; }
.sw-th-spacing span { height: 16px; border-radius: 5px; background: var(--subtle); }
.sw-th-spacing span:nth-child(2) { background: var(--sky); height: 22px; }
.sw-th-width { margin-top: 12px; height: 34px; border-radius: 10px; background: var(--row); position: relative; overflow: hidden; }
.sw-th-width__fill {
  position: absolute; top: 6px; bottom: 6px; left: 50%; transform: translateX(-50%);
  background: var(--sky); border-radius: 6px; transition: width 0.2s;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--ink);
}
.sw-th-width__legend { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); margin-top: 5px; letter-spacing: 0.06em; }
.sw-th-inline-prev { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
.sw-th-hl-mini { font-size: 22px; font-weight: 700; line-height: 1.15; }

/* ---------- abas Estilo / Header / Rodapé ---------- */
.sw-th-tabs { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: 0 2px 14px; }
.sw-th-tabs__hint { font-size: 11px; color: var(--muted); letter-spacing: 0.02em; }
.sw-th-tab { display: inline-flex; align-items: center; gap: 7px; }
.sw-th-tab__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); flex-shrink: 0; }
.sw-th-tab__dot--err { background: var(--danger); }
.sw-th-tab__dot--off { background: transparent; border: 1px dashed currentColor; opacity: 0.55; }

/* ---------- seletor de estilo (header/rodapé) ---------- */
.sw-th-styles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.sw-th-style {
  position: relative; text-align: left; cursor: pointer; font: inherit; color: var(--ink);
  background: var(--row); border: 1px solid transparent; border-radius: 16px; padding: 10px;
  display: flex; flex-direction: column; gap: 10px;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.sw-th-style:hover { background: var(--row-hover); transform: translateY(-1px); }
.sw-th-style--on { background: var(--white); border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand); }
.sw-th-style__art { display: block; border-radius: 10px; overflow: hidden; border: 1px solid var(--divider); background: var(--white); }
.sw-th-style__svg { display: block; width: 100%; height: auto; }
.sw-th-style__foot { display: flex; flex-direction: column; gap: 3px; padding: 0 4px 2px; }
.sw-th-style__name { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
.sw-th-style__hint { font-size: 12px; color: var(--muted); }
.sw-th-style__check {
  position: absolute; top: 16px; right: 16px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--brand); color: var(--white); font-size: 12px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(13, 16, 21, 0.18);
}

/* ---------- header/rodapé ausente ---------- */
.sw-th-global-empty { text-align: center; padding-top: 28px; padding-bottom: 28px; }
.sw-th-global-empty__art { width: 220px; max-width: 70%; margin: 0 auto 18px; border-radius: 14px; overflow: hidden; border: 1px solid var(--divider); }
.sw-th-global-empty__art svg { display: block; width: 100%; height: auto; }
.sw-th-global-empty__title { font-size: 20px; font-weight: 600; margin: 8px 0 8px; letter-spacing: -0.01em; }
.sw-th-global-empty .sw-meta { max-width: 460px; margin: 0 auto; line-height: 1.55; }
.sw-th-global-empty__cta { margin-top: 18px; display: flex; justify-content: center; }

/* ---------- trilha do foco: separador entre grupos e header/rodapé ---------- */
.sw-th-rail-sep { width: 28px; height: 1px; background: var(--line); margin: 6px auto; flex-shrink: 0; }

/* ---------- estado ---------- */
.sw-th-banner { margin-bottom: 14px; }
.sw-th-loading { padding: 60px 0; display: flex; justify-content: center; }
.sw-th-confirm p { margin: 0 0 8px; font-size: 14px; line-height: 1.55; color: var(--ink); }
.sw-th-confirm p.sw-meta { font-size: 12px; }
`

/** Injeta o CSS da view Tema. */
export function ThemeViewStyles() {
  return React.createElement('style', { 'data-swtchr-theme-view': '', dangerouslySetInnerHTML: { __html: THEME_CSS } })
}
