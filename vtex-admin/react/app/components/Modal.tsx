import React, { useEffect } from 'react'

export interface ModalProps {
  title: string
  onClose: () => void
  children?: React.ReactNode
  /** rodapé alinhado à direita (botões) */
  footer?: React.ReactNode
  /** largura máxima (default 880) */
  width?: number
}

/** Modal com overlay; fecha em Esc e clique fora. */
export function Modal({ title, onClose, children, footer, width }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="sw-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="sw-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { width: 'min(' + width + 'px, 100%)' } : undefined}
      >
        <div className="sw-modal__head">
          <h3 className="sw-modal__title">{title}</h3>
          <button type="button" className="sw-modal__x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
        {footer ? <div className="sw-modal__foot">{footer}</div> : null}
      </div>
    </div>
  )
}
