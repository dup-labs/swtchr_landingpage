/**
 * Conversão entre o formato do Content Platform e o formato plano do painel.
 *
 * CP:    arrays viram { values: { <id>: { ...item, id, $position } }, $fnType: 'array' }
 *        itens primitivos viram { value, id, $position }
 * Painel: arrays JS normais, sem id/$position/$fnType.
 *
 * Sections: cada item de data.sections vira um PageSection { uid, key, title, native, data }.
 * Nativas (key não começa com "Swtchr") são devolvidas para exibição, mas no save o objeto
 * original do CMS é reaproveitado por uid (o painel só reordena).
 */

import type { PageSection } from './types'

type Obj = Record<string, unknown>

export const SWTCHR_PREFIX = 'Swtchr'

export const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

export const isSwtchrKey = (key: string) => key.startsWith(SWTCHR_PREFIX)

interface CpArray {
  values: Record<string, Obj>
  $fnType: 'array'
}

export const isCpArray = (v: unknown): v is CpArray =>
  isObj(v) && v.$fnType === 'array' && (v.values === undefined || isObj(v.values))

/** Itens de um array CP em ordem de $position (desempate: id). */
export function cpArrayItems(arr: CpArray): Obj[] {
  const items = Object.entries(arr.values ?? {}).filter(([, v]) => isObj(v)) as Array<[string, Obj]>
  items.sort(([ka, a], [kb, b]) => {
    const pa = typeof a.$position === 'number' ? a.$position : Number.MAX_SAFE_INTEGER
    const pb = typeof b.$position === 'number' ? b.$position : Number.MAX_SAFE_INTEGER
    return pa - pb || String(ka).localeCompare(String(kb))
  })
  return items.map(([, v]) => v)
}

/** CP → plano (recursivo). */
export function fromCP(value: unknown): unknown {
  if (isCpArray(value)) {
    return cpArrayItems(value).map((item) => {
      const { id: _id, $position: _pos, ...rest } = item
      const keys = Object.keys(rest)
      if (keys.length === 1 && keys[0] === 'value') return fromCP(rest.value)
      return fromCP(rest)
    })
  }
  if (Array.isArray(value)) return value.map(fromCP)
  if (isObj(value)) {
    const out: Obj = {}
    for (const [k, v] of Object.entries(value)) out[k] = fromCP(v)
    return out
  }
  return value
}

/** Gerador de ids numéricos únicos (mesmo padrão do CMS: inteiro crescente baseado em ms). */
export function makeIdGen(start = Date.now()) {
  let seq = start
  const used = new Set<number>()
  const gen = (): number => {
    while (used.has(seq)) seq++
    used.add(seq)
    return seq++
  }
  gen.reserve = (id: number) => {
    used.add(id)
  }
  return gen
}

export type IdGen = ReturnType<typeof makeIdGen>

/** plano → CP (recursivo). */
export function toCP(value: unknown, nextId: IdGen): unknown {
  if (Array.isArray(value)) {
    const values: Record<string, Obj> = {}
    value.forEach((item, i) => {
      const id = nextId()
      values[String(id)] = isObj(item)
        ? { ...(toCP(item, nextId) as Obj), id, $position: i }
        : { value: toCP(item, nextId), id, $position: i }
    })
    return { values, $fnType: 'array' }
  }
  if (isObj(value)) {
    const out: Obj = {}
    for (const [k, v] of Object.entries(value)) {
      // Já está no formato CP (ex.: veio intacto) → mantém.
      out[k] = isCpArray(v) ? v : toCP(v, nextId)
    }
    return out
  }
  return value
}

/** Campos de nível de página que nunca voltam num commit. */
const DROP_FIELDS = ['sections', 'locale_metadata']

