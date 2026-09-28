import React from 'react'

import { cx } from '../components/cx'

export type TabKey = 'home' | 'busca' | 'produtos' | 'institucional' | 'tema'

export interface SidebarSection {
  key: TabKey
  label: string
  /** abreviação mostrada na trilha do modo foco */
  short: string
  ready: boolean
}

export const SECTIONS: SidebarSection[] = [
  { key: 'home', label: 'Home', short: 'H', ready: true },
  { key: 'busca', label: 'Busca & Categorias', short: 'B', ready: true },
  { key: 'produtos', label: 'Produtos', short: 'P', ready: true },
  { key: 'institucional', label: 'Institucional', short: 'I', ready: true },
  { key: 'tema', label: 'Tema', short: 'T', ready: true },
]

export interface SidebarProps {
  current: TabKey
  onChange: (key: TabKey) => void
  /** modo foco: trilha estreita com os itens abreviados em pílula (tooltip = nome) */
  compact?: boolean
}

export default function Sidebar({ current, onChange, compact }: SidebarProps) {
  return (
    <aside
      className={cx('sw-sidebar anim-up', compact && 'sw-sidebar--compact')}
      style={{ '--delay': '0.07s' } as React.CSSProperties}
    >
      {SECTIONS.map((s) => {
        const active = current === s.key
        const tip = compact ? s.label + (s.ready ? '' : ' (em breve)') : undefined
        return (
          <button
            key={s.key}
            type="button"
            data-testid={'nav-' + s.key}
            className={cx(
              'sw-sidebar__item',
              active && 'sw-sidebar__item--active',
              !s.ready && 'sw-sidebar__item--soon'
            )}
            title={tip}
            aria-label={tip}
            onClick={() => onChange(s.key)}
          >
            <span className="sw-sidebar__mini" aria-hidden="true">
              {s.short}
            </span>
            <span className="sw-sidebar__label">{s.label}</span>
            {s.ready ? (
              <span className="sw-sidebar__chevron">›</span>
            ) : (
              <span className="sw-badge sw-badge--soon">em breve</span>
            )}
          </button>
        )
      })}
    </aside>
  )
}
