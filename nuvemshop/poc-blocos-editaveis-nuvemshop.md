# POC — Blocos Editáveis via Metafield + Tema (Nuvemshop) · v2.2

> **v2 — 2026-07-07.** Substitui integralmente o desenho v1 (script tag + fetch no front),
> que foi descartado por dois motivos: (a) não era o modelo desejado — conteúdo deve chegar
> **server-side, já no HTML**; (b) a Nuvemshop está desligando scripts legados a partir de
> 30/10/2026 e forçando migração pro NubeSDK (sandbox sem DOM, só tema Patagonia).
> Toda a base de pesquisa com fontes oficiais está em `poc-plano-e-descobertas.md`.
>
> **v2.1 — correções do Dup:** (1) o painel é **app embedado no admin da Nuvemshop**
> (Nexo + Nimbus), não standalone; (2) premissa de produto: funciona com **tema
> preparado pela dup.agency** — app + tema andam juntos, não é "qualquer tema";
> (3) **BR somente** por enquanto.
>
> **v2.2 — decisão do Dup:** (1) home na POC viabiliza com o **porta-dados** (produto
> oculto); (2) o tema da agência será **fork do Ipanema** (geração seccionável);
> (3) o caminho definitivo da home (v1) é **theme settings via a API nova de temas**
> — o mesmo canal onde a Nuvemshop salva a home nativa — aposentando o porta-dados
> quando a API amadurecer, sem refazer o app (muda só o destino da gravação).
>
> **v2.3 — pesquisa fechada (Ipanema + Nexo):** Ipanema **confirmado na conta** (reunião
> com parcerias) → go/no-go de disponibilidade resolvido; falta só o teste empírico de
> metafield em section do Ipanema (não documentado). Painel embedado = **fork do template
> React nativo + Nexo (obrigatório) + Nimbus (recomendado)**; auth por session-token JWT
> somado ao access_token OAuth; dev local via Developer Mode (o contato de parcerias
> habilita). Detalhes em §4.7 e §4.8 do plano.

---

## Contexto

Somos a **dup.agency**, boutique de dev sênior especializada em VTEX IO, Nuvemshop e
Shopify. Já operamos o **SWTCHR**, sistema proprietário de orquestração de blocos pra
VTEX IO. Esta POC aplica o mesmo racional à Nuvemshop: **blocos reutilizáveis, editáveis
pelo cliente via formulário — não via JSON cru em metafield**, que é a solução capenga
que agências concorrentes entregam hoje.

---

## O modelo (uma frase)

App **embedado no admin da Nuvemshop** (Nexo + Nimbus) escreve conteúdo estruturado em
**metafields** via Admin API; o **nosso tema (Twig)** lê esses metafields **server-side**
e renderiza o bloco já no HTML servido — zero JavaScript de injeção, zero fetch no front,
SEO real, sem flash.

Premissas de produto: **app + tema preparado andam juntos** (os snipplets que leem os
campos fazem parte do tema da dup.agency — mesmo racional do SWTCHR na VTEX),
**o tema é fork do Ipanema** (geração seccionável — destrava o workflow moderno de
fork/push via CLI/API e alinha com o norte da v1) e **BR somente** por enquanto
(`api.nuvemshop.com.br`, conteúdo `pt`).

Este é um padrão sancionado pela plataforma: o base-theme oficial lê
`product.metafields.related_products.related_products_ids` (metafield escrito por app)
pra renderizar produtos relacionados server-side.

```
┌─────────────┐   salva    ┌──────────────┐  Admin API   ┌────────────────┐
│ Painel admin │ ─────────▶ │ Backend Node │ ───────────▶ │ Metafields da  │
│ (formulário) │            │ (roteia por  │  (upsert)    │ loja Nuvemshop │
└─────────────┘            │  destino)    │              └───────┬────────┘
                           └──────────────┘                      │ leitura Twig
                                                                 ▼ (server-side)
                                                        ┌────────────────┐
                                                        │ Tema renderiza │
                                                        │ bloco no HTML  │
                                                        └────────────────┘
```

---

## Objetivo da POC

Provar o ciclo completo **edição → publicação → HTML atualizado** nos **5 destinos**:

| # | Destino | Seleção no painel |
|---|---|---|
| 1 | Home | — (única) |
| 2 | Categoria | qual categoria |
| 3 | Produto | qual produto |
| 4 | Institucional | qual página |
| 5 | Landing page | qual landing page |

Componente da POC: **imagem + texto** (bloco mínimo; Hero completo e biblioteca de
blocos vêm depois).

