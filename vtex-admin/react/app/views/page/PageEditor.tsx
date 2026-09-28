/**
 * PageEditor — editor genérico de página do CMS (home, landingPage, plp, search, pdp).
 *
 * Faz tudo que o editor da home fazia: carrega schema + página, lista de sections com dnd,
 * formulário inline (SchemaForm), undo (Ctrl/Cmd+Z), salvar rascunho, publicar, descartar,
 * preview com live ('swtchr:page'), modo foco com trilha e card de SEO.
 *
 *   <PageEditor type="pdp" entryId={id} title="Produto padrão" onBack={() => setId(null)} />
 *
 * Props
 * - `type: PageType`           tipo do content type no CMS. Define textos, blocos permitidos
 *                              (./allowed.ts) e zonas (./pageTypes.ts).
 * - `entryId: string`          id da entrada (GET/PUT /pages/:type/:id). Mudar o id recarrega a página
 *                              (o schema é carregado uma vez por montagem). Quem monta decide a entrada;
 *                              criar entrada nova é com POST /pages/:type fora daqui, e aí passar o id real.
 * - `title?: ReactNode`        título da DraftBar (default: nome da entrada, senão o label do tipo).
 * - `headerExtra?: ReactNode`  conteúdo extra na DraftBar, à esquerda dos botões (seletor de entrada/escopo).
 * - `onBack?: () => void`      mostra "← Voltar" na DraftBar; pede confirmação se houver alteração não salva.
 * - `zones?: ZoneConfig | null` sobrescreve as zonas do tipo (null = lista única, sem zonas).
 * - `onSaved?: (doc) => void`  depois de salvar o rascunho (doc relido do CMS — útil pra atualizar listas).
 * - `onPublished?: () => void` depois de publicar.
 * - `previewPath?: string`     caminho da loja aberto no preview (produto/categoria/página real); mudar recarrega o preview.
 * - `onDiscarded?: () => void` depois de descartar o rascunho. Se a entrada não existir mais na main
 *                              (ex.: criada só no rascunho), o editor não consegue reabrir — use isto pra voltar.
 *
 * O estado "há alterações não salvas" vai pro shell (useShell().dirty), então o wrapper pode perguntar
 * antes de trocar `entryId`. Zonas são só visuais: o array salvo é UMA lista ordenada com as nativas
 * no lugar; o live preview manda a lista completa, na ordem, com `native: true` nas nativas.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ComponentDef, FieldSchema, PageDocument, PageSection, PageType } from '../../api/types'
import {
  BlockPickerModal,
  BlockPreview,
  Button,
  Card,
  DraftBar,
  EditorSplit,
  EmptyState,
  Message,
  Modal,
  PreviewPane,
  Spinner,
  cx,
} from '../../components'
import type { DraftStatus, PreviewDevice } from '../../components'
import { SortableItem, SortableList, arrayMove, uid } from '../../dnd'
import { SchemaForm, hasErrors, initFromSchema, validate } from '../../form'
import { useShell } from '../../shell/ShellContext'
import { notifyMirror } from '../../shell/mirror'
import { allowedComponents, filterByKeys } from './allowed'
import * as api from './pageApi'
import { PageStyles } from './pageCss'
import { pageTypeConfig } from './pageTypes'
import type { ZoneConfig, ZoneSpec } from './pageTypes'
import { SectionCard, sectionTitle } from './SectionCard'

export type { ZoneConfig, ZoneSpec } from './pageTypes'

export interface PageEditorProps {
  type: PageType
  entryId: string
  title?: React.ReactNode
  headerExtra?: React.ReactNode
  onBack?: () => void
  zones?: ZoneConfig | null
  onSaved?: (doc: PageDocument) => void
  onPublished?: () => void
  onDiscarded?: () => void
  /** caminho aberto no preview (produto/categoria/página real, ex.: "/moletom-x-22/p"). Mudar recarrega o preview. */
  previewPath?: string
}

const HISTORY_MAX = 50

type Dict = Record<string, unknown>
/** onde o picker insere: lista inteira (sem zonas) ou uma zona */
type ZoneKey = 'all' | 'before' | 'after'

function isDict(v: unknown): v is Dict {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function cloneData<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

const SEO_SCHEMA: FieldSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Título da página', description: 'Aparece na aba do navegador e no Google.' },
    description: {
      type: 'string',
      title: 'Descrição',
      description: 'Resumo exibido nos resultados de busca (até ~160 caracteres).',
      widget: { 'ui:widget': 'textarea' },
    },
  },
}

