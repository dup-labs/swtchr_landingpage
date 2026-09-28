import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useShell } from '../shell/ShellContext'
import { Button } from './Button'
import { cx } from './cx'
import { Badge, Segmented, Spinner } from './primitives'

// ---------------------------------------------------------------- EditorSplit

export interface EditorSplitProps {
  /** coluna da esquerda (lista de sections / formulário) */
  form: React.ReactNode
  /** coluna da direita, sticky (normalmente <PreviewPane />) */
  preview?: React.ReactNode
  /**
   * trilha estreita (~76px) mostrada no lugar do formulário no modo foco
   * (ex.: thumbs dos blocos, atalhos dos grupos). O formulário continua montado, só escondido.
   */
  rail?: React.ReactNode
}

/**
 * Layout dividido: formulário + preview sticky. Abaixo de 1200px vira uma coluna.
 * No modo foco (useShell().focus) o formulário encolhe pra trilha `rail` e o preview ganha o resto;
 * abaixo de 1200px o foco só esconde o formulário.
 */
export function EditorSplit({ form, preview, rail }: EditorSplitProps) {
  const { focus } = useShell()
  const on = focus && !!preview
  return (
    <div className={cx('sw-editor', on && 'sw-editor--focus')}>
      <div className="sw-editor__form">
        <div className="sw-editor__full" aria-hidden={on || undefined}>
          {form}
        </div>
        {on && rail ? <div className="sw-editor__rail">{rail}</div> : null}
      </div>
      {preview ? <aside className="sw-editor__preview">{preview}</aside> : null}
    </div>
  )
}

// ---------------------------------------------------------------- PreviewPane

export type PreviewDevice = 'desktop' | 'mobile'

/** Mensagem de preview ao vivo: enviada ao iframe como {source:'swtchr-admin', type, props: payload}. */
export interface PreviewLive {
  /** ex.: 'swtchr:theme' */
  type: string
  payload: unknown
}

export interface PreviewPaneProps {
  /** URL do iframe (GET /preview-url). Sem URL mostra spinner. */
  url?: string | null
  /** força o overlay de carregando (ex.: salvando o rascunho) */
  busy?: boolean
  /** controlado (opcional); sem isso guarda o device internamente */
  device?: PreviewDevice
  onDeviceChange?: (d: PreviewDevice) => void
  /** muda este número para forçar reload do iframe (ex.: após salvar) */
  reloadKey?: number
  /** texto opcional acima (default: a própria URL) */
  caption?: React.ReactNode
  /** há alterações ainda não salvas (sem preview ao vivo o iframe só mostra o que foi salvo) */
  unsaved?: boolean
  /**
   * Preview ao vivo (sem salvar) via postMessage. Sempre que o conteúdo mudar (JSON inteiro; na hora se nada foi
   * enviado nos últimos 150ms, senão no fim da janela), no onLoad do iframe e A CADA
   * {source:'swtchr-store', type:'swtchr:ready'} recebido (pode vir várias vezes: sections que montam tarde pedem
   * reenvio), o painel envia {source:'swtchr-admin', type: live.type, props: live.payload} com
   * targetOrigin = origin do 'ready' (ou da `url`, antes do primeiro 'ready').
   * Aceita também um ARRAY de mensagens (ex.: Tema manda 'swtchr:theme' + 'swtchr:global'): cada item vira um
   * postMessage próprio, na ordem do array. Um objeto só continua funcionando como antes.
   */
  live?: PreviewLive | PreviewLive[] | null
}

/** Normaliza `live` (objeto, array ou vazio) → lista de mensagens válidas. */
function liveList(live?: PreviewLive | PreviewLive[] | null): PreviewLive[] {
  if (!live) return []
  const arr = Array.isArray(live) ? live : [live]
  return arr.filter((l) => !!l && typeof l.type === 'string' && !!l.type)
}

