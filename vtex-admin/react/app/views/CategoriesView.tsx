import React, { useCallback, useEffect, useMemo, useState } from 'react'

import * as client from '../api/client'
import type { CategoryNode, PageSummary, ScopedPageSummary } from '../api/types'
import { Badge, Button, EmptyState, Input, Message, Modal, Spinner } from '../components'
import { useShell } from '../shell/ShellContext'
import PageEditor from './page/PageEditor'
import {
  ConfirmDelete,
  FlatCategory,
  GroupHead,
  ListRow,
  ScopedStyles,
  descendants,
  errMsg,
  flattenCategories,
  normPath,
  useDebounced,
} from './scoped/shared'

interface OpenEntry {
  type: 'plp' | 'search'
  id: string
  name: string
  scope: 'default' | 'category' | 'search'
  label?: string
  previewPath?: string
}

/**
 * Aba Busca & Categorias: páginas de listagem (PLP) por categoria + template padrão + página de busca.
 * Na FastStore a subcategoria NÃO herda o conteúdo da categoria-mãe: sem entrada própria, usa o padrão.
 */
export default function CategoriesView() {
  const { refreshDraft, notify } = useShell()

  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [entries, setEntries] = useState<ScopedPageSummary[]>([])
  const [searchPage, setSearchPage] = useState<PageSummary | null>(null)
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [treeError, setTreeError] = useState('')

  const [filter, setFilter] = useState('')
  const term = useDebounced(filter.trim().toLowerCase(), 200)

  const [open, setOpen] = useState<OpenEntry | null>(null)
  const [toCreate, setToCreate] = useState<CategoryNode | null>(null)
  const [toDelete, setToDelete] = useState<ScopedPageSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setPhase((p) => (p === 'ready' ? p : 'loading'))
    setLoadError('')
    try {
      const [list, cats, search] = await Promise.all([
        client.listScopedPages('plp'),
        client.getCategories().catch((e) => {
          setTreeError(errMsg(e))
          return [] as CategoryNode[]
        }),
        client.listPages('search').catch(() => [] as PageSummary[]),
      ])
      setEntries(list || [])
      setTree(cats || [])
      if (cats && cats.length) setTreeError('')
      setSearchPage(search && search.length ? search[0] : null)
      setPhase('ready')
    } catch (e) {
      setLoadError(errMsg(e))
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const defaultEntry = useMemo(() => entries.filter((e) => e.scope === 'default')[0], [entries])
  const byPath = useMemo(() => {
    const m: Record<string, ScopedPageSummary> = {}
    entries.forEach((e) => {
      if (e.scope === 'category' && e.target) m[normPath(e.target)] = e
    })
    return m
  }, [entries])
  const flat = useMemo(() => flattenCategories(tree), [tree])
  const orphans = useMemo(() => {
    const paths: Record<string, boolean> = {}
    flat.forEach((f) => {
      paths[normPath(f.node.path)] = true
    })
    return entries.filter((e) => e.scope === 'category' && !paths[normPath(e.target)])
  }, [entries, flat])

  const visible: FlatCategory[] = term
    ? flat.filter((f) => f.trail.join(' ').toLowerCase().indexOf(term) !== -1)
    : flat

  const firstCategory = flat[0] ? flat[0].node : null
  const searchTerm = firstCategory ? firstCategory.name.split(/\s+/)[0].toLowerCase() : 'a'

  // ------------------------------------------------------------ ações

  const openCategory = (node: CategoryNode, e: ScopedPageSummary, trail?: string[]) =>
    setOpen({
      type: 'plp',
      id: e.id,
      name: e.name,
      scope: 'category',
      label: trail ? trail.join(' › ') : node.name,
      previewPath: node.path,
    })

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await client.deletePage('plp', toDelete.id)
      await refreshDraft()
      notify('Excluído no rascunho — publique para tirar da loja', 'ok')
      setToDelete(null)
      load()
    } catch (e) {
      notify('Erro ao excluir: ' + errMsg(e), 'err', 6000)
    } finally {
      setDeleting(false)
    }
  }

  const trailOf = (path?: string) => {
    const f = flat.filter((x) => normPath(x.node.path) === normPath(path))[0]
    return f ? f.trail : undefined
  }

  // ------------------------------------------------------------ editor

  if (open) {
    const badge =
      open.scope === 'default' ? (
        <Badge>Padrão</Badge>
      ) : open.scope === 'search' ? (
        <Badge>Busca</Badge>
      ) : (
        <Badge tone="ok">Categoria: {open.label}</Badge>
      )
    const back = () => {
      setOpen(null)
      load()
    }
    return (
      <PageEditor
        key={open.type + ':' + open.id}
        type={open.type}
        entryId={open.id}
        title={
          open.scope === 'default' ? 'Categoria · template padrão' : open.scope === 'search' ? 'Página de busca' : open.name
        }
        headerExtra={badge}
        previewPath={open.previewPath}
        onBack={back}
        onSaved={() => load()}
        onDiscarded={back}
      />
    )
  }

  // ------------------------------------------------------------ lista

  if (phase === 'loading') {
    return (
      <div style={{ padding: '48px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner label="carregando categorias…" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <EmptyState
        title="Não deu pra carregar as categorias"
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

      <p className="sw-scoped__note">
        Cada categoria usa a <b>própria página</b>, se existir; senão o <b>template padrão de categoria</b>. Atenção:
        na FastStore a <b>subcategoria não herda</b> da categoria-mãe — pra ela ter o mesmo conteúdo, crie também pra
        ela. Tudo vai pro rascunho; a loja só muda ao publicar.
      </p>

      <GroupHead title="Páginas fixas" />
      {defaultEntry ? (
        <ListRow
          thumbText="★"
          title="Template padrão de categoria"
          meta="toda categoria sem página própria"
          badges={<Badge>Padrão</Badge>}
          action="Editar →"
          onOpen={() =>
            setOpen({
              type: 'plp',
              id: defaultEntry.id,
              name: defaultEntry.name,
              scope: 'default',
              previewPath: firstCategory ? firstCategory.path : undefined,
            })
          }
        />
      ) : (
        <Message kind="err" box>
          Não achei o template padrão de categoria (plp sem template) no CMS. Sem ele não dá pra criar páginas de
          categoria.
        </Message>
      )}
      {searchPage ? (
        <ListRow
          thumbText="⌕"
          title="Página de busca"
          meta={'resultados de /s?q=…'}
          badges={<Badge>Busca</Badge>}
          action="Editar →"
          onOpen={() =>
            setOpen({
              type: 'search',
              id: searchPage.id,
              name: searchPage.name,
              scope: 'search',
              previewPath: '/s?q=' + encodeURIComponent(searchTerm),
            })
          }
        />
      ) : (
        <Message kind="info" box>
          Nenhuma entrada de página de busca no CMS.
        </Message>
      )}

      <GroupHead
        title={'Categorias · ' + flat.length}
        extra={<span className="sw-meta">{Object.keys(byPath).length} com página própria</span>}
      />

      {treeError ? (
        <Message kind="err" box>
          Árvore de categorias indisponível: {treeError}{' '}
          <Button variant="link" onClick={load}>
            tentar de novo
          </Button>
        </Message>
      ) : null}

      {flat.length > 8 ? (
        <div className="sw-scoped__bar">
          <Input pill value={filter} onChange={(v) => setFilter(v)} placeholder="Filtrar categorias pelo nome" />
        </div>
      ) : null}

      {!treeError && !flat.length ? <EmptyState title="Sem categorias">A loja não tem categorias no catálogo.</EmptyState> : null}
      {term && !visible.length ? <EmptyState title="Nada encontrado">Nenhuma categoria com esse nome.</EmptyState> : null}

      {visible.map((f) => {
        const e = byPath[normPath(f.node.path)]
        return (
          <ListRow
            key={f.node.id + ':' + f.node.path}
            ghost={!e}
            indent={term ? 0 : f.depth * 28}
            title={
              <React.Fragment>
                {!term && f.depth ? <span className="sw-scoped__twig">└ </span> : null}
                {term ? f.trail.join(' › ') : f.node.name}
              </React.Fragment>
            }
            meta={f.node.path}
            badges={e ? <Badge tone="ok">conteúdo próprio</Badge> : <Badge tone="muted">usa o padrão</Badge>}
            action={e ? 'Editar →' : 'Criar conteúdo →'}
            disabled={!e && !defaultEntry}
            onOpen={() => (e ? openCategory(f.node, e, f.trail) : setToCreate(f.node))}
            onDelete={e ? () => setToDelete(e) : undefined}
          />
        )
      })}

      {orphans.length ? (
        <React.Fragment>
          <GroupHead title="Sem categoria correspondente" />
          <p className="sw-scoped__note">Páginas cujo caminho não existe mais na árvore de categorias da loja.</p>
          {orphans.map((e) => (
            <ListRow
              key={e.id}
              title={e.name}
              meta={e.target}
              badges={<Badge tone="warn">órfã</Badge>}
              action="Editar →"
              onOpen={() =>
                setOpen({
                  type: 'plp',
                  id: e.id,
                  name: e.name,
                  scope: 'category',
                  label: e.target,
                  previewPath: e.target,
                })
              }
              onDelete={() => setToDelete(e)}
            />
          ))}
        </React.Fragment>
      ) : null}

      {toCreate && defaultEntry ? (
        <CreateCategoryModal
          node={toCreate}
          defaultId={defaultEntry.id}
          existing={byPath}
          onClose={() => setToCreate(null)}
          onDone={(created) => {
            setToCreate(null)
            refreshDraft()
            load()
            const main = created.filter((c) => normPath(c.node.path) === normPath(toCreate.path))[0]
            if (main) openCategory(main.node, main.entry, trailOf(main.node.path))
          }}
        />
      ) : null}

      {toDelete ? (
        <ConfirmDelete
          what={'Categoria: ' + ((trailOf(toDelete.target) || [toDelete.name]).join(' › '))}
          fallback="A categoria volta a usar o template padrão (as subcategorias não são afetadas)."
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------- modal "Criar conteúdo"

interface Created {
  node: CategoryNode
  entry: ScopedPageSummary
}

function CreateCategoryModal({
  node,
  defaultId,
  existing,
  onClose,
  onDone,
}: {
  node: CategoryNode
  defaultId: string
  existing: Record<string, ScopedPageSummary>
  onClose: () => void
  onDone: (created: Created[]) => void
}) {
  const { notify } = useShell()
  const subs = useMemo(() => descendants(node).filter((n) => !existing[normPath(n.path)]), [node, existing])
  const subsTotal = useMemo(() => descendants(node).length, [node])
  const [withSubs, setWithSubs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })
  const [error, setError] = useState('')

  const run = async () => {
    const queue = [node].concat(withSubs ? subs : [])
    const created: Created[] = []
    setBusy(true)
    setError('')
    const failed: string[] = []
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i]
      setProgress({ done: i, total: queue.length, current: n.name })
      try {
        const doc = await client.createPage('plp', {
          name: 'Categoria · ' + n.name,
          target: n.path,
          copyFrom: defaultId,
        })
        created.push({
          node: n,
          entry: { id: doc.id, type: 'plp', name: doc.name || 'Categoria · ' + n.name, scope: 'category', target: n.path },
        })
      } catch (e) {
        if (i === 0) {
          setError(errMsg(e))
          setBusy(false)
          return
        }
        failed.push(n.name)
      }
    }
    setProgress({ done: queue.length, total: queue.length, current: '' })
    if (failed.length) notify('Criadas ' + created.length + '; falharam: ' + failed.join(', '), 'err', 8000)
    else
      notify(
        created.length > 1 ? created.length + ' páginas de categoria criadas no rascunho' : 'Página criada no rascunho',
        'ok'
      )
    onDone(created)
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Modal
      title={'Criar conteúdo · ' + node.name}
      width={520}
      onClose={busy ? () => undefined : onClose}
      footer={
        <React.Fragment>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={run} loading={busy}>
            {withSubs && subs.length ? 'Criar ' + (subs.length + 1) + ' páginas' : 'Criar e editar'}
          </Button>
        </React.Fragment>
      }
    >
      <p className="sw-scoped__note" style={{ marginBottom: 0 }}>
        A página de <b>{node.path}</b> começa como cópia do template padrão de categoria.
      </p>

      {subsTotal ? (
        <label className="sw-scoped__check">
          <input
            type="checkbox"
            checked={withSubs}
            disabled={busy || !subs.length}
            onChange={(e) => setWithSubs(e.target.checked)}
          />
          <span>
            Aplicar às subcategorias ({subs.length} sem página própria
            {subsTotal > subs.length ? ', ' + (subsTotal - subs.length) + ' já têm' : ''})
            <br />
            <span className="sw-meta">
              Na FastStore a subcategoria <b>não herda</b> da categoria: sem página própria, ela usa o template padrão.
              Marcando, cada uma ganha uma cópia independente (editar uma não muda as outras).
            </span>
          </span>
        </label>
      ) : null}

      {busy && progress.total > 1 ? (
        <div style={{ marginTop: 16 }}>
          <div className="sw-meta">
            Criando {Math.min(progress.done + 1, progress.total)} de {progress.total}
            {progress.current ? ' · ' + progress.current : ''}…
          </div>
          <div className="sw-scoped__progress">
            <span style={{ width: pct + '%' }} />
          </div>
        </div>
      ) : null}

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
