// Builder da PDP — modelo de config + registry de blocos + render + sanitização.
// Arquitetura (plano v1): o JSON (pdp_config) fica no backend; o tema recebe só o HTML
// pré-renderizado (pdp_html) e faz `{{ product.metafields.swtchr.pdp_html | raw }}`.
// Dois metafields por produto no namespace `swtchr`: pdp_config (JSON) e pdp_html (HTML).

export const NAMESPACE = 'swtchr'
export const KEY_CONFIG = 'pdp_config'
export const KEY_HTML = 'pdp_html'
export const METAFIELD_MAX = 65535 // teto TEXT confirmado no spike (Fase 0)

// ---------- sanitização (server-side, sem deps) ----------
// Allowlist conservadora: só tags/atributos seguros. Remove <script>, on*, javascript:.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
  'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
])
// `rel` fora de propósito: sempre setamos o nosso (evita acumular em re-sanitização)
const ALLOWED_ATTR = { a: new Set(['href', 'target']) }

export function sanitizeRich(html) {
  if (typeof html !== 'string' || !html) return ''
  // remove blocos perigosos inteiros
  let s = html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, '')
  // processa cada tag: mantém só as da allowlist e atributos seguros
  s = s.replace(/<\/?\s*([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (m, tag, attrs) => {
    tag = tag.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    const closing = /^<\s*\//.test(m)
    if (closing) return `</${tag}>`
    const allow = ALLOWED_ATTR[tag] || new Set()
    let safe = ''
    const re = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g
    let a
    while ((a = re.exec(attrs))) {
      const name = a[1].toLowerCase()
      let val = a[3] ?? a[4] ?? ''
      if (name.startsWith('on')) continue // handlers
      if (!allow.has(name)) continue
      // bloqueia esquemas perigosos em href
      if (name === 'href' && /^\s*(javascript|data|vbscript):/i.test(val)) continue
      safe += ` ${name}="${val.replace(/"/g, '&quot;')}"`
    }
    if (tag === 'a') safe += ' rel="nofollow noopener"' // hardening de links de conteúdo
    return `<${tag}${safe}>`
  })
  return s
}

function escapeAttr(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
function escapeHtml(v) {
  return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function isHttpUrl(u) {
  try {
    const x = new URL(u)
    return x.protocol === 'http:' || x.protocol === 'https:'
  } catch {
    return false
  }
}
// link de botão: http(s) absoluto ou relativo com "/". Bloqueia javascript: e cia.
function cleanUrl(v) {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/')) return s
  return ''
}

// ---------- settings de estilo por bloco (desktop/mobile) ----------
// TODO valor sanitizado ANTES de entrar num <style> (senão é injeção de CSS).
function cleanHex(v) {
  return typeof v === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()) ? v.trim() : ''
}
function cleanLen(v) {
  if (v === '' || v == null) return ''
  const s = String(v).trim()
  return /^-?\d{1,4}$/.test(s) ? s : '' // só inteiro (px); permite negativo p/ margin
}
function cleanSide(o) {
  o = o && typeof o === 'object' ? o : {}
  return { t: cleanLen(o.t), r: cleanLen(o.r), b: cleanLen(o.b), l: cleanLen(o.l) }
}
function cleanOneStyle(o) {
  o = o && typeof o === 'object' ? o : {}
  return {
    bg: cleanHex(o.bg),
    color: cleanHex(o.color),
    margin: cleanSide(o.margin),
    padding: cleanSide(o.padding),
    container: o.container === 'grid' ? 'grid' : 'full',
  }
}
export function defaultSettings() {
  const side = () => ({ t: '', r: '', b: '', l: '' })
  const one = () => ({ bg: '', color: '', margin: side(), padding: side(), container: 'full' })
  return { desktop: one(), mobile: one() }
}
function cleanSettings(s) {
  s = s && typeof s === 'object' ? s : {}
  return { desktop: cleanOneStyle(s.desktop), mobile: cleanOneStyle(s.mobile) }
}
function sideCss(prop, s) {
  if (!(s.t || s.r || s.b || s.l)) return ''
  const v = (x) => (x === '' ? '0' : x + 'px')
  return `${prop}:${v(s.t)} ${v(s.r)} ${v(s.b)} ${v(s.l)};`
}
function oneStyleCss(s) {
  let css = ''
  if (s.bg) css += `background:${s.bg};`
  if (s.color) css += `color:${s.color};`
  css += sideCss('margin', s.margin)
  css += sideCss('padding', s.padding)
  if (s.container === 'grid') css += `max-width:1100px;margin-left:auto;margin-right:auto;`
  return css
}
// CSS escopado por bloco: desktop na regra base, mobile em media query
function blockCss(cls, settings) {
  const d = oneStyleCss(settings.desktop)
  const m = oneStyleCss(settings.mobile)
  let out = d ? `.${cls}{${d}}` : ''
  if (m) out += `@media(max-width:640px){.${cls}{${m}}}`
  return out
}

// ---------- registry de blocos (v1: 1 componente) ----------
// Cada tipo: label + campos declarados + render(fields) -> HTML sanitizado.
export const BLOCK_TYPES = {
  hero_image_text: {
    label: 'Imagem + Texto',
    fields: [
      { id: 'image', type: 'image', label: 'Imagem' },
      { id: 'text', type: 'richtext', label: 'Texto' },
    ],
    render(fields) {
      const img = isHttpUrl(fields.image) ? fields.image : ''
      const text = sanitizeRich(fields.text)
      if (!img && !text) return ''
      return (
        `<section class="swtchr-block swtchr-hero-image-text">` +
        (img ? `<img class="swtchr-block__img" src="${escapeAttr(img)}" alt="" loading="lazy">` : '') +
        (text ? `<div class="swtchr-block__text">${text}</div>` : '') +
        `</section>`
      )
    },
  },

  // Carrossel (Slick no front): lista repetível de slides; cada slide é um flex
  // imagem+texto+botão. O markup vai no pdp_html; o Slick/CSS/init moram no tema
  // (o pdp_html é sanitizado e não pode conter <script>).
  carousel: {
    label: 'Carrossel',
    fields: [
      { id: 'arrows', type: 'toggle', label: 'Mostrar setas', default: true },
      { id: 'dots', type: 'toggle', label: 'Mostrar bullets', default: true },
      { id: 'slides_show', type: 'number', label: 'Slides visíveis', default: 1, min: 1, max: 6 },
      { id: 'slides_scroll', type: 'number', label: 'Slides por scroll', default: 1, min: 1, max: 6 },
      { id: 'gap', type: 'number', label: 'Espaço entre slides (px)', default: 0, min: 0, max: 100 },
      {
        id: 'items',
        type: 'items',
        label: 'Slides',
        itemFields: [
          { id: 'image', type: 'image', label: 'Imagem' },
          { id: 'text', type: 'richtext', label: 'Texto' },
          { id: 'button_text', type: 'text', label: 'Texto do botão' },
          { id: 'button_link', type: 'url', label: 'Link do botão' },
        ],
      },
    ],
    render(fields) {
      const items = Array.isArray(fields.items) ? fields.items : []
      const slides = items
        .map((it) => {
          const img = isHttpUrl(it.image) ? it.image : ''
          const text = sanitizeRich(it.text)
          const btnText = escapeHtml(it.button_text)
          const btnLink = cleanUrl(it.button_link)
          if (!img && !text && !btnText) return ''
          const btn = btnText && btnLink ? `<a class="swtchr-slide__btn" href="${escapeAttr(btnLink)}">${btnText}</a>` : ''
          // wrapper interno (.swtchr-slide__row) leva o flex; o .swtchr-slide é do Slick
          return (
            `<div class="swtchr-slide"><div class="swtchr-slide__row">` +
            (img ? `<div class="swtchr-slide__media"><img src="${escapeAttr(img)}" alt="" loading="lazy"></div>` : '') +
            `<div class="swtchr-slide__body">${text ? `<div class="swtchr-slide__text">${text}</div>` : ''}${btn}</div>` +
            `</div></div>`
          )
        })
        .filter(Boolean)
      if (!slides.length) return ''
      const dots = fields.dots !== false
      const arrows = fields.arrows !== false
      const show = Number(fields.slides_show) || 1
      const scroll = Number(fields.slides_scroll) || 1
      const gap = Number(fields.gap) || 0
      // opções do Slick viajam como data-attrs; o gap vai numa CSS var no elemento
      const opts =
        `data-dots="${dots}" data-arrows="${arrows}" data-show="${show}" data-scroll="${scroll}"` +
        (gap ? ` style="--swtchr-gap:${gap}px"` : '')
      return `<section class="swtchr-block swtchr-carousel-block"><div class="swtchr-carousel" ${opts}>${slides.join('')}</div></section>`
    },
  },
}

// ---------- config: normalização + validação ----------
export function emptyConfig() {
  return { banner: { desktop: '', mobile: '', link: '', text: '', textEnabled: true, bg: '', color: '' }, blocks: [] }
}

// limpa os campos de um bloco conforme os tipos declarados no registry
// (richtext -> sanitiza; image -> só http(s); resto -> string). Assim o config
// GRAVADO já é seguro, não só o HTML renderizado.
function cleanOne(type, v) {
  if (type === 'richtext') return sanitizeRich(typeof v === 'string' ? v : '')
  if (type === 'image') return isHttpUrl(v) ? v : ''
  if (type === 'url') return cleanUrl(v)
  return typeof v === 'string' ? v : ''
}
function cleanBool(v, def) {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return !!def
}
function cleanNum(v, def, min, max) {
  const n = parseInt(v, 10)
  if (Number.isNaN(n)) return def
  return Math.max(min, Math.min(max, n))
}
function cleanItem(itemFields, item) {
  const src = item && typeof item === 'object' ? item : {}
  const out = {}
  for (const f of itemFields) out[f.id] = cleanOne(f.type, src[f.id])
  return out
}
function cleanFields(type, fields) {
  const def = BLOCK_TYPES[type]
  const src = fields && typeof fields === 'object' ? fields : {}
  const out = {}
  for (const f of def.fields) {
    if (f.type === 'items') {
      const arr = Array.isArray(src[f.id]) ? src[f.id] : []
      out[f.id] = arr.slice(0, 30).map((it) => cleanItem(f.itemFields, it)) // teto de 30 slides
    } else if (f.type === 'toggle') {
      out[f.id] = cleanBool(src[f.id], f.default)
    } else if (f.type === 'number') {
      out[f.id] = cleanNum(src[f.id], f.default ?? 0, f.min ?? 0, f.max ?? 9999)
    } else {
      out[f.id] = cleanOne(f.type, src[f.id])
    }
  }
  return out
}

export function normalizeConfig(raw) {
  const c = raw && typeof raw === 'object' ? raw : {}
  const b = c.banner && typeof c.banner === 'object' ? c.banner : {}
  const blocks = Array.isArray(c.blocks) ? c.blocks : []
  return {
    banner: {
      desktop: isHttpUrl(b.desktop) ? b.desktop : '',
      mobile: isHttpUrl(b.mobile) ? b.mobile : '',
      link: cleanUrl(b.link),
      text: sanitizeRich(typeof b.text === 'string' ? b.text : ''),
      // default true = retrocompat: config antigo sem o campo continua exibindo o texto
      textEnabled: cleanBool(b.textEnabled, true),
      bg: cleanHex(b.bg),
      color: cleanHex(b.color),
    },
    blocks: blocks
      .filter((x) => x && BLOCK_TYPES[x.type])
      .map((x, i) => ({
        id: typeof x.id === 'string' && x.id ? x.id : `b${i + 1}`,
        type: x.type,
        visible: x.visible !== false,
        fields: cleanFields(x.type, x.fields),
        settings: cleanSettings(x.settings),
      })),
  }
}

export function validateConfig(config) {
  const errors = []
  const c = normalizeConfig(config)
  if (c.banner.text && c.banner.text.length > 20000) errors.push('texto do banner muito longo')
  c.blocks.forEach((bl, i) => {
    if (!BLOCK_TYPES[bl.type]) errors.push(`bloco ${i + 1}: tipo desconhecido`)
  })
  return errors
}

// ---------- render: config -> pdp_html (banner + blocos visíveis, em ordem) ----------
export function renderBanner(banner) {
  const d = isHttpUrl(banner.desktop) ? banner.desktop : ''
  const m = isHttpUrl(banner.mobile) ? banner.mobile : ''
  const link = cleanUrl(banner.link)
  const text = banner.textEnabled === false ? '' : sanitizeRich(banner.text)
  const bg = cleanHex(banner.bg)
  const color = cleanHex(banner.color)
  if (!d && !m && !text) return ''
  let picture = ''
  if (d || m) {
    picture =
      `<picture class="swtchr-banner__pic">` +
      (m ? `<source media="(max-width: 640px)" srcset="${escapeAttr(m)}">` : '') +
      `<img src="${escapeAttr(d || m)}" alt="" loading="eager">` +
      `</picture>`
    if (link) picture = `<a class="swtchr-banner__link" href="${escapeAttr(link)}">${picture}</a>`
  }
  // bg/color só entram no style depois do cleanHex (formato #rgb/#rrggbb garantido)
  const css = (bg ? `background:${bg};` : '') + (color ? `color:${color};` : '')
  const styleAttr = css ? ` style="${css}"` : ''
  return `<section class="swtchr-block swtchr-banner"${styleAttr}>${picture}${text ? `<div class="swtchr-banner__text">${text}</div>` : ''}</section>`
}

export function renderPdpHtml(config) {
  const c = normalizeConfig(config)
  const parts = []
  const styles = []
  const banner = renderBanner(c.banner)
  if (banner) parts.push(banner)
  for (const bl of c.blocks) {
    if (!bl.visible) continue
    const inner = BLOCK_TYPES[bl.type].render(bl.fields)
    if (!inner) continue
    const cls = 'swtchr-b-' + bl.id
    const css = blockCss(cls, bl.settings || defaultSettings())
    if (css) styles.push(css)
    // envolve o bloco num wrapper que recebe os settings (bg/cor/margin/padding/container)
    parts.push(`<div class="swtchr-blockwrap ${cls}">${inner}</div>`)
  }
  if (!parts.length) return ''
  const styleTag = styles.length ? `<style>${styles.join('')}</style>` : ''
  return `<div class="swtchr-pdp">${styleTag}${parts.join('')}</div>`
}

// resultado do save: config normalizado + html, com aviso se estourar o teto
export function buildSave(config) {
  const normalized = normalizeConfig(config)
  const html = renderPdpHtml(normalized)
  const configStr = JSON.stringify(normalized)
  return {
    normalized,
    html,
    configStr,
    overLimit: html.length > METAFIELD_MAX || configStr.length > METAFIELD_MAX,
    htmlBytes: html.length,
    configBytes: configStr.length,
  }
}
