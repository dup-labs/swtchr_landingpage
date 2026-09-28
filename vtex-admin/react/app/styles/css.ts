/**
 * CSS global do painel swtchr (porte 1:1 de nuvemshop/panel/src/styles.css + extensões VTEX IO).
 * Injetado por <GlobalStyles />. Não importar .css (o builder react do IO não garante loader).
 * Classes sw-* são a API visual compartilhada entre as views.
 */
/* eslint-disable */
const css = `
/* =====================================================================
   SWTCHR — painel (porte Nuvemshop → VTEX IO) · camada de estilo
   Tokens espelham 1-products/swtchr/DESIGN_SYSTEM.md
   Light mode only · sem gradientes · Space Grotesk
   ===================================================================== */

/* ---------- 1. Tokens ---------- */
:root {
  --ink: #0d1015;
  --brand: #639bfc;
  --sky: #c5e2fa;
  --muted: #5c6173; /* era #8f94a7 — escurecido p/ leitura (contraste ~6:1 no branco) */
  --line: #dfe3ec;
  --subtle: #7d8398; /* era #c5cbe0 — itens inativos/placeholders (~4:1) */
  --surface: #f9fafc;
  --white: #ffffff;

  /* compostos */
  --glass: rgba(255, 255, 255, 0.55);
  --badge-fill: rgba(99, 155, 252, 0.08);
  --badge-border: rgba(99, 155, 252, 0.2);
  --divider: rgba(13, 16, 21, 0.06);
  --overlay: rgba(13, 16, 21, 0.35);
  --row: #ecf0f8; /* derivado de subtle/sky sobre branco — rows de produto/bloco */
  --row-hover: #e2e8f4;
  --danger: #c0392b;

  --shadow-card: 0 1px 2px rgba(13, 16, 21, 0.03), 0 8px 24px rgba(13, 16, 21, 0.04);
  --shadow-pop: 0 12px 40px rgba(13, 16, 21, 0.16);
  --blur: 16px;

  --r-card: 20px;
  --r-row: 14px;
  --r-ctl: 10px;
  --r-pill: 999px;

  --pad-card: 24px;
}

/* ---------- 2. Base ---------- */
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--surface);
  color: var(--ink);
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 14px;
  letter-spacing: 0.01em;
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font-family: inherit; }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
::selection { background: var(--sky); }

/* ---------- 3. Keyframes ---------- */
@keyframes sw-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sw-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes sw-spin { to { transform: rotate(360deg); } }

.anim-fade { animation: sw-fade 0.5s ease-out both; animation-delay: var(--delay, 0s); }
.anim-up { animation: sw-up 0.8s cubic-bezier(0.2, 0, 0, 1) both; animation-delay: var(--delay, 0s); }

/* ---------- 4. Tipografia utilitária ---------- */
/* regra da casa: quanto menor o texto, maior o letter-spacing */
.sw-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: var(--brand); }
.sw-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin: 14px 0 6px; }
.sw-title { font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink); margin: 0; }
.sw-meta { font-size: 12px; color: var(--muted); letter-spacing: 0.03em; }
.sw-h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted); margin: 0 0 14px; }

/* ---------- 5. Shell ---------- */
.sw-app { min-height: 100vh; padding: 16px; display: flex; flex-direction: column; gap: 14px; }

.sw-topbar {
  background: var(--white);
  border: 1px solid var(--divider);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: 26px 30px;
  display: flex; align-items: center; justify-content: space-between;
}
.sw-topbar__logo { height: 22px; display: block; }

.sw-shell {
  display: grid; grid-template-columns: 232px minmax(0, 1fr); gap: 14px; align-items: start; flex: 1;
  transition: grid-template-columns 0.35s cubic-bezier(0.2, 0, 0, 1);
}
/* modo foco: sidebar vira trilha */
.sw-shell--focus { grid-template-columns: 76px minmax(0, 1fr); }

.sw-sidebar {
  background: var(--white);
  border: 1px solid var(--divider);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: 14px 10px;
  display: flex; flex-direction: column; gap: 2px;
  position: sticky; top: 16px;
}
.sw-sidebar__item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; border: none; background: none; cursor: pointer; text-align: left;
  padding: 13px 14px; border-radius: 12px;
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--subtle);
  transition: background 0.15s, color 0.15s;
}
.sw-sidebar__item:hover { background: var(--surface); color: var(--muted); }
.sw-sidebar__item--active { color: var(--ink); }
.sw-sidebar__item--active:hover { background: none; color: var(--ink); }
.sw-sidebar__chevron { color: var(--muted); font-size: 13px; font-weight: 400; }
.sw-sidebar__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-sidebar__mini { display: none; }
/* trilha do modo foco: pílulas abreviadas (tooltip = title) */
.sw-sidebar--compact { padding: 12px 8px; gap: 6px; align-items: center; }
.sw-sidebar--compact .sw-sidebar__item { justify-content: center; padding: 4px; width: auto; }
.sw-sidebar--compact .sw-sidebar__item:hover { background: none; }
.sw-sidebar--compact .sw-sidebar__label,
.sw-sidebar--compact .sw-sidebar__chevron,
.sw-sidebar--compact .sw-badge { display: none; }
.sw-sidebar--compact .sw-sidebar__mini {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 32px; border-radius: var(--r-pill);
  background: var(--surface); border: 1px solid var(--line);
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: var(--subtle);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  animation: sw-fade 0.25s ease-out both;
}
.sw-sidebar--compact .sw-sidebar__item:hover .sw-sidebar__mini { background: var(--row); color: var(--muted); }
.sw-sidebar--compact .sw-sidebar__item--active .sw-sidebar__mini,
.sw-sidebar--compact .sw-sidebar__item--active:hover .sw-sidebar__mini { background: var(--white); border-color: var(--ink); color: var(--ink); }
.sw-sidebar--compact .sw-sidebar__item--soon .sw-sidebar__mini { opacity: 0.55; }

.sw-main { min-width: 0; }

@media (max-width: 1000px) {
  .sw-shell, .sw-shell--focus { grid-template-columns: 1fr; }
  .sw-sidebar { position: static; flex-direction: row; flex-wrap: wrap; padding: 8px; }
  .sw-sidebar__item { width: auto; flex: 1 1 auto; justify-content: center; }
}

/* ---------- 6. Superfícies ---------- */
.sw-card {
  background: var(--white);
  border: 1px solid var(--divider);
  border-radius: var(--r-card);
  box-shadow: var(--shadow-card);
  padding: var(--pad-card);
  margin-bottom: 14px;
}

/* ---------- 7. Botões ---------- */
.sw-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: none; cursor: pointer; white-space: nowrap;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em;
  border-radius: var(--r-pill);
  padding: 13px 24px;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s;
}
.sw-btn:active { transform: translateY(1px); }
.sw-btn:disabled { opacity: 0.55; cursor: default; }

.sw-btn--primary { background: var(--ink); color: var(--white); }
.sw-btn--primary:hover:not(:disabled) { box-shadow: 0 6px 18px rgba(13, 16, 21, 0.22); }

.sw-btn--soft { background: var(--sky); color: var(--ink); }
.sw-btn--soft:hover:not(:disabled) { background: #b3d8f8; }

.sw-btn--ghost { background: var(--white); color: var(--ink); border: 1px solid var(--line); }
.sw-btn--ghost:hover:not(:disabled) { border-color: var(--subtle); }

.sw-btn--link { background: none; border: none; color: var(--brand); padding: 2px 0; font-size: 12px; letter-spacing: 0.04em; text-transform: none; border-radius: 4px; }
.sw-btn--danger { background: none; border: none; color: var(--danger); padding: 2px 4px; font-size: 10px; letter-spacing: 0.1em; }
.sw-btn--danger:hover { text-decoration: underline; }

/* ---------- 8. Badges ---------- */
.sw-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em;
  border-radius: 6px; padding: 5px 10px;
  background: var(--badge-fill); border: 1px solid var(--badge-border); color: var(--brand);
}
.sw-badge__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--brand); }
.sw-badge--soon {
  font-size: 8px; padding: 3px 7px; letter-spacing: 0.16em;
  background: var(--surface); border: 1px solid var(--line); color: var(--subtle); border-radius: 5px;
}

/* ---------- 9. Rows (produto / bloco) ---------- */
.sw-row {
  display: flex; align-items: center; gap: 14px;
  width: 100%; text-align: left; border: none; cursor: pointer;
  background: var(--row); border-radius: var(--r-row);
  padding: 18px 20px; margin-bottom: 10px;
  transition: background 0.15s;
}
.sw-row:hover { background: var(--row-hover); }
/* produto do catálogo ainda sem conteúdo cadastrado */
.sw-row--ghost { background: var(--white); border: 1px dashed var(--subtle); }
.sw-row--ghost:hover { background: var(--surface); }
.sw-row--ghost .sw-row__action { color: var(--brand); }
.sw-row__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.sw-row__title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-row__action { flex-shrink: 0; font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--ink); }
.sw-row:hover .sw-row__action { color: var(--brand); }

/* ---------- 10. Forms ---------- */
.sw-input, .sw-select {
  width: 100%; font-size: 14px; color: var(--ink);
  background: var(--white); border: 1px solid var(--line); border-radius: var(--r-ctl);
  padding: 11px 14px; transition: border-color 0.15s;
}
.sw-input::placeholder { color: var(--subtle); }
.sw-input--pill { border-radius: var(--r-pill); padding: 13px 22px; }
.sw-input:focus, .sw-select:focus { outline: none; border-color: var(--brand); }
textarea.sw-input { resize: vertical; min-height: 72px; line-height: 1.5; }

/* switch */
.sw-switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: var(--ink); user-select: none; }
.sw-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.sw-switch__track {
  width: 36px; height: 21px; border-radius: var(--r-pill); flex-shrink: 0;
  background: var(--line); position: relative; transition: background 0.18s;
}
.sw-switch__track::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 15px; height: 15px;
  border-radius: 50%; background: var(--white); box-shadow: 0 1px 3px rgba(13, 16, 21, 0.25);
  transition: transform 0.18s;
}
.sw-switch input:checked + .sw-switch__track { background: var(--ink); }
.sw-switch input:checked + .sw-switch__track::after { transform: translateX(15px); }
.sw-switch input:focus-visible + .sw-switch__track { outline: 2px solid var(--brand); outline-offset: 2px; }

/* segmented (Desktop | Mobile) */
.sw-seg { display: inline-flex; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill); padding: 3px; gap: 2px; }
.sw-seg__btn {
  border: none; background: none; cursor: pointer;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--muted); border-radius: var(--r-pill); padding: 7px 16px;
  transition: background 0.15s, color 0.15s;
}
.sw-seg__btn--on { background: var(--ink); color: var(--white); }

/* spacing em cruz (margin/padding aninhados) */
.sw-spacing { border: 1px dashed var(--line); border-radius: 12px; padding: 10px; }
.sw-spacing--inner { border-style: solid; background: var(--surface); }
.sw-spacing__tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--subtle); margin: 0 0 6px 4px; }
.sw-spacing__grid { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.sw-spacing__mid { display: flex; align-items: center; gap: 10px; width: 100%; justify-content: center; }
.sw-spacing input {
  width: 52px; font-size: 12px; text-align: center; color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px; padding: 6px 4px; background: var(--white);
}
.sw-spacing input:focus { outline: none; border-color: var(--brand); }
.sw-spacing__core { flex: 1; max-width: 150px; height: 44px; border: 1px solid var(--line); border-radius: 8px; background: var(--white); }

/* color field — swatch preenche a caixa inteira (sem moldura nativa do webkit) */
.sw-color { display: flex; gap: 8px; align-items: center; }
.sw-color input[type='color'] {
  width: 44px; height: 40px; border: 1px solid var(--line); border-radius: var(--r-ctl);
  padding: 0; background: var(--white); cursor: pointer; overflow: hidden;
  -webkit-appearance: none; appearance: none;
}
.sw-color input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
.sw-color input[type='color']::-webkit-color-swatch { border: none; border-radius: 0; }
.sw-color input[type='color']::-moz-color-swatch { border: none; }

/* ---------- 11. Dropzone ---------- */
.sw-drop {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  aspect-ratio: 4 / 3; width: 100%;
  background: var(--surface); border: 1px dashed var(--subtle); border-radius: var(--r-row);
  cursor: pointer; overflow: hidden; text-align: center;
  transition: border-color 0.15s, background 0.15s;
  color: var(--subtle);
}
.sw-drop:hover { border-color: var(--brand); color: var(--muted); }
.sw-drop--drag { border-color: var(--brand); background: var(--badge-fill); }
.sw-drop--filled { border-style: solid; border-color: var(--line); background: var(--white); padding: 0; }
.sw-drop__preview { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sw-drop__actions {
  position: absolute; inset: auto 8px 8px auto; display: flex; gap: 6px; opacity: 0;
  transition: opacity 0.15s;
}
.sw-drop--filled:hover .sw-drop__actions { opacity: 1; }
.sw-drop__chip {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
  background: rgba(13, 16, 21, 0.75); color: var(--white); border: none; cursor: pointer;
  border-radius: var(--r-pill); padding: 6px 12px; backdrop-filter: blur(4px);
}
.sw-drop__caption { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); margin-top: 8px; text-align: center; }
.sw-drop__err { color: var(--danger); font-size: 12px; margin-top: 6px; }

/* ---------- 12. Blocos ---------- */
.sw-block { background: var(--row); border-radius: var(--r-row); margin-bottom: 10px; overflow: hidden; }
.sw-block--off { opacity: 0.6; }
.sw-block__head { display: flex; align-items: center; gap: 12px; padding: 13px 16px; }
.sw-block__thumb {
  width: 44px; height: 44px; border-radius: 10px; background: var(--white);
  border: 1px solid var(--divider); flex-shrink: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.sw-block__title-btn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; text-align: left; padding: 6px 0; }
.sw-block__body { background: var(--white); border-top: 1px solid var(--divider); padding: 20px; }

/* accordion configurações do bloco */
.sw-acc__head {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: none; border: none; cursor: pointer; padding: 12px 0 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; color: var(--muted);
}
.sw-acc__chevron { display: inline-block; font-size: 10px; transition: transform 0.15s; }
.sw-acc__chevron--open { transform: rotate(90deg); }

/* ---------- 13. Modal ---------- */
.sw-overlay {
  position: fixed; inset: 0; z-index: 50; background: var(--overlay);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  animation: sw-fade 0.2s ease-out both;
}
.sw-modal {
  background: var(--white); border-radius: var(--r-card); box-shadow: var(--shadow-pop);
  width: min(880px, 100%); max-height: calc(100vh - 48px); overflow: auto;
  padding: 28px; animation: sw-up 0.35s cubic-bezier(0.2, 0, 0, 1) both;
}
.sw-modal__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.sw-modal__title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; margin: 0; }
.sw-modal__x { background: none; border: none; cursor: pointer; font-size: 15px; font-weight: 700; color: var(--muted); padding: 4px 8px; border-radius: 8px; }
.sw-modal__x:hover { color: var(--ink); }
.sw-modal__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 760px) { .sw-modal__grid { grid-template-columns: repeat(2, 1fr); } }
.sw-modal__foot { display: flex; justify-content: flex-end; margin-top: 22px; }

.sw-typecard {
  border: 1px solid var(--line); border-radius: var(--r-row); overflow: hidden;
  background: var(--white); cursor: pointer; padding: 0; text-align: left; position: relative;
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
}
.sw-typecard:hover:not(.sw-typecard--disabled) { transform: translateY(-2px); box-shadow: var(--shadow-card); }
.sw-typecard--selected { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand); }
.sw-typecard--disabled { cursor: default; opacity: 0.75; }
.sw-typecard__preview { height: 110px; background: var(--surface); display: flex; align-items: center; justify-content: center; }
.sw-typecard--disabled .sw-typecard__preview { opacity: 0.45; }
.sw-typecard__name {
  background: var(--ink); color: var(--white); padding: 11px 12px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; text-align: center;
}
.sw-typecard__soon { position: absolute; top: 8px; right: 8px; }

/* ---------- 14. Feedback ---------- */
.sw-spinner {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid var(--line); border-top-color: var(--brand);
  animation: sw-spin 0.9s linear infinite;
}
.sw-btn .sw-spinner { border-color: rgba(255, 255, 255, 0.3); border-top-color: var(--white); width: 13px; height: 13px; }

.sw-empty { text-align: center; color: var(--muted); padding: 56px 24px; border: 1px dashed var(--line); border-radius: var(--r-card); }
.sw-empty__title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink); margin-bottom: 8px; }
.sw-empty p { font-size: 13px; margin: 0; line-height: 1.6; }

.sw-msg { font-size: 13px; color: var(--brand); animation: sw-fade 0.3s ease-out both; }
.sw-msg--err { color: var(--danger); }

/* ---------- 15. Save bar ---------- */
.sw-savebar {
  position: sticky; bottom: 0; z-index: 10;
  display: flex; align-items: center; justify-content: flex-end; gap: 14px;
  padding: 14px 2px; margin-top: 8px;
  background: rgba(249, 250, 252, 0.82); backdrop-filter: blur(var(--blur));
  border-top: 1px solid var(--divider);
}

/* ---------- 15b. Slides (itens repetíveis) e grid de settings ---------- */
.sw-slide { border: 1px dashed var(--line); border-radius: 12px; background: var(--surface); margin-bottom: 8px; }
.sw-slide__head { display: flex; align-items: center; gap: 4px; padding: 10px 12px; }
.sw-slide__toggle { flex: 1; display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; text-align: left; min-width: 0; padding: 2px 0; color: var(--ink); }
.sw-slide__body { padding: 0 14px 14px; }
.sw-slide__summary { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sw-settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 22px; margin-top: 16px; align-items: start; }

/* grid fluido de campos do bloco: toggles/números/textos lado a lado;
   imagem/richtext/slides ocupam a linha inteira */
.sw-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 20px; align-items: start; }
.sw-fields > .sw-field--full { grid-column: 1 / -1; }
.sw-fields > .sw-field--toggle { padding-top: 26px; }

/* slide expandido: imagem de um lado, conteúdo do outro */
.sw-slide__cols { display: grid; grid-template-columns: minmax(220px, 320px) 1fr; gap: 6px 22px; align-items: start; }
@media (max-width: 760px) { .sw-slide__cols { grid-template-columns: 1fr; } }

/* ---------- 16. Richtext (Tiptap) ---------- */
.sw-rt__bar { display: flex; gap: 4px; margin-bottom: 6px; flex-wrap: wrap; align-items: center; }
.sw-rt__btn {
  border: 1px solid var(--line); background: var(--white); border-radius: 8px;
  padding: 4px 10px; cursor: pointer; font-size: 12px; color: var(--ink);
  transition: background 0.15s, border-color 0.15s;
}
.sw-rt__btn:hover { border-color: var(--subtle); }
.sw-rt__btn--on { background: var(--sky); border-color: var(--brand); }
.sw-rt__sep { width: 1px; background: var(--line); margin: 0 2px; align-self: stretch; }

.ProseMirror {
  min-height: 72px; border: 1px solid var(--line); border-radius: var(--r-ctl);
  padding: 11px 14px; font-size: 14px; line-height: 1.55; outline: none; background: var(--white);
  transition: border-color 0.15s;
}
.ProseMirror:focus { border-color: var(--brand); }
.ProseMirror > * { margin: 0 0 6px; }
.ProseMirror > *:last-child { margin-bottom: 0; }
.ProseMirror h1 { font-size: 1.5em; }
.ProseMirror h2 { font-size: 1.3em; }
.ProseMirror h3 { font-size: 1.12em; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.4em; }
.ProseMirror a { color: var(--brand); }
.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--subtle); float: left; height: 0; pointer-events: none; }

/* =====================================================================
   EXTENSÕES VTEX IO (mesma linguagem visual do painel Nuvemshop)
   ===================================================================== */

/* ---------- 17. Topbar (lado direito) ---------- */
.sw-topbar__brand { display: flex; align-items: baseline; gap: 14px; }
.sw-topbar__by { font-size: 11px; font-weight: 300; letter-spacing: 0.05em; color: var(--muted); }
.sw-topbar__right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }

/* ---------- 18. Badges (variações de status) ---------- */
.sw-badge--ok { background: rgba(39, 174, 96, 0.08); border-color: rgba(39, 174, 96, 0.24); color: #1e8a4c; }
.sw-badge--ok .sw-badge__dot { background: #27ae60; }
.sw-badge--warn { background: rgba(230, 145, 20, 0.08); border-color: rgba(230, 145, 20, 0.26); color: #b86e00; }
.sw-badge--warn .sw-badge__dot { background: #e69114; }
.sw-badge--danger { background: rgba(192, 57, 43, 0.06); border-color: rgba(192, 57, 43, 0.22); color: var(--danger); }
.sw-badge--danger .sw-badge__dot { background: var(--danger); }
.sw-badge--muted { background: var(--surface); border-color: var(--line); color: var(--muted); }
.sw-badge--muted .sw-badge__dot { background: var(--subtle); }

/* spinner dentro de botões claros */
.sw-btn--soft .sw-spinner, .sw-btn--ghost .sw-spinner, .sw-btn--link .sw-spinner, .sw-btn--danger .sw-spinner {
  border-color: var(--line); border-top-color: var(--ink);
}
.sw-btn--sm { padding: 9px 16px; font-size: 10px; letter-spacing: 0.14em; }

/* ---------- 19. Field (label + ajuda) ---------- */
.sw-field { margin-bottom: 6px; min-width: 0; }
.sw-field__help { font-size: 12px; color: var(--muted); letter-spacing: 0.02em; line-height: 1.5; margin: -2px 0 8px; }
.sw-field__help--after { margin: 6px 0 0; }
.sw-field__err { font-size: 12px; color: var(--danger); margin-top: 6px; }
.sw-input--err, .sw-select--err { border-color: var(--danger); }

/* ---------- 20. Select estilizado ---------- */
.sw-select {
  -webkit-appearance: none; -moz-appearance: none; appearance: none; cursor: pointer;
  padding-right: 38px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238f94a7' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; background-size: 10px 6px;
}
.sw-select:disabled, .sw-input:disabled { background-color: var(--surface); color: var(--muted); cursor: default; }
.sw-select::-ms-expand { display: none; }

/* ---------- 21. ColorField (swatch + hex + nativo + tokens) ---------- */
.sw-color__swatch {
  position: relative; width: 44px; height: 40px; flex-shrink: 0;
  border: 1px solid var(--line); border-radius: var(--r-ctl); overflow: hidden; cursor: pointer;
  background-color: var(--white);
  background-image:
    linear-gradient(45deg, var(--line) 25%, transparent 25%),
    linear-gradient(-45deg, var(--line) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--line) 75%),
    linear-gradient(-45deg, transparent 75%, var(--line) 75%);
  background-size: 10px 10px; background-position: 0 0, 0 5px, 5px -5px, -5px 0;
}
.sw-color__swatch:hover { border-color: var(--subtle); }
.sw-color__fill { position: absolute; inset: 0; }
.sw-color__swatch input[type='color'] {
  position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: none; padding: 0;
}
.sw-color__hex { flex: 1; min-width: 0; font-variant-numeric: tabular-nums; }
.sw-color__tokens { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.sw-color__token {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
  background: var(--white); color: var(--muted); border: 1px solid var(--line);
  border-radius: var(--r-pill); padding: 6px 11px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.sw-color__token:hover { border-color: var(--subtle); color: var(--ink); }
.sw-color__token--on { background: var(--ink); border-color: var(--ink); color: var(--white); }
.sw-color__token--on:hover { color: var(--white); }

/* ---------- 22. Section travada (nativa da FastStore) ---------- */
.sw-block--locked { background: var(--white); border: 1px dashed var(--subtle); }
.sw-block--locked .sw-block__thumb { background: var(--surface); }
.sw-block--locked .sw-row__title { color: var(--muted); }
.sw-block__static { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.sw-block__lock { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; color: var(--subtle); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
.sw-block__actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sw-block__meta { font-size: 11px; color: var(--muted); letter-spacing: 0.03em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ---------- 23. Barra de rascunho / publicação ---------- */
.sw-draftbar {
  position: sticky; top: 0; z-index: 15;
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  background: var(--white); border: 1px solid var(--divider); border-radius: var(--r-card);
  box-shadow: var(--shadow-card); padding: 14px 18px 14px 22px; margin-bottom: 14px;
}
.sw-draftbar__info { display: flex; align-items: center; gap: 12px; min-width: 0; }
.sw-draftbar__title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-draftbar__status { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); letter-spacing: 0.03em; white-space: nowrap; }
.sw-draftbar__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--subtle); flex-shrink: 0; }
.sw-draftbar__dot--dirty { background: #e69114; box-shadow: 0 0 0 3px rgba(230, 145, 20, 0.15); }
.sw-draftbar__dot--draft { background: var(--brand); box-shadow: 0 0 0 3px var(--badge-fill); }
.sw-draftbar__dot--live { background: #27ae60; box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.12); }
.sw-draftbar__actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ---------- 24. Editor dividido (formulário + preview) ---------- */
.sw-editor {
  display: grid; grid-template-columns: minmax(320px, 1fr) minmax(0, 3fr); gap: 14px; align-items: start;
  transition: grid-template-columns 0.35s cubic-bezier(0.2, 0, 0, 1);
}
.sw-editor__form { min-width: 0; }
.sw-editor__full { animation: sw-fade 0.35s ease-out both; }
/* modo foco: formulário vira trilha (~76px), preview ganha o resto (mesma forma de trilha → transição suave) */
.sw-editor--focus { grid-template-columns: minmax(76px, 0fr) minmax(0, 3fr); }
.sw-editor--focus .sw-editor__full { display: none; }
.sw-editor__rail { position: sticky; top: 16px; animation: sw-fade 0.3s ease-out both; }

/* trilha (modo foco): card branco com atalhos em coluna */
.sw-rail {
  background: var(--white); border: 1px solid var(--divider); border-radius: var(--r-card);
  box-shadow: var(--shadow-card); padding: 10px 8px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  max-height: calc(100vh - 32px); overflow-y: auto; scrollbar-width: none;
}
.sw-rail::-webkit-scrollbar { display: none; }
.sw-rail__item {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 52px; padding: 4px; border: 1px solid transparent; border-radius: 12px; background: none; cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.sw-rail__item:hover { background: var(--row); }
.sw-rail__item--active { border-color: var(--ink); }
.sw-rail__thumb {
  width: 44px; height: 44px; border-radius: 10px; background: var(--row);
  border: 1px solid var(--divider); overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.sw-rail__item--locked .sw-rail__thumb { background: var(--surface); border-style: dashed; border-color: var(--subtle); }
.sw-rail__glyph {
  width: 44px; height: 32px; border-radius: var(--r-pill); background: var(--surface); border: 1px solid var(--line);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted);
}
.sw-rail__item:hover .sw-rail__glyph { color: var(--ink); }
.sw-rail__empty { font-size: 10px; color: var(--subtle); text-align: center; padding: 8px 0; }
.sw-editor__preview {
  position: sticky; top: 16px; min-width: 0;
  background: var(--white); border: 1px solid var(--divider); border-radius: var(--r-card);
  box-shadow: var(--shadow-card); padding: 14px; display: flex; flex-direction: column; gap: 12px;
}
.sw-preview { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.sw-preview__tools { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.sw-preview__note { margin: 0; padding: 9px 14px; border-radius: 12px; background: var(--badge-fill); border: 1px solid var(--badge-border); font-size: 12px; line-height: 1.5; color: var(--muted); }
.sw-preview__note strong { color: var(--ink); }
.sw-preview__note--warn { background: rgba(230, 160, 40, 0.1); border-color: rgba(230, 160, 40, 0.35); color: #8a5a00; }
.sw-preview__bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 2px 4px; }
.sw-preview__url {
  flex: 1; min-width: 0; font-size: 11px; color: var(--muted); letter-spacing: 0.03em;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-pill);
  padding: 7px 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sw-preview__stage {
  position: relative; display: flex; justify-content: center; align-items: stretch;
  height: calc(100vh - 150px); min-height: 480px;
  background: var(--surface); border-radius: var(--r-row); overflow: hidden;
}
.sw-preview__frame {
  display: block; width: 100%; height: 100%; border: none; background: var(--white);
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
}
.sw-preview__stage--mobile { padding: 14px 0; }
.sw-preview__stage--mobile .sw-preview__frame {
  width: 390px; max-width: 100%; border-radius: 18px;
  border: 1px solid var(--line); box-shadow: var(--shadow-card);
}
.sw-preview__loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(249, 250, 252, 0.7); backdrop-filter: blur(4px); animation: sw-fade 0.2s ease-out both;
}
@media (max-width: 1200px) {
  .sw-editor, .sw-editor--focus { grid-template-columns: 1fr; }
  .sw-editor__rail { display: none; }
  .sw-editor--focus .sw-editor__form { display: none; }
  .sw-editor__preview { position: static; }
  .sw-preview__stage { height: 70vh; }
}

/* ---------- 25. Mensagens e toast ---------- */
.sw-msg--ok { color: #1e8a4c; }
.sw-msg--box {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; border-radius: var(--r-row);
  background: var(--badge-fill); border: 1px solid var(--badge-border); line-height: 1.5;
}
.sw-msg--box.sw-msg--ok { background: rgba(39, 174, 96, 0.07); border-color: rgba(39, 174, 96, 0.22); }
.sw-msg--box.sw-msg--err { background: rgba(192, 57, 43, 0.05); border-color: rgba(192, 57, 43, 0.2); }

.sw-toasts { position: fixed; right: 20px; bottom: 20px; z-index: 60; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; pointer-events: none; }
.sw-toast {
  pointer-events: auto; display: flex; align-items: center; gap: 12px; max-width: 420px;
  background: var(--ink); color: var(--white); border-radius: var(--r-row); box-shadow: var(--shadow-pop);
  padding: 13px 16px 13px 18px; font-size: 13px; letter-spacing: 0.02em; line-height: 1.45;
  animation: sw-up 0.35s cubic-bezier(0.2, 0, 0, 1) both;
}
.sw-toast__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--brand); flex-shrink: 0; }
.sw-toast--ok .sw-toast__dot { background: #3ddc84; }
.sw-toast--err .sw-toast__dot { background: #ff6b5b; }
.sw-toast__x { background: none; border: none; color: rgba(255, 255, 255, 0.55); cursor: pointer; font-size: 12px; font-weight: 700; padding: 2px 4px; }
.sw-toast__x:hover { color: var(--white); }

/* ---------- 26. Drag handle ---------- */
.sw-handle { cursor: grab; color: var(--muted); font-size: 15px; line-height: 1; padding: 2px 4px; touch-action: none; user-select: none; }
.sw-handle:active { cursor: grabbing; }
.sw-handle--disabled { cursor: default; color: var(--line); }

/* ---------- 27. Dropzone (vídeo) ---------- */
.sw-drop__kind { position: absolute; top: 8px; left: 8px; }
video.sw-drop__preview { background: var(--ink); }

/* ---------- 28. Utilitários ---------- */
.sw-stack { display: flex; flex-direction: column; gap: 10px; }
.sw-inline { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sw-spread { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sw-divider { height: 1px; background: var(--divider); border: none; margin: 18px 0; }
.sw-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.sw-card__head .sw-h3 { margin: 0; }
.sw-card--flat { box-shadow: none; }
.sw-card--tight { padding: 16px; }

/* ---------- cards de section compactos (coluna estreita do editor) ---------- */
.sw-editor__form .sw-block__head { flex-wrap: wrap; row-gap: 4px; padding: 12px 14px; gap: 10px; }
.sw-editor__form .sw-block__title-btn,
.sw-editor__form .sw-block__static { flex-direction: column; align-items: flex-start; gap: 3px; padding: 2px 0; min-width: 0; flex: 1; }
.sw-editor__form .sw-block__static { display: flex; }
.sw-editor__form .sw-row__title { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sw-editor__form .sw-block__meta { max-width: 100%; }
.sw-editor__form .sw-block__actions {
  flex-basis: 100%; justify-content: flex-end; gap: 4px;
  padding-top: 6px; border-top: 1px solid var(--divider);
}
.sw-editor__form .sw-block__actions .sw-row__action { margin-left: auto; }
.sw-editor__form .sw-block__body { padding: 16px 14px; }
.sw-editor__form .sw-fields { grid-template-columns: 1fr; }
`

export default css
