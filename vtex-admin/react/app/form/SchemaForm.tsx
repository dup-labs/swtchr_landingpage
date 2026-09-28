/**
 * SchemaForm — JSON Schema de uma section do CMS → formulário humano.
 *
 *   <SchemaForm schema={def.schema} value={section.data} onChange={setData} upload={api.upload} />
 *
 * Mapeamento (ver pickWidget em schema.ts):
 *   string ............ Input · text-area → textarea autoexpansível · enum → Segmented (≤4 curtas) ou Select
 *                       media-gallery → Dropzone · draftjs-rich-text → textarea · date-time → datetime-local
 *                       cor (…Color, "hex" na descrição, colors.* do Tema) → ColorField (+ tokens do tema)
 *   boolean ........... Toggle          integer/number ... input number com min/max (clamp no blur)
 *   object ............ grupo · {src, alt} → MediaField · {label, url, variant} → CtaField
 *   array ............. ItemsEditor (accordion + DnD, duplicar, excluir, min/maxItems)
 * Na raiz (path ""), `appearance` vai pro accordion "Aparência" e `skipLazyLoadingSection` pro "Avançado",
 * ambos recolhidos (padrão "Configurações do bloco" da Nuvemshop). Hints mudam isso (hints.ts).
 *
 * React 16.9: sem useId/APIs 18. O valor é sempre tratado como imutável.
 */
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { FieldSchema } from '../api/types'
import { ColorField, Dropzone, Field, Input, Segmented, Select, Toggle } from '../components'
import { DragHandle, SortableItem, SortableList, arrayMove, uid } from '../dnd'
import { FormStyles } from './formCss'
import { FieldGroup, UiHint, UiHints, joinPath, lastKey, resolveHint } from './hints'
import {
  Dict,
  THEME_TOKENS,
  clone,
  colorAllowsTokens,
  enumOptions,
  firstText,
  hasMedia,
  initItem,
  isDict,
  isFullWidth,
  isMediaString,
  mediaAccept,
  pickWidget,
  truncate,
} from './schema'
import { ValidationErrors, validate } from './validate'

export type UploadFn = (file: File) => Promise<string>

export interface SchemaFormProps {
  schema: FieldSchema
  value: Record<string, unknown> | undefined
  onChange: (next: Record<string, unknown>) => void
  upload: UploadFn
  hints?: UiHints
  /** prefixo de caminho (hints/erros). Vazio = raiz de uma section (ativa os grupos Aparência/Avançado). */
  path?: string
  /** erros externos (ex: do servidor); somam com os da validação local */
  errors?: ValidationErrors
}

interface Ctx {
  upload: UploadFn
  hints?: UiHints
  errors: ValidationErrors
}

const FormCtx = createContext<Ctx>({
  upload: () => Promise.reject(new Error('upload não configurado')),
  errors: {},
})

type OnChange = (next: unknown) => void

const EMPTY: Dict = {}

/* ------------------------------------------------------------------ helpers */

function humanize(key: string): string {
  const s = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function labelOf(schema: FieldSchema, key: string, hint: UiHint): string {
  return hint.label || schema.title || humanize(key)
}

function descOf(schema: FieldSchema, hint: UiHint): string | undefined {
  return hint.description !== undefined ? hint.description || undefined : schema.description
}

/** Destaca `*palavra*` e `{token}` na ajuda como código. */
function formatHelp(text?: string): React.ReactNode {
  if (!text) return undefined
  const parts = text.split(/(\*[^*\s][^*]*\*|\{[a-zA-Z]+\})/g)
  if (parts.length === 1) return text
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <code key={i} className="sw-form-code">
        {p}
      </code>
    ) : (
      p
    )
  )
}

