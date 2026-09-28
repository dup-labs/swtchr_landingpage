import React, { useCallback, useEffect, useState } from 'react'

import * as client from '../api/client'
import type { ScopedPageSummary, SlugCheck } from '../api/types'
import { Badge, Button, EmptyState, Field, Input, Message, Modal, Select, Spinner, TextArea } from '../components'
import { useShell } from '../shell/ShellContext'
import PageEditor from './page/PageEditor'
import {
  ConfirmDelete,
  GroupHead,
  ListRow,
  ScopedStyles,
  errMsg,
  initials,
  slugTyping,
  slugify,
  useDebounced,
} from './scoped/shared'

interface OpenEntry {
  id: string
  name: string
  slug: string
}

function slugOf(p: ScopedPageSummary): string {
  return (p.target || p.slug || '').replace(/^\/+/, '')
}

/** Aba Institucional: landing pages (sobre, trocas, campanhas…) com slug próprio. */
export default function InstitutionalView() {
  const { session, refreshDraft, notify } = useShell()

  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [pages, setPages] = useState<ScopedPageSummary[]>([])

  const [open, setOpen] = useState<OpenEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<ScopedPageSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setPhase((p) => (p === 'ready' ? p : 'loading'))
    setLoadError('')
    try {
      const list = await client.listScopedPages('landingPage')
      const sorted = (list || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setPages(sorted)
      setPhase('ready')
    } catch (e) {
      setLoadError(errMsg(e))
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const storeUrl = session && session.storeUrl ? session.storeUrl.replace(/\/+$/, '') : ''

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await client.deletePage('landingPage', toDelete.id)
      await refreshDraft()
      notify('Página excluída no rascunho — publique para tirar da loja', 'ok')
      setToDelete(null)
      load()
    } catch (e) {
      notify('Erro ao excluir: ' + errMsg(e), 'err', 6000)
    } finally {
      setDeleting(false)
    }
  }

  // ------------------------------------------------------------ editor

  if (open) {
    const back = () => {
      setOpen(null)
      load()
    }
    return (
      <PageEditor
        key={open.id}
        type="landingPage"
        entryId={open.id}
        title={open.name}
        headerExtra={
          <span className="sw-inline" style={{ gap: 8 }}>
            <Badge>{'/' + open.slug}</Badge>
            {storeUrl ? (
              <a
                className="sw-btn sw-btn--link"
                href={storeUrl + '/' + open.slug}
                target="_blank"
                rel="noopener noreferrer"
                title="Abre a versão publicada"
              >
                abrir na loja ↗
              </a>
            ) : null}
          </span>
        }
        previewPath={'/' + open.slug}
        onBack={back}
        onSaved={(doc) => {
          if (doc.name && doc.name !== open.name) setOpen({ ...open, name: doc.name })
        }}
        onDiscarded={back}
      />
    )
  }

  // ------------------------------------------------------------ lista

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner label="carregando páginas…" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <EmptyState
        title="Não deu pra carregar as páginas"
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
    <div className="anim-fade">
      <ScopedStyles />

      <GroupHead
        title={'Páginas institucionais · ' + pages.length}
        extra={
          <Button variant="primary" onClick={() => setCreating(true)} data-testid="lp-new">
            Nova página
          </Button>
        }
      />
      <p className="sw-scoped__note">
        Páginas livres com endereço próprio (sobre, trocas, campanhas). Criar, editar e excluir vai pro rascunho — a
        loja só muda ao publicar.
      </p>

      {!pages.length ? (
        <EmptyState
          title="Nenhuma página ainda"
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              Criar a primeira
            </Button>
          }
        >
          Crie uma página institucional com blocos swtchr e um endereço como /sobre ou /institucional/trocas.
        </EmptyState>
      ) : null}

      {pages.map((p) => {
        const slug = slugOf(p)
        return (
          <ListRow
            key={p.id}
            testid={'lp-' + p.id}
            thumbText={initials(p.name || slug)}
            title={p.name || slug || p.id}
            meta={slug ? '/' + slug : 'sem slug'}
            side={
              storeUrl && slug ? (
                <a className="sw-scoped__link" href={storeUrl + '/' + slug} target="_blank" rel="noopener noreferrer">
                  abrir na loja ↗
                </a>
              ) : null
            }
            action="Editar →"
            onOpen={() => setOpen({ id: p.id, name: p.name || slug, slug })}
            onDelete={() => setToDelete(p)}
          />
        )
      })}

      {creating ? (
        <NewPageModal
          pages={pages}
          onClose={() => setCreating(false)}
          onCreated={(entry) => {
            setCreating(false)
            refreshDraft()
            notify('Página criada no rascunho — publique quando terminar', 'ok')
            setOpen(entry)
            load()
          }}
        />
      ) : null}

      {toDelete ? (
        <ConfirmDelete
          what={(toDelete.name || slugOf(toDelete)) + (slugOf(toDelete) ? ' (/' + slugOf(toDelete) + ')' : '')}
          fallback="Depois de publicar, o endereço deixa de existir na loja."
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- modal "Nova página"

const CONFLICT_TEXT: Record<string, string> = {
  categoria: 'Já existe uma categoria com esse endereço.',
  pagina: 'Já existe uma página com esse endereço.',
  invalido: 'Formato inválido: use letras minúsculas, números, hífens e "/".',
}

function NewPageModal({
  pages,
  onClose,
  onCreated,
}: {
  pages: ScopedPageSummary[]
  onClose: () => void
  onCreated: (entry: OpenEntry) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  /** usuário editou o slug à mão → para de acompanhar o nome */
  const [slugTouched, setSlugTouched] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDesc, setSeoDesc] = useState('')
  const [copyFrom, setCopyFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const finalSlug = slugify(slug)
  const debounced = useDebounced(finalSlug, 350)
  const [check, setCheck] = useState<SlugCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')

  useEffect(() => {
    if (!debounced) {
      setCheck(null)
      setCheckError('')
      return undefined
    }
    let alive = true
    setChecking(true)
    setCheckError('')
    client
      .checkSlug(debounced)
      .then((r) => {
        if (alive) setCheck(r)
      })
      .catch((e) => {
        if (!alive) return
        setCheck(null)
        setCheckError(errMsg(e))
      })
      .then(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [debounced])

  const onName = (v: string) => {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  const pending = checking || debounced !== finalSlug
  const current = check && check.slug === finalSlug ? check : null
  const slugOk = !!finalSlug && !pending && !!current && current.ok
  const canCreate = !!name.trim() && slugOk && !busy

  let slugError = ''
  if (current && !current.ok) {
    slugError = (current.conflict ? CONFLICT_TEXT[current.conflict] : 'Endereço indisponível.') || ''
    if (current.detail) slugError += ' ' + current.detail
  } else if (checkError) slugError = 'Não deu pra conferir o endereço: ' + checkError

  let slugHelp: React.ReactNode = 'Minúsculas, sem acento, hífens; "/" cria subpastas (ex.: institucional/trocas).'
  if (finalSlug && pending) slugHelp = 'conferindo /' + finalSlug + '…'
  else if (slugOk) slugHelp = '✓ /' + finalSlug + ' está livre'

  const submit = async () => {
    if (!canCreate) return
    setBusy(true)
    setError('')
    try {
      const seo: { title?: string; description?: string } = {}
      if (seoTitle.trim()) seo.title = seoTitle.trim()
      if (seoDesc.trim()) seo.description = seoDesc.trim()
      const doc = await client.createPage('landingPage', {
        name: name.trim(),
        target: finalSlug,
        seo: seo.title || seo.description ? seo : undefined,
        copyFrom: copyFrom || undefined,
      })
      onCreated({ id: doc.id, name: doc.name || name.trim(), slug: finalSlug })
    } catch (e) {
      setError(errMsg(e))
      setBusy(false)
    }
  }

  const copyOptions = [{ value: '', label: 'Em branco' }].concat(
    pages.map((p) => ({ value: p.id, label: 'Copiar de: ' + (p.name || slugOf(p)) + (slugOf(p) ? ' (/' + slugOf(p) + ')' : '') }))
  )

  return (
    <Modal
      title="Nova página"
      width={600}
      onClose={busy ? () => undefined : onClose}
      footer={
        <React.Fragment>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={!canCreate}>
            Criar e editar
          </Button>
        </React.Fragment>
      }
    >
      <div className="sw-fields">
        <Field label="Nome" full htmlFor="lp-name">
          <Input id="lp-name" value={name} onChange={onName} placeholder="Ex.: Trocas e devoluções" autoFocus />
        </Field>
        <Field label="Endereço (slug)" full htmlFor="lp-slug" help={slugError ? undefined : slugHelp} error={slugError || undefined}>
          <div className="sw-inline" style={{ flexWrap: 'nowrap', gap: 6 }}>
            <span className="sw-meta" style={{ flexShrink: 0 }}>/</span>
            <Input
              id="lp-slug"
              value={slug}
              invalid={!!slugError}
              onChange={(v) => {
                setSlugTouched(true)
                setSlug(slugTyping(v))
              }}
              onBlur={() => setSlug(finalSlug)}
              placeholder="institucional/trocas"
            />
          </div>
        </Field>
        <Field label="Título SEO" htmlFor="lp-seo-title" help="Aba do navegador e Google. Vazio = nome da página.">
          <Input id="lp-seo-title" value={seoTitle} onChange={setSeoTitle} placeholder={name || 'Título da página'} />
        </Field>
        <Field label="Começar a partir de" htmlFor="lp-copy">
          <Select id="lp-copy" value={copyFrom} onChange={setCopyFrom} options={copyOptions} />
        </Field>
        <Field label="Descrição SEO" full htmlFor="lp-seo-desc" help="Resumo nos resultados de busca (até ~160 caracteres).">
          <TextArea id="lp-seo-desc" value={seoDesc} onChange={setSeoDesc} rows={3} />
        </Field>
      </div>
      <p className="sw-meta" style={{ marginTop: 12 }}>
        Título e descrição continuam editáveis no card SEO do editor.
      </p>
      {error ? (
        <div style={{ marginTop: 12 }}>
          <Message kind="err" box>
            {error}
          </Message>
        </div>
      ) : null}
    </Modal>
  )
}
