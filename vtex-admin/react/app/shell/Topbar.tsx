import React, { useState } from 'react'

import { exportAll } from '../api/client'
import { Button } from '../components/Button'
import { Badge } from '../components/primitives'
import { Logo } from '../components/Logo'
import { useShell } from './ShellContext'

/** "2026-09-27" (data local) */
function today(): string {
  const d = new Date()
  const p = (n: number) => (n < 10 ? '0' : '') + n
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/** Baixa um JSON como arquivo (Blob + a[download]). */
function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Topo: logo + "by dup.agency"; à direita conta/workspace, aviso do catálogo (swtchr_data),
 * "Exportar tudo ↓" e status do rascunho.
 */
export default function Topbar() {
  const { session, sessionError, draft, dirty, catalogWarning, notify } = useShell()
  const [exporting, setExporting] = useState(false)

  const onExport = async () => {
    setExporting(true)
    try {
      const bundle = await exportAll()
      const account = bundle.account || (session ? session.account : 'loja')
      downloadJson(bundle, 'swtchr-export-' + account + '-' + today() + '.json')
      notify(bundle.pages.length + ' página(s) exportada(s)', 'ok')
    } catch (e) {
      notify('Não foi possível exportar: ' + (e instanceof Error ? e.message : String(e)), 'err', 7000)
    } finally {
      setExporting(false)
    }
  }

  let draftBadge: React.ReactNode
  if (dirty) {
    draftBadge = <Badge tone="warn">não salvo</Badge>
  } else if (draft && draft.branchId) {
    const n = draft.changes ? draft.changes.length : 0
    draftBadge = (
      <Badge tone="brand" title={draft.branchName || undefined}>
        rascunho{n ? ' · ' + n + (n === 1 ? ' alteração' : ' alterações') : ''}
      </Badge>
    )
  } else if (draft) {
    draftBadge = <Badge tone="ok">publicado</Badge>
  } else {
    draftBadge = null
  }

  return (
    <header className="sw-topbar anim-up">
      <span className="sw-topbar__brand">
        <Logo />
        <span className="sw-topbar__by">by dup.agency</span>
      </span>
      <span className="sw-topbar__right">
        {session ? (
          <Badge tone="muted" title={session.user}>
            {session.account} · {session.workspace}
          </Badge>
        ) : sessionError ? (
          <Badge tone="danger" title={sessionError}>
            sem sessão
          </Badge>
        ) : (
          <Badge tone="muted">…</Badge>
        )}
        {catalogWarning ? (
          <Badge
            tone="muted"
            title={
              (catalogWarning.kind === 'permission'
                ? 'Seu usuário não tem permissão no catálogo: o conteúdo das PDPs de produto não será espelhado no campo swtchr_data ao publicar (a publicação no CMS funciona normalmente). '
                : 'Não foi possível preparar o campo swtchr_data no catálogo; o espelho ao publicar pode falhar. ') +
              catalogWarning.detail
            }
          >
            {catalogWarning.kind === 'permission' ? 'catálogo: sem permissão' : 'catálogo: indisponível'}
          </Badge>
        ) : null}
        {session ? (
          <Button variant="ghost" small loading={exporting} onClick={onExport} title="Baixa um JSON com todas as páginas publicadas do CMS">
            {exporting ? 'Exportando…' : 'Exportar tudo ↓'}
          </Button>
        ) : null}
        {draftBadge}
      </span>
    </header>
  )
}