> **Requisito do Dup (importante):** o campo de imagem tem que ser um **file uploader que
> hospeda a imagem NA loja do cliente** (Nuvemshop), não um campo de URL externa — faz
> parte da POC provar que existe onde guardar o asset dentro da loja. **Spike de pesquisa
> pendente:** qual o mecanismo nativo de hospedagem de imagem via API (upload de imagem de
> produto retorna URL de CDN? há endpoint de assets genérico? `static/` do tema?). Definir
> antes de construir o painel (Fase 2). Link externo só não resolve.

Resultado esperado: vídeo/demo curto do fluxo completo pra usar como material de venda.

---

## Mecânica por destino

| Destino | Recurso de gravação | Leitura no tema | Status |
|---|---|---|---|
| Produto | metafield `owner_resource` produto, `owner_id = product_id` | `product.metafields.swtchr.*` em `product.tpl` | **Documentado e provado** (base-theme oficial) |
| Categoria | metafield categoria, `owner_id = category_id` | `category.metafields.swtchr.*` em `category.tpl` | Gravação confirmada; leitura no template **não documentada — validar** |
| Institucional | metafield página, `owner_id = page_id` | `page.metafields.swtchr.*` em `page.tpl` | Idem categoria |
| Landing page | **mesmo recurso** de institucional (`pages` — Nuvemshop não tem entidade separada de landing) | idem | Idem; bonus: `POST /pages` existe → dá pra criar a landing via API |
| Home | metafield num **produto porta-dados oculto** (não existe `owner_resource: store`) | `home.tpl`: `{% set holder = ['ID'] \| get_products \| first %}` → `holder.metafields.swtchr.*` | `get_products` provado; comportamento com produto oculto — **validar** |

**Fallback universal**: se `category.metafields`/`page.metafields` não renderizarem no
template, todo destino pode ler de produto porta-dados via `| get_products` (mecanismo
da home) — menos elegante, 100% dentro do padrão provado.

---

## Decisões de design (fundamentadas na pesquisa)

1. **Metafields flat, um por campo** — namespace `swtchr`, chaves `block_image` e
   `block_text`. Nada de JSON no value: não existe filtro documentado de parse de JSON
   no Twig da Nuvemshop, e value flat é legível direto no template.
2. **Namespace `swtchr`** em tudo — é o nosso canal app↔tema.
3. **Upsert find-then-write**: não existe "PUT por chave". Fluxo:
   `GET /metafields/{owner_resource}?owner_id={id}&namespace=swtchr` → se a chave existe,
   `PUT /metafields/{id}` (só value/description são atualizáveis); senão `POST /metafields`.
4. **Casing da API**: escrita usa singular capitalizado (`"owner_resource": "Product"`),
   leitura usa plural minúsculo no path (`GET /metafields/products`). Mapeamento
   encapsulado num módulo só.
5. **Headers**: mandar `Authentication: bearer TOKEN` **e** `Authorization: Bearer TOKEN`
   (pegadinha histórica da API) + `User-Agent` obrigatório (400 sem ele).
6. **Rate limit**: leaky bucket 2 req/s burst 40 — irrelevante pra POC, mas o cliente
   HTTP já respeita 429 com retry simples.
7. **Porta-dados da home**: produto criado pelo backend no primeiro save
   (`[SWTCHR] Home Data`, oculto do catálogo), ID salvo em config local e informado
   pra colar no `home.tpl`. Uma vez só. **Workaround assumido** — existe porque
   metafield exige um dono (entidade) e a home não é entidade; invisível pro cliente,
   que só edita "Home" no app. Como o tema é nosso, o ID pode virar setting do tema
   pra ficar limpo.
8. **Sem banco próprio**: conteúdo mora 100% na Nuvemshop. Nosso backend só guarda
   token OAuth + ID do porta-dados (arquivo local na POC).
9. **Backend zero-deps** (Node ≥ 18, sem npm install): roda local com `node server.mjs`
   na porta 8787 (bate com a Redirect URL do app) e é estruturado pra virar Vercel
   Functions depois sem retrabalho.

---

## Escopo

### Dentro
1. 1 bloco (imagem + texto), schema fixo validado no backend
2. Backend: OAuth callback (code→token automático), listagem de
   produtos/categorias/páginas pro seletor, leitura e upsert de metafields com
   roteamento por destino, criação do porta-dados da home
3. Painel = **app embedado no admin** (fork do template React oficial + Nexo + Nimbus):
   dropdown dos 5 destinos → seleção do registro → formulário imagem/texto → salvar →
   feedback. Auth: session token JWT do Nexo (assinado com Client Secret) → backend
   verifica, lê storeId, usa o access_token OAuth daquela loja. Dev local via Developer
   Mode + "Testar App" (localhost, sem ngrok). Ver §4.8 do plano.
4. Snipplets Twig + edições mínimas em `home.tpl`, `product.tpl`, `category.tpl`,
   `page.tpl` da loja demo (via FTP do admin ou CLI `@tiendanube/cli theme ftp watch`)
