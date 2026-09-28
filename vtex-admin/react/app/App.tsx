import React, { useState } from 'react'

import GlobalStyles from './styles/GlobalStyles'
import { EmptyState, ToastStack, cx, useToasts } from './components'
import { ShellProvider, useShell } from './shell/ShellContext'
import Topbar from './shell/Topbar'
import Sidebar, { SECTIONS } from './shell/Sidebar'
import type { TabKey } from './shell/Sidebar'
import CategoriesView from './views/CategoriesView'
import HomeView from './views/HomeView'
import InstitutionalView from './views/InstitutionalView'
import ProductsView from './views/ProductsView'
import ThemeView from './views/ThemeView'

/** Shell do painel: topbar + sidebar + view atual (aba por useState, sem router). */
export default function App() {
  const [tab, setTab] = useState<TabKey>('home')
  const { toasts, notify, dismiss } = useToasts()

  const section = SECTIONS.find((s) => s.key === tab)

  let view: React.ReactNode
  if (tab === 'home') view = <HomeView />
  else if (tab === 'busca') view = <CategoriesView />
  else if (tab === 'produtos') view = <ProductsView />
  else if (tab === 'institucional') view = <InstitutionalView />
  else if (tab === 'tema') view = <ThemeView />
  else view = <ComingSoon label={section ? section.label : tab} />

  return (
    <ShellProvider notify={notify}>
      <GlobalStyles />
      <ShellLayout tab={tab} onTab={setTab}>
        {view}
      </ShellLayout>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ShellProvider>
  )
}

/** Topbar + grid do shell (232px | 1fr; no modo foco 76px | 1fr). */
function ShellLayout({ tab, onTab, children }: { tab: TabKey; onTab: (t: TabKey) => void; children?: React.ReactNode }) {
  const { focus } = useShell()
  return (
    <div className="sw-app">
      <Topbar />
      <div className={cx('sw-shell', focus && 'sw-shell--focus')}>
        <GuardedSidebar current={tab} onChange={onTab} />
        <main className="sw-main anim-up" style={{ '--delay': '0.14s' } as React.CSSProperties}>
          {children}
        </main>
      </div>
    </div>
  )
}

/** Sidebar que pergunta antes de sair de uma view com alterações não salvas. */
function GuardedSidebar({ current, onChange }: { current: TabKey; onChange: (t: TabKey) => void }) {
  const { dirty, setDirty, focus, setFocus } = useShell()
  const handle = (next: TabKey) => {
    if (next === current) return
    if (dirty && !window.confirm('Você tem alterações não salvas. Sair e descartar?')) return
    setDirty(false)
    setFocus(false)
    onChange(next)
  }
  return <Sidebar current={current} onChange={handle} compact={focus} />
}

function ComingSoon({ label }: { label: string }) {
  return (
    <EmptyState title={label + ' — em breve'}>
      No momento estamos alinhando novos processos e logo estarão disponíveis.
    </EmptyState>
  )
}
