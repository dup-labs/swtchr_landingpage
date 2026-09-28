import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import * as client from '../api/client'
import type { CategoryNode, ProductHit, ScopedPageSummary } from '../api/types'
import { Badge, Button, EmptyState, Field, Input, Message, Modal, Select, Spinner } from '../components'
import { useShell } from '../shell/ShellContext'
import PageEditor from './page/PageEditor'
import {
  ConfirmDelete,
  GroupHead,
  ListRow,
  ScopedStyles,
  errMsg,
  findHit,
  flattenCategories,
  initials,
  linkTextOf,
  normPath,
  pathWithin,
  useDebounced,
} from './scoped/shared'

/** Entrada aberta no editor. */
interface OpenEntry {
  id: string
  name: string
  scope: 'default' | 'category' | 'product'
  /** nome da categoria/produto (badge) */
  label?: string
  previewPath?: string
}

/**
 * Aba Produtos (PDP): lista de conteúdos por escopo (padrão / categoria / produto),
 * busca no catálogo pra criar conteúdo de um produto e editor genérico por entrada.
 * Prioridade na loja: produto > categoria (mais específica) > padrão.
 */
export default function ProductsView() {
  const { refreshDraft, notify } = useShell()

  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading')
  const [loadError, setLoadError] = useState('')
  const [entries, setEntries] = useState<ScopedPageSummary[]>([])
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [treeError, setTreeError] = useState('')
  /** linkText → produto (nome/imagem/url) das entradas por produto */
  const [products, setProducts] = useState<Record<string, ProductHit>>({})

  const [q, setQ] = useState('')
  const term = useDebounced(q.trim(), 300)
  const [hits, setHits] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [open, setOpen] = useState<OpenEntry | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [catModal, setCatModal] = useState(false)
  const [toDelete, setToDelete] = useState<ScopedPageSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  /** primeiros produtos do catálogo (preview do padrão/categoria) */
  const firstProducts = useRef<ProductHit[] | null>(null)

  // ------------------------------------------------------------ carga

  const load = useCallback(async () => {
    setPhase((p) => (p === 'ready' ? p : 'loading'))
    setLoadError('')
    try {
      const [list, cats] = await Promise.all([
        client.listScopedPages('pdp'),
        client.getCategories().catch((e) => {
          setTreeError(errMsg(e))
          return [] as CategoryNode[]
        }),
      ])
      setEntries(list || [])
      setTree(cats || [])
      if (cats && cats.length) setTreeError('')
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
  const categoryEntries = useMemo(() => entries.filter((e) => e.scope === 'category'), [entries])
  const productEntries = useMemo(() => entries.filter((e) => e.scope === 'product'), [entries])

  const flat = useMemo(() => flattenCategories(tree), [tree])
  const catByPath = useMemo(() => {
    const m: Record<string, { name: string; trail: string[]; node: CategoryNode }> = {}
    flat.forEach((f) => {
      m[normPath(f.node.path)] = { name: f.node.name, trail: f.trail, node: f.node }
    })
    return m
  }, [flat])

  // nome/imagem dos produtos das entradas por produto (busca pelo linkText)
  useEffect(() => {
    let alive = true
    const missing = productEntries.map((e) => linkTextOf(e.target)).filter((lt) => lt && !products[lt])
    if (!missing.length) return undefined
    Promise.all(
      missing.map((lt) =>
        client
          .searchProducts(lt.replace(/-/g, ' '))
          .then((r) => findHit(r || [], lt) || null)
          .catch(() => null)
      )
    ).then((found) => {
      if (!alive) return
      const next: Record<string, ProductHit> = {}
      found.forEach((h) => {
        if (h) next[h.linkText] = h
      })
      if (Object.keys(next).length) setProducts((p) => ({ ...p, ...next }))
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productEntries])

  // busca no catálogo (debounce 300ms)
  useEffect(() => {
    if (!term) {
      setHits([])
      setSearchError('')
      return undefined
    }
    let alive = true
    setSearching(true)
    setSearchError('')
    client
      .searchProducts(term)
      .then((r) => {
        if (alive) setHits(r || [])
      })
      .catch((e) => {
        if (!alive) return
        setHits([])
        setSearchError(errMsg(e))
      })
      .then(() => {
        if (alive) setSearching(false)
      })
    return () => {
      alive = false
    }
  }, [term])

  // ------------------------------------------------------------ helpers

  const entryByTemplate = useMemo(() => {
    const m: Record<string, ScopedPageSummary> = {}
    productEntries.forEach((e) => {
      m[normPath(e.target)] = e
    })
    return m
  }, [productEntries])

  const categoryName = (path?: string) => {
    const c = catByPath[normPath(path)]
    return c ? c.trail.join(' › ') : path || '—'
  }

  /** Qual entrada o produto usa hoje: categoria mais específica que contém a dele, senão o padrão. */
  const currentFor = (hit: ProductHit): string => {
    let best: ScopedPageSummary | undefined
    categoryEntries.forEach((e) => {
      if (!pathWithin(hit.categoryPath, e.target)) return
      if (!best || normPath(e.target).length > normPath(best.target).length) best = e
    })
    return best ? 'hoje usa: categoria ' + categoryName(best.target) : 'hoje usa: template padrão'
  }

  const catalogFirst = async (): Promise<ProductHit[]> => {
    if (firstProducts.current) return firstProducts.current
    const r = await client.searchProducts('')
    firstProducts.current = r || []
    return firstProducts.current
  }

  /** Produto real pro preview: da categoria (prefixo), senão o primeiro do catálogo. */
  const samplePath = async (categoryPath?: string): Promise<string | undefined> => {
    try {
      const first = await catalogFirst()
      if (categoryPath) {
        const inCat = first.filter((h) => pathWithin(h.categoryPath, categoryPath))[0]
        if (inCat) return inCat.url
        const c = catByPath[normPath(categoryPath)]
        if (c) {
          const byName = await client.searchProducts(c.name).catch(() => [] as ProductHit[])
          const hit = (byName || []).filter((h) => pathWithin(h.categoryPath, categoryPath))[0]
          if (hit) return hit.url
        }
      }
      return first[0] ? first[0].url : undefined
    } catch (e) {
      return undefined
    }
  }

  const openEntry = async (e: ScopedPageSummary, hit?: ProductHit) => {
    setOpening(e.id)
    try {
      if (e.scope === 'product') {
        const lt = linkTextOf(e.target)
        let h: ProductHit | undefined = hit || products[lt]
        if (!h) {
          const r = await client.searchProducts(lt.replace(/-/g, ' ')).catch(() => [] as ProductHit[])
          h = findHit(r || [], lt)
        }
        setOpen({
          id: e.id,
          name: e.name,
          scope: 'product',
          label: h ? h.name : lt,
          previewPath: h ? h.url : await samplePath(),
        })
      } else if (e.scope === 'category') {
        setOpen({
          id: e.id,
          name: e.name,
          scope: 'category',
          label: categoryName(e.target),
          previewPath: await samplePath(e.target),
        })
      } else {
        setOpen({ id: e.id, name: e.name, scope: 'default', previewPath: await samplePath() })
      }
    } finally {
      setOpening(null)
    }
  }

  const createForProduct = async (hit: ProductHit) => {
    if (!defaultEntry) {
      notify('Sem template padrão de produto no CMS — não dá pra copiar as seções.', 'err', 6000)
      return
    }
    setCreating(hit.id)
    try {
      const doc = await client.createPage('pdp', {
        name: hit.name,
        target: hit.pdpTemplate,
        copyFrom: defaultEntry.id,
      })
      await refreshDraft()
      notify('Conteúdo criado no rascunho — publique quando terminar', 'ok')
      setProducts((p) => ({ ...p, [hit.linkText]: hit }))
      setOpen({ id: doc.id, name: doc.name || hit.name, scope: 'product', label: hit.name, previewPath: hit.url })
      load()
    } catch (e) {
      notify('Erro ao criar: ' + errMsg(e), 'err', 6000)
    } finally {
      setCreating(null)
    }
  }

  const createForCategory = async (node: CategoryNode) => {
    if (!defaultEntry) return
    const doc = await client.createPage('pdp', {
      name: 'PDP · ' + node.name,
      target: node.path,
      copyFrom: defaultEntry.id,
    })
    await refreshDraft()
    notify('Conteúdo da categoria criado no rascunho', 'ok')
    setCatModal(false)
    setOpen({
      id: doc.id,
      name: doc.name || 'PDP · ' + node.name,
      scope: 'category',
      label: categoryName(node.path),
      previewPath: await samplePath(node.path),
    })
    load()
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await client.deletePage('pdp', toDelete.id)
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

  // ------------------------------------------------------------ editor

  if (open) {
    const badge =
      open.scope === 'default' ? (
        <Badge>Padrão</Badge>
      ) : open.scope === 'category' ? (
        <Badge tone="ok">Categoria: {open.label}</Badge>
      ) : (
        <Badge tone="ok">Produto: {open.label}</Badge>
      )
    const back = () => {
      setOpen(null)
      load()
    }
    return (
      <PageEditor
        key={open.id}
        type="pdp"
        entryId={open.id}
        title={open.scope === 'default' ? 'Produto · template padrão' : open.name}
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
        <Spinner label="carregando páginas de produto…" />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <EmptyState
        title="Não deu pra carregar as páginas de produto"
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

  const withContent = hits.filter((h) => !!entryByTemplate[normPath(h.pdpTemplate)])
  const withoutContent = hits.filter((h) => !entryByTemplate[normPath(h.pdpTemplate)])
  const busy = !!opening || !!creating

  const productRow = (e: ScopedPageSummary) => {
    const lt = linkTextOf(e.target)
    const h = products[lt]
    return (
      <ListRow
        key={e.id}
        testid={'pdp-' + e.id}
        thumb={h && h.image}
        thumbText={initials(h ? h.name : e.name)}
        title={h ? h.name : e.name}
        meta={e.target}
        action={opening === e.id ? <Spinner /> : 'Editar →'}
        disabled={busy}
        onOpen={() => openEntry(e, h)}
        onDelete={() => setToDelete(e)}
      />
    )
  }

  return (
    <div className="anim-fade">
      <ScopedStyles />

      <p className="sw-scoped__note">
        Cada produto usa <b>uma</b> página: a <b>do produto</b>, se existir; senão a <b>da categoria mais específica</b>{' '}
        dele; senão o <b>template padrão</b>. Tudo que você cria ou exclui aqui vai pro rascunho — a loja só muda ao
        publicar na barra do editor.
      </p>

      <div className="sw-scoped__bar">
        <Input
          pill
          value={q}
          onChange={(v) => setQ(v)}
          placeholder="Busque um produto pelo nome"
          data-testid="pdp-search"
        />
        <Button variant="primary" onClick={() => setCatModal(true)} disabled={!defaultEntry || !tree.length}>
          Criar por categoria
        </Button>
      </div>

      {treeError ? (
        <Message kind="err" box>
          Árvore de categorias indisponível: {treeError}
        </Message>
      ) : null}

      {term ? (
        <React.Fragment>
          {searchError ? (
            <Message kind="err" box>
              Erro na busca: {searchError}
            </Message>
          ) : null}
          {searching ? (
            <div style={{ padding: '12px 0' }}>
              <Spinner label="buscando no catálogo…" />
            </div>
          ) : (
            <React.Fragment>
              {withContent.length ? <GroupHead title="Com conteúdo próprio" /> : null}
              {withContent.map((h) => {
                const e = entryByTemplate[normPath(h.pdpTemplate)]
                return (
                  <ListRow
                    key={h.id}
                    thumb={h.image}
                    thumbText={initials(h.name)}
                    title={h.name}
                    meta={h.pdpTemplate}
                    badges={<Badge tone="ok">conteúdo próprio</Badge>}
                    action={opening === e.id ? <Spinner /> : 'Editar →'}
                    disabled={busy}
                    onOpen={() => openEntry(e, h)}
                  />
                )
              })}
              {withoutContent.length ? <GroupHead title="Conteúdo não cadastrado" /> : null}
              {withoutContent.map((h) => (
                <ListRow
                  key={h.id}
                  ghost
                  thumb={h.image}
                  thumbText={initials(h.name)}
                  title={h.name}
                  meta={currentFor(h)}
                  action={creating === h.id ? <Spinner /> : 'Criar conteúdo deste produto →'}
                  disabled={busy || !defaultEntry}
                  onOpen={() => createForProduct(h)}
                />
              ))}
              {!hits.length && !searchError ? (
                <EmptyState title="Nada encontrado">Nenhum produto com esse nome no catálogo.</EmptyState>
              ) : null}
            </React.Fragment>
          )}
        </React.Fragment>
      ) : (
        <React.Fragment>
          <GroupHead title="Template padrão" />
          {defaultEntry ? (
            <ListRow
              title="Página de produto padrão"
              meta="vale pra todo produto sem conteúdo de categoria ou próprio"
              thumbText="★"
              badges={<Badge>Padrão</Badge>}
              action={opening === defaultEntry.id ? <Spinner /> : 'Editar →'}
              disabled={busy}
              onOpen={() => openEntry(defaultEntry)}
            />
          ) : (
            <Message kind="err" box>
              Não achei a página de produto padrão (pdp sem template) no CMS. Sem ela não dá pra criar conteúdos por
              categoria/produto.
            </Message>
          )}

          <GroupHead title={'Por categoria · ' + categoryEntries.length} />
          {categoryEntries.length ? (
            categoryEntries.map((e) => (
              <ListRow
                key={e.id}
                testid={'pdp-' + e.id}
                thumbText={initials(catByPath[normPath(e.target)] ? catByPath[normPath(e.target)].name : e.name)}
                title={categoryName(e.target)}
                meta={e.target + (catByPath[normPath(e.target)] ? '' : ' · categoria não encontrada na loja')}
                action={opening === e.id ? <Spinner /> : 'Editar →'}
                disabled={busy}
                onOpen={() => openEntry(e)}
                onDelete={() => setToDelete(e)}
              />
            ))
          ) : (
            <div className="sw-meta" style={emptyBox}>
              Nenhuma categoria com página própria. Use “Criar por categoria”.
            </div>
          )}

          <GroupHead title={'Por produto · ' + productEntries.length} />
          {productEntries.length ? (
            productEntries.map(productRow)
          ) : (
            <div className="sw-meta" style={emptyBox}>
              Nenhum produto com página própria. Busque um produto acima pra criar.
            </div>
          )}
        </React.Fragment>
      )}

      {catModal && defaultEntry ? (
        <CategoryPicker
          tree={tree}
          taken={categoryEntries.map((e) => normPath(e.target))}
          onClose={() => setCatModal(false)}
          onCreate={createForCategory}
        />
      ) : null}

      {toDelete ? (
        <ConfirmDelete
          what={
            toDelete.scope === 'category'
              ? 'Categoria: ' + categoryName(toDelete.target)
              : 'Produto: ' +
                (products[linkTextOf(toDelete.target)] ? products[linkTextOf(toDelete.target)].name : toDelete.name)
          }
          fallback={
            toDelete.scope === 'category'
              ? 'Os produtos dela voltam a usar outra categoria que se aplique ou o template padrão.'
              : 'O produto volta a usar a página da categoria dele ou o template padrão.'
          }
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      ) : null}
    </div>
  )
}

const emptyBox: React.CSSProperties = {
  padding: '16px',
  textAlign: 'center',
  border: '1px dashed var(--subtle)',
  borderRadius: 14,
  marginBottom: 10,
}

// ---------------------------------------------------------------- modal "Criar por categoria"

function CategoryPicker({
  tree,
  taken,
  onClose,
  onCreate,
}: {
  tree: CategoryNode[]
  taken: string[]
  onClose: () => void
  onCreate: (node: CategoryNode) => Promise<void>
}) {
  const flat = useMemo(() => flattenCategories(tree), [tree])
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = flat.map((f) => {
    const has = taken.indexOf(normPath(f.node.path)) !== -1
    return {
      value: f.node.path,
      label: repeat('   ', f.depth) + (f.depth ? '└ ' : '') + f.node.name + (has ? ' (já tem)' : ''),
      disabled: has,
    }
  })
  const chosen = flat.filter((f) => f.node.path === path)[0]

  const submit = async () => {
    if (!chosen) return
    setBusy(true)
    setError('')
    try {
      await onCreate(chosen.node)
    } catch (e) {
      setError(errMsg(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Página de produto por categoria"
      width={520}
      onClose={busy ? () => undefined : onClose}
      footer={
        <React.Fragment>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={!chosen}>
            Criar e editar
          </Button>
        </React.Fragment>
      }
    >
      <Field label="Categoria" help="Começa como cópia do template padrão.">
        <Select value={path} onChange={(v) => setPath(v)} options={options} placeholder="Escolha a categoria" />
      </Field>
      <p className="sw-scoped__note" style={{ marginTop: 14, marginBottom: 0 }}>
        Vale pros produtos desta categoria que não têm página própria. Se houver página numa subcategoria mais
        específica, ela vence; página do produto vence tudo.
      </p>
      {chosen ? <p className="sw-meta">Alvo: {chosen.node.path}</p> : null}
      {error ? (
        <Message kind="err" box>
          {error}
        </Message>
      ) : null}
    </Modal>
  )
}

function repeat(s: string, n: number): string {
  let out = ''
  for (let i = 0; i < n; i++) out += s
  return out
}