/** Renderiza "Peças que\n*viajam* com você" com o destaque e a quebra. */
function renderHighlight(text: string): React.ReactNode {
  return text.split('\n').map((line, li) => (
    <React.Fragment key={li}>
      {li > 0 ? <br /> : null}
      {line.split(/(\*[^*]+\*)/g).map((p, i) =>
        i % 2 === 1 ? (
          <em key={i} className="sw-form-hl">
            {p.slice(1, -1)}
          </em>
        ) : (
          p
        )
      )}
    </React.Fragment>
  ))
}

/** Chaves do objeto na ordem final (hint.order primeiro, depois ordem do schema), sem as escondidas. */
function orderedKeys(schema: FieldSchema, path: string, hints?: UiHints): string[] {
  const props = schema.properties || {}
  return Object.keys(props)
    .map((k, i) => ({ k, i, h: resolveHint(joinPath(path, k), hints) }))
    .filter((x) => !x.h.hidden)
    .sort((a, b) => {
      const oa = a.h.order !== undefined ? a.h.order : Infinity
      const ob = b.h.order !== undefined ? b.h.order : Infinity
      return oa === ob ? a.i - b.i : oa - ob
    })
    .map((x) => x.k)
}

function countErrorsUnder(errors: ValidationErrors, prefixes: string[]): number {
  return Object.keys(errors).filter((p) => prefixes.some((pre) => p === pre || p.indexOf(pre + '.') === 0)).length
}

/* ------------------------------------------------------------------ SchemaForm */

export function SchemaForm({ schema, value, onChange, upload, hints, path = '', errors }: SchemaFormProps) {
  const obj: Dict = isDict(value) ? value : EMPTY
  const localErrors = useMemo(() => validate(schema, obj, path), [schema, obj, path])
  const allErrors = useMemo(() => (errors ? Object.assign({}, localErrors, errors) : localErrors), [localErrors, errors])
  const ctx = useMemo<Ctx>(() => ({ upload, hints, errors: allErrors }), [upload, hints, allErrors])
  const set = (next: unknown) => onChange(isDict(next) ? next : {})

  let body: React.ReactNode
  if (!schema.properties) {
    body = null
  } else if (path === '') {
    body = <RootFields schema={schema} value={obj} onChange={set} />
  } else {
    body = <ObjectFields schema={schema} value={obj} onChange={set} path={path} />
  }

  return (
    <FormCtx.Provider value={ctx}>
      <FormStyles />
      <div className="sw-form">{body}</div>
    </FormCtx.Provider>
  )
}

/* ------------------------------------------------------------------ raiz: Conteúdo / Aparência / Avançado */

const GROUP_META: Record<Exclude<FieldGroup, 'content'>, { title: string; hint: string }> = {
  appearance: { title: 'Aparência', hint: 'tom, cores, espaçamento' },
  advanced: { title: 'Avançado', hint: 'carregamento e dados técnicos' },
}

function RootFields({ schema, value, onChange }: { schema: FieldSchema; value: Dict; onChange: OnChange }) {
  const { hints, errors } = useContext(FormCtx)
  const props = schema.properties || {}
  const keys = orderedKeys(schema, '', hints)
  const byGroup: Record<FieldGroup, string[]> = { content: [], appearance: [], advanced: [] }
  keys.forEach((k) => {
    const g = resolveHint(k, hints).group || 'content'
    byGroup[g].push(k)
  })
  const setKey = (k: string) => (v: unknown) => onChange(Object.assign({}, value, { [k]: v }))

  /** Dentro do accordion, o objeto `appearance` é "achatado" (sem caixa com título repetido). */
  const renderGroupKeys = (ks: string[]) => (
    <div className="sw-fields">
      {ks.map((k) => {
        const s = props[k]
        const flatten = s.type === 'object' && (k === 'appearance' || ks.length === 1) && pickWidget(s, k, k, resolveHint(k, hints)) === 'group'
        if (flatten) {
          return (
            <div key={k} className="sw-field sw-field--full">
              {s.description ? <div className="sw-field__help sw-field__help--after">{formatHelp(s.description)}</div> : null}
              <ObjectFields schema={s} value={isDict(value[k]) ? (value[k] as Dict) : {}} onChange={setKey(k)} path={k} />
            </div>
          )
        }
        return <FieldRenderer key={k} name={k} schema={s} value={value[k]} onChange={setKey(k)} path={k} />
      })}
    </div>
  )

  return (
    <>
      {byGroup.content.length ? (
        <div className="sw-fields">
          {byGroup.content.map((k) => (
            <FieldRenderer key={k} name={k} schema={props[k]} value={value[k]} onChange={setKey(k)} path={k} />
          ))}
        </div>
      ) : null}
      {(['appearance', 'advanced'] as Array<'appearance' | 'advanced'>).map((g) =>
        byGroup[g].length ? (
          <Accordion
            key={g}
            title={GROUP_META[g].title}
            hint={GROUP_META[g].hint}
            errorCount={countErrorsUnder(errors, byGroup[g])}
            defaultOpen={byGroup.content.length === 0}
          >
            {renderGroupKeys(byGroup[g])}
          </Accordion>
        ) : null
      )}
    </>
  )
}

