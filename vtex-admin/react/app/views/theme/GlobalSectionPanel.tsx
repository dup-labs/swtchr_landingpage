import React, { useMemo } from 'react'

import * as api from '../../api/client'
import type { ComponentDef, FieldSchema } from '../../api/types'
import { Badge, Button, Card, cx } from '../../components'
import { SchemaForm } from '../../form'
import type { UploadFn } from '../../form'
import { enumOptions } from '../../form/schema'
import type { GlobalKey } from './globals'
import { GLOBAL_META, HEADER_KEY, currentVariant, globalHintsFor } from './globals'

/** Upload de mídia do formulário (logo, selos, formas de pagamento…) → URL pública. */
export const uploadMedia: UploadFn = async (file) => (await api.upload(file)).url

// ---------------------------------------------------------------- mini-previews (SVG)

const INK = '#0d1015'
const BRAND = '#639bfc'
const SKY = '#c5e2fa'
const ROW = '#ecf0f8'
const LINE = '#dfe3ec'
const WHITE = '#ffffff'

/** viewBox comum dos desenhos: 160 × 100 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg className="sw-th-style__svg" viewBox="0 0 160 100" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** Header em duas pílulas flutuando sobre o banner. */
function ArtHeaderPills() {
  return (
    <Frame>
      <defs>
        <linearGradient id="swth-banner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={SKY} />
          <stop offset="1" stopColor={BRAND} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="160" height="100" fill="url(#swth-banner)" />
      <rect x="14" y="62" width="58" height="7" rx="3.5" fill={WHITE} opacity="0.95" />
      <rect x="14" y="74" width="38" height="5" rx="2.5" fill={WHITE} opacity="0.6" />
      <rect x="14" y="84" width="26" height="8" rx="4" fill={INK} />
      {/* pílula esquerda: logo + menu */}
      <rect x="8" y="8" width="92" height="16" rx="8" fill={WHITE} />
      <rect x="15" y="13.5" width="16" height="5" rx="2.5" fill={INK} />
      <rect x="38" y="14.5" width="13" height="3" rx="1.5" fill={LINE} />
      <rect x="55" y="14.5" width="13" height="3" rx="1.5" fill={LINE} />
      <rect x="72" y="14.5" width="13" height="3" rx="1.5" fill={LINE} />
      {/* pílula direita: ações */}
      <rect x="106" y="8" width="46" height="16" rx="8" fill={WHITE} />
      <circle cx="116" cy="16" r="3" fill={LINE} />
      <circle cx="126" cy="16" r="3" fill={LINE} />
      <rect x="133" y="11" width="15" height="10" rx="5" fill={INK} />
    </Frame>
  )
}

/** Header clássico: barra inteira com logo, menu central e ícones, acima do conteúdo. */
function ArtHeaderClassic() {
  return (
    <Frame>
      <rect x="0" y="0" width="160" height="100" fill={ROW} />
      <rect x="0" y="0" width="160" height="7" fill={INK} />
      <rect x="56" y="2.5" width="48" height="2" rx="1" fill={WHITE} opacity="0.7" />
      <rect x="0" y="7" width="160" height="20" fill={WHITE} />
      <rect x="0" y="26.5" width="160" height="0.8" fill={LINE} />
      <rect x="10" y="14" width="22" height="6" rx="1.5" fill={INK} />
      <rect x="50" y="15.5" width="12" height="3" rx="1.5" fill={LINE} />
      <rect x="67" y="15.5" width="12" height="3" rx="1.5" fill={BRAND} />
      <rect x="84" y="15.5" width="12" height="3" rx="1.5" fill={LINE} />
      <rect x="101" y="15.5" width="12" height="3" rx="1.5" fill={LINE} />
      <circle cx="132" cy="17" r="3" fill={LINE} />
      <circle cx="142" cy="17" r="3" fill={LINE} />
      <circle cx="152" cy="17" r="3" fill={INK} />
      <rect x="10" y="36" width="140" height="54" rx="6" fill={SKY} />
      <rect x="20" y="62" width="50" height="6" rx="3" fill={WHITE} opacity="0.95" />
      <rect x="20" y="73" width="30" height="7" rx="3.5" fill={INK} />
    </Frame>
  )
}

