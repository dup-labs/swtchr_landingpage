import React, { useEffect, useState } from 'react'
import { initNexo } from './nexo.js'
import Sidebar, { SECTIONS } from './views/Sidebar.jsx'
import ProductList from './views/ProductList.jsx'
import ProductEditor from './views/ProductEditor.jsx'

export default function App() {
  const [tab, setTab] = useState('produto')
  const [mode, setMode] = useState('...')

  useEffect(() => {
    initNexo(setMode)
  }, [])

  return (
    <div className="sw-app">
      <header className="sw-topbar">
        <img src="/logo-swtchr-black.svg" alt="SWTCHR by dup.agency" className="sw-topbar__logo" />
        <span className="sw-badge">
          <span className="sw-badge__dot" />
          {mode === 'embedded' ? 'no admin' : mode === 'standalone' ? 'standalone' : '…'}
        </span>
      </header>

      <div className="sw-shell">
        <Sidebar current={tab} onChange={setTab} />
        <main className="sw-main">
          {tab === 'produto' ? <ProductTab /> : <ComingSoon label={SECTIONS.find((s) => s.key === tab).label} />}
        </main>
      </div>
    </div>
  )
}

function ComingSoon({ label }) {
  return (
    <div className="sw-empty">
      <div className="sw-empty__title">{label} — em breve</div>
      <p>Este destino depende de recurso de tema seccionável (Ipanema) ainda em liberação pela Nuvemshop.</p>
    </div>
  )
}

// ---------- aba Produto ----------
function ProductTab() {
  const [product, setProduct] = useState(null) // {id, name}

  if (!product) return <ProductList onOpen={setProduct} />
  return (
    <div>
      <button onClick={() => setProduct(null)} className="sw-btn sw-btn--link" style={{ marginBottom: 14 }} data-testid="back">
        ← voltar
      </button>
      <ProductEditor product={product} />
    </div>
  )
}
