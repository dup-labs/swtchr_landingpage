/**
 * Peças compartilhadas pelas abas com escopo (Produtos, Busca & Categorias, Institucional):
 * row de lista, modal de exclusão, árvore de categorias achatada, debounce e slug.
 */
import React, { useEffect, useState } from 'react'

import type { CategoryNode, ProductHit } from '../../api/types'
import { Button, Modal, cx } from '../../components'

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

// ---------------------------------------------------------------- CSS local

const SCOPED_CSS = `
.sw-scoped__bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.sw-scoped__bar .sw-input { flex: 1 1 260px; }
.sw-scoped__group { margin: 26px 0 12px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.sw-scoped__group .sw-h3 { margin: 0; }
.sw-scoped__group:first-child { margin-top: 0; }
.sw-scoped__note { font-size: 13px; line-height: 1.6; color: var(--muted); margin: 0 0 20px; }
.sw-scoped__note b { color: var(--ink); font-weight: 600; }
.sw-scoped__row { cursor: pointer; }
.sw-scoped__row:focus { outline: none; box-shadow: 0 0 0 2px var(--brand); }
.sw-scoped__thumb {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: var(--white) center / cover no-repeat;
  border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 0.08em;
}
.sw-scoped__side { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.sw-scoped__link { font-size: 12px; color: var(--brand); text-decoration: none; letter-spacing: 0.03em; white-space: nowrap; }
.sw-scoped__link:hover { text-decoration: underline; }
.sw-scoped__tree-gap { display: inline-block; flex-shrink: 0; }
.sw-scoped__twig { color: var(--subtle); font-size: 12px; margin-right: -6px; }
.sw-scoped__progress { height: 6px; border-radius: 999px; background: var(--row); overflow: hidden; margin-top: 12px; }
.sw-scoped__progress > span { display: block; height: 100%; background: var(--brand); transition: width 0.2s; }
.sw-scoped__check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; cursor: pointer; margin-top: 14px; }
.sw-scoped__check input { margin-top: 3px; }
.sw-scoped__scope { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
`

export function ScopedStyles() {
  return <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
}

// ---------------------------------------------------------------- Row

export interface ListRowProps {
  title: React.ReactNode
  meta?: React.ReactNode
  /** URL de imagem ou texto curto (ex.: iniciais) no quadradinho da esquerda */
  thumb?: string
  thumbText?: string
  badges?: React.ReactNode
  /** links/ações extras à direita (cliques não abrem a row) */
  side?: React.ReactNode
  action: React.ReactNode
  ghost?: boolean
  /** recuo à esquerda (árvore) */
  indent?: number
  onOpen: () => void
  onDelete?: () => void
  disabled?: boolean
  testid?: string
}

/** Row .sw-row (div clicável, pra poder ter botões dentro). */
export function ListRow({
  title,
  meta,
  thumb,
  thumbText,
  badges,
  side,
  action,
  ghost,
  indent,
  onOpen,
  onDelete,
  disabled,
  testid,
}: ListRowProps) {
  const open = () => {
    if (!disabled) onOpen()
  }
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <div
      className={cx('sw-row', 'sw-scoped__row', ghost && 'sw-row--ghost')}
      role="button"
      tabIndex={0}
      aria-disabled={disabled || undefined}
      data-testid={testid}
      style={disabled ? { opacity: 0.6, cursor: 'default' } : undefined}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          open()
        }
      }}
    >
      {indent ? <span className="sw-scoped__tree-gap" style={{ width: indent }} aria-hidden="true" /> : null}
      {thumb || thumbText ? (
        <span className="sw-scoped__thumb" style={thumb ? { backgroundImage: 'url("' + thumb + '")' } : undefined}>
          {thumb ? null : thumbText}
        </span>
      ) : null}
      <span className="sw-row__body">
        <span className="sw-row__title">{title}</span>
        {meta ? <span className="sw-meta">{meta}</span> : null}
      </span>
      <span className="sw-scoped__side" onClick={stop} onKeyDown={stop}>
        {badges}
        {side}
        {onDelete ? (
          <Button variant="danger" onClick={onDelete} disabled={disabled}>
            Excluir
          </Button>
        ) : null}
      </span>
      <span className="sw-row__action">{action}</span>
    </div>
  )
}

