import React, { useEffect, useState } from 'react'
import { api } from './api.js'
import { initNexo } from './nexo.js'
import { C, styles, RichText, ImageUploader } from './ui.jsx'
import { SortableList, SortableItem, DragHandle, arrayMove, uid } from './dnd.jsx'
import { SettingsEditor, emptySettings } from './settings.jsx'

const TABS = [
  { key: 'home', label: 'Home', ready: false },
  { key: 'categoria', label: 'Categoria', ready: false },
  { key: 'produto', label: 'Produto', ready: true },
  { key: 'paginas', label: 'Páginas', ready: false },
]

const emptyFor = (f) =>
  f.type === 'items' ? [] : f.type === 'toggle' ? f.default ?? false : f.type === 'number' ? f.default ?? 0 : ''
const newBlock = (type, fields) => ({
  id: 'b' + Math.random().toString(36).slice(2, 9),
  type,
  visible: true,
  fields: Object.fromEntries((fields || []).map((f) => [f.id, emptyFor(f)])),
  settings: emptySettings(),
})

// adiciona _uid nos itens repetíveis (chave estável pro drag-and-drop; o backend descarta)
function hydrateUids(config) {
  return {
    ...config,
    blocks: config.blocks.map((b) => ({
      ...b,
      fields: Object.fromEntries(
        Object.entries(b.fields).map(([k, v]) =>
          Array.isArray(v) ? [k, v.map((it) => (it && it._uid ? it : { _uid: uid(), ...it }))] : [k, v]
        )
      ),
    })),
  }
}

export default function App() {
  const [tab, setTab] = useState('produto')
  const [mode, setMode] = useState('...')

  useEffect(() => {
    initNexo(setMode)
  }, [])

  return (
    <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: C.ink, background: C.surface, minHeight: '100vh' }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.line}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo-swtchr-black.svg" alt="SWTCHR by dup.agency" style={{ height: 24, display: 'block' }} />
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.muted }}>
          {mode === 'embedded' ? 'no admin' : mode === 'standalone' ? 'standalone' : '…'}
        </span>
      </header>

      <nav style={{ display: 'flex', gap: 4, padding: '0 20px', background: C.white, borderBottom: `1px solid ${C.line}` }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: 'none', background: 'none', cursor: 'pointer', padding: '14px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              color: tab === t.key ? C.ink : C.muted,
              borderBottom: `2px solid ${tab === t.key ? C.brand : 'transparent'}`,
            }}
          >
            {t.label}
            {!t.ready && <span style={{ fontSize: 9, color: C.muted, marginLeft: 5, fontWeight: 600 }}>em breve</span>}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>
        {tab === 'produto' ? <ProductTab /> : <ComingSoon label={TABS.find((t) => t.key === tab).label} />}
      </main>
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div style={{ textAlign: 'center', color: C.muted, padding: '60px 20px', border: `1px dashed ${C.line}`, borderRadius: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{label} — em breve</div>
      <div style={{ fontSize: 13 }}>Este destino depende de recurso de tema seccionável (Ipanema) ainda em liberação pela Nuvemshop.</div>
    </div>
  )
}

// ---------- aba Produto ----------
function ProductTab() {
  const [view, setView] = useState('list') // list | edit
  const [product, setProduct] = useState(null) // {id, name}

  if (view === 'list') {
    return (
      <HistoryList
        onAdd={() => {
          setProduct(null)
          setView('edit')
        }}
        onOpen={(p) => {
          setProduct(p)
          setView('edit')
        }}
      />
    )
  }
  return (
    <Editor
      product={product}
      onPick={setProduct}
      onBack={() => {
        setProduct(null)
        setView('list')
      }}
    />
  )
}

function HistoryList({ onAdd, onOpen }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    api.history().then(setRows).catch((e) => setErr(e.message))
  }, [])
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Produtos editados</h2>
        <button onClick={onAdd} style={styles.primary}>+ Adicionar novo</button>
      </div>
      {err && <div style={{ color: '#c0392b' }}>{err}</div>}
      {rows === null && !err && <div style={{ color: C.muted }}>carregando…</div>}
      {rows && rows.length === 0 && <div style={{ color: C.muted, padding: '40px 0', textAlign: 'center' }}>Nenhum produto editado ainda. Clica em “Adicionar novo”.</div>}
      {rows && rows.map((p) => (
        <button key={p.id} onClick={() => onOpen(p)} style={{ ...rowStyle }}>
          <span>{p.name}</span>
          <span style={{ color: C.muted, fontSize: 12 }}>#{p.id} · editar →</span>
        </button>
      ))}
    </div>
  )
}

function Editor({ product, onPick, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ ...styles.linkBtn, marginBottom: 12 }}>← voltar</button>
      {!product ? <ProductSearch onPick={onPick} /> : <Builder product={product} />}
    </div>
  )
}