function Accordion({
  title,
  hint,
  errorCount,
  defaultOpen,
  children,
}: {
  title: string
  hint?: string
  errorCount?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="sw-form-acc">
      <button type="button" className="sw-acc__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={'sw-acc__chevron' + (open ? ' sw-acc__chevron--open' : '')}>▶</span>
        {title}
        {hint && !open ? <span className="sw-form-acc__hint">{hint}</span> : null}
        {errorCount ? <span className="sw-form-acc__err" title={errorCount + ' erro(s)'} /> : null}
      </button>
      {open ? <div className="sw-form-acc__body">{children}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ objeto */

function ObjectFields({
  schema,
  value,
  onChange,
  path,
  className,
}: {
  schema: FieldSchema
  value: Dict
  onChange: OnChange
  path: string
  className?: string
}) {
  const { hints } = useContext(FormCtx)
  const props = schema.properties || {}
  const keys = orderedKeys(schema, path, hints)
  return (
    <div className={'sw-fields' + (className ? ' ' + className : '')}>
      {keys.map((k) => (
        <FieldRenderer
          key={k}
          name={k}
          schema={props[k]}
          value={value[k]}
          onChange={(v) => onChange(Object.assign({}, value, { [k]: v }))}
          path={joinPath(path, k)}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ roteador de campo */

interface FieldProps {
  name: string
  schema: FieldSchema
  value: unknown
  onChange: OnChange
  path: string
  /** profundidade de grupos (estilo aninhado) */
  depth?: number
}

export function FieldRenderer(props: FieldProps) {
  const { name, schema, value, onChange, path } = props
  const { hints, errors, upload } = useContext(FormCtx)
  const hint = resolveHint(path, hints)
  if (hint.hidden) return null

  const widget = pickWidget(schema, name, path, hint)
  const label = labelOf(schema, name, hint)
  const desc = descOf(schema, hint)
  const error = errors[path]
  const full = hint.full !== undefined ? hint.full : isFullWidth(widget)
  const shown = value === undefined ? schema.default : value
  const str = typeof shown === 'string' ? shown : shown === undefined || shown === null ? '' : String(shown)

  switch (widget) {
    case 'toggle':
      return (
        <Field toggle full={hint.full} error={error}>
          <Toggle checked={!!shown} onChange={(v) => onChange(v)} label={label} />
          {desc ? <div className="sw-field__help sw-field__help--after">{formatHelp(desc)}</div> : null}
        </Field>
      )

    case 'number':
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <NumberInput schema={schema} value={shown} onChange={onChange} placeholder={hint.placeholder} invalid={!!error} />
        </Field>
      )

    case 'segmented': {
      const opts = enumOptions(schema)
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <div className="sw-form-seg">
            <Segmented options={opts} value={str} onChange={(v: string) => onChange(v)} />
          </div>
        </Field>
      )
    }

    case 'select': {
      const opts = enumOptions(schema)
      const known = !str || opts.some((o) => o.value === str)
      const all = known ? opts : opts.concat([{ value: str, label: str + ' (inválido)' }])
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <Select
            value={str}
            onChange={(v) => onChange(v === '' ? undefined : v)}
            options={all}
            placeholder={schema.default === undefined ? '—' : undefined}
            invalid={!!error}
          />
        </Field>
      )
    }

    case 'color':
      return (
        <div className={'sw-form-color' + (full ? ' sw-field--full' : '')}>
          <ColorField
            label={label}
            help={formatHelp(desc)}
            value={str}
            onChange={(v) => onChange(v)}
            allowTokens={colorAllowsTokens(schema, path) ? THEME_TOKENS : undefined}
            placeholder={typeof schema.default === 'string' ? schema.default : hint.placeholder}
          />
          {error ? <div className="sw-field__err">{error}</div> : null}
        </div>
      )

    case 'media':
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <Dropzone value={str || undefined} onChange={(url) => onChange(url || '')} upload={upload} accept={mediaAccept(schema)} />
        </Field>
      )

    case 'textarea':
    case 'richtext': {
      const highlight = /\*palavra\*|destac/i.test(desc || '')
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={full}>
          <AutoTextArea
            value={str}
            onChange={(v) => onChange(v)}
            placeholder={hint.placeholder}
            minRows={widget === 'richtext' ? 4 : 2}
            invalid={!!error}
          />
          {highlight && /\*[^*]+\*|\n/.test(str) ? (
            <div className="sw-form-preview" aria-hidden="true">
              <span className="sw-form-preview__tag">Prévia</span>
              {renderHighlight(str)}
            </div>
          ) : null}
        </Field>
      )
    }

    case 'date':
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <Input
            type="datetime-local"
            value={isoToLocal(str)}
            onChange={(v) => onChange(v ? localToIso(v) : undefined)}
            invalid={!!error}
          />
        </Field>
      )

    case 'slug':
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <Input
            value={str}
            onChange={(v) => onChange(v)}
            onBlur={() => str && onChange(slugify(str))}
            placeholder={hint.placeholder || 'minha-pagina'}
            invalid={!!error}
          />
        </Field>
      )

    case 'mediaObject':
      return <MediaField {...props} label={label} desc={desc} />

    case 'cta':
      return <CtaField {...props} label={label} desc={desc} />

    case 'group':
      return (
        <div className={'sw-field sw-field--full sw-form-group' + ((props.depth || 0) > 0 ? ' sw-form-group--nested' : '')}>
          <div className="sw-form-group__head">
            <h4 className="sw-form-group__title">{label}</h4>
          </div>
          {desc ? <p className="sw-form-group__desc">{formatHelp(desc)}</p> : null}
          <GroupBody schema={schema} value={shown} onChange={onChange} path={path} depth={(props.depth || 0) + 1} />
        </div>
      )

    case 'items':
      return (
        <div className="sw-field sw-field--full">
          <ItemsEditor schema={schema} value={shown} onChange={onChange} path={path} label={label} desc={desc} />
        </div>
      )

    case 'text':
    default:
      return (
        <Field label={label} help={formatHelp(desc)} error={error} full={hint.full}>
          <Input value={str} onChange={(v) => onChange(v)} placeholder={hint.placeholder} invalid={!!error} />
        </Field>
      )
  }
}

/** Corpo de um grupo: repassa a profundidade pros filhos (grupos aninhados ficam em superfície). */
function GroupBody({ schema, value, onChange, path, depth }: { schema: FieldSchema; value: unknown; onChange: OnChange; path: string; depth: number }) {
  const { hints } = useContext(FormCtx)
  const obj: Dict = isDict(value) ? value : {}
  const props = schema.properties || {}
  return (
    <div className="sw-fields">
      {orderedKeys(schema, path, hints).map((k) => (
        <FieldRenderer
          key={k}
          name={k}
          schema={props[k]}
          value={obj[k]}
          onChange={(v) => onChange(Object.assign({}, obj, { [k]: v }))}
          path={joinPath(path, k)}
          depth={depth}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ número */

function NumberInput({
  schema,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  schema: FieldSchema
  value: unknown
  onChange: OnChange
  placeholder?: string
  invalid?: boolean
}) {
  const isInt = schema.type === 'integer'
  const min = schema.minimum
  const max = schema.maximum
  const toText = (v: unknown) => (typeof v === 'number' && !isNaN(v) ? String(v) : '')
  const [draft, setDraft] = useState(toText(value))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(toText(value))
  }, [value])

  const parse = (s: string): number | undefined => {
    if (s.trim() === '' || s === '-') return undefined
    const n = isInt ? parseInt(s, 10) : parseFloat(s.replace(',', '.'))
    return isNaN(n) ? undefined : n
  }
  const clamp = (n: number) => {
    let r = n
    if (min !== undefined && r < min) r = min
    if (max !== undefined && r > max) r = max
    return r
  }

  const range = min !== undefined && max !== undefined ? min + '–' + max : min !== undefined ? '≥ ' + min : max !== undefined ? '≤ ' + max : ''

  return (
    <div className="sw-form-num">
      <Input
        type="number"
        inputMode={isInt ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={isInt ? 1 : 'any'}
        value={draft}
        placeholder={placeholder !== undefined ? placeholder : toText(schema.default)}
        invalid={invalid}
        onFocus={() => {
          focused.current = true
        }}
        onChange={(s) => {
          setDraft(s)
          const n = parse(s)
          if (s.trim() === '') onChange(undefined)
          // só propaga enquanto digita se já estiver dentro da faixa (ex: min 960 não trava o "1" de 1440)
          else if (n !== undefined && n === clamp(n)) onChange(n)
        }}
        onBlur={() => {
          focused.current = false
          const n = parse(draft)
          if (n === undefined) {
            setDraft(toText(value))
            return
          }
          const c = clamp(n)
          setDraft(String(c))
          if (c !== value) onChange(c)
        }}
      />
      {range ? <span className="sw-form-num__range">{range}</span> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ textarea autoexpansível */

function AutoTextArea({
  value,
  onChange,
  placeholder,
  minRows,
  invalid,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minRows: number
  invalid?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      className={'sw-input sw-form-autosize' + (invalid ? ' sw-input--err' : '')}
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/* ------------------------------------------------------------------ mídia {src, mobileSrc, alt, position, poster} */

const MEDIA_LABELS: Record<string, string> = {
  src: 'Desktop',
  mobileSrc: 'Mobile · opcional',
  poster: 'Capa do vídeo · opcional',
}

const POSITION_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Topo', value: '50% 20%' },
  { label: 'Centro', value: '' },
  { label: 'Base', value: '50% 80%' },
]

function MediaField({ schema, value, onChange, path, label, desc }: FieldProps & { label: string; desc?: string }) {
  const { hints, errors, upload } = useContext(FormCtx)
  const obj: Dict = isDict(value) ? value : {}
  const props = schema.properties || {}
  const keys = orderedKeys(schema, path, hints)
  const mediaKeys = keys.filter((k) => isMediaString(props[k]))
  const otherKeys = keys.filter((k) => !isMediaString(props[k]))
  const setKey = (k: string) => (v: unknown) => onChange(Object.assign({}, obj, { [k]: v }))
  const pos = typeof obj.position === 'string' ? obj.position : ''

  return (
    <div className="sw-field sw-field--full sw-form-box">
      <label className="sw-label">{label}</label>
      {desc ? <div className="sw-field__help">{formatHelp(desc)}</div> : null}
      <div className="sw-form-media__drops">
        {mediaKeys.map((k) => {
          const p = joinPath(path, k)
          const h = resolveHint(p, hints)
          return (
            <div key={k} className="sw-form-media__drop">
              <Dropzone
                label={h.label || MEDIA_LABELS[k] || props[k].title}
                value={typeof obj[k] === 'string' && obj[k] ? (obj[k] as string) : undefined}
                onChange={(url) => setKey(k)(url || '')}
                upload={upload}
                accept={mediaAccept(props[k])}
              />
              {errors[p] ? <div className="sw-field__err">{errors[p]}</div> : null}
            </div>
          )
        })}
      </div>
      <div className="sw-fields">
        {otherKeys.map((k) => {
          const p = joinPath(path, k)
          if (k === 'position' && props[k].type === 'string') {
            const h = resolveHint(p, hints)
            return (
              <Field key={k} label={h.label || 'Enquadramento'} help={formatHelp(descOf(props[k], h))} error={errors[p]}>
                <Input value={pos} onChange={(v) => setKey(k)(v)} placeholder={h.placeholder || '50% 50%'} invalid={!!errors[p]} />
                <div className="sw-form-chips">
                  {POSITION_PRESETS.map((pr) => (
                    <button
                      key={pr.label}
                      type="button"
                      className={'sw-form-chip' + (pos === pr.value ? ' sw-form-chip--on' : '')}
                      onClick={() => setKey(k)(pr.value)}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </Field>
            )
          }
          return <FieldRenderer key={k} name={k} schema={props[k]} value={obj[k]} onChange={setKey(k)} path={p} />
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ CTA {label, url, newTab, variant, icon} */

function CtaField({ schema, value, onChange, path, label, desc }: FieldProps & { label: string; desc?: string }) {
  return (
    <div className="sw-field sw-field--full sw-form-box">
      <label className="sw-label">{label}</label>
      {desc ? <div className="sw-field__help">{formatHelp(desc)}</div> : null}
      <ObjectFields schema={schema} value={isDict(value) ? value : {}} onChange={onChange} path={path} className="sw-form-cta" />
    </div>
  )
}

/* ------------------------------------------------------------------ lista repetível */

interface ArrayLimits {
  minItems?: number
  maxItems?: number
}

function itemSummary(schema: FieldSchema | undefined, item: unknown): string {
  const t = firstText(schema, item)
  if (t) return truncate(t, 40)
  return hasMedia(item) ? '(imagem)' : '(vazio)'
}

function ItemsEditor({
  schema,
  value,
  onChange,
  path,
  label,
  desc,
}: {
  schema: FieldSchema
  value: unknown
  onChange: OnChange
  path: string
  label: string
  desc?: string
}) {
  const { errors } = useContext(FormCtx)
  const items: unknown[] = Array.isArray(value) ? value : []
  const itemSchema = schema.items
  const itemTitle = (itemSchema && itemSchema.title) || 'Item'
  const lim = schema as FieldSchema & ArrayLimits
  const canAdd = lim.maxItems === undefined || items.length < lim.maxItems
  const canRemove = items.length > (lim.minItems || 0)

  // ids estáveis por posição (os dados do CMS não têm id; não poluímos o valor com _uid)
  const ids = useRef<string[]>([])
  while (ids.current.length < items.length) ids.current.push(uid())
  if (ids.current.length > items.length) ids.current = ids.current.slice(0, items.length)

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setOpen((s) => Object.assign({}, s, { [id]: !s[id] }))

  const add = () => {
    const id = uid()
    ids.current = ids.current.concat([id])
    setOpen((s) => Object.assign({}, s, { [id]: true })) // item novo entra aberto
    onChange(items.concat([initItem(itemSchema)]))
  }
  const duplicate = (i: number) => {
    const id = uid()
    ids.current = ids.current.slice(0, i + 1).concat([id], ids.current.slice(i + 1))
    setOpen((s) => Object.assign({}, s, { [id]: true }))
    onChange(items.slice(0, i + 1).concat([clone(items[i])], items.slice(i + 1)))
  }
  const remove = (i: number) => {
    ids.current = ids.current.filter((_, j) => j !== i)
    onChange(items.filter((_, j) => j !== i))
  }
  const reorder = (from: number, to: number) => {
    ids.current = arrayMove(ids.current, from, to)
    onChange(arrayMove(items, from, to))
  }
  const setItem = (i: number) => (v: unknown) => onChange(items.map((it, j) => (j === i ? v : it)))

  const lower = itemTitle.toLowerCase()
  const listError = errors[path]

  return (
    <div className="sw-form-items">
      <div className="sw-form-items__head">
        <label className="sw-label">
          {label}
          <span className="sw-form-items__count">
            ({items.length}
            {lim.maxItems !== undefined ? '/' + lim.maxItems : ''})
          </span>
        </label>
        <button type="button" onClick={add} disabled={!canAdd} className="sw-btn sw-btn--ghost sw-btn--sm" style={{ padding: '8px 16px' }}>
          + Adicionar {lower}
        </button>
      </div>
      {desc ? <div className="sw-field__help">{formatHelp(desc)}</div> : null}
      {listError ? <div className="sw-field__err" style={{ marginBottom: 8 }}>{listError}</div> : null}
      {items.length === 0 ? (
        <div className="sw-form-items__empty">Nenhum {lower} ainda. Clique em “Adicionar {lower}”.</div>
      ) : null}
      <SortableList ids={ids.current.slice()} onReorder={reorder}>
        {items.map((it, i) => {
          const id = ids.current[i]
          const isOpen = !!open[id]
          const itemPath = joinPath(path, i)
          const hasErr = countErrorsUnder(errors, [itemPath]) > 0
          return (
            <SortableItem key={id} id={id}>
              {({ dragHandleProps }) => (
                <div className="sw-slide">
                  <div className="sw-slide__head">
                    <DragHandle {...dragHandleProps} disabled={items.length < 2} />
                    <button type="button" className="sw-slide__toggle" aria-expanded={isOpen} onClick={() => toggle(id)}>
                      <span className={'sw-acc__chevron' + (isOpen ? ' sw-acc__chevron--open' : '')} style={{ color: 'var(--muted)', fontSize: 9 }}>
                        ▶
                      </span>
                      <strong className="sw-form-item__title">
                        {itemTitle} {i + 1}
                      </strong>
                      {hasErr ? <span className="sw-form-item__err" title="Há campos com erro" /> : null}
                      {!isOpen ? <span className="sw-slide__summary">— {itemSummary(itemSchema, it)}</span> : null}
                    </button>
                    <div className="sw-form-item__actions">
                      {canAdd ? (
                        <button type="button" className="sw-btn sw-btn--link" onClick={() => duplicate(i)}>
                          duplicar
                        </button>
                      ) : null}
                      {canRemove ? (
                        <button type="button" className="sw-btn sw-btn--danger" onClick={() => remove(i)}>
                          excluir
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {isOpen && itemSchema ? (
                    <div className="sw-slide__body">
                      {itemSchema.type === 'object' ? (
                        <GroupBody schema={itemSchema} value={it} onChange={setItem(i)} path={itemPath} depth={1} />
                      ) : (
                        <div className="sw-fields">
                          <FieldRenderer name={lastKey(path)} schema={itemSchema} value={it} onChange={setItem(i)} path={itemPath} />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </SortableItem>
          )
        })}
      </SortableList>
    </div>
  )
}

/* ------------------------------------------------------------------ utilitários de formato */

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** ISO → valor do <input type=datetime-local> (horário local). */
function isoToLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function localToIso(local: string): string {
  const d = new Date(local)
  return isNaN(d.getTime()) ? local : d.toISOString()
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default SchemaForm