/** Rodapé em colunas: marca + colunas de links + linha final. */
function ArtFooterColumns() {
  return (
    <Frame>
      <rect x="0" y="0" width="160" height="100" fill={ROW} />
      <rect x="10" y="8" width="60" height="5" rx="2.5" fill={LINE} />
      <rect x="0" y="22" width="160" height="78" fill={INK} />
      <rect x="12" y="33" width="30" height="7" rx="2" fill={WHITE} />
      <rect x="12" y="45" width="36" height="3" rx="1.5" fill={WHITE} opacity="0.35" />
      <rect x="12" y="51" width="28" height="3" rx="1.5" fill={WHITE} opacity="0.35" />
      {[64, 96, 128].map((x) => (
        <g key={x}>
          <rect x={x} y="33" width="20" height="3.5" rx="1.5" fill={SKY} />
          <rect x={x} y="42" width="22" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
          <rect x={x} y="48" width="16" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
          <rect x={x} y="54" width="19" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
        </g>
      ))}
      {[12, 22, 32].map((x) => (
        <circle key={x} cx={x + 3} cy="70" r="3.5" fill={WHITE} opacity="0.25" />
      ))}
      <rect x="0" y="82" width="160" height="0.8" fill={WHITE} opacity="0.12" />
      <rect x="12" y="89" width="54" height="2.5" rx="1.25" fill={WHITE} opacity="0.3" />
      <rect x="116" y="89" width="32" height="2.5" rx="1.25" fill={WHITE} opacity="0.3" />
    </Frame>
  )
}

/** Rodapé editorial: newsletter em destaque e wordmark gigante na base. */
function ArtFooterEditorial() {
  return (
    <Frame>
      <rect x="0" y="0" width="160" height="100" fill={ROW} />
      <rect x="10" y="8" width="60" height="5" rx="2.5" fill={LINE} />
      <rect x="0" y="22" width="160" height="78" fill={INK} />
      <rect x="12" y="32" width="56" height="5" rx="2.5" fill={WHITE} />
      <rect x="12" y="42" width="62" height="11" rx="5.5" fill={WHITE} opacity="0.12" />
      <rect x="54" y="44" width="18" height="7" rx="3.5" fill={BRAND} />
      <rect x="104" y="33" width="18" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
      <rect x="104" y="39" width="14" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
      <rect x="130" y="33" width="18" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
      <rect x="130" y="39" width="12" height="2.5" rx="1.25" fill={WHITE} opacity="0.4" />
      {[104, 112, 120, 128].map((x) => (
        <rect key={x} x={x} y="48" width="6" height="4" rx="1" fill={WHITE} opacity="0.3" />
      ))}
      <text
        x="80"
        y="93"
        textAnchor="middle"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontWeight="700"
        fontSize="34"
        letterSpacing="-1.5"
        fill={SKY}
      >
        dup.store
      </text>
    </Frame>
  )
}

/** Estilo sem arte própria (variant nova no schema): bloco neutro com o nome. */
function ArtGeneric({ label, footer }: { label: string; footer: boolean }) {
  return (
    <Frame>
      <rect x="0" y="0" width="160" height="100" fill={ROW} />
      <rect x="0" y={footer ? 62 : 0} width="160" height="38" fill={footer ? INK : WHITE} />
      <text
        x="80"
        y={footer ? 86 : 24}
        textAnchor="middle"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontWeight="700"
        fontSize="12"
        fill={footer ? WHITE : INK}
      >
        {label}
      </text>
    </Frame>
  )
}

interface StyleArt {
  label: string
  hint: string
  art: React.ReactNode
}

const ARTS: Record<string, StyleArt> = {
  pills: { label: 'Pílulas', hint: 'flutua em duas pílulas', art: <ArtHeaderPills /> },
  classic: { label: 'Clássico', hint: 'barra inteira, menu ao centro', art: <ArtHeaderClassic /> },
  columns: { label: 'Colunas', hint: 'marca + colunas de links', art: <ArtFooterColumns /> },
  editorial: { label: 'Editorial', hint: 'newsletter e wordmark gigante', art: <ArtFooterEditorial /> },
}

// ---------------------------------------------------------------- seletor de estilo

interface StyleOption {
  value: string
  label: string
  hint?: string
  art: React.ReactNode
}

function styleOptions(schema: FieldSchema | undefined, footer: boolean): StyleOption[] {
  if (!schema || !schema.enum || !schema.enum.length) return []
  return enumOptions(schema).map((o) => {
    const a = ARTS[o.value]
    // estilos conhecidos usam o nome curto da arte; os novos, o enumNames do schema
    const label = a ? a.label : o.label
    return { value: o.value, label, hint: a ? a.hint : undefined, art: a ? a.art : <ArtGeneric label={label} footer={footer} /> }
  })
}

