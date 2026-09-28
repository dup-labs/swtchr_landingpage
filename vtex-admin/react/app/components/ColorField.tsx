import React from 'react'

import { cx } from './cx'

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** #abc → #aabbcc (o <input type=color> só aceita 6 dígitos). */
function toSix(hex: string): string {
  if (hex.length === 4) return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  return hex.toLowerCase()
}

export interface ColorFieldProps {
  value?: string
  /** '' = herda / vazio */
  onChange: (value: string) => void
  label?: React.ReactNode
  help?: React.ReactNode
  /** tokens do tema como atalho (ex.: ['brand','ink','white']). Valor gravado = o próprio token. */
  allowTokens?: string[]
  placeholder?: string
}

/** Cor: swatch (abre o picker nativo) + campo hex + limpar + tokens opcionais. Vazio = herda. */
export function ColorField({ value, onChange, label, help, allowTokens, placeholder }: ColorFieldProps) {
  const v = value || ''
  const valid = HEX.test(v)
  const isToken = !!allowTokens && allowTokens.indexOf(v) !== -1

  return (
    <div className="sw-field">
      {label ? <label className="sw-label">{label}</label> : null}
      {help ? <div className="sw-field__help">{help}</div> : null}
      <div className="sw-color">
        <span className="sw-color__swatch" title={v || 'herda'}>
          {valid ? <span className="sw-color__fill" style={{ background: v }} /> : null}
          <input
            type="color"
            aria-label="Escolher cor"
            value={valid ? toSix(v) : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
          />
        </span>
        <input
          type="text"
          className={cx('sw-input', 'sw-color__hex', !!v && !valid && !isToken && 'sw-input--err')}
          value={v}
          spellCheck={false}
          placeholder={placeholder || '#rrggbb (vazio = herda)'}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        {v ? (
          <button type="button" className="sw-btn sw-btn--link" onClick={() => onChange('')}>
            limpar
          </button>
        ) : null}
      </div>
      {allowTokens && allowTokens.length ? (
        <div className="sw-color__tokens">
          {allowTokens.map((t) => (
            <button
              key={t}
              type="button"
              className={cx('sw-color__token', v === t && 'sw-color__token--on')}
              onClick={() => onChange(v === t ? '' : t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
