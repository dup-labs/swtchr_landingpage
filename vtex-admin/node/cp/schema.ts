/**
 * Schema da store no CP → ComponentDef[] para a paleta do painel.
 *
 * GET https://api.vtexcommercestable.com.br/api/content-platform/schemas/{account}.{store}
 *   → { $id: "<account>.<store>@<versão>", components: { Key: {...} }, "content-types": {...}, $defs }
 * Sem versão na URL devolve a mais recente (o $id diz qual).
 * O documento é grande (~2,5 MB): guardamos só o resumo processado, em memória, com TTL.
 */

import { isObj, isSwtchrKey } from './format'
import type { ComponentDef, FieldSchema, PageType } from './types'

type Obj = Record<string, unknown>

/** Chaves do JSON Schema que interessam ao formulário do painel. */
const KEEP = [
  'title',
  'description',
  'type',
  'default',
  'enum',
  'enumNames',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
  'pattern',
  'properties',
  'items',
  'required',
  'widget',
]

export function cleanField(input: unknown): FieldSchema {
  if (!isObj(input)) return {}
  const out: Obj = {}
  for (const key of KEEP) {
    const v = input[key]
    if (v === undefined) continue
    if (key === 'properties' && isObj(v)) {
      const props: Obj = {}
      for (const [pk, pv] of Object.entries(v)) props[pk] = cleanField(pv)
      out.properties = props
    } else if (key === 'items') {
      out.items = cleanField(v)
    } else if (key === 'required') {
      if (Array.isArray(v) && v.length) out.required = v
    } else {
      out[key] = v
    }
  }
  return out as FieldSchema
}

export interface ContentTypeInfo {
  identifierKeys: string[]
  /** componentKeys aceitos em sections (vazio = desconhecido) */
  allowedSections: string[]
}

export interface SchemaSummary {
  schemaId: string
  components: ComponentDef[]
  contentTypes: Record<string, ContentTypeInfo>
}

export function summarizeSchema(doc: unknown): SchemaSummary {
  const d = isObj(doc) ? doc : {}
  const schemaId = typeof d.$id === 'string' ? d.$id : ''
  const comps = isObj(d.components) ? d.components : {}

  const components: ComponentDef[] = Object.entries(comps)
    .filter(([, c]) => isObj(c))
    .map(([k, c]) => {
      const comp = c as Obj
      const key = typeof comp.$componentKey === 'string' ? comp.$componentKey : k
      const schema = cleanField(comp)
      schema.type = 'object'
      delete schema.title
      delete schema.description
      return {
        key,
        title:
          (typeof comp.$componentTitle === 'string' && comp.$componentTitle) ||
          (typeof comp.title === 'string' && comp.title) ||
          key,
        description: typeof comp.description === 'string' ? comp.description : undefined,
        schema,
        swtchr: isSwtchrKey(key),
      }
    })
    .sort((a, b) => Number(b.swtchr) - Number(a.swtchr) || a.title.localeCompare(b.title))

  const contentTypes: Record<string, ContentTypeInfo> = {}
  const cts = isObj(d['content-types']) ? (d['content-types'] as Obj) : {}
  for (const [name, ct] of Object.entries(cts)) {
    if (!isObj(ct)) continue
    const props = isObj(ct.properties) ? ct.properties : {}
    const sections = isObj(props.sections) ? props.sections : {}
    const items = isObj(sections.items) ? sections.items : {}
    const anyOf = Array.isArray(items.anyOf) ? items.anyOf : []
    contentTypes[name] = {
      identifierKeys: Array.isArray(ct.identifierKeys) ? (ct.identifierKeys as string[]) : [],
      allowedSections: anyOf
        .map((x) => (isObj(x) && typeof x.$componentKey === 'string' ? x.$componentKey : ''))
        .filter(Boolean),
    }
  }

  return { schemaId, components, contentTypes }
}

export const PAGE_TYPES: PageType[] = ['home', 'plp', 'pdp', 'search', 'landingPage', 'globalSections']

export const isPageType = (v: unknown): v is PageType =>
  typeof v === 'string' && (PAGE_TYPES as string[]).includes(v)