export function GroupHead({ title, extra }: { title: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="sw-scoped__group">
      <div className="sw-h3">{title}</div>
      {extra}
    </div>
  )
}

// ---------------------------------------------------------------- exclusão

export interface ConfirmDeleteProps {
  what: React.ReactNode
  /** o que acontece com a loja depois (ex.: "os produtos voltam a usar o padrão") */
  fallback?: React.ReactNode
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDelete({ what, fallback, busy, onConfirm, onClose }: ConfirmDeleteProps) {
  return (
    <Modal
      title="Excluir conteúdo?"
      width={480}
      onClose={busy ? () => undefined : onClose}
      footer={
        <React.Fragment>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={busy}>
            Excluir
          </Button>
        </React.Fragment>
      }
    >
      <p className="sw-meta" style={{ lineHeight: 1.6, fontSize: 13 }}>
        “{what}” sai do rascunho. {fallback ? <React.Fragment>{fallback} </React.Fragment> : null}
        A loja só muda quando você <b>publicar o rascunho</b> na barra do editor.
      </p>
    </Modal>
  )
}

// ---------------------------------------------------------------- categorias

export interface FlatCategory {
  node: CategoryNode
  depth: number
  /** nomes do topo até ela, ex.: ["Vestuário", "Casacos"] */
  trail: string[]
}

export function flattenCategories(tree: CategoryNode[]): FlatCategory[] {
  const out: FlatCategory[] = []
  const walk = (nodes: CategoryNode[], depth: number, trail: string[]) => {
    nodes.forEach((n) => {
      const t = trail.concat(n.name)
      out.push({ node: n, depth, trail: t })
      if (n.children && n.children.length) walk(n.children, depth + 1, t)
    })
  }
  walk(tree || [], 0, [])
  return out
}

/** Todas as subcategorias (todos os níveis) de um nó. */
export function descendants(node: CategoryNode): CategoryNode[] {
  const out: CategoryNode[] = []
  const walk = (nodes: CategoryNode[]) => {
    nodes.forEach((n) => {
      out.push(n)
      if (n.children && n.children.length) walk(n.children)
    })
  }
  walk(node.children || [])
  return out
}

export function normPath(p?: string): string {
  if (!p) return ''
  let s = p.trim().toLowerCase()
  if (s.charAt(0) !== '/') s = '/' + s
  while (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1)
  return s
}

/** `path` está dentro de `base` (igual ou subcategoria). */
export function pathWithin(path: string | undefined, base: string | undefined): boolean {
  const p = normPath(path)
  const b = normPath(base)
  if (!p || !b) return false
  return p === b || p.indexOf(b + '/') === 0
}

// ---------------------------------------------------------------- catálogo

/** linkText a partir do template de PDP por produto ("/<linkText>/p"). */
export function linkTextOf(target?: string): string {
  if (!target) return ''
  return target.replace(/^\/+/, '').replace(/\/p\/?$/, '')
}

export function findHit(hits: ProductHit[], linkText: string): ProductHit | undefined {
  const lt = linkText.toLowerCase()
  return hits.filter((h) => (h.linkText || '').toLowerCase() === lt)[0]
}

// ---------------------------------------------------------------- utilidades

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Normalização leve enquanto digita o slug: minúsculas, sem acento, espaço → hífen, só [a-z0-9-/]. */
export function slugTyping(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-/]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
}

/** Slug final: como o de digitação, sem hífen/barra sobrando nas pontas de cada segmento. */
export function slugify(s: string): string {
  return slugTyping(s)
    .split('/')
    .map((part) => part.replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/')
}

export function initials(s: string): string {
  const words = (s || '').trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}
