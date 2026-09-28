import React from 'react'

import { DragHandle } from '../dnd'
import type { DragHandleProps } from '../dnd'
import { BlockPreview } from './BlockPreview'
import { cx } from './cx'

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

export interface BlockCardProps {
  /** nome exibido (ex.: $componentTitle sem o prefixo) */
  title: React.ReactNode
  /** $componentKey → wireframe da thumb */
  previewKey: string
  /** section nativa da FastStore: travada (cadeado, sem expandir; ainda pode arrastar) */
  locked?: boolean
  /** section desativada/oculta: esmaece e mostra badge "oculto" */
  hidden?: boolean
  /** texto pequeno ao lado do título (resumo do conteúdo) */
  meta?: React.ReactNode
  /** badges extras no título */
  badges?: React.ReactNode
  open?: boolean
  onToggleOpen?: () => void
  /** props do SortableItem (render-prop) */
  dragHandleProps?: DragHandleProps
  /** ações extras à direita do cabeçalho (antes de "Editar →") */
  actions?: React.ReactNode
  /** corpo exibido quando aberto (formulário da section) */
  children?: React.ReactNode
  testid?: string
}

/** Row de section: handle + thumb + título + "Editar →"; expande inline. Versão travada para nativas. */
export function BlockCard({
  title,
  previewKey,
  locked,
  hidden,
  meta,
  badges,
  open,
  onToggleOpen,
  dragHandleProps,
  actions,
  children,
  testid,
}: BlockCardProps) {
  const titleContent = (
    <React.Fragment>
      <span className="sw-row__title">{title}</span>
      {meta ? <span className="sw-block__meta">{meta}</span> : null}
      {hidden ? <span className="sw-badge sw-badge--soon">oculto</span> : null}
      {badges}
    </React.Fragment>
  )

  return (
    <section className={cx('sw-block', locked && 'sw-block--locked', hidden && 'sw-block--off')} data-testid={testid}>
      <div className="sw-block__head">
        {dragHandleProps ? <DragHandle {...dragHandleProps} /> : null}
        <span className="sw-block__thumb">
          <BlockPreview type={previewKey} native={locked} />
        </span>
        {locked ? (
          <div className="sw-block__static">{titleContent}</div>
        ) : (
          <button type="button" className="sw-block__title-btn" onClick={onToggleOpen}>
            {titleContent}
          </button>
        )}
        <div className="sw-block__actions">
          {actions}
          {locked ? (
            <span className="sw-block__lock" title="Section nativa da FastStore — só dá pra reordenar">
              <LockIcon />
              nativa
            </span>
          ) : (
            <button
              type="button"
              className="sw-btn sw-btn--link sw-row__action"
              style={{ color: 'inherit' }}
              onClick={onToggleOpen}
            >
              {open ? 'Fechar' : 'Editar →'}
            </button>
          )}
        </div>
      </div>
      {open && !locked ? <div className="sw-block__body">{children}</div> : null}
    </section>
  )
}
