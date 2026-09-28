/**
 * CSS do motor de formulário (classes sw-form-*). Mesma estética do styles/ global
 * (tokens var(--ink), var(--line), var(--brand)...). Injetado uma vez no <head> por <FormStyles />.
 */
import React, { useEffect } from 'react'

export const FORM_CSS = `
.sw-form { min-width: 0; }
.sw-form .sw-fields { gap: 0 20px; }

/* grupos (objetos do schema) */
.sw-form-group {
  border: 1px solid var(--line); border-radius: var(--r-row, 14px);
  background: var(--white); padding: 4px 18px 16px; margin: 16px 0 2px;
}
.sw-form-group--nested { background: var(--surface); border-style: dashed; }
.sw-form-group__head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin: 14px 0 0; }
.sw-form-group__title {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--ink); margin: 0;
}
.sw-form-group__desc { font-size: 12px; color: var(--muted); letter-spacing: 0.02em; line-height: 1.5; margin: 4px 0 0; }

/* seções da raiz: Aparência / Avançado (accordion recolhido) */
.sw-form-acc { border-top: 1px solid var(--divider); margin-top: 22px; }
.sw-form-acc .sw-acc__head { padding: 16px 0 6px; }
.sw-form-acc__hint { font-weight: 500; text-transform: none; letter-spacing: 0.02em; color: var(--subtle); font-size: 12px; margin-left: 6px; }
.sw-form-acc__err { width: 7px; height: 7px; border-radius: 50%; background: var(--danger); display: inline-block; margin-left: 4px; }
.sw-form-acc__body { padding-bottom: 6px; animation: sw-fade 0.2s ease-out both; }

/* ajuda com *destaque* e {tokens} */
.sw-form-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
  background: var(--badge-fill); border: 1px solid var(--badge-border); color: var(--brand);
  border-radius: 5px; padding: 0 4px;
}
.sw-form-preview {
  margin-top: 8px; padding: 10px 12px; border-radius: var(--r-ctl, 10px);
  background: var(--surface); border: 1px dashed var(--line);
  font-size: 15px; font-weight: 700; line-height: 1.25; color: var(--ink); letter-spacing: 0.01em;
}
.sw-form-preview__tag { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--subtle); margin-bottom: 4px; }
.sw-form-hl { font-style: normal; color: var(--brand); background: linear-gradient(transparent 62%, var(--sky) 62%); }

/* textarea autoexpansível */
textarea.sw-input.sw-form-autosize { resize: none; overflow: hidden; min-height: 46px; }

/* número */
.sw-form-num { display: flex; align-items: center; gap: 8px; }
.sw-form-num .sw-input { max-width: 140px; }
.sw-form-num__range { font-size: 11px; color: var(--subtle); letter-spacing: 0.04em; white-space: nowrap; }

/* caixas compactas (mídia, CTA) */
.sw-form-box {
  border: 1px solid var(--line); border-radius: var(--r-row, 14px);
  background: var(--white); padding: 2px 16px 14px; margin: 14px 0 2px;
}
.sw-form-box .sw-label:first-child { margin-top: 12px; }
.sw-form-cta { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important; }
.sw-form-media__drops { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.sw-form-media__drop { flex: 1 1 180px; min-width: 0; max-width: 280px; }
.sw-form-media__drop > * { max-width: 100% !important; }
.sw-form-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.sw-form-chip {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
  border: 1px solid var(--line); background: var(--white); color: var(--muted);
  border-radius: var(--r-pill, 999px); padding: 5px 11px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.sw-form-chip:hover { border-color: var(--subtle); color: var(--ink); }
.sw-form-chip--on { background: var(--ink); border-color: var(--ink); color: var(--white); }
.sw-form-chip--on:hover { color: var(--white); }

/* lista repetível */
.sw-form-items__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 16px 0 10px; }
.sw-form-items__head .sw-label { margin: 0; }
.sw-form-items__count { color: var(--subtle); margin-left: 4px; }
.sw-form-items__empty { color: var(--muted); font-size: 13px; padding: 2px 0 10px; }
.sw-form-item__actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sw-form-item__actions .sw-btn--link { font-size: 11px; }
.sw-form-item__title { font-size: 12px; white-space: nowrap; }
.sw-form-item__err { width: 6px; height: 6px; border-radius: 50%; background: var(--danger); flex-shrink: 0; }
.sw-form .sw-slide { background: var(--surface); }
.sw-form .sw-slide .sw-slide { background: var(--white); }
.sw-form .sw-slide__body { padding-top: 2px; }

.sw-form-seg { max-width: 100%; overflow-x: auto; }
`

const STYLE_ID = 'sw-form-css'

/** Injeta o CSS do formulário no <head> (uma vez, mesmo com vários formulários na tela). */
export function FormStyles(): React.ReactElement | null {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = FORM_CSS
    document.head.appendChild(el)
  }, [])
  return null
}
