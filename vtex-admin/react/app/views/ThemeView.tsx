import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as api from '../api/client'
import type { ComponentDef, PageDocument, PageSection } from '../api/types'
import { Button, DraftBar, EditorSplit, EmptyState, Message, Modal, PreviewPane, Segmented, Spinner, cx } from '../components'
import type { DraftStatus, PreviewLive } from '../components'
import { uid } from '../dnd'
import { initFromSchema, validate } from '../form'
import { useShell } from '../shell/ShellContext'
import { notifyMirror } from '../shell/mirror'
import { ColorsCard } from './theme/ColorsCard'
import { GlobalSectionPanel } from './theme/GlobalSectionPanel'
import type { GlobalData, GlobalKey } from './theme/globals'
import {
  EMPTY_GLOBALS,
  FOOTER_KEY,
  GLOBAL_KEYS,
  GLOBAL_META,
  HEADER_KEY,
  currentVariant,
  insertGlobal,
  sameJson,
  visibleErrorCount,
} from './theme/globals'
import { useThemeFonts } from './theme/fonts'
import type { ThemeState } from './theme/model'
import {
  THEME_KEY,
  cloneState,
  defaultsFromSchema,
  errorCount,
  fromData,
  sameState,
  toData,
  validateTheme,
} from './theme/model'
import { LayoutCard, ShapeCard } from './theme/ShapeLayoutCards'
import { ThemeViewStyles } from './theme/themeCss'
import { TypographyCard } from './theme/TypographyCard'

const PAGE_TYPE = 'globalSections'

type Confirm = null | 'discard' | 'reset'

/** Sub-navegação da aba Tema. Um DraftBar só salva/publica/descarta as três (a globalSections inteira). */
type Tab = 'style' | 'header' | 'footer'

const TAB_KEY: Record<Exclude<Tab, 'style'>, GlobalKey> = { header: HEADER_KEY, footer: FOOTER_KEY }

/** Grupos do editor, na ordem dos cards em .sw-th-stack (trilha do modo foco). */
const GROUPS: Array<{ short: string; label: string }> = [
  { short: 'C', label: 'Cores' },
  { short: 'Aa', label: 'Tipografia' },
  { short: 'F', label: 'Formas' },
  { short: 'L', label: 'Layout' },
]

/** espera a transição do layout ao sair do modo foco antes de rolar */
const FOCUS_EXIT_MS = 380

const FONT_MIME: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
}

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const err = e as { message: string; detail?: string }
    return err.message + (err.detail ? ' — ' + err.detail : '')
  }
  return String(e)
}

/** Sobe o arquivo de fonte com o mime correto (o navegador costuma mandar type vazio pra .woff2). */
async function uploadFont(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const mime = FONT_MIME[ext]
  const body = mime && file.type !== mime ? new Blob([file], { type: mime }) : file
  const res = await api.upload(body, file.name)
  return res.url
}

interface Loaded {
  doc: PageDocument
  /** uid da section SwtchrTheme dentro de doc.sections */
  themeUid: string
  /** a section não existia no CMS e foi criada localmente (precisa salvar) */
  created: boolean
  /** uid da primeira SwtchrHeader / SwtchrFooter em doc.sections (ausente = ainda não existe no CMS) */
  globalUids: Partial<Record<GlobalKey, string>>
}

/**
 * Tema — estilos globais da loja (section SwtchrTheme da página globalSections).
 * Editor dedicado: cores, tipografia, formas, layout e movimento + preview da loja.
 * Só o `data` da SwtchrTheme muda; as demais sections da globalSections vão intactas.
 *
 * Abas: Estilo (SwtchrTheme) · Header (SwtchrHeader) · Rodapé (SwtchrFooter). Header/Rodapé são SchemaForm
 * genérico sobre o schema + seletor visual do `variant` (theme/GlobalSectionPanel). Salvar grava o array
 * inteiro de sections trocando só o `data` dessas três (header/rodapé novos entram via insertGlobal).
 * Prévia ao vivo: 'swtchr:theme' + 'swtchr:global' ({ sections: [{ key, data }] }) — PreviewPane `live` em array.
 */
