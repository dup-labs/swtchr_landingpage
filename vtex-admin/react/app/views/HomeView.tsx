import React, { useCallback, useEffect, useState } from 'react'

import type { PageSummary } from '../api/types'
import { Button, EmptyState, Select, Spinner } from '../components'
import { useShell } from '../shell/ShellContext'
import PageEditor from './page/PageEditor'
import * as api from './page/pageApi'

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Aba Home: acha a(s) entrada(s) de home no CMS e entrega pro editor genérico (views/page/PageEditor).
 * Com mais de uma entrada, mostra o seletor na DraftBar (pergunta antes de trocar com alteração não salva).
 */
export default function HomeView() {
  const { dirty } = useShell()
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [entries, setEntries] = useState<PageSummary[]>([])
  const [entryId, setEntryId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setPhase('loading')
    setLoadError('')
    try {
      const list = await api.listPages('home')
      if (!list || !list.length) throw new Error('Nenhuma entrada de home encontrada no CMS.')
      setEntries(list)
      setEntryId(list[0].id)
      setPhase('ready')
    } catch (e) {
      setLoadError(errMsg(e))
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const switchEntry = (id: string) => {
    if (id === entryId) return
    if (dirty && !window.confirm('Há alterações não salvas nesta home. Trocar mesmo assim?')) return
    setEntryId(id)
  }

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner label="carregando a home…" />
      </div>
    )
  }

  if (phase === 'error' || !entryId) {
    return (
      <EmptyState
        title="Não deu pra carregar a home"
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

  return (
    <PageEditor
      type="home"
      entryId={entryId}
      headerExtra={
        entries.length > 1 ? (
          <Select
            value={entryId}
            onChange={(v) => switchEntry(v)}
            options={entries.map((e) => ({ value: e.id, label: e.name || e.id }))}
          />
        ) : undefined
      }
    />
  )
}
