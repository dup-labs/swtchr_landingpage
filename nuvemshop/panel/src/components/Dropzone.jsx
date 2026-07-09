import React, { useRef, useState } from 'react'
import { api } from '../api.js'
import { Spinner } from './primitives.jsx'

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

const IconImage = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="26" height="22" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="11" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 24l7-7 5 5 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// uploader: clique ou arraste → /api/upload → URL do CDN da loja
export default function Dropzone({ label, value, onChange, minHeight = 150 }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')

  const send = async (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return setErr('Só imagem.')
    setErr('')
    setBusy(true)
    try {
      const b64 = await toBase64(f)
      const { src } = await api.upload(b64, f.name)
      onChange(src)
    } catch (e) {
      setErr('Falha no upload: ' + e.message)
    }
    setBusy(false)
  }

  const cls = 'sw-drop' + (value ? ' sw-drop--filled' : '') + (drag ? ' sw-drop--drag' : '')
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        className={cls}
        style={{ minHeight }}
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files[0]) }}
      >
        {value ? (
          <>
            <img className="sw-drop__preview" src={value} alt="" />
            <div className="sw-drop__actions">
              <button type="button" className="sw-drop__chip" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>trocar</button>
              <button type="button" className="sw-drop__chip" onClick={(e) => { e.stopPropagation(); onChange('') }}>remover</button>
            </div>
          </>
        ) : busy ? (
          <Spinner label="enviando…" />
        ) : (
          <>
            <IconImage />
            <span style={{ fontSize: 11, letterSpacing: '0.04em' }}>clique ou arraste a imagem</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { send(e.target.files[0]); e.target.value = '' }} />
      </div>
      {label && <div className="sw-drop__caption">{label}</div>}
      {err && <div className="sw-drop__err">{err}</div>}
    </div>
  )
}