function ProductSearch({ onPick }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setRows([])
        return
      }
      setBusy(true)
      try {
        setRows(await api.search(q))
      } catch {
        setRows([])
      }
      setBusy(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>Buscar produto</h2>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="nome ou id do produto" style={styles.input} />
      <div style={{ marginTop: 10 }}>
        {busy && <div style={{ color: C.muted }}>buscando…</div>}
        {rows.map((p) => (
          <button key={p.id} onClick={() => onPick(p)} style={rowStyle}>
            <span>{p.name}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>#{p.id}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Builder({ product }) {
  const [config, setConfig] = useState(null)
  const [blockTypes, setBlockTypes] = useState([])
  const [loadErr, setLoadErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [picking, setPicking] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set()) // blocos recolhidos (accordion)
  const [settingsOpen, setSettingsOpen] = useState(() => new Set()) // painel ⚙ config aberto por bloco

  useEffect(() => {
    setConfig(null)
    setLoadErr('')
    api
      .getPdp(product.id)
      .then((d) => {
        setConfig(hydrateUids(d.config))
        setBlockTypes(d.blockTypes)
        setCollapsed(new Set(d.config.blocks.map((b) => b.id))) // começa tudo recolhido
      })
      .catch((e) => setLoadErr(e.message))
  }, [product.id])

  if (loadErr) return <div style={{ color: '#c0392b' }}>Erro ao carregar: {loadErr}</div>
  if (!config) return <div style={{ color: C.muted }}>carregando config…</div>

  const setBanner = (patch) => setConfig((c) => ({ ...c, banner: { ...c.banner, ...patch } }))
  const setBlock = (id, patch) => setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  const setBlockField = (id, fid, val) => setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, fields: { ...b.fields, [fid]: val } } : b)) }))
  const reorderBlocks = (from, to) => setConfig((c) => ({ ...c, blocks: arrayMove(c.blocks, from, to) }))
  const remove = (id) => setConfig((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }))
  const addBlock = (t) => {
    setConfig((c) => ({ ...c, blocks: [...c.blocks, newBlock(t.type, t.fields)] }))
    setPicking(false) // bloco novo entra expandido (não vai pro set de recolhidos)
  }
  const toggleCollapse = (id) =>
    setCollapsed((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleSettings = (id) =>
    setSettingsOpen((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const r = await api.savePdp(product.id, config)
      setMsg(`Salvo ✓ (${r.htmlBytes}B). Recarrega a página do produto na loja pra ver.`)
    } catch (e) {
      setMsg('Erro: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>{product.name} <span style={{ color: C.muted, fontSize: 13, fontWeight: 400 }}>#{product.id}</span></h2>

      {/* Configurações padrão — banner */}
      <section style={cardStyle}>
        <h3 style={h3}>Configurações padrão · Banner principal</h3>
        <ImageUploader label="Imagem desktop" value={config.banner.desktop} onChange={(v) => setBanner({ desktop: v })} />
        <ImageUploader label="Imagem mobile" value={config.banner.mobile} onChange={(v) => setBanner({ mobile: v })} />
        <label style={styles.label}>Texto do banner</label>
        <RichText key={'banner-' + product.id} value={config.banner.text} onChange={(v) => setBanner({ text: v })} placeholder="texto do banner" />
      </section>

      {/* Blocos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
        <h3 style={{ ...h3, margin: 0 }}>Blocos ({config.blocks.length})</h3>
        <button onClick={() => setPicking((p) => !p)} style={styles.ghost}>+ Adicionar bloco</button>
      </div>

      {picking && (
        <div style={{ ...cardStyle, background: C.sky + '55' }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Escolha o componente:</div>
          {blockTypes.map((t) => (
            <button key={t.type} onClick={() => addBlock(t)} style={{ ...rowStyle }}>
              <span>{t.label}</span>
              <span style={{ color: C.brand, fontSize: 12 }}>adicionar +</span>
            </button>
          ))}
        </div>
      )}

      <SortableList ids={config.blocks.map((b) => b.id)} onReorder={reorderBlocks}>
        {config.blocks.map((b, i) => {
          const def = blockTypes.find((t) => t.type === b.type)
          const open = !collapsed.has(b.id)
          return (
            <SortableItem key={b.id} id={b.id}>
              {(dragProps) => (
                <section style={{ ...cardStyle, opacity: b.visible ? 1 : 0.6, padding: open ? 18 : '10px 12px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: open ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                      <DragHandle {...dragProps} />
                      <button onClick={() => toggleCollapse(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: C.ink, minWidth: 0 }}>
                        <span style={{ color: C.muted, fontSize: 10, display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                        <strong style={{ fontSize: 13 }}>{i + 1}. {def?.label || b.type}</strong>
                        {!b.visible && <span style={{ fontSize: 10, color: C.muted }}>(oculto)</span>}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <label style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="checkbox" checked={b.visible} onChange={(e) => setBlock(b.id, { visible: e.target.checked })} /> visível
                      </label>
                      <button onClick={() => remove(b.id)} style={{ ...miniBtn, color: '#c0392b' }}>excluir</button>
                    </div>
                  </div>
                  {open && (
                    <>
                      {(def?.fields || []).map((f) => (
                        <FieldEditor key={f.id} field={f} value={b.fields[f.id]} onChange={(v) => setBlockField(b.id, f.id, v)} idKey={b.id + f.id} />
                      ))}
                      <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                        <button type="button" onClick={() => toggleSettings(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: C.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                          <span style={{ fontSize: 10, transform: settingsOpen.has(b.id) ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
                          ⚙ Configurações
                        </button>
                        {settingsOpen.has(b.id) && <SettingsEditor settings={b.settings} onChange={(sv) => setBlock(b.id, { settings: sv })} />}
                      </div>
                    </>
                  )}
                </section>
              )}
            </SortableItem>
          )
        })}
      </SortableList>

      <div style={{ position: 'sticky', bottom: 0, background: C.surface, padding: '14px 0', marginTop: 8, borderTop: `1px solid ${C.line}` }}>
        <button onClick={save} disabled={saving} style={{ ...styles.primary, width: '100%' }}>{saving ? 'salvando…' : 'Salvar e publicar'}</button>
        {msg && <div style={{ marginTop: 8, fontSize: 13, color: msg.startsWith('Erro') ? '#c0392b' : C.brand }}>{msg}</div>}
      </div>
    </div>
  )
}

// roteador de campo por tipo (usado em blocos e, recursivamente, em slides)
function FieldEditor({ field, value, onChange, idKey }) {
  if (field.type === 'items') return <ItemsEditor field={field} items={Array.isArray(value) ? value : []} onChange={onChange} idKey={idKey} />
  if (field.type === 'image') return <ImageUploader label={field.label} value={value || ''} onChange={onChange} />
  if (field.type === 'toggle')
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0', fontSize: 13, color: C.ink, cursor: 'pointer' }}>
        <input type="checkbox" checked={value === '' || value == null ? !!field.default : !!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    )
  if (field.type === 'number')
    return (
      <>
        <label style={styles.label}>{field.label}</label>
        <input type="number" min={field.min} max={field.max} value={value === '' || value == null ? '' : value} placeholder={String(field.default ?? '')} onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))} style={{ ...styles.input, maxWidth: 150 }} />
      </>
    )
  if (field.type === 'richtext')
    return (
      <>
        <label style={styles.label}>{field.label}</label>
        <RichText key={idKey} value={value || ''} onChange={onChange} placeholder={field.label} />
      </>
    )
  return (
    <>
      <label style={styles.label}>{field.label}</label>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.type === 'url' ? 'https://… ou /caminho' : ''} style={styles.input} />
    </>
  )
}

// resumo curto de um slide recolhido
function itemSummary(it) {
  const txt = (it.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt.slice(0, 40) || it.button_text || (it.image ? '(imagem)' : '(vazio)')
}

// lista repetível com accordion + drag-and-drop (ex.: slides do carrossel)
function ItemsEditor({ field, items, onChange, idKey }) {
  const [open, setOpen] = useState(() => new Set()) // _uids expandidos; default recolhido
  const toggle = (u) => setOpen((s) => { const n = new Set(s); n.has(u) ? n.delete(u) : n.add(u); return n })
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
        <label style={{ ...styles.label, margin: 0 }}>{field.label} ({items.length})</label>
        <button type="button" onClick={add} style={styles.ghost}>+ Adicionar slide</button>
      </div>
      {items.length === 0 && <div style={{ color: C.muted, fontSize: 13, padding: '4px 0 8px' }}>Nenhum slide ainda. Clica em “Adicionar slide”.</div>}
      <SortableList ids={items.map((it) => it._uid)} onReorder={reorder}>
        {items.map((it, i) => {
          const isOpen = open.has(it._uid)
          return (
            <SortableItem key={it._uid} id={it._uid}>
              {(dragProps) => (
                <div style={{ border: `1px dashed ${C.line}`, borderRadius: 10, padding: isOpen ? 12 : '8px 12px', marginBottom: 8, background: C.surface }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? 8 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                      <DragHandle {...dragProps} />
                      <button type="button" onClick={() => toggle(it._uid)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, color: C.ink, textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <span style={{ color: C.muted, fontSize: 9, display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                        <strong style={{ fontSize: 12 }}>Slide {i + 1}</strong>
                        {!isOpen && <span style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {itemSummary(it)}</span>}
                      </button>
                    </div>
                    <button type="button" onClick={() => remove(it._uid)} style={{ ...miniBtn, color: '#c0392b', flexShrink: 0 }}>excluir</button>
                  </div>
                  {isOpen &&
                    field.itemFields.map((f) => (
                      <FieldEditor key={f.id} field={f} value={it[f.id]} onChange={(v) => setItemField(it._uid, f.id, v)} idKey={idKey + '-' + it._uid + '-' + f.id} />
                    ))}
                </div>
              )}
            </SortableItem>
          )
        })}
      </SortableList>
    </div>
  )
}

const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: C.ink }
const cardStyle = { background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 18, marginBottom: 14 }
const h3 = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.muted, margin: '0 0 10px' }
const miniBtn = { border: `1px solid ${C.line}`, background: C.white, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }
