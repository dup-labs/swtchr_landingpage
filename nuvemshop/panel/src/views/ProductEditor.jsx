import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { RichText } from '../ui.jsx'
import { SortableList, SortableItem, arrayMove, uid } from '../dnd.jsx'
import { Toggle, Spinner } from '../components/primitives.jsx'
import Dropzone from '../components/Dropzone.jsx'
import { ColorField, emptySettings } from '../settings.jsx'
import BlockCard from './BlockCard.jsx'
import BlockPickerModal from './BlockPickerModal.jsx'

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

export default function ProductEditor({ product }) {
  const [config, setConfig] = useState(null)
  const [blockTypes, setBlockTypes] = useState([])
  const [loadErr, setLoadErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [picking, setPicking] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set()) // blocos recolhidos (accordion)
  const [settingsOpen, setSettingsOpen] = useState(() => new Set()) // painel de config aberto por bloco

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

  if (loadErr) return <div className="sw-msg sw-msg--err">Erro ao carregar: {loadErr}</div>
  if (!config) return <Spinner label="carregando configuração…" />

  const banner = config.banner
  const textEnabled = banner.textEnabled !== false
  const setBanner = (patch) => setConfig((c) => ({ ...c, banner: { ...c.banner, ...patch } }))
  const setBlock = (id, patch) => setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }))
  const setBlockField = (id, fid, val) =>
    setConfig((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, fields: { ...b.fields, [fid]: val } } : b)) }))
  const reorderBlocks = (from, to) => setConfig((c) => ({ ...c, blocks: arrayMove(c.blocks, from, to) }))
  const remove = (id) => setConfig((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }))
  const addBlock = (t) => {
    setConfig((c) => ({ ...c, blocks: [...c.blocks, newBlock(t.type, t.fields)] }))
    setPicking(false) // bloco novo entra expandido (não vai pro set de recolhidos)
  }
  const toggleIn = (setter) => (id) =>
    setter((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const toggleCollapse = toggleIn(setCollapsed)
  const toggleSettings = toggleIn(setSettingsOpen)

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
    <div className="anim-fade">
      <div style={{ margin: '6px 0 20px' }}>
        <h2 className="sw-title">{product.name}</h2>
        <span className="sw-meta">#{product.id}</span>
      </div>

      {/* Configurações da página — banner principal */}
      <section className="sw-card">
        <h3 className="sw-h3">Configurações da página</h3>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Dropzone label="Banner desktop" value={banner.desktop} onChange={(v) => setBanner({ desktop: v })} minHeight={170} />
          <Dropzone label="Banner mobile" value={banner.mobile} onChange={(v) => setBanner({ mobile: v })} minHeight={170} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 22px', marginTop: 6 }}>
          <div>
            <label className="sw-label">Link do banner</label>
            <input className="sw-input" value={banner.link ?? ''} placeholder="https://… ou /caminho" onChange={(e) => setBanner({ link: e.target.value })} />
            <div style={{ opacity: textEnabled ? 1 : 0.45, pointerEvents: textEnabled ? 'auto' : 'none', transition: 'opacity .2s' }}>
              <label className="sw-label">Texto do banner</label>
              <RichText key={'banner-' + product.id} value={banner.text} onChange={(v) => setBanner({ text: v })} placeholder="texto do banner" />
            </div>
          </div>
          <div>
            <ColorField label="Cor de fundo do banner" value={banner.bg ?? ''} onChange={(v) => setBanner({ bg: v })} />
            <div style={{ opacity: textEnabled ? 1 : 0.45, pointerEvents: textEnabled ? 'auto' : 'none', transition: 'opacity .2s' }}>
              <ColorField label="Cor do texto do banner" value={banner.color ?? ''} onChange={(v) => setBanner({ color: v })} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Toggle checked={textEnabled} onChange={(v) => setBanner({ textEnabled: v })} label="Ativar o texto do banner" testid="banner-text-toggle" />
            </div>
          </div>
        </div>
      </section>

      {/* Blocos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 12px' }}>
        <h3 className="sw-h3" style={{ margin: 0 }}>Blocos ({config.blocks.length})</h3>
        <button onClick={() => setPicking(true)} className="sw-btn sw-btn--soft" data-testid="add-block">
          Adicionar novo bloco
        </button>
      </div>

      {picking && <BlockPickerModal blockTypes={blockTypes} onAdd={addBlock} onClose={() => setPicking(false)} />}

      <SortableList ids={config.blocks.map((b) => b.id)} onReorder={reorderBlocks}>
        {config.blocks.map((b) => {
          const def = blockTypes.find((t) => t.type === b.type)
          return (
            <SortableItem key={b.id} id={b.id}>
              {(dragProps) => (
                <BlockCard
                  block={b}
                  def={def}
                  open={!collapsed.has(b.id)}
                  onToggleOpen={() => toggleCollapse(b.id)}
                  onPatch={(patch) => setBlock(b.id, patch)}
                  onField={(fid, v) => setBlockField(b.id, fid, v)}
                  onRemove={() => remove(b.id)}
                  settingsOpen={settingsOpen.has(b.id)}
                  onToggleSettings={() => toggleSettings(b.id)}
                  dragProps={dragProps}
                />
              )}
            </SortableItem>
          )
        })}
      </SortableList>

      <div className="sw-savebar">
        {msg && <span className={'sw-msg' + (msg.startsWith('Erro') ? ' sw-msg--err' : '')}>{msg}</span>}
        <button onClick={save} disabled={saving} className="sw-btn sw-btn--primary" data-testid="save">
          {saving && <span className="sw-spinner" />}
          {saving ? 'salvando…' : 'Salvar produto'}
        </button>
      </div>
    </div>
  )
}