export default function ThemeView() {
  const { draft, refreshDraft, setDirty, notify, setFocus } = useShell()

  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [def, setDef] = useState<ComponentDef | null>(null)
  const [defaults, setDefaults] = useState<ThemeState>(() => defaultsFromSchema(null))
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [saved, setSaved] = useState<ThemeState | null>(null)
  const [state, setState] = useState<ThemeState | null>(null)
  const [globalDefs, setGlobalDefs] = useState<Record<GlobalKey, ComponentDef | null>>({
    SwtchrHeader: null,
    SwtchrFooter: null,
  })
  /** data de header/rodapé em edição (null = section ausente) e a baseline salva */
  const [gdata, setGdata] = useState<GlobalData>(EMPTY_GLOBALS)
  const [savedG, setSavedG] = useState<GlobalData>(EMPTY_GLOBALS)
  const [tab, setTab] = useState<Tab>('style')

  /** URL + contador de reload num estado só: trocar os dois juntos recria o iframe UMA vez (React 16 não agrupa setState em async) */
  const [preview, setPreview] = useState<{ url: string | null; reloadKey: number }>({ url: null, reloadKey: 0 })
  const [saving, setSaving] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [justPublished, setJustPublished] = useState(false)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const [scrollTo, setScrollTo] = useState<{ index: number } | null>(null)

  const alive = useRef(true)
  useEffect(
    () => () => {
      alive.current = false
    },
    []
  )

  /** Aplica um documento da globalSections: acha (ou cria no início) a SwtchrTheme e zera a baseline. */
  const applyDoc = useCallback((doc: PageDocument, dflt: ThemeState, component: ComponentDef | null) => {
    let sections = doc.sections || []
    let sec = sections.find((s) => s.key === THEME_KEY)
    let created = false
    if (!sec) {
      const data = component ? initFromSchema(component.schema) : toData(dflt, dflt, { skipLazyLoadingSection: true })
      sec = {
        uid: uid(),
        key: THEME_KEY,
        title: component ? component.title : 'swtchr · Tema da loja',
        native: false,
        data,
      }
      sections = [sec].concat(sections)
      created = true
    }
    const next = fromData(sec.data, dflt)
    const globalUids: Partial<Record<GlobalKey, string>> = {}
    const g: GlobalData = { SwtchrHeader: null, SwtchrFooter: null }
    GLOBAL_KEYS.forEach((k) => {
      const gs = sections.find((s) => s.key === k)
      if (gs) {
        globalUids[k] = gs.uid
        g[k] = JSON.parse(JSON.stringify(gs.data || {})) as Record<string, unknown>
      }
    })
    setLoaded({ doc: Object.assign({}, doc, { sections }), themeUid: sec.uid, created, globalUids })
    setSaved(next)
    setState(cloneState(next))
    setSavedG(g)
    setGdata(g)
  }, [])

  const refreshPreview = useCallback(async (id: string) => {
    let url: string | null = null
    try {
      url = (await api.getPreviewUrl(PAGE_TYPE, id)).url
    } catch (e) {
      // preview é auxiliar; mantém a URL anterior
    }
    if (alive.current) setPreview((p) => ({ url: url || p.url, reloadKey: p.reloadKey + 1 }))
  }, [])

  const load = useCallback(async () => {
    setPhase('loading')
    setLoadError('')
    try {
      const [schema, pages] = await Promise.all([api.getSchema(), api.listPages(PAGE_TYPE)])
      const comps = schema.components || []
      const component = comps.find((c) => c.key === THEME_KEY) || null
      const gDefs: Record<GlobalKey, ComponentDef | null> = {
        SwtchrHeader: comps.find((c) => c.key === HEADER_KEY) || null,
        SwtchrFooter: comps.find((c) => c.key === FOOTER_KEY) || null,
      }
      const dflt = defaultsFromSchema(component ? initFromSchema(component.schema) : null)
      if (!pages.length) throw new Error('Nenhuma entrada "Global Sections" no CMS desta loja.')
      const doc = await api.getPage(PAGE_TYPE, pages[0].id)
      if (!alive.current) return
      setDef(component)
      setGlobalDefs(gDefs)
      setDefaults(dflt)
      applyDoc(doc, dflt, component)
      setPhase('ready')
      refreshPreview(doc.id)
    } catch (e) {
      if (!alive.current) return
      setLoadError(errMsg(e))
      setPhase('error')
    }
  }, [applyDoc, refreshPreview])

  useEffect(() => {
    load()
  }, [load])

  const globalsDirty = !sameJson(gdata, savedG)
  const dirty = !!loaded && !!state && !!saved && (loaded.created || !sameState(state, saved) || globalsDirty)

  // badge "alterações não salvas" do topo
  useEffect(() => {
    setDirty(dirty)
  }, [dirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])

  useEffect(() => {
    if (dirty) setJustPublished(false)
  }, [dirty])

  useThemeFonts(state ? [state.typography.display, state.typography.body] : [])

  const update = useCallback((fn: (d: ThemeState) => void) => {
    setState((prev) => {
      if (!prev) return prev
      const d = cloneState(prev)
      fn(d)
      return d
    })
  }, [])

  /**
   * Prévia ao vivo (o mesmo que seria salvo), duas mensagens:
   *  - 'swtchr:theme'  → data da SwtchrTheme
   *  - 'swtchr:global' → { sections: [{ key: 'SwtchrHeader', data }, { key: 'SwtchrFooter', data }] } (só as presentes)
   */
  const live = useMemo<PreviewLive[] | null>(() => {
    if (!loaded || !state) return null
    const sec = loaded.doc.sections.find((s) => s.uid === loaded.themeUid)
    const out: PreviewLive[] = [{ type: 'swtchr:theme', payload: toData(state, defaults, sec ? sec.data : {}) }]
    const sections: Array<{ key: GlobalKey; data: Record<string, unknown> }> = []
    GLOBAL_KEYS.forEach((k) => {
      const d = gdata[k]
      if (d) sections.push({ key: k, data: d })
    })
    if (sections.length) out.push({ type: 'swtchr:global', payload: { sections } })
    return out
  }, [loaded, state, defaults, gdata])

  const setGlobal = useCallback((k: GlobalKey, next: Record<string, unknown>) => {
    setGdata((prev) => Object.assign({}, prev, { [k]: next }))
  }, [])

  /** "Adicionar header/rodapé swtchr": data inicial do schema; a section entra no array só ao salvar (insertGlobal). */
  const addGlobal = (k: GlobalKey) => {
    const d = globalDefs[k]
    if (!d) return
    setGlobal(k, initFromSchema(d.schema))
    notify(GLOBAL_META[k].label + ' adicionado — salve o rascunho para gravar no CMS', 'info')
  }

  // trilha do modo foco → rola até o card do grupo (depois da transição)
  useEffect(() => {
    if (!scrollTo) return undefined
    const t = window.setTimeout(() => {
      const el = stackRef.current ? (stackRef.current.children[scrollTo.index] as HTMLElement | undefined) : undefined
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, FOCUS_EXIT_MS)
    return () => window.clearTimeout(t)
  }, [scrollTo])

  const jumpTo = (index: number) => {
    setFocus(false)
    setTab('style')
    setScrollTo({ index })
  }

  const formTopRef = useRef<HTMLDivElement | null>(null)
  const jumpToTab = (t: Tab) => {
    setFocus(false)
    setTab(t)
    window.setTimeout(() => {
      const el = formTopRef.current
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, FOCUS_EXIT_MS)
  }

  const errors = state ? validateTheme(state) : {}
  const themeErrors = errorCount(errors)
  const globalErrors: Record<GlobalKey, number> = { SwtchrHeader: 0, SwtchrFooter: 0 }
  GLOBAL_KEYS.forEach((k) => {
    const d = globalDefs[k]
    const v = gdata[k]
    if (d && v) globalErrors[k] = visibleErrorCount(validate(d.schema, v), k, currentVariant(d, v))
  })
  const nErrors = themeErrors + globalErrors.SwtchrHeader + globalErrors.SwtchrFooter

  // ---------------------------------------------------------------- ações

  const save = async (): Promise<boolean> => {
    if (!loaded || !state) return false
    if (nErrors) {
      notify('Corrija ' + nErrors + (nErrors === 1 ? ' campo' : ' campos') + ' antes de salvar.', 'err')
      return false
    }
    setSaving(true)
    try {
      let sections: PageSection[] = loaded.doc.sections.map((s) => {
        if (s.uid === loaded.themeUid) return Object.assign({}, s, { data: toData(state, defaults, s.data) })
        const gk = GLOBAL_KEYS.filter((k) => loaded.globalUids[k] === s.uid)[0]
        const gd = gk ? gdata[gk] : null
        return gd ? Object.assign({}, s, { data: gd }) : s
      })
      // header/rodapé adicionados agora: header logo após o Tema, rodapé por último
      GLOBAL_KEYS.forEach((k) => {
        const d = gdata[k]
        const gdef = globalDefs[k]
        if (!d || loaded.globalUids[k]) return
        sections = insertGlobal(
          sections,
          { uid: uid(), key: k, title: gdef ? gdef.title : GLOBAL_META[k].fallbackTitle, native: false, data: d },
          loaded.themeUid
        )
      })
      const doc = await api.savePage(PAGE_TYPE, loaded.doc.id, {
        name: loaded.doc.name,
        fields: loaded.doc.fields,
        sections,
      })
      if (!alive.current) return true
      applyDoc(doc, defaults, def)
      setSaving(false)
      await refreshDraft()
      refreshPreview(doc.id)
      notify('Rascunho do tema salvo (estilo, header e rodapé)', 'ok')
      return true
    } catch (e) {
      if (alive.current) setSaving(false)
      notify('Não foi possível salvar: ' + errMsg(e), 'err', 7000)
      return false
    }
  }

  const publish = async () => {
    if (!loaded) return
    if (dirty) {
      const ok = await save()
      if (!ok) return
    }
    setPublishing(true)
    try {
      const result = await api.publishDraft()
      notifyMirror(result, notify)
      if (!alive.current) return
      setJustPublished(true)
      try {
        // relê da main (source volta a 'main')
        applyDoc(await api.getPage(PAGE_TYPE, loaded.doc.id), defaults, def)
      } catch (e) {
        // mantém o estado atual
      }
      await refreshDraft()
      refreshPreview(loaded.doc.id)
      notify('Tema publicado na loja', 'ok')
    } catch (e) {
      notify('Não foi possível publicar: ' + errMsg(e), 'err', 7000)
    }
    if (alive.current) setPublishing(false)
  }

  const hasServerDraft = !!(draft && draft.branchId) || (!!loaded && loaded.doc.source === 'draft')

  const discard = async () => {
    setConfirm(null)
    if (!loaded || !saved) return
    if (!hasServerDraft) {
      // nada salvo no CMS: só volta ao último estado carregado
      setState(cloneState(saved))
      setGdata(savedG)
      notify('Alterações descartadas', 'ok')
      return
    }
    setDiscarding(true)
    try {
      await api.discardDraft()
      const doc = await api.getPage(PAGE_TYPE, loaded.doc.id)
      if (!alive.current) return
      applyDoc(doc, defaults, def)
      await refreshDraft()
      refreshPreview(doc.id)
      notify('Rascunho descartado', 'ok')
    } catch (e) {
      notify('Não foi possível descartar: ' + errMsg(e), 'err', 7000)
    }
    if (alive.current) setDiscarding(false)
  }

  const resetDefaults = () => {
    setConfirm(null)
    setState(cloneState(defaults))
    notify('Padrões restaurados — salve para aplicar', 'info')
  }

  // ---------------------------------------------------------------- render

  if (phase === 'loading') {
    return (
      <div className="sw-th-loading">
        <ThemeViewStyles />
        <Spinner label="carregando o tema…" />
      </div>
    )
  }

  if (phase === 'error' || !loaded || !state) {
    return (
      <EmptyState
        title="Não deu pra carregar o tema"
        action={
          <Button variant="primary" onClick={load}>
            Tentar de novo
          </Button>
        }
      >
        {loadError || 'Erro desconhecido.'}
      </EmptyState>
    )
  }

  let status: DraftStatus = 'clean'
  if (dirty) status = 'dirty'
  else if (justPublished) status = 'live'
  else if (hasServerDraft) status = 'draft'

  const isDefault = sameState(state, defaults)

  /** rótulo da aba com bolinha: vermelha = erro, azul = alterado, tracejada = section ausente */
  const tabLabel = (label: string, errs: number, changed: boolean, missing: boolean) => (
    <span className="sw-th-tab">
      {label}
      {errs ? (
        <span className="sw-th-tab__dot sw-th-tab__dot--err" title={errs + ' erro(s)'} />
      ) : changed ? (
        <span className="sw-th-tab__dot" title="alterado" />
      ) : missing ? (
        <span className="sw-th-tab__dot sw-th-tab__dot--off" title="ainda não adicionado" />
      ) : null}
    </span>
  )
  const globalTab = (k: GlobalKey) =>
    tabLabel(GLOBAL_META[k].label, globalErrors[k], !sameJson(gdata[k], savedG[k]), !gdata[k])
  const tabOptions: Array<{ value: Tab; label: React.ReactNode }> = [
    { value: 'style', label: tabLabel('Estilo', themeErrors, loaded.created || !sameState(state, saved || state), false) },
    { value: 'header', label: globalTab(HEADER_KEY) },
    { value: 'footer', label: globalTab(FOOTER_KEY) },
  ]

  return (
    <div className="sw-theme-view">
      <ThemeViewStyles />

      <DraftBar
        title="Tema da loja"
        status={status}
        statusText={status === 'clean' ? 'igual ao publicado' : undefined}
        onSave={save}
        onDiscard={() => setConfirm('discard')}
        onPublish={publish}
        saving={saving}
        discarding={discarding}
        publishing={publishing}
        extra={
          tab === 'style' ? (
            <Button variant="link" small disabled={isDefault || saving || publishing} onClick={() => setConfirm('reset')}>
              Restaurar padrão
            </Button>
          ) : null
        }
      />

      {loaded.created ? (
        <div className="sw-th-banner">
          <Message kind="info" box>
            Esta loja ainda não tinha a section de Tema em Global Sections. Ela foi criada com os valores padrão —
            salve o rascunho para gravá-la no CMS.
          </Message>
        </div>
      ) : null}

      {nErrors ? (
        <div className="sw-th-banner">
          <Message kind="err" box>
            {nErrors === 1 ? '1 campo precisa' : nErrors + ' campos precisam'} de correção antes de salvar.
          </Message>
        </div>
      ) : null}

      <EditorSplit
        form={
          <div ref={formTopRef} className="sw-th-form">
            <div className="sw-th-tabs">
              <Segmented options={tabOptions} value={tab} onChange={setTab} />
              <span className="sw-th-tabs__hint">salvar e publicar valem para as três</span>
            </div>
            {tab === 'style' ? (
              <div className="sw-th-stack" ref={stackRef}>
                <ColorsCard state={state} defaults={defaults} errors={errors} update={update} />
                <TypographyCard state={state} defaults={defaults} errors={errors} update={update} upload={uploadFont} />
                <ShapeCard state={state} defaults={defaults} errors={errors} update={update} />
                <LayoutCard state={state} defaults={defaults} errors={errors} update={update} />
              </div>
            ) : (
              <GlobalSectionPanel
                key={tab}
                sectionKey={TAB_KEY[tab]}
                def={globalDefs[TAB_KEY[tab]]}
                data={gdata[TAB_KEY[tab]]}
                onChange={(next) => setGlobal(TAB_KEY[tab as 'header' | 'footer'], next)}
                onAdd={() => addGlobal(TAB_KEY[tab as 'header' | 'footer'])}
                isNew={!!gdata[TAB_KEY[tab]] && !loaded.globalUids[TAB_KEY[tab]]}
              />
            )}
          </div>
        }
        rail={
          <nav className="sw-rail" aria-label="Grupos do tema">
            {GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                className="sw-rail__item"
                title={g.label}
                aria-label={'Abrir ' + g.label}
                onClick={() => jumpTo(i)}
              >
                <span className="sw-rail__glyph">{g.short}</span>
              </button>
            ))}
            <span className="sw-th-rail-sep" aria-hidden="true" />
            {(['header', 'footer'] as Array<'header' | 'footer'>).map((t) => (
              <button
                key={t}
                type="button"
                className={cx('sw-rail__item', tab === t && 'sw-rail__item--active')}
                title={GLOBAL_META[TAB_KEY[t]].label}
                aria-label={'Abrir ' + GLOBAL_META[TAB_KEY[t]].label}
                onClick={() => jumpToTab(t)}
              >
                <span className="sw-rail__glyph">{t === 'header' ? 'H' : 'R'}</span>
              </button>
            ))}
          </nav>
        }
        preview={
          <PreviewPane
            url={preview.url}
            live={live}
            busy={saving || publishing || discarding}
            reloadKey={preview.reloadKey}
            unsaved={dirty}
            caption={hasServerDraft ? 'preview do rascunho' : 'loja publicada'}
          />
        }
      />

      {confirm === 'discard' ? (
        <Modal
          title="Descartar alterações?"
          width={480}
          onClose={() => setConfirm(null)}
          footer={
            <React.Fragment>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={discard}>
                Descartar
              </Button>
            </React.Fragment>
          }
        >
          <div className="sw-th-confirm">
            {hasServerDraft ? (
              <React.Fragment>
                <p>O rascunho volta ao que está publicado na loja. Isso não tem desfazer.</p>
                <p className="sw-meta">
                  O rascunho é um só para o painel inteiro: alterações salvas em outras telas (ex.: Home) também serão
                  descartadas.
                </p>
              </React.Fragment>
            ) : (
              <p>As alterações feitas nesta tela e ainda não salvas serão perdidas.</p>
            )}
          </div>
        </Modal>
      ) : null}

      {confirm === 'reset' ? (
        <Modal
          title="Restaurar o tema padrão?"
          width={480}
          onClose={() => setConfirm(null)}
          footer={
            <React.Fragment>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={resetDefaults}>
                Restaurar padrão
              </Button>
            </React.Fragment>
          }
        >
          <div className="sw-th-confirm">
            <p>Cores, fontes, formas e layout voltam aos valores padrão do swtchr.</p>
            <p className="sw-meta">Nada muda na loja até você salvar o rascunho e publicar.</p>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
