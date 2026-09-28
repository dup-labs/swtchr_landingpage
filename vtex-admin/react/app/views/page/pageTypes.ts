import type { PageType } from '../../api/types'

/**
 * Configuração por tipo de página do PageEditor: textos e ZONAS.
 *
 * Zonas são só visuais: o array salvo continua sendo UMA lista ordenada. Uma section "âncora"
 * (a primeira com `anchorKey`) divide a lista em:
 *
 *   [ zona before: sections 0 … a-1 ]  [ âncora ]  [ zona after: sections a+1 … n-1 ]
 *
 * Mover (↑/↓ e arrastar) fica dentro da zona; "Adicionar bloco aqui" insere dentro da zona.
 * Outras nativas (CartSidebar, RegionModal…) continuam no lugar, travadas, dentro da zona onde caírem.
 * Sem âncora na página → lista única + aviso (`missing`).
 */

export interface ZoneSpec {
  /** rótulo da zona (ex.: "Antes dos produtos") */
  title: string
  help?: string
  /** mostra "Adicionar bloco aqui" nesta zona */
  addable: boolean
  /** keys permitidas no picker desta zona (default: ALLOWED_SECTIONS do tipo) */
  allowed?: string[]
  /** texto quando a zona está vazia (default genérico) */
  emptyText?: string
}

export interface ZoneConfig {
  /** $componentKey da section que divide as zonas (ex.: "ProductGallery", "SwtchrProductHero") */
  anchorKey: string
  /**
   * 'locked' = nativa travada, só um divisor (ProductGallery na PLP).
   * 'pinned' = fixa (não move/exclui) mas com campos editáveis (SwtchrProductHero na PDP).
   */
  anchorMode: 'locked' | 'pinned'
  /** título exibido no card da âncora (default: título da section) */
  anchorTitle?: string
  /** texto pequeno no card da âncora */
  anchorMeta?: string
  before: ZoneSpec
  after: ZoneSpec
  /** página sem a âncora */
  missing: {
    message: string
    /**
     * Se definido, mostra um botão que cria a âncora (só funciona pra section swtchr presente no schema).
     * Ela entra depois das nativas iniciais (CartSidebar etc.), antes de qualquer bloco.
     */
    addLabel?: string
  }
}

export interface PageTypeConfig {
  /** nome curto (título padrão da DraftBar) */
  label: string
  /** "a home", "a página de produto"… (usado nas frases) */
  the: string
  /** "da home", "da página de produto"… */
  of: string
  /** undefined = lista única, sem zonas */
  zones?: ZoneConfig
}

const LISTING_ZONES: ZoneConfig = {
  anchorKey: 'ProductGallery',
  anchorMode: 'locked',
  anchorTitle: 'Produtos (listagem nativa com filtros)',
  anchorMeta: 'grade de produtos, filtros e ordenação da FastStore',
  before: {
    title: 'Antes dos produtos',
    help: 'banner, texto de abertura, atalhos',
    addable: true,
    emptyText: 'Nenhum bloco antes da listagem.',
  },
  after: {
    title: 'Depois dos produtos',
    help: 'vitrines, texto de SEO, chamadas',
    addable: true,
    emptyText: 'Nenhum bloco depois da listagem.',
  },
  missing: {
    message:
      'Esta página não tem a listagem nativa de produtos (ProductGallery). Os blocos aparecem numa lista única — ' +
      'a loja pode ficar sem grade de produtos nesta página.',
  },
}

export const PAGE_TYPES: Record<PageType, PageTypeConfig> = {
  home: { label: 'Home', the: 'a home', of: 'da home' },
  landingPage: { label: 'Página', the: 'a página', of: 'da página' },
  plp: { label: 'Categoria', the: 'a página de categoria', of: 'da página de categoria', zones: LISTING_ZONES },
  search: { label: 'Busca', the: 'a página de busca', of: 'da página de busca', zones: LISTING_ZONES },
  pdp: {
    label: 'Produto',
    the: 'a página de produto',
    of: 'da página de produto',
    zones: {
      anchorKey: 'SwtchrProductHero',
      anchorMode: 'pinned',
      before: {
        title: 'Topo do produto',
        help: 'galeria, preço, compra — sempre no topo',
        addable: false,
      },
      after: {
        title: 'Descrição e blocos',
        help: 'o que aparece abaixo do produto',
        addable: true,
        emptyText: 'Nenhum bloco abaixo do produto ainda.',
      },
      missing: {
        message: 'Esta página de produto não tem o topo do produto (galeria, preço e botão de compra).',
        addLabel: 'Adicionar topo do produto',
      },
    },
  },
  globalSections: { label: 'Seções globais', the: 'as seções globais', of: 'das seções globais' },
}

export function pageTypeConfig(type: PageType): PageTypeConfig {
  return PAGE_TYPES[type] || { label: type, the: 'a página', of: 'da página' }
}
