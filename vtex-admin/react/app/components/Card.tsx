import React from 'react'

import { cx } from './cx'

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** título pequeno em caps (.sw-h3) no cabeçalho */
  title?: React.ReactNode
  /** conteúdo à direita do cabeçalho (botões, badges) */
  actions?: React.ReactNode
  /** padding menor */
  tight?: boolean
  /** sem sombra */
  flat?: boolean
}

/** Superfície branca radius 20 (.sw-card). */
export function Card({ title, actions, tight, flat, className, children, ...rest }: CardProps) {
  return (
    <div className={cx('sw-card', tight && 'sw-card--tight', flat && 'sw-card--flat', className)} {...rest}>
      {title || actions ? (
        <div className="sw-card__head">
          {title ? <h3 className="sw-h3">{title}</h3> : <span />}
          {actions ? <div className="sw-inline">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
