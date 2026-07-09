import React, { useEffect } from 'react'

export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sw-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sw-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sw-modal__head">
          <h3 className="sw-modal__title">{title}</h3>
          <button type="button" className="sw-modal__x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="sw-modal__foot">{footer}</div>}
      </div>
    </div>
  )
}
