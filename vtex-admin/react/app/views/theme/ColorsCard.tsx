import React from 'react'

import { Card, ColorField } from '../../components'
import type { ColorKey } from './model'
import { contrastRatio } from './model'
import type { ThemeCardProps } from './parts'
import { Group, HighlightText, palette } from './parts'

interface ColorDef {
  key: ColorKey
  label: string
  help?: string
}

const GROUPS: Array<{ title: string; hint: string; colors: ColorDef[] }> = [
  {
    title: 'Marca',
    hint: 'destaques, badges, faixas de cor',
    colors: [
      { key: 'primary', label: 'Primária' },
      { key: 'secondary', label: 'Secundária' },
    ],
  },
  {
    title: 'Base',
    hint: 'texto, fundos e superfícies',
    colors: [
      { key: 'ink', label: 'Tinta' },
      { key: 'inverse', label: 'Inversa' },
      { key: 'background', label: 'Fundo' },
      { key: 'surface', label: 'Superfície' },
    ],
  },
  {
    title: 'Texto sobre cor',
    hint: 'legibilidade em cima da marca',
    colors: [
      { key: 'onPrimary', label: 'Sobre a primária' },
      { key: 'onSecondary', label: 'Sobre a secundária' },
    ],
  },
]

const HL_COLORS: ColorDef[] = [
  { key: 'highlightFrom', label: 'De' },
  { key: 'highlightTo', label: 'Até' },
]

const MIN_RATIO = 4.5

function ColorItem({ def, state, defaults, errors, update }: ThemeCardProps & { def: ColorDef }) {
  const err = errors['colors.' + def.key]
  const v = state.colors[def.key]
  return (
    <div className="sw-th-color">
      <ColorField
        label={def.label}
        value={v}
        placeholder={defaults.colors[def.key] + ' (padrão)'}
        onChange={(next) =>
          update((d) => {
            d.colors[def.key] = next
          })
        }
      />
      {err ? (
        <div className="sw-th-color__err">{err}</div>
      ) : !v ? (
        <div className="sw-th-color__default">vazio · usa o padrão {defaults.colors[def.key]}</div>
      ) : null}
    </div>
  )
}

export function ColorsCard(props: ThemeCardProps) {
  const { state, defaults } = props
  const p = palette(state, defaults)

  const pairs: Array<{ name: string; bg: string; fg: string }> = [
    { name: 'Texto no fundo', bg: p.background, fg: p.ink },
    { name: 'Texto na superfície', bg: p.surface, fg: p.ink },
    { name: 'Inversa na tinta', bg: p.ink, fg: p.inverse },
    { name: 'Sobre a primária', bg: p.primary, fg: p.onPrimary },
    { name: 'Sobre a secundária', bg: p.secondary, fg: p.onSecondary },
  ]
  const weak = pairs.filter((x) => contrastRatio(x.bg, x.fg) < MIN_RATIO)

  return (
    <Card title="Cores">
      <p className="sw-th-card__lead">
        A paleta da loja inteira. Toda section e todo componente nativo pinta com estas cores. Campo vazio volta ao
        padrão do tema.
      </p>

      <div className="sw-th-strip" aria-hidden="true">
        <span style={{ background: p.primary }} />
        <span style={{ background: p.secondary }} />
        <span style={{ background: p.ink }} />
        <span style={{ background: p.surface }} />
        <span style={{ background: p.background }} />
        <span style={{ backgroundImage: 'linear-gradient(165deg, ' + p.highlightFrom + ', ' + p.highlightTo + ')' }} />
      </div>

      {GROUPS.map((g) => (
        <Group key={g.title} title={g.title} hint={g.hint}>
          <div className="sw-th-colors">
            {g.colors.map((c) => (
              <ColorItem key={c.key} def={c} {...props} />
            ))}
          </div>
        </Group>
      ))}

      <Group title="Destaque de título" hint="a *palavra* entre asteriscos">
        <div className="sw-th-colors">
          {HL_COLORS.map((c) => (
            <ColorItem key={c.key} def={c} {...props} />
          ))}
        </div>
        <div className="sw-th-hl-demo" style={{ background: p.background, color: p.ink, fontWeight: 700 }}>
          <HighlightText
            text="Peças que *viajam* com você"
            mode="gradient"
            from={p.highlightFrom}
            to={p.highlightTo}
            primary={p.primary}
          />
        </div>
        {state.motion.highlight !== 'gradient' ? (
          <div className="sw-meta" style={{ marginTop: 8 }}>
            O estilo do destaque está em “{state.motion.highlight === 'solid' ? 'Cor primária' : 'Sem destaque'}” (card
            Layout e movimento): estas duas cores só aparecem na loja com “Gradiente”.
          </div>
        ) : null}
      </Group>

      <Group title="Contraste" hint={'WCAG AA · mínimo ' + MIN_RATIO + ':1'}>
        <div className="sw-th-contrast">
          {pairs.map((x) => {
            const r = contrastRatio(x.bg, x.fg)
            const ok = r >= MIN_RATIO
            return (
              <div key={x.name} className="sw-th-pair" style={{ background: x.bg, color: x.fg }}>
                <span className="sw-th-pair__name">{x.name}</span>
                <span className="sw-th-pair__sample">Aa Texto</span>
                <div className="sw-th-pair__foot">
                  <span className="sw-th-pair__ratio">{r.toFixed(1)}:1</span>
                  <span className={'sw-th-pair__flag sw-th-pair__flag--' + (ok ? 'ok' : 'warn')}>
                    {ok ? 'ok' : 'baixo'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {weak.length ? (
          <div className="sw-th-warn" role="status">
            <span aria-hidden="true">⚠</span>
            <span>
              <b>Contraste baixo</b> em {weak.map((w) => w.name.toLowerCase()).join(', ')}. Abaixo de {MIN_RATIO}:1 o
              texto fica difícil de ler para parte dos clientes. Dá pra salvar mesmo assim.
            </span>
          </div>
        ) : null}
      </Group>
    </Card>
  )
}
