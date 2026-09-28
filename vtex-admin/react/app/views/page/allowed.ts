import type { ComponentDef, PageType } from '../../api/types'

/**
 * Sections swtchr que cada tipo de página aceita no "Adicionar bloco".
 * Theme/Header/Footer são globais (globalSections); ProductHero é a âncora fixa da PDP
 * (não entra no picker). Keys que ainda não existem no schema do CMS simplesmente não aparecem.
 * Ajuste aqui quando nascer section nova.
 */
const HOME_LIKE = [
  'SwtchrHero',
  'SwtchrBannerCarousel',
  'SwtchrMarquee',
  'SwtchrFeatureList',
  'SwtchrBento',
  'SwtchrCategoryCards',
  'SwtchrEditorial',
  'SwtchrNewsletter',
  'SwtchrCta',
  'SwtchrProductShelf',
  'SwtchrReviews',
  'SwtchrGallery',
  'SwtchrTeam',
  'SwtchrHeroEditorial',
  'SwtchrFullBleed',
  'SwtchrSeoText',
]

const LISTING = [
  'SwtchrCollectionHero',
  'SwtchrBannerCarousel',
  'SwtchrEditorial',
  'SwtchrFeatureList',
  'SwtchrCategoryCards',
  'SwtchrProductShelf',
  'SwtchrSeoText',
  'SwtchrMarquee',
  'SwtchrCta',
]

/** PDP: vale para a zona "Descrição e blocos" (o topo é a SwtchrProductHero fixa). */
const PRODUCT = [
  'SwtchrFullBleed',
  'SwtchrEditorial',
  'SwtchrProductSpecs',
  'SwtchrReviews',
  'SwtchrProductShelf',
  'SwtchrFeatureList',
  'SwtchrGallery',
  'SwtchrSeoText',
  'SwtchrBannerCarousel',
  'SwtchrCta',
  'SwtchrMarquee',
]

export const ALLOWED_SECTIONS: Partial<Record<PageType, string[]>> = {
  home: HOME_LIKE,
  landingPage: HOME_LIKE,
  plp: LISTING,
  search: LISTING,
  pdp: PRODUCT,
}

/**
 * Filtra os components do schema pela lista de keys (mantém a ordem da lista).
 * Sem lista → todas as sections swtchr.
 */
export function filterByKeys(components: ComponentDef[], keys?: string[]): ComponentDef[] {
  const swtchr = components.filter((c) => c.swtchr)
  if (!keys) return swtchr
  const out: ComponentDef[] = []
  keys.forEach((k) => {
    const def = swtchr.find((c) => c.key === k)
    if (def) out.push(def)
  })
  return out
}

/** Filtra os components do schema pelo que o tipo de página permite (mantém a ordem da lista acima). */
export function allowedComponents(components: ComponentDef[], type: PageType): ComponentDef[] {
  return filterByKeys(components, ALLOWED_SECTIONS[type])
}
