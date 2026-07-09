import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { Spinner, EmptyState } from '../components/primitives.jsx'

function Row({ p, onOpen, ghost }) {
  return (
    <button className={'sw-row' + (ghost ? ' sw-row--ghost' : '')} onClick={() => onOpen(p)} data-testid={'row-' + p.id}>
      <span className="sw-row__body">
        <span className="sw-row__title">{p.name}</span>
        <span className="sw-meta">#{p.id}</span>
      </span>
      <span className="sw-row__action">{ghost ? 'Configurar →' : 'Editar →'}</span>
    </button>
  )
}

// listagem única: histórico + busca inline no catálogo (sem tela intermediária)
export default function ProductList({ onOpen }) {
  const [rows, setRows] = useState(null) // produtos já editados
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [catalog, setCatalog] = useState([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    api.history().then(setRows).catch((e) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setCatalog([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        setCatalog(await api.search(q))
      } catch {
        setCatalog([])
      }
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const term = q.trim().toLowerCase()
  const filtered = useMemo(
    () => (!rows ? [] : term ? rows.filter((p) => p.name.toLowerCase().includes(term) || String(p.id).includes(term)) : rows),
    [rows, term]
  )
  const editedIds = useMemo(() => new Set((rows || []).map((p) => p.id)), [rows])
  const catalogOnly = catalog.filter((p) => !editedIds.has(p.id))
  const nothing = term && !searching && filtered.length === 0 && catalogOnly.length === 0

  return (
    <div className="anim-fade">
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          className="sw-input sw-input--pill"
          style={{ flex: '1 1 260px' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busque pelo nome ou id do produto"
          data-testid="search"
        />
        <button className="sw-btn sw-btn--primary" onClick={() => inputRef.current?.focus()} data-testid="add-new">
          Adicionar novo produto
        </button>
      </div>

      {err && <div className="sw-msg sw-msg--err">Erro ao carregar: {err}</div>}
      {rows === null && !err && <Spinner label="carregando produtos…" />}

      {rows && !term && rows.length === 0 && (
        <EmptyState title="Nenhum produto editado">Busca um produto pelo nome ou id e começa por ele.</EmptyState>
      )}

      {filtered.map((p) => (
        <Row key={p.id} p={p} onOpen={onOpen} />
      ))}

      {term && (searching || catalogOnly.length > 0) && (
        <div style={{ margin: '26px 0 12px' }}>
          <div className="sw-h3" style={{ margin: 0 }}>Conteúdo não cadastrado</div>
        </div>
      )}
      {term && searching && <Spinner label="buscando no catálogo…" />}
      {!searching && catalogOnly.map((p) => <Row key={p.id} p={p} onOpen={onOpen} ghost />)}

      {nothing && <EmptyState title="Nada encontrado">Nenhum produto com esse nome ou id.</EmptyState>}
    </div>
  )
}
