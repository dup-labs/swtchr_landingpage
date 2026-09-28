import React, { useEffect, useState } from 'react'

import { cx } from '../../components'
import type { ColorKey, HighlightMode, ThemeErrors, ThemeState } from './model'
import { clamp, effColor, splitHighlight } from './model'

/** Props comuns aos cards do editor. */
export interface ThemeCardProps {
  state: ThemeState
  defaults: ThemeState
  errors: ThemeErrors
  /** aplica uma mutação num clone do estado */
  update: (fn: (draft: ThemeState) => void) => void
}

/** Paleta efetiva (vazio/inválido → default). */
export function palette(state: ThemeState, defaults: ThemeState): Record<ColorKey, string> {
  return {
    primary: effColor(state, defaults, 'primary'),
    secondary: effColor(state, defaults, 'secondary'),
    ink: effColor(state, defaults, 'ink'),
    inverse: effColor(state, defaults, 'inverse'),
    background: effColor(state, defaults, 'background'),
    surface: effColor(state, defaults, 'surface'),
    onPrimary: effColor(state, defaults, 'onPrimary'),
    onSecondary: effColor(state, defaults, 'onSecondary'),
    highlightFrom: effColor(state, defaults, 'highlightFrom'),
    highlightTo: effColor(state, defaults, 'highlightTo'),
  }
}

export function highlightStyle(mode: HighlightMode, from: string, to: string, primary: string): React.CSSProperties {
  if (mode === 'gradient') return { backgroundImage: 'linear-gradient(165deg, ' + from + ', ' + to + ')' }
  if (mode === 'solid') return { backgroundColor: primary, backgroundImage: 'none' }
  return {}
}

export interface HighlightTextProps {
  /** texto com *palavra* destacada */
  text: string
  mode: HighlightMode
  from: string
  to: string
  primary: string
}

/** Renderiza "*palavra*" como o destaque de título da loja. */
export function HighlightText({ text, mode, from, to, primary }: HighlightTextProps) {
  const style = highlightStyle(mode, from, to, primary)
  return (
    <React.Fragment>
      {splitHighlight(text).map((p, i) =>
        p.hl && mode !== 'none' ? (
          <span key={i} className={cx('sw-th-hl', 'sw-th-hl--' + mode)} style={style}>
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
    </React.Fragment>
  )
}

export interface RangeNumberProps {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  invalid?: boolean
  id?: string
}

/** Slider + campo numérico sincronizados. O número aceita digitação livre e é travado no intervalo ao sair. */
export function RangeNumber({ value, min, max, step, unit, onChange, invalid, id }: RangeNumberProps) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  return (
    <div className="sw-th-range">
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={clamp(value, min, max)}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Ajustar valor"
      />
      <input
        id={id}
        type="number"
        className={cx('sw-input', invalid && 'sw-input--err')}
        min={min}
        max={max}
        step={step || 1}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value.trim() !== '' && isFinite(n)) onChange(Math.round(n))
        }}
        onBlur={() => {
          const n = Number(text)
          const next = text.trim() === '' || !isFinite(n) ? value : clamp(n, min, max)
          setText(String(next))
          if (next !== value) onChange(next)
        }}
      />
      {unit ? <span className="sw-th-range__unit">{unit}</span> : null}
    </div>
  )
}

export interface GroupProps {
  title: React.ReactNode
  hint?: React.ReactNode
  children?: React.ReactNode
}

/** Subgrupo dentro de um card (título azul caps + hint). */
export function Group({ title, hint, children }: GroupProps) {
  return (
    <div className="sw-th-group">
      <div className="sw-th-group__head">
        <span className="sw-th-group__title">{title}</span>
        {hint ? <span className="sw-th-group__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}
