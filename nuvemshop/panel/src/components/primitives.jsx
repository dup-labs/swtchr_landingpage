import React from 'react'

// switch acessível (checkbox oculto + track estilizado)
export function Toggle({ checked, onChange, label, testid }) {
  return (
    <label className="sw-switch">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} data-testid={testid} />
      <span className="sw-switch__track" />
      {label && <span>{label}</span>}
    </label>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="sw-seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={'sw-seg__btn' + (value === o.value ? ' sw-seg__btn--on' : '')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Spinner({ label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 13 }}>
      <span className="sw-spinner" />
      {label}
    </span>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="sw-empty">
      {title && <div className="sw-empty__title">{title}</div>}
      <p>{children}</p>
    </div>
  )
}