const isDraftPreview = (url?: string | null) => !!url && url.indexOf('/api/preview') >= 0

const LIVE_DEBOUNCE = 150

/** origin da URL do iframe (targetOrigin do postMessage); null se não der pra resolver. */
function originOf(url?: string | null): string | null {
  if (!url) return null
  try {
    const o = new URL(url, window.location.href).origin
    return o && o !== 'null' ? o : null
  } catch (e) {
    return null
  }
}

function liveKeyOf(live?: PreviewLive | PreviewLive[] | null): string {
  const list = liveList(live)
  if (!list.length) return ''
  return list
    .map((l) => {
      try {
        return l.type + '|' + JSON.stringify(l.payload)
      } catch (e) {
        return l.type + '|' + String(Date.now())
      }
    })
    .join('\n')
}

/**
 * Preview em iframe com toggle Desktop (100%) / Mobile (390px), botão de modo foco (estado global do shell)
 * e preview ao vivo opcional (`live`).
 */
export function PreviewPane({
  url,
  busy,
  device,
  onDeviceChange,
  reloadKey,
  caption,
  unsaved,
  live,
}: PreviewPaneProps) {
  const { focus, setFocus } = useShell()
  const [own, setOwn] = useState<PreviewDevice>('desktop')
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  // A loja às vezes cai na tela de senha da VTEX dentro do iframe (cookie de proteção bloqueado
  // entre domínios). A tela de senha não manda 'swtchr:ready' → recarregamos sozinhos até 2x.
  const [retry, setRetry] = useState(0)
  const [stuck, setStuck] = useState(false)
  const connectedRef = useRef(false)
  const dev = device || own
  const setDev = (d: PreviewDevice) => {
    if (onDeviceChange) onDeviceChange(d)
    if (!device) setOwn(d)
  }

  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const liveRef = useRef<PreviewLive | PreviewLive[] | null | undefined>(live)
  liveRef.current = live

  /**
   * Identidade do iframe atual (muda com url / reloadKey / retry → React recria o <iframe>).
   * Timers de auto-retry guardam a identidade de quando foram criados: um timer de um iframe antigo
   * nunca recarrega o iframe novo.
   */
  const frameKey = (url || '') + '#' + (reloadKey || 0) + '#' + retry
  const frameKeyRef = useRef(frameKey)
  /** origin real da loja (e.origin do último 'swtchr:ready'); cobre redirect do iframe pra outro domínio */
  const storeOriginRef = useRef<string | null>(null)
  const retryTimerRef = useRef<number | undefined>(undefined)
  /** último envio (ms) — throttle com envio imediato na 1ª mudança e envio final garantido */
  const lastPostRef = useRef(0)

  if (frameKeyRef.current !== frameKey) {
    // iframe novo neste render: a conexão (e o origin) valem só pro iframe que mandou o 'ready'
    frameKeyRef.current = frameKey
    connectedRef.current = false
    storeOriginRef.current = null
  }

  useEffect(() => {
    setLoading(true)
    // iframe novo: espera outro 'swtchr:ready'
    setConnected(false)
    if (retryTimerRef.current !== undefined) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = undefined
    }
  }, [url, reloadKey, retry])

  useEffect(() => {
    setRetry(0)
    setStuck(false)
  }, [url, reloadKey])

  useEffect(
    () => () => {
      if (retryTimerRef.current !== undefined) window.clearTimeout(retryTimerRef.current)
    },
    []
  )

  /** envia TODAS as mensagens atuais ao iframe (no-op sem `live`, sem iframe ou sem origin) */
  const post = useCallback(() => {
    const list = liveList(liveRef.current)
    const frame = frameRef.current
    const origin = storeOriginRef.current || originOf(url)
    if (!list.length || !frame || !frame.contentWindow || !origin) return
    const win = frame.contentWindow
    lastPostRef.current = Date.now()
    list.forEach((l) => {
      try {
        win.postMessage({ source: 'swtchr-admin', type: l.type, props: l.payload }, origin)
      } catch (e) {
        // iframe navegou / payload não clonável: ignora (o próximo envio tenta de novo)
      }
    })
  }, [url])

  // A loja avisa que está pronta → reenvia TUDO na hora. Pode chegar várias vezes pro mesmo iframe
  // (loja carregou, footer/header montaram depois, navegação interna…): cada 'ready' só reenvia;
  // nunca recarrega nem mexe no auto-retry além de marcar "conectado".
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = frameRef.current
      if (!frame || !frame.contentWindow || e.source !== frame.contentWindow) return
      const data = e.data as { source?: unknown; type?: unknown } | null
      if (!data || typeof data !== 'object' || data.source !== 'swtchr-store') return
      if (data.type === 'swtchr:ready') {
        if (e.origin && e.origin !== 'null') storeOriginRef.current = e.origin
        if (!connectedRef.current) {
          connectedRef.current = true
          setConnected(true)
          setStuck(false)
        }
        if (retryTimerRef.current !== undefined) {
          window.clearTimeout(retryTimerRef.current)
          retryTimerRef.current = undefined
        }
        post()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [post])

  // `live` mudou (comparação pelo JSON inteiro, inclusive campos aninhados) → envia.
  // Throttle: se nada foi enviado nos últimos LIVE_DEBOUNCE ms, envia NA HORA (ex.: trocar o estilo);
  // senão agenda pro fim da janela. O timer lê liveRef → sempre manda o estado mais recente.
  const liveKey = liveKeyOf(live)
  useEffect(() => {
    if (!liveKey) return undefined
    const wait = LIVE_DEBOUNCE - (Date.now() - lastPostRef.current)
    if (wait <= 0) {
      post()
      return undefined
    }
    const t = window.setTimeout(post, wait)
    return () => window.clearTimeout(t)
  }, [liveKey, post])

  const liveOn = liveList(live).length > 0 && connected

  return (
    <div className="sw-preview">
      <div className="sw-preview__bar">
        <Segmented
          options={[
            { value: 'desktop' as PreviewDevice, label: 'Desktop' },
            { value: 'mobile' as PreviewDevice, label: 'Mobile' },
          ]}
          value={dev}
          onChange={setDev}
        />
        <span className="sw-preview__url" title={url || undefined}>
          {caption || (isDraftPreview(url) ? 'preview do rascunho' : url ? 'loja publicada' : 'carregando preview…')}
        </span>
        <div className="sw-preview__tools">
          {liveOn ? (
            <Badge tone="ok" title="As alterações aparecem na prévia na hora, antes de salvar">
              ao vivo
            </Badge>
          ) : null}
          {url ? (
            <a className="sw-btn sw-btn--ghost sw-btn--sm" href={url} target="_blank" rel="noopener noreferrer">
              Nova aba ↗
            </a>
          ) : null}
          <Button
            variant={focus ? 'primary' : 'ghost'}
            small
            onClick={() => setFocus(!focus)}
            title={focus ? 'Sair do modo foco (Esc)' : 'Modo foco: preview ocupa a tela, formulário vira trilha'}
            aria-pressed={focus}
          >
            {focus ? 'Sair do foco' : 'Foco ⤢'}
          </Button>
        </div>
      </div>
      {unsaved ? (
        liveOn ? (
          <p className="sw-preview__note sw-preview__note--warn">
            Prévia ao vivo — salve o rascunho para guardar as mudanças.
          </p>
        ) : (
          <p className="sw-preview__note sw-preview__note--warn">
            Você tem alterações não salvas — clique em <strong>Salvar rascunho</strong> para vê-las aqui.
          </p>
        )
      ) : stuck ? (
        <p className="sw-preview__note sw-preview__note--warn">
          A loja não carregou dentro do painel (a proteção de senha da VTEX bloqueia o preview em domínios
          *.vtex.app). Use <strong>Nova aba ↗</strong> — isso some quando a loja tiver domínio próprio.
        </p>
      ) : isDraftPreview(url) ? (
        <p className="sw-preview__note">
          Mostrando o seu rascunho. Se não refletir o que você salvou, o navegador está bloqueando o preview dentro do
          painel — use <strong>Nova aba ↗</strong>.
        </p>
      ) : null}
      <div className={cx('sw-preview__stage', dev === 'mobile' && 'sw-preview__stage--mobile')}>
        {url ? (
          <iframe
            key={frameKey}
            ref={frameRef}
            className="sw-preview__frame"
            src={url}
            title="Preview da loja"
            onLoad={() => {
              setLoading(false)
              post()
              // Auto-retry (tela de senha da VTEX não manda 'ready'). Só um timer por iframe; se ESTE iframe
              // já conectou alguma vez (mesmo que depois navegue e dispare onLoad de novo), nunca recarrega.
              if (connectedRef.current) return
              if (retryTimerRef.current !== undefined) window.clearTimeout(retryTimerRef.current)
              const key = frameKey
              const attempt = retry
              retryTimerRef.current = window.setTimeout(() => {
                retryTimerRef.current = undefined
                if (frameKeyRef.current !== key || connectedRef.current) return
                if (attempt < 2) setRetry(attempt + 1)
                else setStuck(true)
              }, 6000)
            }}
          />
        ) : null}
        {!url || loading || busy ? (
          <div className="sw-preview__loading">
            <Spinner label={busy ? 'atualizando…' : 'carregando…'} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- DraftBar

/** clean = igual ao salvo · dirty = alterações não salvas · draft = rascunho salvo não publicado · live = publicado */
export type DraftStatus = 'clean' | 'dirty' | 'draft' | 'live'

const STATUS_TEXT: Record<DraftStatus, string> = {
  clean: 'sem alterações',
  dirty: 'alterações não salvas',
  draft: 'rascunho salvo · não publicado',
  live: 'publicado',
}

export interface DraftBarProps {
  /** nome da página em edição */
  title?: React.ReactNode
  status: DraftStatus
  /** sobrescreve o texto do status */
  statusText?: React.ReactNode
  onSave?: () => void
  onDiscard?: () => void
  onPublish?: () => void
  saving?: boolean
  discarding?: boolean
  publishing?: boolean
  /** conteúdo extra à esquerda dos botões */
  extra?: React.ReactNode
}

/** Barra sticky do editor: título + status do rascunho + Salvar rascunho / Descartar / Publicar. */
export function DraftBar({
  title,
  status,
  statusText,
  onSave,
  onDiscard,
  onPublish,
  saving,
  discarding,
  publishing,
  extra,
}: DraftBarProps) {
  const busy = !!(saving || discarding || publishing)
  return (
    <div className="sw-draftbar">
      <div className="sw-draftbar__info">
        {title ? <span className="sw-draftbar__title">{title}</span> : null}
        <span className="sw-draftbar__status">
          <span className={cx('sw-draftbar__dot', status !== 'clean' && 'sw-draftbar__dot--' + status)} />
          {statusText || STATUS_TEXT[status]}
        </span>
      </div>
      <div className="sw-draftbar__actions">
        {extra}
        {onDiscard ? (
          <Button
            variant="ghost"
            small
            loading={discarding}
            disabled={busy || status === 'clean' || status === 'live'}
            onClick={onDiscard}
          >
            Descartar
          </Button>
        ) : null}
        {onSave ? (
          <Button variant="soft" small loading={saving} disabled={busy || status !== 'dirty'} onClick={onSave}>
            Salvar rascunho
          </Button>
        ) : null}
        {onPublish ? (
          <Button
            variant="primary"
            small
            loading={publishing}
            disabled={busy || status === 'clean' || status === 'live'}
            onClick={onPublish}
          >
            Publicar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
