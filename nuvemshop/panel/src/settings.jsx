import React, { useState } from 'react'
import { C, styles } from './ui.jsx'

const emptySide = () => ({ t: '', r: '', b: '', l: '' })
const emptyStyle = () => ({ bg: '', color: '', margin: emptySide(), padding: emptySide(), container: 'full' })
export const emptySettings = () => ({ desktop: emptyStyle(), mobile: emptyStyle() })

// Cor: color picker + campo hex (sincronizados). Vazio = herda.
function ColorField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value || '') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 42, height: 32, border: `1px solid ${C.line}`, borderRadius: 6, padding: 0, background: 'none', cursor: 'pointer' }}
        />
        <input type="text" value={value} placeholder="#rrggbb (vazio = herda)" onChange={(e) => onChange(e.target.value)} style={{ ...styles.input, flex: 1 }} />
        {value ? <button type="button" onClick={() => onChange('')} style={styles.linkBtn}>limpar</button> : null}
      </div>
    </div>
  )
}

// Espaçamento nos 4 lados (layout em cruz: topo / esq-dir / base)
function SpacingField({ label, value, onChange }) {
  const v = value || emptySide()
  const box = (side) => (
    <input
      type="number"
      value={v[side]}
      placeholder="0"
      onChange={(e) => onChange({ ...v, [side]: e.target.value })}
      style={{ width: 54, fontFamily: 'inherit', fontSize: 13, textAlign: 'center', border: `1px solid ${C.line}`, borderRadius: 6, padding: '5px 4px' }}
    />
  )
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {box('t')}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>{box('l')}{box('r')}</div>
        {box('b')}
      </div>
    </div>
  )
}

function StyleFields({ style, onChange }) {
  const s = style || emptyStyle()
  return (
    <div>
      <ColorField label="Cor de fundo" value={s.bg} onChange={(v) => onChange({ bg: v })} />
      <ColorField label="Cor do texto" value={s.color} onChange={(v) => onChange({ color: v })} />
      <SpacingField label="Margin (px)" value={s.margin} onChange={(v) => onChange({ margin: v })} />
      <SpacingField label="Padding (px)" value={s.padding} onChange={(v) => onChange({ padding: v })} />
      <label style={styles.label}>Container</label>
      <select value={s.container} onChange={(e) => onChange({ container: e.target.value })} style={styles.input}>
        <option value="full">100% (largura total)</option>
        <option value="grid">Grid (centralizado, máx 1100px)</option>
      </select>
    </div>
  )
}

// accordion desktop/mobile (um aberto por vez)
export function SettingsEditor({ settings, onChange }) {
  const s = settings || emptySettings()
  const [open, setOpen] = useState('desktop')
  const setStyle = (which, patch) => onChange({ ...s, [which]: { ...s[which], ...patch } })
  const section = (key, label) => {
    const isOpen = open === key
    return (
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setOpen(isOpen ? '' : key)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: C.surface, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '9px 12px', color: C.ink }}
        >
          <span style={{ color: C.muted, fontSize: 10, transform: isOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
          <strong style={{ fontSize: 12 }}>{label}</strong>
        </button>
        {isOpen && (
          <div style={{ padding: 12 }}>
            <StyleFields style={s[key]} onChange={(patch) => setStyle(key, patch)} />
          </div>
        )}
      </div>
    )
  }
  return (
    <div style={{ marginTop: 8 }}>
      {section('desktop', '🖥 Desktop')}
      {section('mobile', '📱 Mobile')}
    </div>
  )
}
