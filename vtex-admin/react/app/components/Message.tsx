import React, { useCallback, useEffect, useRef, useState } from 'react'

import { cx } from './cx'

export type MessageKind = 'info' | 'ok' | 'err'

export interface MessageProps {
  kind?: MessageKind
  /** caixa com fundo/borda (em vez de texto solto) */
  box?: boolean
  children?: React.ReactNode
}

/** Mensagem inline (.sw-msg): sucesso, erro ou info. */
export function Message({ kind = 'info', box, children }: MessageProps) {
  return (
    <div
      className={cx('sw-msg', kind === 'ok' && 'sw-msg--ok', kind === 'err' && 'sw-msg--err', box && 'sw-msg--box')}
      role={kind === 'err' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

export interface ToastItem {
  id: number
  kind: MessageKind
  text: React.ReactNode
}

export interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

/** Pilha de toasts fixa no canto inferior direito. Use com useToasts(). */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (!toasts.length) return null
  return (
    <div className="sw-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('sw-toast', t.kind !== 'info' && 'sw-toast--' + t.kind)} role={t.kind === 'err' ? 'alert' : 'status'}>
          <span className="sw-toast__dot" />
          <span style={{ flex: 1 }}>{t.text}</span>
          <button type="button" className="sw-toast__x" aria-label="Fechar" onClick={() => onDismiss(t.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

/**
 * Estado de toasts: const { toasts, notify, dismiss } = useToasts()
 * notify(texto, 'ok' | 'err' | 'info', ms?) — some sozinho (default 4s; erro 7s; 0 = fixo).
 */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    []
  )

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (text: React.ReactNode, kind: MessageKind = 'info', ms?: number) => {
      seq.current += 1
      const id = seq.current
      setToasts((list) => list.concat([{ id, kind, text }]))
      const life = ms === undefined ? (kind === 'err' ? 7000 : 4000) : ms
      if (life > 0) timers.current.push(window.setTimeout(() => dismiss(id), life))
    },
    [dismiss]
  )

  return { toasts, notify, dismiss }
}
