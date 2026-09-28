import React from 'react'

import type { ComponentDef, PageSection } from '../../api/types'
import { Badge, BlockCard, Button, Message, cleanTitle } from '../../components'
import type { DragHandleProps } from '../../dnd'
import { SchemaForm, sectionSummary } from '../../form'
import type { UploadFn } from '../../form'

export interface SectionCardProps {
  section: PageSection
  def?: ComponentDef
  /** posição dentro da zona (↑/↓ respeitam a zona) */
  index: number
  /** tamanho da zona */
  count: number
  open: boolean
  invalid: boolean
  /** ausente = sem punho de arrastar (ex.: section fixa) */
  dragHandleProps?: DragHandleProps
  upload: UploadFn
  /**
   * Section fixa (âncora de zona): não move, não duplica, não exclui.
   * Se for swtchr com schema, os campos continuam editáveis (ex.: SwtchrProductHero na PDP).
   */
  pinned?: boolean
  /** substitui o título exibido (ex.: "Produtos (listagem nativa com filtros)") */
  titleOverride?: string
  /** substitui o texto pequeno ao lado do título */
  metaOverride?: React.ReactNode
  onToggleOpen: () => void
  onChangeData: (data: Record<string, unknown>) => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onRemove: () => void
}

export function sectionTitle(section: PageSection, def?: ComponentDef): string {
  return cleanTitle(section.title || (def && def.title)) || section.key
}

function IconBtn({
  label,
  danger,
  children,
  ...rest
}: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={'sw-page__iconbtn' + (danger ? ' sw-page__iconbtn--danger' : '')}
      title={label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Card de uma section da página: nativa travada, fixa (âncora) ou swtchr editável (SchemaForm inline). */
export function SectionCard({
  section,
  def,
  index,
  count,
  open,
  invalid,
  dragHandleProps,
  upload,
  pinned,
  titleOverride,
  metaOverride,
  onToggleOpen,
  onChangeData,
  onMove,
  onDuplicate,
  onRemove,
}: SectionCardProps) {
  const title = titleOverride || sectionTitle(section, def)
  const locked = section.native
  const editable = !locked && !!def

  const moveButtons = pinned ? null : (
    <React.Fragment>
      <IconBtn label={'Mover ' + title + ' para cima'} disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </IconBtn>
      <IconBtn label={'Mover ' + title + ' para baixo'} disabled={index === count - 1} onClick={() => onMove(1)}>
        ↓
      </IconBtn>
    </React.Fragment>
  )

  const actions =
    locked || pinned ? (
      moveButtons
    ) : (
      <React.Fragment>
        {moveButtons}
        {def ? (
          <IconBtn label={'Duplicar ' + title} onClick={onDuplicate}>
            ⧉
          </IconBtn>
        ) : null}
        <IconBtn label={'Excluir ' + title} danger onClick={onRemove}>
          ✕
        </IconBtn>
      </React.Fragment>
    )

  const badges = (
    <React.Fragment>
      {invalid ? <span className="sw-page__errdot" title="há campos com erro nesta section" /> : null}
      {pinned && !locked ? (
        <Badge tone="muted" title="Section fixa desta página: dá pra editar, mas não mover nem excluir">
          fixa
        </Badge>
      ) : null}
      {!locked && !def ? (
        <Badge tone="warn" title="Esta section não está no schema atual do CMS">
          sem schema
        </Badge>
      ) : null}
    </React.Fragment>
  )

  const meta =
    metaOverride !== undefined
      ? metaOverride
      : locked
      ? undefined
      : sectionSummary(section.key, section.data) || undefined

  return (
    <div id={'sw-sec-' + section.uid} className={invalid ? 'sw-page__block--err' : undefined}>
      <BlockCard
        title={title}
        previewKey={section.key}
        locked={locked}
        meta={meta}
        badges={badges}
        open={open}
        onToggleOpen={onToggleOpen}
        dragHandleProps={dragHandleProps}
        actions={actions}
        testid={'section-' + section.uid}
      >
        {editable && def ? (
          <React.Fragment>
            <SchemaForm schema={def.schema} value={section.data} onChange={onChangeData} upload={upload} />
            {pinned ? null : (
              <div className="sw-page__body-foot">
                <Button variant="ghost" small onClick={onDuplicate}>
                  Duplicar
                </Button>
                <Button variant="danger" small onClick={onRemove}>
                  Excluir section
                </Button>
              </div>
            )}
          </React.Fragment>
        ) : (
          <Message kind="err">
            O schema desta section ({section.key}) não foi encontrado — ela é mantida como está, mas não dá pra editar
            aqui.
          </Message>
        )}
      </BlockCard>
    </div>
  )
}