function StylePicker({
  options,
  value,
  onChange,
  title,
}: {
  options: StyleOption[]
  value: string
  onChange: (v: string) => void
  title: string
}) {
  return (
    <div className="sw-th-styles" role="radiogroup" aria-label={title}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={cx('sw-th-style', on && 'sw-th-style--on')}
            onClick={() => onChange(o.value)}
          >
            <span className="sw-th-style__art">{o.art}</span>
            <span className="sw-th-style__foot">
              <span className="sw-th-style__name">{o.label}</span>
              {o.hint ? <span className="sw-th-style__hint">{o.hint}</span> : null}
            </span>
            {on ? <span className="sw-th-style__check">✓</span> : null}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- painel

export interface GlobalSectionPanelProps {
  sectionKey: GlobalKey
  /** definição da section no schema (getSchema); null = a loja não tem essa section no schema */
  def: ComponentDef | null
  /** data atual; null = a section não existe na globalSections */
  data: Record<string, unknown> | null
  onChange: (next: Record<string, unknown>) => void
  onAdd: () => void
  /** a section foi adicionada agora e ainda não foi salva */
  isNew?: boolean
}

/**
 * Editor de uma section global (Header ou Rodapé): seletor visual de estilo (`variant`) + SchemaForm do schema.
 * Genérico sobre o schema: campos novos aparecem sozinhos; hints (globals.ts) só ordenam/agrupam.
 */
export function GlobalSectionPanel({ sectionKey, def, data, onChange, onAdd, isNew }: GlobalSectionPanelProps) {
  const meta = GLOBAL_META[sectionKey]
  const footer = sectionKey !== HEADER_KEY
  const current = currentVariant(def, data)
  // hints dinâmicos: esconde (sem apagar) os campos que não valem pro estilo escolhido
  const hints = useMemo(() => globalHintsFor(sectionKey, current), [sectionKey, current])

  if (!def) {
    return (
      <Card className="sw-th-global-empty">
        <p className="sw-eyebrow">{meta.label}</p>
        <h3 className="sw-th-global-empty__title">{meta.label} swtchr indisponível</h3>
        <p className="sw-meta">
          O schema desta loja ainda não tem a section <code>{sectionKey}</code>. Publique o schema atualizado do swtchr
          no CMS e recarregue o painel.
        </p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="sw-th-global-empty">
        <div className="sw-th-global-empty__art">{footer ? <ArtFooterColumns /> : <ArtHeaderPills />}</div>
        <p className="sw-eyebrow">{meta.label}</p>
        <h3 className="sw-th-global-empty__title">Esta loja ainda não usa o {meta.noun} swtchr</h3>
        <p className="sw-meta">
          {footer
            ? 'Ele entra por último em Global Sections, depois das outras sections.'
            : 'Ele entra em Global Sections logo depois do Tema. Tire a Navbar nativa pra não aparecerem dois headers.'}{' '}
          Nada muda na loja até você salvar o rascunho e publicar.
        </p>
        <div className="sw-th-global-empty__cta">
          <Button variant="primary" onClick={onAdd}>
            Adicionar {meta.noun} swtchr
          </Button>
        </div>
      </Card>
    )
  }

  const props = def.schema.properties || {}
  const options = styleOptions(props.variant, footer)

  return (
    <div className="sw-th-stack">
      {options.length ? (
        <Card
          title={'Estilo do ' + meta.noun}
          actions={isNew ? <Badge tone="brand">novo · não salvo</Badge> : null}
        >
          <p className="sw-th-card__lead">
            {footer
              ? 'Escolha o desenho do rodapé. Abaixo aparecem só os campos que valem para o estilo escolhido — o que você preencheu no outro estilo fica guardado.'
              : 'Escolha o desenho do header. Abaixo aparecem só os campos que valem para o estilo escolhido — o que você preencheu no outro estilo fica guardado.'}
          </p>
          <StylePicker
            title={'Estilo do ' + meta.noun}
            options={options}
            value={current}
            onChange={(v) => {
              if (v !== data.variant) onChange(Object.assign({}, data, { variant: v }))
            }}
          />
        </Card>
      ) : null}
      <Card
        title={footer ? 'Conteúdo do rodapé' : 'Conteúdo do header'}
        actions={!options.length && isNew ? <Badge tone="brand">novo · não salvo</Badge> : null}
      >
        <SchemaForm schema={def.schema} value={data} onChange={onChange} upload={uploadMedia} hints={hints} />
      </Card>
    </div>
  )
}