5. Validação empírica ordenada (ver abaixo) + atualização da spec com os resultados

### Fora (não fazer agora)
- Homologação na App Store / NubeSDK
- Biblioteca de blocos, múltiplos blocos por página, ordenação
- Preview em tempo real, multi-idioma (metafield value é string única — i18n fica pra v1;
  BR-only por enquanto de qualquer jeito)
- Suporte a temas de terceiros (premissa: tema preparado da dup.agency)
- Onboarding de cliente real

---

## Ordem de validação empírica (do documentado pro incerto)

> **Estratégia (pós-pesquisa rodada 2): Ipanema confirmado na conta da agência**
> (reunião com parcerias Nuvemshop). O metafield no template do Ipanema ainda é NÃO
> documentado (a doc aponta apps genéricos pro NubeSDK client-side — mas nós somos autores
> do tema, caso diferente), então o item zero roda **direto no fork do Ipanema**. Clássico
> vira só rede de segurança. Dúvidas não documentadas → contato de parcerias, em paralelo.

0. **`product.metafields` renderiza server-side num fork do Ipanema** — pré-condição de
   tudo, go/no-go da tese. Rede de segurança: clássico (documentado) se não renderizar.
1. **Produto** — caminho 100% documentado no clássico; se falhar com o item 0 OK, o
   problema é nosso (token, escopo, namespace), não da plataforma
2. **Categoria** e **Página** — `*.metafields` no template é o risco real da POC;
   testar logo após produto funcionar
3. **Home** — porta-dados via `get_products`; validar se produto oculto é hidratado
   pelo filtro (se não for: produto publicado sem categoria/estoque, invisível na prática)
4. **Limites** — tamanho máximo do value (não documentado; testar 1KB/10KB/100KB)
5. Registrar cada resultado neste arquivo (seção "Resultados", criar ao validar)

---

## Stack e estrutura

- Backend: Node.js zero-deps (`server.mjs`), deployável como Vercel Functions depois
- Painel: HTML + vanilla JS servido pelo próprio backend
- Tema: snipplets Twig no tema da loja demo
- Storage: Nuvemshop (conteúdo) + `.data/` local (token, config) — fora do git

```
nuvemshop/
├── poc-blocos-editaveis-nuvemshop.md   # esta spec
├── poc-plano-e-descobertas.md          # pesquisa consolidada com fontes
├── server.mjs                          # servidor + rotas da API
├── lib/
│   ├── nuvemshop.mjs                   # cliente Admin API (auth, retry, casing)
│   └── blocks.mjs                      # schema do bloco + upsert por destino
├── public/
│   └── index.html                      # painel admin (visual SWTCHR)
├── theme/
│   ├── snipplets/swtchr-block.tpl      # o bloco em Twig
│   └── INSTALL.md                      # o que colar em cada template
├── .env.example
└── .data/                              # token.json, config.json (gitignored)
```

---

## Pré-requisitos (humano) — ver checklist detalhado na seção 5 do plano

Partner account → loja demo → app "Para seus clientes" com escopos
`write_products` + `write_content` (+ `write_scripts` por opcionalidade) →
Redirect URL `http://localhost:8787/auth/callback` → `app_id`/`client_secret` no `.env`.
**Não instalar o app antes do backend estar rodando** (code expira em 5 min).

---

## Norte da v1 (registrado, não é POC)

- **Home sem porta-dados**: backend grava conteúdo direto nos **theme settings**
  (`config/settings_data.json`) — o canal nativo do Personalizar. **Correção da pesquisa:
  não existe REST API pública de temas**; o caminho é a **CLI** (`@tiendanube/cli`,
  scriptável via `--token` = Base64 por loja que codifica store_id + access_token).
  Backend faria isso via CLI, não via REST suportada. Pré-requisitos: Ipanema fora do
  rollout / acesso confirmado, e prova de que push de `settings_data.json` atualiza
  publicado sem conflitar com o Personalizar (mesmo arquivo → risco last-writer-wins).
- **Bloco como section nativa do Ipanema**: o bloco vira section com `{% schema %}`,
  e o app escreve os valores da section — edição pelo nosso app E pelo Personalizar
  convivendo.
- Migração porta-dados → settings não toca o app nem o formulário: muda só o destino
  da gravação no backend.

## Critério de sucesso

Editar imagem/texto no painel, escolhendo cada um dos **5 destinos** → salvar →
recarregar o storefront → conteúdo atualizado **já no HTML servido** — view-source
mostra o conteúdo, provando server-side — sem tocar em código ou JSON.

Se categoria/página não lerem metafield direto no template, documentar e ativar o
fallback do porta-dados — isso também é validação; muda o desenho da v1, não a tese.
