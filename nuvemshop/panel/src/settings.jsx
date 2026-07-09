import React, { useState } from 'react'
import { Segmented } from './components/primitives.jsx'

const emptySide = () => ({ t: '', r: '', b: '', l: '' })
const emptyStyle = () => ({ bg: '', color: '', margin: emptySide(), padding: emptySide(), container: 'full' })
export const emptySettings = () => ({ desktop: emptyStyle(), mobile: emptyStyle() })

// Cor: color picker + campo hex (sincronizados). Vazio = herda.
export function ColorField({ label, value, onChange }) {
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value || '')
  return (
    <div style={{ marginBottom: 6 }}>
      <label className="sw-label">{label}</label>
      <div className="sw-color">
        <input type="color" value={valid ? value : '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" className="sw-input" style={{ flex: 1 }} value={value} placeholder="#rrggbb (vazio = herda)" onChange={(e) => onChange(e.target.value)} />
        {value ? (
          <button type="button" className="sw-btn sw-btn--link" onClick={() => onChange('')}>
            limpar
          </button>
        ) : null}
      </div>
    </div>
  )
}

// margin/padding em cruz — boxes aninhados como no desenho do Figma
function SpacingCross({ margin, padding, onChange }) {
  const m = margin || emptySide()
  const p = padding || emptySide()
  const box = (obj, key, side) => (
    <input
      type="number"
      value={obj[side]}
      placeholder="0"
      aria-label={`${key} ${side}`}
      onChange={(e) => onChange(key, { ...obj, [side]: e.target.value })}
    />
  )
  return (
    <div className="sw-spacing">
      <div className="sw-spacing__tag">Margin</div>
      <div className="sw-spacing__grid">
        {box(m, 'margin', 't')}
        <div className="sw-spacing__mid">
          {box(m, 'margin', 'l')}
          <div className="sw-spacing sw-spacing--inner" style={{ flex: 1 }}>
            <div className="sw-spacing__tag">Padding</div>
            <div className="sw-spacing__grid">
              {box(p, 'padding', 't')}
              <div className="sw-spacing__mid">
                {box(p, 'padding', 'l')}
                <div className="sw-spacing__core" />
                {box(p, 'padding', 'r')}
              </div>
              {box(p, 'padding', 'b')}
            </div>
          </div>
          {box(m, 'margin', 'r')}
        </div>
        {box(m, 'margin', 'b')}
      </div>
    </div>
  )
}

// settings por bloco: segmented Desktop/Mobile (mesmo schema de antes)
export function SettingsEditor({ settings, onChange }) {
  const s = settings || emptySettings()
  const [which, setWhich] = useState('desktop')
  const st = s[which] || emptyStyle()
  const patch = (partial) => onChange({ ...s, [which]: { ...st, ...partial } })
  return (
    <div style={{ marginTop: 12 }}>
      <Segmented
        options={[
          { value: 'desktop', label: 'Desktop' },
          { value: 'mobile', label: 'Mobile' },
        ]}
        value={which}
        onChange={setWhich}
      />
      <div className="sw-settings-grid">
        <SpacingCross margin={st.margin} padding={st.padding} onChange={(key, v) => patch({ [key]: v })} />
        <div>
          <ColorField label="Cor de fundo" value={st.bg} onChange={(v) => patch({ bg: v })} />
          <ColorField label="Cor do texto" value={st.color} onChange={(v) => patch({ color: v })} />
          <label className="sw-label">Container</label>
          <select className="sw-select" value={st.container} onChange={(e) => patch({ container: e.target.value })}>
            <option value="full">100% (largura total)</option>
            <option value="grid">Grid (centralizado, máx 1100px)</option>
          </select>
        </div>
      </div>
    </div>
  )
}
