import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { api } from './api.js'

export const C = {
  brand: '#639BFC', ink: '#0D1015', surface: '#F9FAFC', muted: '#8F94A7',
  line: '#DFE3EC', white: '#fff', sky: '#C5E2FA',
}

// ---------- Richtext (Tiptap): WYSIWYG + atalhos markdown ----------
// Digitar "# " vira H1, "## " H2, "**x**" negrito, "- " lista, "> " citação — e a
// toolbar faz o mesmo pra quem não sabe markdown. Saída = HTML → mesmo sanitizador do backend.
export function RichText({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: false, code: false, horizontalRule: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'nofollow noopener' } }),
      Placeholder.configure({ placeholder: placeholder || '' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })
  if (!editor) return null

  const tb = (label, active, on) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      style={{ ...styles.rtBtn, ...(active ? { background: C.sky, borderColor: C.brand } : {}) }}
    >
      {label}
    </button>
  )
  const setLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL do link:', prev || 'https://')
    if (url === null) return
    if (url === '') return editor.chain().focus().unsetLink().run()
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  return (
    <div>
      <div style={styles.rtBar}>
        {tb('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
        {tb('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {tb('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {tb('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        <span style={{ width: 1, background: C.line, margin: '0 2px', alignSelf: 'stretch' }} />
        {tb(<b>B</b>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {tb(<i>I</i>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {tb('• lista', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {tb('🔗', editor.isActive('link'), setLink)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

// ---------- Uploader de imagem (arquivo → /api/upload → URL do CDN) ----------
function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export function ImageUploader({ label, value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setErr('')
    setBusy(true)
    try {
      const b64 = await toBase64(f)
      const { src } = await api.upload(b64, f.name)
      onChange(src)
    } catch (e2) {
      setErr('Falha no upload: ' + e2.message)
    }
    setBusy(false)
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      {value ? (
        <div style={{ margin: '6px 0' }}>
          <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: `1px solid ${C.line}`, display: 'block' }} />
          <button type="button" onClick={() => onChange('')} style={styles.linkBtn}>remover</button>
        </div>
      ) : null}
      <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
      {busy && <span style={{ color: C.muted, marginLeft: 8 }}>enviando…</span>}
      {err && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 4 }}>{err}</div>}
    </div>
  )
}

export const styles = {
  label: { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.muted, margin: '10px 0 4px' },
  input: { width: '100%', fontFamily: 'inherit', fontSize: 14, color: C.ink, background: C.white, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 12px', boxSizing: 'border-box' },
  rtBar: { display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' },
  rtBtn: { border: `1px solid ${C.line}`, background: C.white, borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 13 },
  rtArea: { minHeight: 64, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, lineHeight: 1.5, outline: 'none', background: C.white },
  linkBtn: { background: 'none', border: 'none', color: C.brand, cursor: 'pointer', fontSize: 12, padding: '2px 0' },
  primary: { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', background: C.brand, color: C.white, border: 'none', borderRadius: 8, padding: '11px 18px', cursor: 'pointer' },
  ghost: { fontFamily: 'inherit', fontSize: 13, background: C.white, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 14px', cursor: 'pointer' },
}
