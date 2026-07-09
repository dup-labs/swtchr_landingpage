import React, { useState } from 'react'
import { RichText } from './ui.jsx'
import Dropzone from './components/Dropzone.jsx'
import { Toggle } from './components/primitives.jsx'
import { SortableList, SortableItem, DragHandle, arrayMove, uid } from './dnd.jsx'

// roteador de campo por tipo (usado em blocos e, recursivamente, em slides).
// Cada campo sai embrulhado em .sw-field; os "largos" (imagem/richtext/slides)
// ganham --full pra ocupar a linha inteira dentro do grid .sw-fields.
export function FieldEditor({ field, value, onChange, idKey }) {
  if (field.type === 'items')
    return (
      <div className="sw-field sw-field--full">
        <ItemsEditor field={field} items={Array.isArray(value) ? value : []} onChange={onChange} idKey={idKey} />
      </div>
    )
  if (field.type === 'image')
    return (
      <div className="sw-field" style={{ margin: '14px 0', display: 'flex' }}>
        <Dropzone label={field.label} value={value || ''} onChange={onChange} />
      </div>
    )
  if (field.type === 'toggle')
    return (
      <div className="sw-field sw-field--toggle" style={{ margin: '14px 0' }}>
        <Toggle checked={value === '' || value == null ? !!field.default : !!value} onChange={onChange} label={field.label} />
      </div>
    )
  if (field.type === 'number')
    return (
      <div className="sw-field">
        <label className="sw-label">{field.label}</label>
        <input
          type="number"
          className="sw-input"
          min={field.min}
          max={field.max}
          value={value === '' || value == null ? '' : value}
          placeholder={String(field.default ?? '')}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        />
      </div>
    )
  if (field.type === 'richtext')
    return (
      <div className="sw-field sw-field--full">
        <label className="sw-label">{field.label}</label>
        <RichText key={idKey} value={value || ''} onChange={onChange} placeholder={field.label} />
      </div>
    )
  return (
    <div className="sw-field">
      <label className="sw-label">{field.label}</label>
      <input className="sw-input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.type === 'url' ? 'https://… ou /caminho' : ''} />
    </div>
  )
}

// resumo curto de um slide recolhido
function itemSummary(it) {
  const txt = (it.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt.slice(0, 40) || it.button_text || (it.image ? '(imagem)' : '(vazio)')
}

// lista repetível com accordion + drag-and-drop (ex.: slides do carrossel)
export function ItemsEditor({ field, items, onChange, idKey }) {
  const [open, setOpen] = useState(() => new Set()) // _uids expandidos; default recolhido
  const toggle = (u) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(u) ? n.delete(u) : n.add(u)
      return n
    })
  const setItemField = (u, fid, v) => onChange(items.map((it) => (it._uid === u ? { ...it, [fid]: v } : it)))
  const add = () => {
    const u = uid()
    onChange([...items, { _uid: u, ...Object.fromEntries(field.itemFields.map((f) => [f.id, f.type === 'items' ? [] : ''])) }])
    setOpen((s) => new Set(s).add(u)) // slide novo entra expandido
  }
  const remove = (u) => onChange(items.filter((it) => it._uid !== u))
  const reorder = (from, to) => onChange(arrayMove(items, from, to))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px' }}>
        <label className="sw-label" style={{ margin: 0 }}>
          {field.label} ({items.length})
        </label>
        <button type="button" onClick={add} className="sw-btn sw-btn--ghost" style={{ padding: '8px 16px' }}>
          + Adicionar slide
        </button>
      </div>
      {items.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '2px 0 8px' }}>Nenhum slide ainda. Clica em “Adicionar slide”.</div>}
      <SortableList ids={items.map((it) => it._uid)} onReorder={reorder}>
        {items.map((it, i) => {
          const isOpen = open.has(it._uid)
          return (
            <SortableItem key={it._uid} id={it._uid}>
              {(dragProps) => (
                <div className="sw-slide">
                  <div className="sw-slide__head">
                    <DragHandle {...dragProps} />
                    <button type="button" className="sw-slide__toggle" onClick={() => toggle(it._uid)}>
                      <span className={'sw-acc__chevron' + (isOpen ? ' sw-acc__chevron--open' : '')} style={{ color: 'var(--muted)', fontSize: 9 }}>
                        ▶
                      </span>
                      <strong style={{ fontSize: 12 }}>Slide {i + 1}</strong>
                      {!isOpen && <span className="sw-slide__summary">— {itemSummary(it)}</span>}
                    </button>
                    <button type="button" className="sw-btn sw-btn--danger" onClick={() => remove(it._uid)}>
                      excluir
                    </button>
                  </div>
                  {isOpen &&
                    (() => {
                      const imgs = field.itemFields.filter((f) => f.type === 'image')
                      const rest = field.itemFields.filter((f) => f.type !== 'image')
                      const editors = (fs) =>
                        fs.map((f) => (
                          <FieldEditor key={f.id} field={f} value={it[f.id]} onChange={(v) => setItemField(it._uid, f.id, v)} idKey={idKey + '-' + it._uid + '-' + f.id} />
                        ))
                      // imagem de um lado, conteúdo do outro (proporção decente pro preview)
                      if (imgs.length)
                        return (
                          <div className="sw-slide__body sw-slide__cols">
                            <div style={{ paddingTop: 14 }}>
                              {imgs.map((f) => (
                                <Dropzone key={f.id} label={f.label} value={it[f.id] || ''} onChange={(v) => setItemField(it._uid, f.id, v)} minHeight={210} />
                              ))}
                            </div>
                            <div className="sw-fields">{editors(rest)}</div>
                          </div>
                        )
                      return <div className="sw-slide__body sw-fields">{editors(field.itemFields)}</div>
                    })()}
                </div>
              )}
            </SortableItem>
          )
        })}
      </SortableList>
    </div>
  )
}
