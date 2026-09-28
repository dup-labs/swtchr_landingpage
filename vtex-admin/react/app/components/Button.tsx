import React from 'react'

import { cx } from './cx'
import { Spinner } from './primitives'

export type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'link' | 'danger'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** mostra spinner e desabilita */
  loading?: boolean
  /** versão compacta (padding menor) */
  small?: boolean
}

/** Botão pill (.sw-btn). Default: primary, type="button". */
export function Button({
  variant = 'primary',
  loading,
  small,
  disabled,
  className,
  type,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type || 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('sw-btn', 'sw-btn--' + variant, small && 'sw-btn--sm', className)}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}
