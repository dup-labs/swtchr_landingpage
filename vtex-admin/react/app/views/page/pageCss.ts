import React from 'react'

/** CSS do editor de página genérico (complementa styles/css.ts sem editá-lo). */
export const PAGE_CSS = `
.sw-page__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 18px 0 12px; }
.sw-page__head .sw-h3 { margin: 0; }
.sw-page__count { color: var(--muted); font-weight: 500; }
.sw-page__iconbtn {
  width: 28px; height: 28px; border-radius: 999px; border: 1px solid transparent; background: none;
  color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; line-height: 1; padding: 0; transition: background 0.15s, color 0.15s;
}
.sw-page__iconbtn:hover:not(:disabled) { background: var(--white); color: var(--ink); }
.sw-page__iconbtn:disabled { opacity: 0.3; cursor: default; }
.sw-page__iconbtn--danger:hover:not(:disabled) { color: var(--danger); }
.sw-page__errdot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--danger);
  box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15); flex-shrink: 0;
}
.sw-page__block--err > .sw-block { box-shadow: inset 0 0 0 1px rgba(192, 57, 43, 0.35); }
.sw-page__body-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--divider); }
.sw-page__empty { padding: 28px 16px; text-align: center; color: var(--muted); border: 1px dashed var(--subtle); border-radius: 14px; margin-bottom: 10px; }
.sw-page__add { width: 100%; justify-content: center; margin-top: 4px; }
.sw-page__seo { margin-top: 18px; }
.sw-page__errbox { margin: 0 0 12px; }
.sw-page__back { margin-right: 4px; }
/* zonas (plp/search/pdp) */
.sw-page__zone { margin: 22px 0 10px; }
.sw-page__zone:first-of-type { margin-top: 8px; }
.sw-page__zonehead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.sw-page__zonetitle { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink); }
.sw-page__zonehelp { font-size: 12px; color: var(--muted); }
.sw-page__zoneempty { padding: 14px 16px; text-align: center; font-size: 13px; color: var(--muted); border: 1px dashed var(--subtle); border-radius: 14px; margin-bottom: 8px; }
.sw-page__anchor { margin: 6px 0 4px; }
.sw-page__warn { margin: 0 0 12px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
/* rolagem até a section não esconde o topo atrás da DraftBar sticky */
[id^="sw-sec-"] { scroll-margin-top: 96px; }
`

export function PageStyles() {
  return React.createElement('style', { dangerouslySetInnerHTML: { __html: PAGE_CSS } })
}
