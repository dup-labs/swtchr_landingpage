import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

// tokens em JS (raros casos fora do CSS — ex.: dnd.jsx); a fonte canônica é styles.css
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
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={on} className={'sw-rt__btn' + (active ? ' sw-rt__btn--on' : '')}>
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
      <div className="sw-rt__bar">
        {tb('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
        {tb('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {tb('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {tb('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        <span className="sw-rt__sep" />
        {tb(<b>B</b>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {tb(<i>I</i>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {tb('• lista', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {tb('🔗', editor.isActive('link'), setLink)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
