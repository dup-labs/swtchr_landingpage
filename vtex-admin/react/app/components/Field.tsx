import React from 'react'

import { cx } from './cx'

export interface FieldProps {
  label?: React.ReactNode
  /** texto de ajuda (abaixo do label) */
  help?: React.ReactNode
  /** mensagem de erro (abaixo do controle) */
  error?: React.ReactNode
  /** id do controle, liga o <label htmlFor> */
  htmlFor?: string
  /** ocupa a linha inteira dentro de .sw-fields */
  full?: boolean
  /** alinha toggles com inputs dentro de .sw-fields */
  toggle?: boolean
  className?: string
  children?: React.ReactNode
}

/** Label caps + ajuda + controle + erro. Use dentro de <div className="sw-fields"> pra grid fluido. */
export function Field({ label, help, error, htmlFor, full, toggle, className, children }: FieldProps) {
  return (
    <div className={cx('sw-field', full && 'sw-field--full', toggle && 'sw-field--toggle', className)}>
      {label ? (
        <label className="sw-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {help ? <div className="sw-field__help">{help}</div> : null}
      {children}
      {error ? <div className="sw-field__err">{error}</div> : null}
    </div>
  )
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number
  /** recebe o valor em string */
  onChange?: (value: string, e: React.ChangeEvent<HTMLInputElement>) => void
  /** formato pill (busca) */
  pill?: boolean
  invalid?: boolean
}

export function Input({ value, onChange, pill, invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={cx('sw-input', pill && 'sw-input--pill', invalid && 'sw-input--err', className)}
      value={value === undefined || value === null ? '' : value}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      {...rest}
    />
  )
}

export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value?: string
  onChange?: (value: string, e: React.ChangeEvent<HTMLTextAreaElement>) => void
  invalid?: boolean
}

export function TextArea({ value, onChange, invalid, className, rows, ...rest }: TextAreaProps) {
  return (
    <textarea
      className={cx('sw-input', invalid && 'sw-input--err', className)}
      value={value || ''}
      rows={rows || 3}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      {...rest}
    />
  )
}

export interface SelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value?: string
  onChange?: (value: string, e: React.ChangeEvent<HTMLSelectElement>) => void
  /** opções (alternativa a passar <option> como children) */
  options?: SelectOption[]
  /** primeira opção vazia (value "") */
  placeholder?: string
  invalid?: boolean
}

/** <select> estilizado (seta própria, appearance none). */
export function Select({ value, onChange, options, placeholder, invalid, className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cx('sw-select', invalid && 'sw-select--err', className)}
      value={value === undefined || value === null ? '' : value}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      {...rest}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  )
}