/** data do CP → { fields, sections } normalizados. */
export function normalizePageData(data: unknown): { fields: Obj; sections: PageSection[] } {
  const d = isObj(data) ? data : {}
  const fields: Obj = {}
  for (const [k, v] of Object.entries(d)) {
    if (DROP_FIELDS.includes(k)) continue
    fields[k] = fromCP(v)
  }

  const sections: PageSection[] = isCpArray(d.sections)
    ? cpArrayItems(d.sections).map((raw, i) => {
        const { id, $position: _pos, $componentKey, $componentTitle, ...rest } = raw
        const key = typeof $componentKey === 'string' ? $componentKey : typeof rest.name === 'string' ? rest.name : ''
        return {
          uid: id !== undefined && id !== null ? String(id) : `pos-${i}`,
          key,
          title: typeof $componentTitle === 'string' ? $componentTitle : undefined,
          native: !isSwtchrKey(key),
          data: fromCP(rest) as Obj,
        }
      })
    : []

  return { fields, sections }
}

/** Mapa uid → objeto CP bruto das sections atuais (p/ preservar nativas). */
export function rawSectionsByUid(data: unknown): Map<string, Obj> {
  const out = new Map<string, Obj>()
  const d = isObj(data) ? data : {}
  if (!isCpArray(d.sections)) return out
  cpArrayItems(d.sections).forEach((raw, i) => {
    const uid = raw.id !== undefined && raw.id !== null ? String(raw.id) : `pos-${i}`
    out.set(uid, raw)
  })
  return out
}

export interface BuildPageOptions {
  /** data atual no CMS (rascunho ou main) — base para preservar campos e nativas */
  currentData: unknown
  fields: Obj
  sections: PageSection[]
  /** título padrão por componentKey (do schema) */
  titleOf?: (key: string) => string | undefined
}

/**
 * Monta o `data` do commit.
 * - campos: os atuais do CMS (preserva o que o painel não conhece) sobrescritos pelos do body
 * - sections swtchr: convertidas do formato plano
 * - sections nativas: objeto original do CMS reaproveitado por uid (só muda $position)
 */
export function buildPageData(opts: BuildPageOptions): Obj {
  const current = isObj(opts.currentData) ? opts.currentData : {}
  const raws = rawSectionsByUid(current)
  const nextId = makeIdGen()

  // Reserva ids existentes para não colidir.
  raws.forEach((raw) => {
    if (typeof raw.id === 'number') nextId.reserve(raw.id)
  })
  opts.sections.forEach((s) => {
    if (/^\d{1,16}$/.test(s.uid)) nextId.reserve(Number(s.uid))
  })

  const data: Obj = {}
  for (const [k, v] of Object.entries(current)) {
    if (!DROP_FIELDS.includes(k)) data[k] = v
  }
  for (const [k, v] of Object.entries(opts.fields ?? {})) {
    if (DROP_FIELDS.includes(k)) continue
    data[k] = toCP(v, nextId)
  }

  const values: Record<string, Obj> = {}
  const seen = new Set<number>()

  opts.sections.forEach((section, i) => {
    const raw = raws.get(section.uid)
    if (section.native && raw) {
      const id = typeof raw.id === 'number' && !seen.has(raw.id) ? raw.id : nextId()
      seen.add(id)
      values[String(id)] = { ...raw, id, $position: i }
      return
    }

    const numeric = /^\d{1,16}$/.test(section.uid) ? Number(section.uid) : NaN
    const id = Number.isSafeInteger(numeric) && !seen.has(numeric) ? numeric : nextId()
    seen.add(id)
    nextId.reserve(id)

    const { id: _i, $position: _p, $componentKey: _k, $componentTitle: _t, ...clean } = (section.data ?? {}) as Obj
    const title = section.title ?? (opts.titleOf ? opts.titleOf(section.key) : undefined) ?? section.key
    values[String(id)] = {
      ...(toCP(clean, nextId) as Obj),
      $componentKey: section.key,
      $componentTitle: title,
      id,
      $position: i,
    }
  })

  data.sections = { values, $fnType: 'array' }
  return data
}
