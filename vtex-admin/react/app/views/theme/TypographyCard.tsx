import React, { useState } from 'react'

import { Button, Card, Dropzone, Field, Input, Segmented, cx } from '../../components'
import { FONT_PRESETS, fontStack } from './fonts'
import type { FontValue, TitleTransform } from './model'
import { LIMITS } from './model'
import type { ThemeCardProps } from './parts'
import { Group, HighlightText, RangeNumber, palette } from './parts'

export interface TypographyCardProps extends ThemeCardProps {
  upload: (file: File) => Promise<string>
}

type Which = 'display' | 'body'

const FONT_ACCEPT = '.woff2,.woff,.ttf,.otf'
const BUTTON_RADIUS = { pill: '9999px', rounded: '12px', square: '0px' }

function fileName(url: string): string {
  const clean = url.split('?')[0].split('#')[0]
  const last = clean.substring(clean.lastIndexOf('/') + 1)
  try {
    return decodeURIComponent(last) || url
  } catch (e) {
    return last || url
  }
}

interface FontPickerProps extends TypographyCardProps {
  which: Which
}

function FontPicker({ which, state, defaults, errors, update, upload }: FontPickerProps) {
  const f = state.typography[which]
  const fallbackKey = defaults.typography[which].preset
  const [replacing, setReplacing] = useState(false)
  const [typing, setTyping] = useState(false)

  const set = (patch: Partial<FontValue>) =>
    update((d) => {
      d.typography[which] = Object.assign({}, d.typography[which], patch)
    })

  const nameErr = errors['typography.' + which + '.customName']
  const urlErr = errors['typography.' + which + '.customUrl']

  return (
    <React.Fragment>
      <div className="sw-th-fonts" role="radiogroup">
        {FONT_PRESETS.map((p) => {
          const on = f.preset === p.key
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              className={cx('sw-th-font', on && 'sw-th-font--on')}
              style={{ fontFamily: fontStack({ preset: p.key, customName: '', customUrl: '' }, fallbackKey) }}
              onClick={() => set({ preset: p.key })}
              title={p.label}
            >
              {on ? <span className="sw-th-font__check">✓</span> : null}
              <span className="sw-th-font__aa" style={{ fontWeight: which === 'display' ? 600 : 400 }}>
                Aa
              </span>
              <span className="sw-th-font__name">{p.label}</span>
              <span className="sw-th-font__kind">{p.kind}</span>
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={f.preset === 'custom'}
          className={cx('sw-th-font', 'sw-th-font--custom', f.preset === 'custom' && 'sw-th-font--on')}
          style={f.preset === 'custom' && f.customName ? { fontFamily: fontStack(f, fallbackKey) } : undefined}
          onClick={() => set({ preset: 'custom' })}
        >
          {f.preset === 'custom' ? <span className="sw-th-font__check">✓</span> : null}
          <span className="sw-th-font__aa">+</span>
          <span className="sw-th-font__name">{f.preset === 'custom' && f.customName ? f.customName : 'Personalizada'}</span>
          <span className="sw-th-font__kind">seu arquivo</span>
        </button>
      </div>

      {f.preset === 'custom' ? (
        <div className="sw-th-custom">
          <Field label="Nome da fonte" help="Como ela vai se chamar no CSS. Ex: Minha Fonte" error={nameErr}>
            <Input value={f.customName} invalid={!!nameErr} placeholder="Minha Fonte" onChange={(v) => set({ customName: v })} />
          </Field>
          <Field label="Arquivo" help=".woff2 (recomendado), .woff, .ttf ou .otf" error={urlErr}>
            {f.customUrl && !replacing && !typing ? (
              <div className="sw-th-file">
                <span className="sw-th-file__name" title={f.customUrl}>
                  {fileName(f.customUrl)}
                </span>
                <Button variant="link" small onClick={() => setReplacing(true)}>
                  trocar
                </Button>
                <Button variant="link" small onClick={() => set({ customUrl: '' })}>
                  remover
                </Button>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <Dropzone
                  accept={FONT_ACCEPT}
                  upload={upload}
                  minHeight={96}
                  maxWidth="100%"
                  onChange={(url) => {
                    set({ customUrl: url || '' })
                    setReplacing(false)
                  }}
                  label="arraste o arquivo da fonte"
                />
                <Input
                  style={{ marginTop: 8 }}
                  value={f.customUrl}
                  invalid={!!urlErr && !!f.customUrl}
                  placeholder="ou cole a URL: https://…/fonte.woff2"
                  onChange={(v) => set({ customUrl: v.trim() })}
                  onFocus={() => setTyping(true)}
                  onBlur={() => {
                    setTyping(false)
                    if (f.customUrl) setReplacing(false)
                  }}
                />
              </div>
            )}
          </Field>
        </div>
      ) : null}
    </React.Fragment>
  )
}

export function TypographyCard(props: TypographyCardProps) {
  const { state, defaults, errors, update } = props
  const p = palette(state, defaults)
  const t = state.typography
  const displayStack = fontStack(t.display, defaults.typography.display.preset)
  const bodyStack = fontStack(t.body, defaults.typography.body.preset)

  return (
    <Card title="Tipografia">
      <p className="sw-th-card__lead">
        Duas fontes: uma com personalidade para os títulos, outra confortável para ler. As amostras já estão na própria
        fonte.
      </p>

      <div
        className="sw-th-specimen"
        style={{ background: p.background, color: p.ink }}
        aria-label="Prévia da tipografia"
      >
        <div className="sw-th-specimen__eyebrow" style={{ fontFamily: bodyStack }}>
          Nova coleção
        </div>
        <h2
          className="sw-th-specimen__title"
          style={{
            fontFamily: displayStack,
            fontWeight: t.titleWeight,
            textTransform: t.titleTransform,
          }}
        >
          <HighlightText
            text="Peças que *viajam* com você"
            mode={state.motion.highlight}
            from={p.highlightFrom}
            to={p.highlightTo}
            primary={p.primary}
          />
        </h2>
        <p className="sw-th-specimen__body" style={{ fontFamily: bodyStack }}>
          Tecidos leves, cortes que não amassam e bolsos onde você precisa. Frete grátis acima de R$ 299 e troca fácil
          em até 30 dias.
        </p>
        <span
          className="sw-th-specimen__btn"
          style={{
            fontFamily: bodyStack,
            background: p.primary,
            color: p.onPrimary,
            borderRadius: BUTTON_RADIUS[state.shape.buttonShape],
          }}
        >
          Ver coleção
        </span>
      </div>

      <Group title="Fonte de título" hint="h1, h2, destaques">
        <FontPicker which="display" {...props} />
      </Group>

      <Group title="Fonte de texto" hint="parágrafos, preços, botões">
        <FontPicker which="body" {...props} />
      </Group>

      <Group title="Títulos">
        <div className="sw-th-row">
          <Field label="Peso" help="300 fino · 900 black" error={errors['typography.titleWeight']}>
            <RangeNumber
              value={t.titleWeight}
              min={LIMITS.titleWeight.min}
              max={LIMITS.titleWeight.max}
              step={100}
              invalid={!!errors['typography.titleWeight']}
              onChange={(v) =>
                update((d) => {
                  d.typography.titleWeight = v
                })
              }
            />
          </Field>
          <Field label="Caixa" help="Como os títulos aparecem">
            <div style={{ marginTop: 4 }}>
              <Segmented<TitleTransform>
                options={[
                  { value: 'uppercase', label: 'MAIÚSCULAS' },
                  { value: 'none', label: 'Como digitado' },
                ]}
                value={t.titleTransform}
                onChange={(v) =>
                  update((d) => {
                    d.typography.titleTransform = v
                  })
                }
              />
            </div>
          </Field>
        </div>
      </Group>
    </Card>
  )
}
