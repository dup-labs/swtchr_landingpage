import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

import type { DraftInfo, Session, SetupResult } from '../api/types'
import type { MessageKind } from '../components/Message'

/**
 * Estado global do shell, disponível para todas as views via useShell():
 * sessão, rascunho aberto, "há alterações não salvas", modo foco e toasts.
 *
 * O shell busca /session e /draft sozinho (fetch mínimo abaixo) pra não depender de api/client.ts;
 * as views devem usar api/client.ts para o resto e chamar refreshDraft() depois de salvar/publicar/descartar.
 */
export interface ShellState {
  session: Session | null
  sessionError: string | null
  draft: DraftInfo | null
  /** recarrega GET /draft (chamar após salvar, publicar ou descartar) */
  refreshDraft: () => Promise<void>
  /** substitui o rascunho localmente (quando a view já tem a resposta) */
  setDraft: (d: DraftInfo | null) => void
  /** view atual tem alterações não salvas (aparece no badge do topo) */
  dirty: boolean
  setDirty: (v: boolean) => void
  /**
   * Modo foco: sidebar e formulário viram trilhas estreitas (~76px) e o preview ocupa o resto.
   * Alternado pelo botão da barra do PreviewPane; Esc sai.
   */
  focus: boolean
  setFocus: (v: boolean) => void
  /** toast global: notify('Salvo', 'ok') */
  notify: (text: React.ReactNode, kind?: MessageKind, ms?: number) => void
  /**
   * Aviso do setup do catálogo (GET /setup, campo global swtchr_data). null = ok/pendente.
   * `permission` = o usuário não tem permissão no catálogo (o espelho ao publicar vai falhar).
   */
  catalogWarning: { kind: 'permission' | 'error'; detail: string } | null
}

const noop = () => undefined

const ShellContext = createContext<ShellState>({
  session: null,
  sessionError: null,
  draft: null,
  refreshDraft: () => Promise.resolve(),
  setDraft: noop,
  dirty: false,
  setDirty: noop,
  focus: false,
  setFocus: noop,
  notify: noop,
  catalogWarning: null,
})

export function useShell(): ShellState {
  return useContext(ShellContext)
}

const API = '/_v/swtchr/api'

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
  if (!res.ok) {
    let msg = res.status + ' ' + res.statusText
    try {
      const body = await res.json()
      if (body && body.error) msg = body.error + (body.detail ? ' — ' + body.detail : '')
    } catch (e) {
      // corpo não-JSON
    }
    throw new HttpError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export interface ShellProviderProps {
  notify: ShellState['notify']
  children?: React.ReactNode
}

export function ShellProvider({ notify, children }: ShellProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftInfo | null>(null)
  const [dirty, setDirty] = useState(false)
  const [focus, setFocus] = useState(false)
  const [catalogWarning, setCatalogWarning] = useState<ShellState['catalogWarning']>(null)

  // Esc sai do modo foco
  useEffect(() => {
    if (!focus) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [focus])

  const refreshDraft = useCallback(async () => {
    try {
      setDraft(await getJson<DraftInfo>('/draft'))
    } catch (e) {
      // status do rascunho é informativo; não bloqueia o painel
      setDraft(null)
    }
  }, [])

  useEffect(() => {
    let alive = true
    getJson<Session>('/session')
      .then((s) => {
        if (!alive) return undefined
        setSession(s)
        // uma vez por abertura: garante o campo global swtchr_data no catálogo (silencioso)
        return getJson<SetupResult>('/setup').then(
          () => undefined,
          (e: Error) => {
            if (!alive) return
            const status = e instanceof HttpError ? e.status : 0
            setCatalogWarning({ kind: status === 401 || status === 403 ? 'permission' : 'error', detail: e.message })
          }
        )
      })
      .catch((e: Error) => {
        if (alive) setSessionError(e.message)
      })
    refreshDraft()
    return () => {
      alive = false
    }
  }, [refreshDraft])

  const value: ShellState = {
    session,
    sessionError,
    draft,
    refreshDraft,
    setDraft,
    dirty,
    setDirty,
    focus,
    setFocus,
    notify,
    catalogWarning,
  }

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
