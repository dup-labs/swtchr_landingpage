import React from 'react'

import { cx } from './cx'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  testid?: string
}

/** Switch acessível (checkbox oculto + track). */
export function Toggle({ checked, onChange, label, disabled, testid }: ToggleProps) {
  return (
    <label className="sw-switch" style={disabled ? { opacity: 0.55, cursor: 'default' } : undefined}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testid}
      />
      <span className="sw-switch__track" />
      {label ? <span>{label}</span> : null}
    </label>
  )
}

export interface SegmentedOption<V extends string> {
  value: V
  label: React.ReactNode
}

export interface SegmentedProps<V extends string> {
  options: Array<SegmentedOption<V>>
  value: V
  onChange: (value: V) => void
}

/** Pílula segmentada (ex.: Desktop | Mobile). */
export function Segmented<V extends string>({ options, value, onChange }: SegmentedProps<V>) {
  return (
    <div className="sw-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={cx('sw-seg__btn', value === o.value && 'sw-seg__btn--on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export interface SpinnerProps {
  label?: React.ReactNode
}

/** Loader circular; com label vira linha "spinner + texto". */
export function Spinner({ label }: SpinnerProps) {
  if (!label) return <span className="sw-spinner" aria-hidden="true" />
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
      <span className="sw-spinner" />
      {label}
    </span>
  )
}

export interface EmptyStateProps {
  title?: React.ReactNode
  children?: React.ReactNode
  /** botões/ações abaixo do texto */
  action?: React.ReactNode
}

/** Caixa tracejada centralizada (vazio / em breve / erro de carga). */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="sw-empty">
      {title ? <div className="sw-empty__title">{title}</div> : null}
      {children ? <p>{children}</p> : null}
      {action ? <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10 }}>{action}</div> : null}
    </div>
  )
}

export type BadgeTone = 'brand' | 'ok' | 'warn' | 'danger' | 'muted' | 'soon'

export interface BadgeProps {
  tone?: BadgeTone
  /** bolinha indicadora à esquerda (default: true, exceto tone "soon") */
  dot?: boolean
  children?: React.ReactNode
  className?: string
  title?: string
}

/** Badge caps 9px (.sw-badge). tone "soon" = etiqueta cinza pequena ("em breve", "oculto"). */
export function Badge({ tone = 'brand', dot, children, className, title }: BadgeProps) {
  const showDot = dot === undefined ? tone !== 'soon' : dot
  return (
    <span className={cx('sw-badge', tone !== 'brand' && 'sw-badge--' + tone, className)} title={title}>
      {showDot ? <span className="sw-badge__dot" /> : null}
      {children}
    </span>
  )
}
