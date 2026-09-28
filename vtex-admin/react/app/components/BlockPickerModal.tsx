import React, { useState } from 'react'

import type { ComponentDef } from '../api/types'
import { BlockPreview } from './BlockPreview'
import { cx } from './cx'
import { Modal } from './Modal'

export interface SoonBlock {
  key: string
  label: string
}

export interface BlockPickerModalProps {
  /** sections disponíveis (GET /schema). Só as swtchr (swtchr: true) aparecem, a menos que includeNative. */
  components: ComponentDef[]
  onAdd: (def: ComponentDef) => void
  onClose: () => void
  title?: string
  /** vitrine desabilitada "em breve" */
  soon?: SoonBlock[]
  includeNative?: boolean
}

/** Remove o prefixo "swtchr · " do $componentTitle. */
export function cleanTitle(title?: string): string {
  return (title || '').replace(/^swtchr\s*[·\-:|]\s*/i, '')
}

/** Modal de escolha de section: grid de typecards com wireframe. */
export function BlockPickerModal({
  components,
  onAdd,
  onClose,
  title,
  soon,
  includeNative,
}: BlockPickerModalProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const list = components.filter((c) => includeNative || c.swtchr)

  const include = () => {
    const def = list.find((c) => c.key === selected)
    if (def) {
      onAdd(def)
      onClose()
    }
  }

  return (
    <Modal
      title={title || 'Adicionar section'}
      onClose={onClose}
      footer={
        <button type="button" className="sw-btn sw-btn--primary" disabled={!selected} onClick={include}>
          Incluir section
        </button>
      }
    >
      <div className="sw-modal__grid">
        {list.map((c) => (
          <button
            key={c.key}
            type="button"
            title={c.description}
            className={cx('sw-typecard', selected === c.key && 'sw-typecard--selected')}
            onClick={() => setSelected(c.key)}
            onDoubleClick={() => {
              onAdd(c)
              onClose()
            }}
          >
            <div className="sw-typecard__preview">
              <BlockPreview type={c.key} native={!c.swtchr} />
            </div>
            <div className="sw-typecard__name">{cleanTitle(c.title) || c.key}</div>
          </button>
        ))}
        {(soon || []).map((s) => (
          <div key={s.key} className="sw-typecard sw-typecard--disabled" aria-disabled="true">
            <span className="sw-badge sw-badge--soon sw-typecard__soon">em breve</span>
            <div className="sw-typecard__preview">
              <BlockPreview type={s.key} />
            </div>
            <div className="sw-typecard__name">{s.label}</div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
