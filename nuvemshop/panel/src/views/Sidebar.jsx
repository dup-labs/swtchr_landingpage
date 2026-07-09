import React from 'react'

export const SECTIONS = [
  { key: 'home', label: 'Home', ready: false },
  { key: 'produto', label: 'Produto', ready: true },
  { key: 'categorias', label: 'Categorias', ready: false },
  { key: 'paginas', label: 'Páginas', ready: false },
]

export default function Sidebar({ current, onChange }) {
  return (
    <aside className="sw-sidebar">
      {SECTIONS.map((s) => {
        const active = current === s.key
        return (
          <button
            key={s.key}
            data-testid={'nav-' + s.key}
            className={'sw-sidebar__item' + (active ? ' sw-sidebar__item--active' : '')}
            onClick={() => onChange(s.key)}
          >
            <span>{s.label}</span>
            {s.ready ? <span className="sw-sidebar__chevron">›</span> : <span className="sw-badge sw-badge--soon">em breve</span>}
          </button>
        )
      })}
    </aside>
  )
}
