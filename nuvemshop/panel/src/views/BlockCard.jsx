import React from 'react'
import { DragHandle } from '../dnd.jsx'
import { Toggle } from '../components/primitives.jsx'
import BlockPreview from '../components/BlockPreviews.jsx'
import { FieldEditor } from '../fields.jsx'
import { SettingsEditor } from '../settings.jsx'

// row de bloco: colapsada = handle + thumb + label + "Editar →"; expande inline
export default function BlockCard({ block, def, open, onToggleOpen, onPatch, onField, onRemove, settingsOpen, onToggleSettings, dragProps }) {
  return (
    <section className={'sw-block' + (block.visible ? '' : ' sw-block--off')}>
      <div className="sw-block__head">
        <DragHandle {...dragProps} />
        <span className="sw-block__thumb">
          <BlockPreview type={block.type} />
        </span>
        <button type="button" className="sw-block__title-btn" onClick={onToggleOpen} data-testid={'block-' + block.id}>
          <span className="sw-row__title">{def?.label || block.type}</span>
          {!block.visible && <span className="sw-badge sw-badge--soon">oculto</span>}
        </button>
        <button type="button" className="sw-btn sw-btn--link sw-row__action" style={{ color: 'inherit' }} onClick={onToggleOpen}>
          {open ? 'Fechar' : 'Editar →'}
        </button>
      </div>

      {open && (
        <div className="sw-block__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Toggle checked={block.visible} onChange={(v) => onPatch({ visible: v })} label="Ativar bloco" testid={'visible-' + block.id} />
            <button type="button" className="sw-btn sw-btn--danger" onClick={onRemove}>
              excluir bloco
            </button>
          </div>

          <div className="sw-fields">
            {(def?.fields || []).map((f) => (
              <FieldEditor key={f.id} field={f} value={block.fields[f.id]} onChange={(v) => onField(f.id, v)} idKey={block.id + f.id} />
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--divider)', marginTop: 18 }}>
            <button type="button" className="sw-acc__head" onClick={onToggleSettings}>
              <span className={'sw-acc__chevron' + (settingsOpen ? ' sw-acc__chevron--open' : '')}>▶</span>
              Configurações do bloco
            </button>
            {settingsOpen && <SettingsEditor settings={block.settings} onChange={(sv) => onPatch({ settings: sv })} />}
          </div>
        </div>
      )}
    </section>
  )
}
