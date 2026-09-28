/**
 * Validação leve dos dados de uma section contra o schema do CMS.
 * Vazio é sempre válido (exceto `required`): o CMS aceita campos em branco e as sections têm fallback.
 * Retorna { "cards.0.url": "mensagem" } — mesmo formato de caminho que o SchemaForm usa.
 */
import { FieldSchema } from '../api/types'
import { joinPath } from './hints'
import { colorAllowsTokens, enumOptions, isColorField, isDict, isMediaString, THEME_TOKENS } from './schema'

export type ValidationErrors = Record<string, string>

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isHex(v: string): boolean {
  return HEX_RE.test(v.trim())
}

/** Link aceito: caminho interno, âncora, URL completa, mailto/tel. */
export function isValidUrl(v: string): boolean {
  const s = v.trim()
  if (/\s/.test(s)) return false
  if (/^\/(?!\/)/.test(s) || s === '/' || /^#/.test(s) || /^\?/.test(s)) return true
  if (/^(mailto|tel):.+/i.test(s)) return true
  return /^https?:\/\/[^/.]+\.[^/]+/i.test(s) || /^https?:\/\/localhost/i.test(s)
}

/** Campo com cara de link (url, href, link, *Url) — exceto mídia. */
export function isUrlField(s: FieldSchema, key: string): boolean {
  if (s.type !== 'string' || s.enum || isMediaString(s)) return false
  return /^(url|href)$/i.test(key) || /Url$/.test(key)
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
}

export function validateField(schema: FieldSchema, key: string, path: string, value: unknown): string | null {
  if (isEmpty(value)) return null
  const t = schema.type
  if (t === 'string') {
    if (typeof value !== 'string') return 'Esperava texto.'
    if (schema.enum && schema.enum.length) {
      const ok = enumOptions(schema).some((o) => o.value === value)
      return ok ? null : 'Opção inválida: "' + value + '".'
    }
    if (isColorField(schema, key, path)) {
      if (isHex(value)) return null
      if (colorAllowsTokens(schema, path) && THEME_TOKENS.indexOf(value.trim()) !== -1) return null
      return colorAllowsTokens(schema, path)
        ? 'Use um hex (#AD61C2) ou um token: ' + THEME_TOKENS.join(', ') + '.'
        : 'Use um hex válido, ex: #AD61C2.'
    }
    if (isUrlField(schema, key) && !isValidUrl(value)) {
      return 'Link inválido. Use um caminho (/casacos) ou URL completa (https://…).'
    }
    return null
  }
  if (t === 'integer' || t === 'number') {
    const n = typeof value === 'number' ? value : Number(value)
    if (typeof value === 'boolean' || isNaN(n)) return 'Esperava um número.'
    if (t === 'integer' && Math.floor(n) !== n) return 'Use um número inteiro.'
    if (schema.minimum !== undefined && n < schema.minimum) return 'Mínimo: ' + schema.minimum + '.'
    if (schema.maximum !== undefined && n > schema.maximum) return 'Máximo: ' + schema.maximum + '.'
    return null
  }
  if (t === 'boolean') return typeof value === 'boolean' ? null : 'Esperava ligado/desligado.'
  return null
}

interface ArrayLimits {
  minItems?: number
  maxItems?: number
}

/** Valida recursivamente. `path` = prefixo (vazio na raiz da section). */
export function validate(schema: FieldSchema, value: unknown, path = ''): ValidationErrors {
  const errors: ValidationErrors = {}
  walk(schema, path ? path.split('.').pop() || '' : '', path, value, errors)
  return errors
}

function walk(schema: FieldSchema, key: string, path: string, value: unknown, errors: ValidationErrors) {
  if (schema.type === 'object') {
    const props = schema.properties || {}
    const obj = isDict(value) ? value : {}
    const required = schema.required || []
    Object.keys(props).forEach((k) => {
      const p = joinPath(path, k)
      if (required.indexOf(k) !== -1 && isEmpty(obj[k])) errors[p] = 'Obrigatório.'
      else walk(props[k], k, p, obj[k], errors)
    })
    return
  }
  if (schema.type === 'array') {
    const arr = Array.isArray(value) ? value : []
    const lim = schema as FieldSchema & ArrayLimits
    if (lim.minItems !== undefined && arr.length < lim.minItems) errors[path] = 'Mínimo de ' + lim.minItems + ' itens.'
    else if (lim.maxItems !== undefined && arr.length > lim.maxItems) errors[path] = 'Máximo de ' + lim.maxItems + ' itens.'
    const item = schema.items
    if (item) arr.forEach((it, i) => walk(item, key, joinPath(path, i), it, errors))
    return
  }
  const err = validateField(schema, key, path, value)
  if (err) errors[path] = err
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0
}
