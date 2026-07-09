import React, { useState } from 'react'
import Modal from '../components/Modal.jsx'
import BlockPreview from '../components/BlockPreviews.jsx'

// tipos ainda não implementados no registry — só vitrine, desabilitados
const SOON = [
  { type: 'tabela_nutricional', label: 'Tabela nutricional' },
  { type: 'texto_seo', label: 'Texto SEO' },
  { type: 'accordion_perguntas', label: 'Accordion de perguntas' },
  { type: 'tabela_medidas', label: 'Tabela de medidas' },
  { type: 'vitrine_produtos', label: 'Vitrine de produtos' },
  { type: 'grid_imagens', label: 'Grid de imagens' },
  { type: 'banner_full', label: 'Banner full' },
]

export default function BlockPickerModal({ blockTypes, onAdd, onClose }) {
  const [selected, setSelected] = useState(null) // type string

  const include = () => {
    const t = blockTypes.find((x) => x.type === selected)
    if (t) {
      onAdd(t)
      onClose()
    }
  }

  return (
    <Modal
      title="Adicionar novo bloco"
      onClose={onClose}
      footer={
        <button className="sw-btn sw-btn--primary" disabled={!selected} onClick={include} data-testid="include-block">
          Incluir bloco
        </button>
      }
    >
      <div className="sw-modal__grid">
        {blockTypes.map((t) => (
          <button
            key={t.type}
            type="button"
            className={'sw-typecard' + (selected === t.type ? ' sw-typecard--selected' : '')}
            onClick={() => setSelected(t.type)}
            data-testid={'pick-' + t.type}
          >
            <div className="sw-typecard__preview">
              <BlockPreview type={t.type} />
            </div>
            <div className="sw-typecard__name">{t.label}</div>
          </button>
        ))}
        {SOON.map((t) => (
          <div key={t.type} className="sw-typecard sw-typecard--disabled" aria-disabled="true">
            <span className="sw-badge sw-badge--soon sw-typecard__soon">em breve</span>
            <div className="sw-typecard__preview">
              <BlockPreview type={t.type} />
            </div>
            <div className="sw-typecard__name">{t.label}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
