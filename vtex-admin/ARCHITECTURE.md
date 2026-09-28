# swtchr-admin (VTEX IO) — arquitetura

Painel swtchr para lojas FastStore. Edita o CMS da VTEX (Content Platform) com drag-and-drop,
formulários humanos e preview. **Não tem banco próprio**: o CMS é a fonte da verdade.

## Stack e restrições

- App VTEX IO `dupagencypartnerbr.swtchr-admin`, builders `admin` (menu Storefront → swtchr), `react` 3.x, `node` 7.x, `messages`.
- **React 16.9** (o admin roda nessa versão): hooks sim; nada de React 18 (useId, useSyncExternalStore, createRoot).
- **TypeScript 3.9 no builder react**: sem template literal types, `satisfies`, `import type` ok.
- CSS: o admin v4 roda o app em iframe → CSS global é seguro. Estilos em `react/app/styles/` como string injetada por `<GlobalStyles />` (evita depender de loaders do builder).
- Desenvolvimento no workspace `swtchr` (`vtex use swtchr && vtex link`). **Nunca** no master sem ok.

## Estrutura

```
manifest.json · admin/ (navigation, routes) · messages/
node/                         # backend: proxy autenticado pro CMS
  index.ts                    # Service + rotas
  service.json                # /_v/swtchr/health, /_v/swtchr/api/*path
  cp/                         # cliente do Content Platform + conversão de formato
  middlewares/
react/
  SwtchrAdmin.tsx             # entrada (admin/routes.json → SwtchrAdmin)
  app/
    App.tsx                   # shell: topbar + sidebar + view atual
    api/types.ts              # CONTRATO front↔back (fonte da verdade)
    api/client.ts             # fetch tipado das rotas
    styles/                   # tokens + CSS global (porte do painel Nuvemshop)
    components/               # primitivos (Button, Modal, Toggle, Segmented, Dropzone, ColorField...)
    dnd/                      # SortableList/SortableItem/DragHandle (dnd-kit)
    form/                     # SchemaForm: JSON Schema do CMS → formulário
    views/                    # Home, Tema (estilos globais), ...
```

## Rotas do backend (`/_v/swtchr/api/...`)

| Método | Rota | Faz |
|---|---|---|
| GET | `/session` | conta, workspace, usuário, store, schemaId, storeUrl |
| GET | `/schema` | sections disponíveis (swtchr + nativas) com JSON Schema |
| GET | `/pages?type=` | entradas do tipo |
| GET | `/pages/:type/:id` | página normalizada (rascunho do usuário, senão main) |
| PUT | `/pages/:type/:id` | salva no rascunho do usuário (commit na branch `swtchr-<usuario>`) |
| POST | `/pages/:type` | cria pdp/plp/landingPage no rascunho (`CreatePageBody`) |
| DELETE | `/pages/:type/:id` | exclui pelo rascunho: publicada → delete-on-merge; só no rascunho → undo |
| GET | `/catalog/categories` | árvore de categorias (catalog_system pub, cache 5 min) |
| GET | `/catalog/products?q=` | busca no catálogo (máx 20) |
| GET | `/scoped-pages?type=` | entradas com escopo (default/product/category/page) e alvo |
| GET | `/slug-check?slug=` | slug de landing: formato, conflito com categoria/página |
| GET | `/draft` | rascunho aberto do usuário |
| POST | `/draft/publish` | merge do rascunho na main (publica) + espelho das PDPs de produto no `swtchr_data` (`mirror`) |
| DELETE | `/draft` | descarta o rascunho |
| POST | `/upload` | sobe mídia (file manager) → URL pública |
| GET | `/preview-url?type=&id=` | URL de preview do rascunho na loja |
| GET | `/status` | status de publicação/build |
| GET | `/setup` | garante o campo global `swtchr_data` no catálogo → `{ dataField: { id, created } }` |
| GET | `/export` | todas as páginas do CMS (main), formato plano + URLs de mídia (`ExportBundle`) |

Formato do CMS (`{values:{id:{...,$position}}, $fnType:'array'}`) ↔ arrays planos: conversão **só no node**.
Sections nativas passam intactas (o front só pode reordenar).

## Portabilidade: swtchr_data e export

O conteúdo não fica preso ao CMS: há duas saídas.

**1. Campo `swtchr_data` no catálogo** (`node/cp/specs.ts`)

- Especificação **global de produto** (`CategoryId null`, texto multilinha `FieldTypeId 2`, grupo global `swtchr`,
  não aparece na PDP, não é filtro). Na conta dupagencypartnerbr: grupo `10`, campo `59`.
- Criado automaticamente: o `ShellContext` chama `GET /setup` uma vez depois da sessão. `ensureDataField()` sempre
  **procura antes de criar** (`listTreeByCategoryId` de uma categoria qualquer + `groupbycategory`) e cacheia o FieldId
  por conta no pod. O `listTree` é endpoint `pub` com cache de CDN: vai com `?_=<timestamp>` (sem isso o campo recém-criado
  some por minutos e o painel tentaria criar de novo — o catálogo recusa com 400 "duplicated field name", que também é tratado).
- Sem permissão no catálogo → o Topbar mostra o badge discreto "catálogo: sem permissão" (o CMS continua funcionando).
- **Ao publicar** (`POST /draft/publish`): antes do merge lê as PDPs alteradas no rascunho (versão do rascunho e da main);
  depois do merge, para cada PDP cujo `template.value` é `/<linkText>/p`, acha o `productId` (`/pub/products/search/<linkText>/p`)
  e grava `{ swtchr: 1, type: 'pdp', store, template, entryId, name, publishedAt, author, sections: [{ key, native, data }] }`
  (nativas só `key` + `native`). Entrada excluída (delete-on-merge) ou que trocou de produto → limpa o produto antigo (`Value [""]`).
  Resultado em `PublishResult.mirror` (uma linha por produto); **falha no espelho não desfaz a publicação**. JSON > 60KB → `warning`.
- Gravação: `POST /api/catalog_system/pvt/products/{id}/specification` com `[{ Value: [json], Id, Name }]` — upsert só do campo
  enviado (as outras specs do produto ficam intactas); `Value [""]` remove a associação. Leitura: `GET /api/catalog/pvt/product/{id}/specification`
  (a legada `catalog_system/pvt/products/{id}/specification` não lista o campo global recém-associado). Testado até 1MB sem erro.
- Auth: header `VtexIdclientAutCookie` com o token do usuário do admin, host `{account}.vtexcommercestable.com.br` (policy já existente).

**2. Exportar tudo** (`GET /export`, botão "Exportar tudo ↓" no Topbar)

Baixa `swtchr-export-<account>-<AAAA-MM-DD>.json`: `{ swtchr: 1, exportedAt, account, store, schemaId, pages, media }`.
`pages` = todas as entradas publicadas de todos os tipos (`globalSections`, `home`, `pdp`, `plp`, `search`, `landingPage`)
na versão da main, formato plano (`fields` + `sections: [{ key, native, data }]`, nativas com `data`), com `scope`/`target` em
pdp/plp/landingPage. `media` = URLs http(s) de mídia encontradas nos dados (únicas).

## Estética

Porte 1:1 do painel swtchr Nuvemshop (`~/dup.lab/1-products/swtchr/nuvemshop/panel/src/styles.css`,
`../DESIGN_SYSTEM.md`): Space Grotesk, ink `#0d1015`, brand `#639bfc`, sky `#c5e2fa`, surface `#f9fafc`,
cards brancos radius 20, rows `#ecf0f8` radius 14, botões pill, classes `sw-*`.
