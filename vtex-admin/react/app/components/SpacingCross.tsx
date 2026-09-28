import React from 'react'

export interface Sides {
  t: string
  r: string
  b: string
  l: string
}

export const emptySides = (): Sides => ({ t: '', r: '', b: '', l: '' })

export interface SpacingCrossProps {
  margin?: Sides
  padding?: Sides
  onChange: (key: 'margin' | 'padding', value: Sides) => void
}

/** margin/padding em cruz — boxes aninhados (porte de settings.jsx). */
export function SpacingCross({ margin, padding, onChange }: SpacingCrossProps) {
  const m = margin || emptySides()
  const p = padding || emptySides()
  const box = (obj: Sides, key: 'margin' | 'padding', side: keyof Sides) => (
    <input
      type="number"
      value={obj[side]}
      placeholder="0"
      aria-label={key + ' ' + side}
      onChange={(e) => {
        const next: Sides = { t: obj.t, r: obj.r, b: obj.b, l: obj.l }
        next[side] = e.target.value
        onChange(key, next)
      }}
    />
  )
  return (
    <div className="sw-spacing">
      <div className="sw-spacing__tag">Margin</div>
      <div className="sw-spacing__grid">
        {box(m, 'margin', 't')}
        <div className="sw-spacing__mid">
          {box(m, 'margin', 'l')}
          <div className="sw-spacing sw-spacing--inner" style={{ flex: 1 }}>
            <div className="sw-spacing__tag">Padding</div>
            <div className="sw-spacing__grid">
              {box(p, 'padding', 't')}
              <div className="sw-spacing__mid">
                {box(p, 'padding', 'l')}
                <div className="sw-spacing__core" />
                {box(p, 'padding', 'r')}
              </div>
              {box(p, 'padding', 'b')}
            </div>
          </div>
          {box(m, 'margin', 'r')}
        </div>
        {box(m, 'margin', 'b')}
      </div>
    </div>
  )
}
