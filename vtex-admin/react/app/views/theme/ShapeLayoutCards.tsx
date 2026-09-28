import React from 'react'

import { Card, Field, Segmented, Toggle } from '../../components'
import { fontStack } from './fonts'
import type { ButtonShape, HighlightMode, Spacing } from './model'
import { LIMITS, clamp } from './model'
import type { ThemeCardProps } from './parts'
import { Group, HighlightText, RangeNumber, palette } from './parts'

const BUTTON_RADIUS: Record<ButtonShape, string> = { pill: '9999px', rounded: '12px', square: '0px' }
const SPACING_GAP: Record<Spacing, number> = { compact: 5, normal: 10, airy: 16 }
const SPACING_PX: Record<Spacing, string> = { compact: '56–110px', normal: '90–170px', airy: '110–220px' }

// ------------------------------------------------------------------ Formas

export function ShapeCard({ state, defaults, errors, update }: ThemeCardProps) {
  const p = palette(state, defaults)
  const radius = clamp(state.shape.radius, LIMITS.radius.min, LIMITS.radius.max)
  const bodyStack = fontStack(state.typography.body, defaults.typography.body.preset)

  return (
    <Card title="Formas">
      <p className="sw-th-card__lead">Cantos de cards, imagens e botões — o que dá o “tom” da loja.</p>

      <Group title="Arredondamento de cards" hint="cards de produto, banners, caixas">
        <div className="sw-th-shape">
          <Field label="Raio" error={errors['shape.radius']}>
            <RangeNumber
              value={state.shape.radius}
              min={LIMITS.radius.min}
              max={LIMITS.radius.max}
              unit="px"
              invalid={!!errors['shape.radius']}
              onChange={(v) =>
                update((d) => {
                  d.shape.radius = v
                })
              }
            />
          </Field>
          <div className="sw-th-stage" style={{ background: p.background }}>
            <div className="sw-th-mock" style={{ borderRadius: radius, background: p.inverse }}>
              <div
                className="sw-th-mock__img"
                style={{ background: 'linear-gradient(160deg, ' + p.surface + ', ' + p.secondary + ')' }}
              />
              <div className="sw-th-mock__body">
                <div className="sw-th-mock__line" style={{ background: p.ink }} />
                <div className="sw-th-mock__line" style={{ background: p.ink }} />
              </div>
            </div>
          </div>
        </div>
      </Group>

      <Group title="Formato dos botões">
        <div className="sw-th-shape">
          <div style={{ paddingTop: 4 }}>
            <Segmented<ButtonShape>
              options={[
                { value: 'pill', label: 'Pílula' },
                { value: 'rounded', label: 'Arredondado' },
                { value: 'square', label: 'Reto' },
              ]}
              value={state.shape.buttonShape}
              onChange={(v) =>
                update((d) => {
                  d.shape.buttonShape = v
                })
              }
            />
          </div>
          <div className="sw-th-stage" style={{ background: p.background, minHeight: 96 }}>
            <span
              className="sw-th-btn-demo"
              style={{
                borderRadius: BUTTON_RADIUS[state.shape.buttonShape],
                background: p.primary,
                color: p.onPrimary,
                fontFamily: bodyStack,
              }}
            >
              Comprar
            </span>
          </div>
        </div>
      </Group>
    </Card>
  )
}

// ------------------------------------------------------------------ Layout e movimento

export function LayoutCard({ state, defaults, errors, update }: ThemeCardProps) {
  const p = palette(state, defaults)
  const width = clamp(state.layout.containerWidth, LIMITS.containerWidth.min, LIMITS.containerWidth.max)
  const displayStack = fontStack(state.typography.display, defaults.typography.display.preset)

  return (
    <Card title="Layout e movimento">
      <p className="sw-th-card__lead">Quanto a página respira, até onde o conteúdo estica e como ele aparece.</p>

      <Group title="Respiro entre sections" hint={SPACING_PX[state.layout.spacing]}>
        <div className="sw-th-inline-prev" style={{ marginTop: 0 }}>
          <div style={{ flex: '1 1 220px' }}>
            <Segmented<Spacing>
              options={[
                { value: 'compact', label: 'Compacto' },
                { value: 'normal', label: 'Normal' },
                { value: 'airy', label: 'Arejado' },
              ]}
              value={state.layout.spacing}
              onChange={(v) =>
                update((d) => {
                  d.layout.spacing = v
                })
              }
            />
          </div>
          <div className="sw-th-spacing" style={{ gap: SPACING_GAP[state.layout.spacing] }} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </Group>

      <Group title="Largura máxima do conteúdo" hint="telas grandes">
        <Field error={errors['layout.containerWidth']}>
          <RangeNumber
            value={state.layout.containerWidth}
            min={LIMITS.containerWidth.min}
            max={LIMITS.containerWidth.max}
            step={20}
            unit="px"
            invalid={!!errors['layout.containerWidth']}
            onChange={(v) =>
              update((d) => {
                d.layout.containerWidth = v
              })
            }
          />
        </Field>
        <div className="sw-th-width" aria-hidden="true">
          <div className="sw-th-width__fill" style={{ width: (width / 1920) * 100 + '%' }}>
            {width}px
          </div>
        </div>
        <div className="sw-th-width__legend">
          <span>tela de 1920px</span>
          <span>{width >= 1920 ? 'ocupa tudo' : Math.round((width / 1920) * 100) + '% da tela'}</span>
        </div>
      </Group>

      <Group title="Movimento">
        <div className="sw-th-row">
          <Field label="Animar entrada" help="Blocos sobem suavemente ao rolar a página">
            <div style={{ marginTop: 8 }}>
              <Toggle
                checked={state.motion.reveal}
                label={state.motion.reveal ? 'Ligado' : 'Desligado'}
                onChange={(v) =>
                  update((d) => {
                    d.motion.reveal = v
                  })
                }
              />
            </div>
          </Field>
          <Field label="Estilo do destaque" help="A *palavra* entre asteriscos nos títulos">
            <div style={{ marginTop: 4 }}>
              <Segmented<HighlightMode>
                options={[
                  { value: 'gradient', label: 'Gradiente' },
                  { value: 'solid', label: 'Cor primária' },
                  { value: 'none', label: 'Sem destaque' },
                ]}
                value={state.motion.highlight}
                onChange={(v) =>
                  update((d) => {
                    d.motion.highlight = v
                  })
                }
              />
            </div>
            <div
              className="sw-th-hl-mini"
              style={{
                marginTop: 12,
                fontFamily: displayStack,
                fontWeight: state.typography.titleWeight,
                textTransform: state.typography.titleTransform,
                color: p.ink,
              }}
            >
              <HighlightText
                text="Nova *coleção*"
                mode={state.motion.highlight}
                from={p.highlightFrom}
                to={p.highlightTo}
                primary={p.primary}
              />
            </div>
          </Field>
        </div>
      </Group>
    </Card>
  )
}