/** Editor de página: lista de sections (dnd, com zonas) + formulário inline + preview + rascunho/publicação. */
export default function PageEditor({
  type,
  entryId,
  title,
  headerExtra,
  onBack,
  zones,
  onSaved,
  onPublished,
  onDiscarded,
  previewPath,
}: PageEditorProps) {
  const { draft, refreshDraft, setDirty, notify, setFocus } = useShell()
  const cfg = pageTypeConfig(type)
  const zoneCfg: ZoneConfig | undefined = zones === null ? undefined : zones || cfg.zones

  // ------------------------------------------------------------ carga
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [components, setComponents] = useState<ComponentDef[]>([])
  const [page, setPage] = useState<PageDocument | null>(null)

  // ------------------------------------------------------------ estado editável
  const [sections, setSections] = useState<PageSection[]>([])
  const [fields, setFields] = useState<Dict>({})
  const [localDirty, setLocalDirty] = useState(false)
  const [open, setOpen] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  // ------------------------------------------------------------ UI
  const [picking, setPicking] = useState<ZoneKey | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [justPublished, setJustPublished] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)

  // ------------------------------------------------------------ preview
  // URL + reload num estado só: trocar os dois juntos recria o iframe uma vez (setState em promise não é agrupado no React 16)
  const [frame, setFrame] = useState<{ url: string | null; reloadKey: number }>({ url: null, reloadKey: 0 })
  const [previewError, setPreviewError] = useState('')
  const [device, setDevice] = useState<PreviewDevice>('desktop')

  // refs: valor atual (p/ handlers assíncronos), histórico de undo, versão de edição, rolagem pendente
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const pageRef = useRef(page)
  pageRef.current = page
  const past = useRef<PageSection[][]>([])
  const lastEdit = useRef<{ key: string; at: number }>({ key: '', at: 0 })
  const editVersion = useRef(0)
  /** schema já carregado nesta montagem (troca de entrada só relê a página) */
  const schemaLoaded = useRef(false)
  /** descarta respostas de aberturas antigas (troca rápida de entrada) */
  const openSeq = useRef(0)
  /** `delay`: espera a transição do layout (ex.: saindo do modo foco) antes de rolar */
  const [scrollTarget, setScrollTarget] = useState<{ id: string; delay?: number } | null>(null)

  const defs = useMemo(() => {
    const m: Record<string, ComponentDef> = {}
    components.forEach((c) => {
      m[c.key] = c
    })
    return m
  }, [components])

  const pickable = useMemo(() => allowedComponents(components, type), [components, type])

  // ------------------------------------------------------------ carregamento

  // ref: trocar o caminho não recria loadPreview/openEntry (não recarrega a página, só o preview)
  const previewPathRef = useRef(previewPath)
  previewPathRef.current = previewPath

  const loadPreview = useCallback(
    (id: string) => {
      setPreviewError('')
      return api
        .getPreviewUrl(type, id, previewPathRef.current || undefined)
        .then((r) => {
          setFrame((p) => ({ url: r.url, reloadKey: p.reloadKey + 1 }))
        })
        .catch((e) => setPreviewError(errMsg(e)))
    },
    [type]
  )

  const applyDoc = useCallback((doc: PageDocument) => {
    setPage(doc)
    setSections(doc.sections || [])
    setFields(doc.fields || {})
    setOpen([])
    setSelected(null)
    setLocalDirty(false)
    past.current = []
    lastEdit.current = { key: '', at: 0 }
    editVersion.current += 1
  }, [])

  const openEntry = useCallback(
    async (id: string) => {
      const seq = ++openSeq.current
      const doc = await api.getPage(type, id)
      if (seq !== openSeq.current) return
      applyDoc(doc)
      loadPreview(doc.id)
    },
    [type, applyDoc, loadPreview]
  )

  const load = useCallback(async () => {
    setPhase('loading')
    setLoadError('')
    try {
      const [schema] = await Promise.all([api.getSchema(), openEntry(entryId)])
      setComponents(schema.components || [])
      schemaLoaded.current = true
      setPhase('ready')
    } catch (e) {
      setLoadError(errMsg(e))
      setPhase('error')
    }
  }, [openEntry, entryId])

  // montagem: schema + página. Depois, trocar `entryId`/`type` só relê a página (sem spinner de tela cheia).
  useEffect(() => {
    if (!schemaLoaded.current) {
      load()
      return
    }
    if (pageRef.current && pageRef.current.id === entryId && pageRef.current.type === type) return
    openEntry(entryId).catch((e) => notify('Erro ao abrir: ' + errMsg(e), 'err'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, entryId])

  // caminho do preview mudou (ex.: produto de exemplo resolvido depois) → só recarrega o preview
  const lastPreviewPath = useRef(previewPath)
  useEffect(() => {
    if (lastPreviewPath.current === previewPath) return
    lastPreviewPath.current = previewPath
    if (pageRef.current) loadPreview(pageRef.current.id)
  }, [previewPath, loadPreview])

  // ------------------------------------------------------------ dirty: shell + beforeunload

  useEffect(() => {
    setDirty(localDirty)
  }, [localDirty, setDirty])

  // ao sair da view (troca de aba) as alterações locais somem → limpa o badge do shell
  useEffect(() => () => setDirty(false), [setDirty])

  useEffect(() => {
    if (!localDirty) return undefined
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [localDirty])

  const markDirty = () => {
    editVersion.current += 1
    setLocalDirty(true)
    setJustPublished(false)
  }

  // ------------------------------------------------------------ zonas

  /** índice da âncora (primeira section com anchorKey) ou -1 */
  const anchorIndexOf = (list: PageSection[]) =>
    zoneCfg ? list.findIndex((s) => s.key === zoneCfg.anchorKey) : -1

  // ------------------------------------------------------------ mutações da lista (com undo)

  /** Aplica uma mudança na lista. `coalesce` agrupa edições seguidas da mesma section num passo de undo. */
  const commit = (next: PageSection[], coalesce?: string) => {
    const now = Date.now()
    const same = !!coalesce && lastEdit.current.key === coalesce && now - lastEdit.current.at < 1500
    if (!same) {
      past.current.push(sectionsRef.current)
      if (past.current.length > HISTORY_MAX) past.current.shift()
    }
    lastEdit.current = { key: coalesce || '', at: now }
    sectionsRef.current = next
    setSections(next)
    markDirty()
  }

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev) return false
    lastEdit.current = { key: '', at: 0 }
    sectionsRef.current = prev
    setSections(prev)
    editVersion.current += 1
    setLocalDirty(true)
    return true
  }, [])

  // Ctrl/Cmd+Z fora de campos de texto (dentro deles vale o undo nativo do navegador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || (e.key !== 'z' && e.key !== 'Z')) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (undo()) {
        e.preventDefault()
        notify('Desfeito', 'info', 1500)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, notify])

  // rola até a section recém-criada/duplicada/com erro
  useEffect(() => {
    if (!scrollTarget) return undefined
    const t = window.setTimeout(() => {
      const el = document.getElementById('sw-sec-' + scrollTarget.id)
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: scrollTarget.delay ? 'start' : 'nearest' })
    }, scrollTarget.delay || 0)
    return () => window.clearTimeout(t)
  }, [scrollTarget])

  const openIds = (ids: string[]) => {
    setOpen((cur) => cur.concat(ids.filter((id) => cur.indexOf(id) === -1)))
  }

  /** Trilha do modo foco: sai do foco, abre a section (se editável) e rola até ela. */
  const jumpTo = (sec: PageSection) => {
    setFocus(false)
    if (!sec.native) {
      openIds([sec.uid])
      setSelected(sec.uid)
    }
    setScrollTarget({ id: sec.uid, delay: 380 })
  }

  const toggleOpen = (id: string) => {
    const isOpen = open.indexOf(id) !== -1
    setOpen(isOpen ? open.filter((x) => x !== id) : open.concat(id))
    setSelected(isOpen ? (selected === id ? null : selected) : id)
  }

  /** Insere na posição `at` da lista, já aberta e selecionada. */
  const insertAt = (sec: PageSection, at: number) => {
    const list = sectionsRef.current
    const i = Math.max(0, Math.min(at, list.length))
    commit(list.slice(0, i).concat(sec, list.slice(i)))
    openIds([sec.uid])
    setSelected(sec.uid)
    setScrollTarget({ id: sec.uid })
  }

  /**
   * Onde um bloco novo entra: logo após a section selecionada se ela estiver na zona alvo,
   * senão no fim da zona (antes da âncora, para 'before'; fim da lista, para 'after'/'all').
   */
  const insertIndex = (target: ZoneKey): number => {
    const list = sectionsRef.current
    const sel = selected ? list.findIndex((s) => s.uid === selected) : -1
    const a = anchorIndexOf(list)
    if (target === 'all' || a === -1) return sel !== -1 ? sel + 1 : list.length
    if (target === 'before') return sel !== -1 && sel < a ? sel + 1 : a
    return sel >= a ? sel + 1 : list.length
  }

  /** Zona do botão "Adicionar bloco" do cabeçalho: a da section selecionada, senão a última que aceita blocos. */
  const headerTarget = (): ZoneKey => {
    const a = anchorIndexOf(sections)
    if (!zoneCfg || a === -1) return 'all'
    const sel = selected ? sections.findIndex((s) => s.uid === selected) : -1
    if (sel !== -1 && sel < a && zoneCfg.before.addable) return 'before'
    if (zoneCfg.after.addable) return 'after'
    return zoneCfg.before.addable ? 'before' : 'after'
  }

  const addSection = (def: ComponentDef, target: ZoneKey) => {
    insertAt(
      { uid: uid(), key: def.key, title: def.title, native: false, data: initFromSchema(def.schema) },
      insertIndex(target)
    )
  }

  /** Cria a âncora que falta (ex.: SwtchrProductHero): depois das nativas iniciais, antes de qualquer bloco. */
  const addAnchor = () => {
    if (!zoneCfg) return
    const def = defs[zoneCfg.anchorKey]
    if (!def || !def.swtchr) return
    const list = sectionsRef.current
    let at = 0
    while (at < list.length && list[at].native) at += 1
    insertAt({ uid: uid(), key: def.key, title: def.title, native: false, data: initFromSchema(def.schema) }, at)
  }

  const duplicate = (id: string) => {
    const list = sectionsRef.current
    const idx = list.findIndex((s) => s.uid === id)
    const src = list[idx]
    if (!src || src.native) return
    insertAt({ uid: uid(), key: src.key, title: src.title, native: false, data: cloneData(src.data) }, idx + 1)
  }

  const remove = (id: string) => {
    commit(sectionsRef.current.filter((s) => s.uid !== id))
    setOpen(open.filter((x) => x !== id))
    if (selected === id) setSelected(null)
  }

  const move = (from: number, to: number) => {
    const list = sectionsRef.current
    if (to < 0 || to >= list.length || from === to) return
    commit(arrayMove(list, from, to))
  }

  const changeData = (id: string, data: Record<string, unknown>) => {
    commit(
      sectionsRef.current.map((s) => (s.uid === id ? { ...s, data } : s)),
      'data:' + id
    )
  }

  const changeSeo = (seo: Record<string, unknown>) => {
    setFields({ ...fields, seo })
    markDirty()
  }

  // ------------------------------------------------------------ validação

  const invalid = useMemo(() => {
    const m: Record<string, boolean> = {}
    sections.forEach((s) => {
      const def = defs[s.key]
      if (!s.native && def) m[s.uid] = hasErrors(validate(def.schema, s.data))
    })
    return m
  }, [sections, defs])

  const invalidList = sections.filter((s) => invalid[s.uid])

  // ------------------------------------------------------------ rascunho

  const hasDraft = !!(draft && draft.branchId)
  const status: DraftStatus = localDirty ? 'dirty' : hasDraft ? 'draft' : justPublished ? 'live' : 'clean'
  const statusText =
    status === 'dirty' && invalidList.length
      ? 'alterações não salvas · ' +
        invalidList.length +
        (invalidList.length === 1 ? ' section com erro' : ' sections com erro')
      : status === 'clean'
      ? 'sem alterações · igual à loja'
      : undefined

  const save = async (): Promise<boolean> => {
    if (!page) return false
    if (invalidList.length) {
      const names = invalidList.map((s) => sectionTitle(s, defs[s.key])).join(', ')
      notify('Corrija os campos marcados antes de salvar: ' + names, 'err', 6000)
      openIds(invalidList.map((s) => s.uid))
      setScrollTarget({ id: invalidList[0].uid })
      return false
    }
    const version = editVersion.current
    setSaving(true)
    try {
      const saved = await api.savePage(type, page.id, {
        name: page.name,
        fields,
        sections: sectionsRef.current,
      })
      if (editVersion.current === version) {
        // nada mudou durante o save → adota a página relida (ids do CMS), mantendo abertas as mesmas posições
        if (saved && Array.isArray(saved.sections)) {
          const before = sectionsRef.current
          const remap = (id: string | null) => {
            if (!id) return id
            const i = before.findIndex((s) => s.uid === id)
            return i !== -1 && saved.sections[i] ? saved.sections[i].uid : id
          }
          setOpen((cur) => cur.map((id) => remap(id) as string))
          setSelected(remap(selected))
          setPage(saved)
          setSections(saved.sections)
          setFields(saved.fields || fields)
          past.current = []
        } else {
          setPage({ ...page, source: 'draft' })
        }
        setLocalDirty(false)
      }
      await refreshDraft()
      await loadPreview(saved && saved.id ? saved.id : page.id)
      notify('Rascunho salvo', 'ok')
      if (onSaved && saved) onSaved(saved)
      return true
    } catch (e) {
      notify('Erro ao salvar: ' + errMsg(e), 'err', 6000)
      return false
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!page) return
    if (localDirty) {
      const ok = await save()
      if (!ok) return
    }
    const id = (pageRef.current || page).id
    setPublishing(true)
    try {
      const result = await api.publishDraft()
      await refreshDraft()
      setJustPublished(true)
      setPage((p) => (p ? { ...p, source: 'main' } : p))
      await loadPreview(id)
      notify('Publicado — a loja atualiza em instantes', 'ok')
      notifyMirror(result, notify)
      if (onPublished) onPublished()
    } catch (e) {
      notify('Erro ao publicar: ' + errMsg(e), 'err', 6000)
    } finally {
      setPublishing(false)
    }
  }

  const discard = async () => {
    if (!page) return
    setConfirmDiscard(false)
    setDiscarding(true)
    try {
      if (hasDraft) await api.discardDraft()
      await refreshDraft()
      try {
        await openEntry(page.id)
      } catch (e) {
        // entrada criada só no rascunho some junto com ele → quem montou decide pra onde ir
        if (!onDiscarded) throw e
      }
      setJustPublished(false)
      notify('Alterações descartadas', 'ok')
      if (onDiscarded) onDiscarded()
    } catch (e) {
      notify('Erro ao descartar: ' + errMsg(e), 'err', 6000)
    } finally {
      setDiscarding(false)
    }
  }

  const back = () => {
    if (!onBack) return
    if (localDirty && !window.confirm('Há alterações não salvas. Voltar e descartar?')) return
    setDirty(false)
    onBack()
  }

  // ------------------------------------------------------------ render

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner label={'carregando ' + cfg.the + '…'} />
      </div>
    )
  }

  if (phase === 'error' || !page) {
    return (
      <EmptyState
        title={'Não deu pra carregar ' + cfg.the}
        action={
          <React.Fragment>
            {onBack ? (
              <Button variant="ghost" onClick={onBack}>
                ← Voltar
              </Button>
            ) : null}
            <Button variant="primary" onClick={load}>
              Tentar de novo
            </Button>
          </React.Fragment>
        }
      >
        {loadError || 'Erro desconhecido.'}
      </EmptyState>
    )
  }

  const seo = isDict(fields.seo) ? fields.seo : null
  const removing = confirmRemove ? sections.find((s) => s.uid === confirmRemove) : undefined
  const anchorIdx = anchorIndexOf(sections)
  const zoned = !!zoneCfg && anchorIdx !== -1

  /** Uma faixa contígua [start, end) da lista, ordenável só dentro dela. */
  const renderRange = (start: number, end: number) => {
    const slice = sections.slice(start, end)
    return (
      <SortableList ids={slice.map((s) => s.uid)} onReorder={(from, to) => move(start + from, start + to)}>
        {slice.map((s, i) => (
          <SortableItem key={s.uid} id={s.uid}>
            {({ dragHandleProps }) => (
              <SectionCard
                section={s}
                def={defs[s.key]}
                index={i}
                count={slice.length}
                open={open.indexOf(s.uid) !== -1}
                invalid={!!invalid[s.uid]}
                dragHandleProps={dragHandleProps}
                upload={api.upload}
                onToggleOpen={() => toggleOpen(s.uid)}
                onChangeData={(d) => changeData(s.uid, d)}
                onMove={(delta) => move(start + i, start + i + delta)}
                onDuplicate={() => duplicate(s.uid)}
                onRemove={() => setConfirmRemove(s.uid)}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
    )
  }

  const zoneBlock = (key: 'before' | 'after', spec: ZoneSpec, start: number, end: number, anchor?: React.ReactNode) => (
    <div className="sw-page__zone" data-zone={key}>
      <div className="sw-page__zonehead">
        <span className="sw-page__zonetitle">{spec.title}</span>
        {spec.help ? <span className="sw-page__zonehelp">{spec.help}</span> : null}
      </div>
      {end > start ? renderRange(start, end) : spec.addable ? (
        <div className="sw-page__zoneempty">{spec.emptyText || 'Nenhum bloco aqui ainda.'}</div>
      ) : null}
      {anchor}
      {spec.addable ? (
        <Button
          variant="ghost"
          small
          className="sw-page__add"
          onClick={() => setPicking(key)}
          data-testid={'add-section-' + key}
        >
          + Adicionar bloco aqui
        </Button>
      ) : null}
    </div>
  )

  let list: React.ReactNode
  if (zoned && zoneCfg) {
    const a = sections[anchorIdx]
    const pinned = zoneCfg.anchorMode === 'pinned'
    const anchorCard = (
      <div className="sw-page__anchor">
        <SectionCard
          section={a}
          def={defs[a.key]}
          index={0}
          count={1}
          open={!a.native && open.indexOf(a.uid) !== -1}
          invalid={!!invalid[a.uid]}
          upload={api.upload}
          pinned
          titleOverride={zoneCfg.anchorTitle}
          metaOverride={zoneCfg.anchorMeta}
          onToggleOpen={() => (a.native ? undefined : toggleOpen(a.uid))}
          onChangeData={(d) => changeData(a.uid, d)}
          onMove={() => undefined}
          onDuplicate={() => undefined}
          onRemove={() => undefined}
        />
      </div>
    )
    list = pinned ? (
      <React.Fragment>
        {zoneBlock('before', zoneCfg.before, 0, anchorIdx, anchorCard)}
        {zoneBlock('after', zoneCfg.after, anchorIdx + 1, sections.length)}
      </React.Fragment>
    ) : (
      <React.Fragment>
        {zoneBlock('before', zoneCfg.before, 0, anchorIdx)}
        {anchorCard}
        {zoneBlock('after', zoneCfg.after, anchorIdx + 1, sections.length)}
      </React.Fragment>
    )
  } else {
    const anchorDef = zoneCfg ? defs[zoneCfg.anchorKey] : undefined
    list = (
      <React.Fragment>
        {zoneCfg ? (
          <div className="sw-page__warn">
            <Message kind="err" box>
              {zoneCfg.missing.message}
            </Message>
            {zoneCfg.missing.addLabel && anchorDef && anchorDef.swtchr ? (
              <Button variant="soft" small onClick={addAnchor} data-testid="add-anchor">
                {zoneCfg.missing.addLabel}
              </Button>
            ) : null}
          </div>
        ) : null}

        {sections.length === 0 ? (
          <div className="sw-page__empty">
            {capitalize(cfg.the)} ainda não tem sections. Comece adicionando um bloco.
          </div>
        ) : null}

        {renderRange(0, sections.length)}

        {sections.length > 0 ? (
          <Button variant="ghost" className="sw-page__add" onClick={() => setPicking('all')}>
            + Adicionar bloco
          </Button>
        ) : null}
      </React.Fragment>
    )
  }

  const showHeaderAdd = !zoneCfg || !zoned || zoneCfg.before.addable || zoneCfg.after.addable

  const form = (
    <div className="anim-fade">
      <div className="sw-page__head">
        <h3 className="sw-h3">
          Sections <span className="sw-page__count">({sections.length})</span>
        </h3>
        {showHeaderAdd ? (
          <Button variant="soft" small onClick={() => setPicking(headerTarget())} data-testid="add-section">
            Adicionar bloco
          </Button>
        ) : null}
      </div>

      {list}

      {seo ? (
        <Card
          className="sw-page__seo"
          title={'SEO ' + cfg.of}
          actions={
            <Button variant="link" small onClick={() => setSeoOpen(!seoOpen)} aria-expanded={seoOpen}>
              {seoOpen ? 'Fechar' : 'Editar →'}
            </Button>
          }
        >
          {seoOpen ? (
            <SchemaForm schema={SEO_SCHEMA} value={seo} onChange={changeSeo} upload={api.upload} path="seo" />
          ) : null}
        </Card>
      ) : null}
    </div>
  )

  const rail = (
    <nav className="sw-rail" aria-label={'Sections ' + cfg.of}>
      {sections.map((s) => {
        const t = sectionTitle(s, defs[s.key])
        const tip = s.native ? t + ' (nativa)' : t
        return (
          <button
            key={s.uid}
            type="button"
            className={cx(
              'sw-rail__item',
              s.native && 'sw-rail__item--locked',
              selected === s.uid && 'sw-rail__item--active'
            )}
            title={tip}
            aria-label={'Abrir ' + tip}
            onClick={() => jumpTo(s)}
          >
            <span className="sw-rail__thumb">
              <BlockPreview type={s.key} native={s.native} />
            </span>
          </button>
        )
      })}
      {sections.length === 0 ? <span className="sw-rail__empty">vazia</span> : null}
    </nav>
  )

  // Prévia ao vivo: a loja (dentro do iframe) troca as sections da página pela versão atual do editor.
  const live = {
    type: 'swtchr:page',
    payload: { pageType: type, sections: sections.map((s) => ({ key: s.key, native: s.native, data: s.data })) },
  }
  const preview = previewError ? (
    <EmptyState
      title="Preview indisponível"
      action={
        <Button variant="soft" small onClick={() => loadPreview(page.id)}>
          Tentar de novo
        </Button>
      }
    >
      {previewError}
    </EmptyState>
  ) : (
    <PreviewPane
      url={frame.url}
      busy={saving || publishing}
      device={device}
      onDeviceChange={setDevice}
      reloadKey={frame.reloadKey}
      unsaved={localDirty}
      live={live}
    />
  )

  const pickerComponents =
    picking && picking !== 'all' && zoneCfg && zoneCfg[picking].allowed
      ? filterByKeys(components, zoneCfg[picking].allowed)
      : pickable

  const barExtra =
    onBack || headerExtra ? (
      <React.Fragment>
        {onBack ? (
          <Button variant="ghost" small className="sw-page__back" onClick={back}>
            ← Voltar
          </Button>
        ) : null}
        {headerExtra}
      </React.Fragment>
    ) : undefined

  return (
    <div>
      <PageStyles />
      <DraftBar
        title={title || page.name || cfg.label}
        status={status}
        statusText={statusText}
        onSave={save}
        onPublish={publish}
        onDiscard={() => setConfirmDiscard(true)}
        saving={saving}
        publishing={publishing}
        discarding={discarding}
        extra={barExtra}
      />

      <EditorSplit form={form} preview={preview} rail={rail} />

      {picking ? (
        <BlockPickerModal
          title={
            picking === 'all' || !zoneCfg ? 'Adicionar bloco' : 'Adicionar bloco · ' + zoneCfg[picking].title
          }
          components={pickerComponents}
          onAdd={(def) => addSection(def, picking)}
          onClose={() => setPicking(null)}
        />
      ) : null}

      {removing ? (
        <Modal
          title="Excluir section?"
          width={460}
          onClose={() => setConfirmRemove(null)}
          footer={
            <React.Fragment>
              <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  remove(removing.uid)
                  setConfirmRemove(null)
                }}
              >
                Excluir
              </Button>
            </React.Fragment>
          }
        >
          <p className="sw-meta">
            “{sectionTitle(removing, defs[removing.key])}” sai {cfg.of}. A mudança só chega na loja depois de salvar e
            publicar (Ctrl/Cmd+Z desfaz).
          </p>
        </Modal>
      ) : null}

      {confirmDiscard ? (
        <Modal
          title="Descartar alterações?"
          width={480}
          onClose={() => setConfirmDiscard(false)}
          footer={
            <React.Fragment>
              <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={discard}>
                Descartar
              </Button>
            </React.Fragment>
          }
        >
          <p className="sw-meta">
            {hasDraft
              ? 'O rascunho inteiro é apagado (inclusive o que já foi salvo) e ' +
                cfg.the +
                ' volta à versão publicada na loja.'
              : 'As alterações não salvas desta tela são perdidas e ' + cfg.the + ' volta à versão publicada.'}
          </p>
        </Modal>
      ) : null}
    </div>
  )
}
