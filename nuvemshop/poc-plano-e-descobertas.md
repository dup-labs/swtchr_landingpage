# POC Blocos Editáveis Nuvemshop — Plano, Visão e Descobertas

> Documento vivo, consolidado em 2026-07-07. Reúne a visão do projeto, a correção de escopo,
> os vereditos da pesquisa (com fontes oficiais) e a lição de casa do Dup.
> Pendente: resultado de 2 agentes de pesquisa (temas/Twig e script tags). Quando fecharem,
> a spec original (`poc-blocos-editaveis-nuvemshop.md`) será reescrita por cima disso.

---

## 1. Visão do projeto

**Comercialmente, faz muito sentido.** A dor é real e conhecida: o editor nativo da
Nuvemshop é limitado, e a "solução" do mercado é cliente editando JSON cru em metafield —
frágil, feio e assustador pro lojista. Um formulário simples que publica bloco visual em
qualquer página é o pitch do SWTCHR ("sem ticket, sem dev, sem espera") aplicado a uma
plataforma com dezenas de milhares de lojas no Brasil. E a POC vira **material de venda
gravado em vídeo** — ativo comercial imediato, não promessa.

**Tecnicamente é viável** — e a pesquisa confirmou que o modelo desejado (renderização
server-side via metafield) é um padrão que a própria Nuvemshop documenta. Detalhes na seção 4.

---

## 2. Correção de escopo (modelo do Dup, substitui o desenho do Sonnet)

A doc original desenhou a renderização via **script tag + fetch no front**. Não é isso.
O modelo correto:

- **App embedado no admin da Nuvemshop** (iframe via Nexo + design system Nimbus) —
  o cliente edita de dentro do próprio painel da loja, sem login separado. Nele a
  pessoa escolhe o destino:
  1. Home
  2. Categoria → qual categoria
  3. Produto → qual produto
  4. Institucional → qual página
  5. Landing page → qual landing page
- Preenche um **formulário** (nada de JSON cru) e salva.
- O app grava **direto no metafield** da Nuvemshop via Admin API. A loja é a fonte da
  verdade — nenhum banco nosso guarda conteúdo.
- Quem lê o metafield e monta o HTML é o **tema, server-side**: a página chega pronta,
  sem flash de carregamento, com SEO de verdade. **Zero fetch no front.**
- Componente da POC: **imagem + texto** (simplificado; o Hero completo fica pra depois).
- **Premissa de produto: app + tema andam juntos.** Só funciona com **tema preparado
  pela dup.agency** (snipplets que leem os campos) — não é app "instala e funciona em
  qualquer tema". Mesmo racional do SWTCHR na VTEX: os blocos moram no tema.
  Consequência boa: o caveat "FTP aberto congela atualização de tema" perde relevância
  — o tema é nosso e a manutenção é nossa.
- **BR somente por enquanto**: base `api.nuvemshop.com.br`, conteúdo `pt`/`pt_BR`
  (os exemplos com `es_AR` na doc são só porque a Tiendanube é argentina — loja BR usa
  as mesmas estruturas com chave de idioma pt).
- **Decisão (07/07)**: home na POC viabiliza com porta-dados; **tema = fork do Ipanema**;
  norte da v1 = theme settings via API nova de temas (canal nativo da home), aposentando
  o porta-dados sem refazer o app. Risco aberto: a prova do metafield no template veio
  do tema clássico — **confirmar comportamento no Ipanema é o item zero da validação**
  (pesquisa em andamento).

Pontos de alinhamento:

- **Landing page e institucional são o mesmo recurso na API** (`pages`) — a Nuvemshop não
  tem entidade separada de "landing page". No painel viram duas opções de dropdown com
  semânticas diferentes, mas por baixo é metafield em `pages` nos dois casos.
- **Home é o caso especial** — ver seção 4.2.

---

## 3. Riscos ranqueados

1. ~~Cobertura do script tag~~ → **eliminado, e com validação extra**: a Nuvemshop está
   matando scripts legados (remoção progressiva a partir de 30/10/2026, inclusive pra
   apps privados) e forçando migração pro NubeSDK — que é sandbox sem acesso ao DOM,
   renderiza só em slots pré-definidos e **só funciona no tema Patagonia**. Ou seja:
   o caminho da doc original ia nascer com data de morte. A renderização via tema
   (metafield server-side) não usa script nenhum e passa ao largo disso tudo.
   Ver seção 4.5.
2. **Template de categoria/página ler metafield** — documentado só pra `product.metafields`
   (e provado no código do base-theme oficial). Mesmo engine (Twig), então provavelmente
   `category.metafields`/`page.metafields` funcionam igual, mas é validação empírica da POC.
   **Fallback universal se não funcionar**: todo destino pode ler de um produto porta-dados
   via `| get_products` (o mecanismo da home) — mais feio, porém 100% dentro do padrão provado.
3. **Home sem metafield de loja** — confirmado que não existe `owner_resource: store`.
   Plano B server-side elegante já identificado (seção 4.2).
4. **Tamanho máximo do value do metafield** — não documentado ("any string").
   Teste empírico na POC.
5. (v1, não POC) Rate limit de 2 req/s com burst de 40 por loja+app — irrelevante pra POC,
   relevante pra produto com muitos blocos/updates em lote.

---

## 4. Descobertas da pesquisa (com fontes oficiais)

### 4.1 Placar dos pontos incertos da spec original

| Ponto | Veredito |
|---|---|
| `POST /pages` existe? | ✅ **Existe** — CRUD completo de páginas via API |
| Pages aceita custom-fields? | ❌ Não — pages aceita **só metafields** (`owner_resource: pages`) |
| Metafield em categories? | ✅ Confirmado (e categories aceita custom-fields também) |
| `owner_resource: store` (home)? | ❌ **Refutado** — lista de entidades é fechada, sem "store" |
| Tema lê metafield server-side? | ✅ **Confirmado** — provado no código-fonte do base-theme oficial (products); categoria/página = validar na POC |
| Como agência edita o tema? | ✅ FTP do admin (plano-dependente) ou CLI oficial `@tiendanube/cli` com watch/sync |

### 4.2 Metafields

- Entidades aceitas (lista fechada): Product, Product_Variant, Category, Page, Order,
  Customer. **`store` não existe.**
- CRUD: `POST /metafields` · `GET /metafields/{owner_resource}?owner_id={id}` ·
  `GET /metafields/{id}` · `PUT /metafields/{id}` (só value/description) ·
  `DELETE /metafields/{id}`. Não existe rota aninhada tipo `/products/{id}/metafields`.
- Atenção à inconsistência de casing na doc: escrita usa singular capitalizado
  (`"owner_resource": "Product"`), leitura usa plural minúsculo no path
  (`GET /metafields/products`).
- Tamanho do value: não documentado ("it can be any string") — descobrir empiricamente.
- Rate limit: leaky bucket, **2 req/s, burst 40**, por loja+app (10× em planos
  Next/Evolution). Headers `x-rate-limit-*`. Paginação máx. `per_page=200`.

**Tema lendo metafield (o achado central)** — doc oficial de web designers mostra:

```twig
{% set related_products_ids = product.metafields.related_products.related_products_ids %}
{% if related_products_ids %}
  {% set related_products = related_products_ids | get_products %}
```

- O tema é **Twig** (arquivos `.tpl`). App grava metafield via API → template renderiza
  server-side, sem autenticação, sem JS. É o padrão documentado de handoff app→tema.
- Só `product.metafields` está demonstrado na doc. Categoria/página: não documentado
  (nem negado) — validar na POC.
- **Solução pra Home (refinada pelo agente de temas)**: o porta-dados oculto deve ser
  um **PRODUTO**, não uma página — porque o filtro `| get_products` (buscar produto por
  ID de dentro do template) existe e está provado no base-theme, e **não existe filtro
  equivalente pra páginas**. A `home.tpl` faz
  `{% set holder = ['ID'] | get_products | first %}` e lê `holder.metafields.swtchr.*`.

Fontes: [Metafields API](https://tiendanube.github.io/api-documentation/resources/metafields) ·
[Rate limits](https://tiendanube.github.io/api-documentation/intro) ·
[Produtos relacionados — tutorial oficial com Twig lendo metafield](https://docs.nuvemshop.com.br/help/produtos-relacionados) ·
[Referência de objetos do template](https://docs.nuvemshop.com.br/help/nosso-cdigo-objetos)

### 4.3 Pages e Categories

- **`POST /pages` existe** (escopo `write_content`): dá pra criar página institucional /
  landing 100% via API, sem passo manual no admin. CRUD completo:
  `GET /pages`, `GET /pages/{id}`, `POST /pages`, `PUT /pages/{id}`, `DELETE /pages/{id}`.
- Payload de criação usa estrutura `i18n` aninhada por idioma
  (`{"page": {"publish": true, "i18n": {"pt_BR": {"title": ..., "content": ..., "seo_handle": ...}}}}`).
  Atenção: leitura devolve `name`/`handle`, escrita usa `title`/`seo_handle`.
- Categorias: `GET /categories` etc., aceitam metafields **e** custom-fields.
- Pages: **só metafields** (o recurso `pages/custom-fields` não existe — 404 na doc).
- Consequência de desenho: **metafields vira o mecanismo único** pra produto, categoria,
  página e landing. Backend mais simples.

Fontes: [Page](https://tiendanube.github.io/api-documentation/resources/page) ·
[Category](https://tiendanube.github.io/api-documentation/resources/category) ·
[Category custom fields](https://tiendanube.github.io/api-documentation/resources/categories/custom-fields)

### 4.4 OAuth, app e API — detalhes de implementação

- **Fluxo**: instalar app na loja → Nuvemshop redireciona pro Redirect URL com `?code=...`
  → `POST https://www.nuvemshop.com.br/apps/authorize/token` com
  `{client_id, client_secret, grant_type: "authorization_code", code}` (no body, não na URL)
  → resposta traz `access_token` + `user_id` (**= store_id**) + `scope`.
- **`code` expira em 5 minutos e é de uso único.** Se perder, desinstala/reinstala o app.
  Por isso o endpoint de callback fica pronto ANTES do clique de instalar.
- **Token não expira** — só invalida se desinstalar o app ou emitir token novo.
- **Redirect URL** é campo fixo no portal (não parâmetro da URL de authorize).
  `http://localhost:PORT/path` é oficialmente suportado em dev, sem ngrok.
- **Escopos** (checkboxes no portal, preset default só tem Products; mudar escopo exige
  reinstalar): `write_products` (inclui categorias), `write_content` (pages),
  `write_scripts`. Write implica read.
- **Base da API**: `https://api.nuvemshop.com.br/v1/{store_id}` (existe também a base
  versionada por data `https://api.nuvemshop.com.br/2025-03/{store_id}`).
- **Pegadinha do header de auth**: forma histórica/canônica é `Authentication: bearer TOKEN`
  (header não-padrão, "bearer" minúsculo — é o que o SDK oficial PHP manda); doc atual
  mostra `Authorization: Bearer`. Na dúvida, **mandar os dois**.
- **`User-Agent` é obrigatório** (`User-Agent: App (email)`) senão a API devolve 400.

Troca de token copy-pasteable:

```bash
# 1) Instalar o app na loja demo (redireciona pro Redirect URL com ?code=...):
#    https://www.nuvemshop.com.br/apps/{APP_ID}/authorize

# 2) Trocar o code (válido por 5 min) pelo access_token permanente:
curl -X POST "https://www.nuvemshop.com.br/apps/authorize/token" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"APP_ID","client_secret":"CLIENT_SECRET","grant_type":"authorization_code","code":"CODE_DO_REDIRECT"}'

# 3) Teste (user_id da resposta == store_id):
curl "https://api.nuvemshop.com.br/v1/STORE_ID/products" \
  -H "Authentication: bearer ACCESS_TOKEN" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "User-Agent: SWTCHR POC (hi@brunodup.com)"
```

Fontes: [Authentication (API docs)](https://tiendanube.github.io/api-documentation/authentication) ·
[Authentication (DevHub)](https://dev.nuvemshop.com.br/en/docs/applications/authentication) ·
[Overview de apps](https://dev.nuvemshop.com.br/en/docs/applications/overview) ·
[Template oficial de app standalone Node](https://github.com/TiendaNube/tiendanube-app-standalone-template-node)

### 4.5 Script tags e NubeSDK — por que o caminho antigo morreu (e por que não importa)

**O modelo antigo de Scripts acabou.** `POST /scripts {src, event, where}` não registra
mais script: hoje o arquivo `.js` é enviado no Portal de Parceiros (CDN da Nuvemshop),
com `location: store | checkout`, e a API só faz a associação script↔loja (apps
auto-instalados nem precisam disso). `onload` exige aprovação prévia por e-mail; o
default é `onfirstinteraction` (primeiro scroll/clique).

**E o modelo legado inteiro está com data de morte:**

| Data | O que acontece |
|---|---|
| 05/06/2026 | NubeSDK obrigatório em homologação (já passou) |
| 30/08/2026 | Novas instalações bloqueadas pra apps sem SDK |
| 30/10/2026 | Remoção progressiva de scripts legados — **inclusive apps privados** (bloqueio sistêmico no front-end) |

**O substituto (NubeSDK) é muito mais restrito pro nosso caso:**
- Roda em Web Worker sandboxado, **sem acesso ao DOM** — renderiza só em slots
  pré-definidos (home, produto, categoria, busca; **não há slots pra página
  institucional**).
- Storefront **só funciona no tema Patagonia**.
- Detecção de página até melhorou (`location.page.type`: home, product, category,
  custom_page...), mas de nada serve se não renderiza livre.

**Conclusão de arquitetura:** a renderização server-side via metafield + tema não usa
script nenhum — nosso app só escreve via Admin API (isso não é "injeção de script",
a enforcement do NubeSDK não nos alcança) e o tema, que a agência controla, renderiza.
O modelo do Dup passa ao largo da migração inteira. Script tag deixa de ser fallback
recomendável; se um dia precisar de comportamento client-side, a conversa é NubeSDK.

Dados úteis que sobram desse capítulo (pra eventual uso futuro):
- Objeto global `LS` disponível pra scripts legados em toda página do storefront:
  `LS.store.id`, `LS.cart`, `LS.lang`, `LS.currency`, `LS.customer`, `LS.theme`;
  `LS.product`/`LS.variants` em produto; `LS.category` em categoria; `LS.order` no
  obrigado. Home/institucional não têm marcador próprio (detecta por ausência + URL).
- Sem CSP/sandbox nos scripts legados (AJAX cross-origin liberado); NubeSDK tem `fetch`
  no worker, mas exige CORS no destino.
- Loja em 402 (inadimplente): scripts não carregam e webhooks não disparam.

Fontes: [Script resource](https://tiendanube.github.io/api-documentation/resources/script) ·
[Overview de apps — cronograma NubeSDK](https://dev.nuvemshop.com.br/en/docs/applications/overview) ·
[NubeSDK — state](https://dev.nuvemshop.com.br/en/docs/applications/nube-sdk/state) ·
[NubeSDK — UI slots](https://dev.nuvemshop.com.br/en/docs/applications/nube-sdk/ui-slots) ·
[NubeSDK — overview](https://dev.nuvemshop.com.br/en/docs/applications/nube-sdk/overview)

### 4.6 Temas: Twig, edição por agência e a prova definitiva

**A prova definitiva do modelo** — código-fonte do tema oficial da Nuvemshop
([base-theme](https://github.com/TiendaNube/base-theme), `snipplets/product/product-related.tpl`):

```twig
{% set related_products_ids_from_app = product.metafields.related_products.related_products_ids %}
{% set has_related_products_from_app = related_products_ids_from_app | get_products | length > 0 %}
{% if has_related_products_from_app %}
    {% set related_products = related_products_ids_from_app | get_products %}
{% endif %}
```

100% server-side, sem AJAX, lendo metafield **escrito por um app** — exatamente a nossa
arquitetura, usada pela própria plataforma no recurso de produtos relacionados.
É padrão sancionado, não gambiarra.

**O engine:**
- Twig (base PHP), arquivos `.tpl`. Um template por tipo de página: `home.tpl`,
  `product.tpl`, `category.tpl`, `page.tpl` (institucional/landing), mais
  `layouts/layout.tpl` e `snipplets/` reutilizáveis — ou seja, temos ponto de inserção
  em **todos os 5 destinos**.
- Objetos por contexto: `store`, `product`, `category`, `page`, `cart`, `customer`,
  `settings`... A referência oficial de objetos **não lista `metafields`** — o acesso
  só aparece em tutoriais (products). Categoria/página: validar empiricamente.
- Filtros custom: `get_products` (hidrata IDs em objetos produto — a chave da home),
  `money`, `static_url`, `product_image_url`, `take`, `shuffle` etc.
  **Não há filtro de parse de JSON documentado** → decisão de design: **um metafield
  por campo** (flat: `swtchr.block_image`, `swtchr.block_text`), nada de JSON no value.

**Como a agência edita o tema:**
- **FTP do admin** (Loja online → Design → Editar código → Abrir FTP) — recurso
  "Design 100% flexível", dependente de plano. Caveat importante pra conversa com
  cliente: **loja com FTP aberto para de receber atualização automática de tema**.
- **CLI oficial** [`@tiendanube/cli`](https://github.com/TiendaNube/cli): workflow FTP
  (`theme ftp setup/pull/push/watch` — watch sincroniza no save e recarrega o storefront)
  e workflow Fork via API (só temas seccionáveis, ex. Ipanema, em rollout).
- Loja demo de parceiro tem "todos os recursos" — confirmar na prática se FTP vem liberado.
- Theme settings/sections existem (`settings.txt`, schema de sections no Ipanema), mas
  **não há API pública pra app escrever neles** — metafield segue sendo o único canal de
  escrita programática. Não existe recurso "Theme" na API de apps.

Fontes: [base-theme](https://github.com/TiendaNube/base-theme) ·
[Twig — o que é](https://docs.tiendanube.com/help/qu-es-twig) ·
[Objetos](https://docs.tiendanube.com/help/codigo-objetos) ·
[Métodos/filtros](https://docs.tiendanube.com/help/mtodos) ·
[Templates](https://docs.tiendanube.com/help/templates) ·
[FTP](https://ayuda.tiendanube.com/es_ES/123227-editar-el-codigo-de-diseno/como-trabajar-con-el-codigo-fuente-ftp-de-mi-tiendanube) ·
[CLI](https://dev.nuvemshop.com.br/docs/developer-tools/cli/getting-started)

### 4.7 Ipanema + Themes API — o que a pesquisa mudou (rodada 2)

A decisão de construir no Ipanema continua de pé, mas a pesquisa trouxe **três alertas
que reordenam o risco**. Resumo honesto:

**a) Metafield no template do Ipanema: NÃO documentado (go/no-go #1).**
A prova de `product.metafields.ns.key` server-side veio do tema **clássico** (base-theme).
O Ipanema é a geração seccionável e **a doc dele não menciona metafield em lugar nenhum** —
pior, a página "Integração com apps" do seccionável aponta os canais "abençoados" pra app
como **slots client-side do NubeSDK** e hooks CSS `data-store`, **não** metafield server-side.
- **Mas tem uma nuance que nos protege**: essa orientação é pra **app genérico que instala
  em qualquer tema** (não controla o tema, então injeta client-side). **Nós controlamos o
  tema** (premissa do Dup, §2) — somos autores do tema lendo nosso próprio metafield, que é
  exatamente o padrão do clássico. Seções do Ipanema são Twig sobre o mesmo modelo de
  objetos (`product`/`category`/`page`), então `{{ product.metafields.ns.key }}` **muito
  provavelmente** renderiza num fork do Ipanema — mas é inferência, não doc. **Testar num
  fork antes de apostar.**

**b) Ipanema é gated / em rollout — ✅ RESOLVIDO pra nós.**
A doc diz que Ipanema "está em rollout, pode não estar disponível em toda loja". **Mas o
Dup confirmou em reunião com o diretor de parcerias da Nuvemshop que o Ipanema está
disponível na conta da agência** (dup.store). Go/no-go #2 fechado — não é bloqueante.
Bônus: a linha direta de parcerias resolve os itens não documentados (a, c, d abaixo)
na fonte, sem depender só de teste empírico.

**c) Não existe REST API pública de temas (ajusta o norte da v1).**
O que existe é a **CLI** (`@tiendanube/cli`), scriptável via `--token` (token Base64
por loja, que codifica `store_id` + `access_token`). "O fork usa bearer-token e a REST
API da Tiendanube", mas **os endpoints REST não são publicados**. Então o "backend grava
`settings_data.json`" da v1 roda **via CLI** (ou endpoints não documentados = risco), não
via superfície REST suportada. Direção mantida, mecanismo revisado.

**Ponto positivo que fica de pé:** a estrutura seccionável é exatamente o que a gente quer —
`enabled_on` permite seção em home/produto/categoria/página, blocos aninhados com `{% schema %}`,
tipos de setting ricos (text, richtext, image_picker, color...). Ou seja, na v1 **o bloco vira
section nativa** de verdade. E `fork` deixa a gente "dar push em qualquer arquivo, incluindo o
schema de settings".

**d) Conflito editor nativo × push (anotar pra v1).** `settings_data.json` é escrito tanto
pelo Personalizar quanto pelo nosso push — mesmo arquivo, risco de last-writer-wins. Não
documentado como resolvem. Validar.

**Recomendação (atualizada — Ipanema confirmado na conta):** com o go/no-go #2 fechado,
o item zero roda **direto num fork do Ipanema**: forkar o Ipanema, colar
`{{ product.metafields.swtchr.block_text }}` numa section, gravar um metafield de teste via
API, recarregar a página do produto e ver se renderiza no HTML. ~20–30 min, resolve o único
go/no-go que sobra (a tese no Ipanema). O tema clássico vira **só rede de segurança**: se o
metafield não renderizar no fork do Ipanema (improvável, mas não documentado), prova-se a
tese no clássico enquanto o contato de parcerias confirma o comportamento esperado no Ipanema.
Perguntas a, c, d podem ir pro contato de parcerias em paralelo.

Fontes: [Temas seccionáveis](https://docs.tiendanube.com/help/sectionable-themes) ·
[Estrutura de pastas seccionável](https://docs.tiendanube.com/help/themes-basados-en-seciones-estructura-de-carpetas) ·
[Sections e blocks](https://docs.tiendanube.com/help/sections-y-blocks) ·
[JSON templates](https://docs.tiendanube.com/help/json-templates) ·
[Schema reference](https://docs.tiendanube.com/help/schema-reference) ·
[Integração com apps (seccionável)](https://docs.tiendanube.com/help/integracion-con-apps) ·
[CLI — theme installations](https://dev.nuvemshop.com.br/en/docs/developer-tools/cli/theme-installations) ·
[CLI — api workflow](https://dev.nuvemshop.com.br/en/docs/developer-tools/cli/api-workflow)

### 4.8 Painel embedado — Nexo + Nimbus (rodada 2, fechado)

**Terminologia:** "app incorporado/integrado/nativo" = app renderizado num **iframe dentro
do admin** da Nuvemshop. É o checkbox "Incorporar ao administrador da lojista" que o Dup viu
no portal. (Diferente do NubeSDK, que é pra UI de storefront/checkout — outro assunto.)

**Stack (validada no código dos templates oficiais):**
- **Nexo** (`@tiendanube/nexo`, React ^18) — SDK que faz a ponte iframe↔admin via postMessage.
  Handshake obrigatório `connect(nexo)` → `iAmReady(nexo)` antes do admin trocar o spinner
  pela nossa UI. Expõe navegação, session token, store info.
- **Nimbus** (`@nimbus-ds/*`, React 18) — design system da Nuvemshop. **Recomendado, não
  obrigatório** pra app privado ("Para seus clientes") — homologação (que exigiria Nimbus +
  ErrorBoundary) só vale pra App Store. **Nexo, esse sim, é tecnicamente obrigatório** pro
  iframe funcionar.
- **Templates oficiais** pra forkar: `tiendanube-app-native-template-node` (backend
  Node/Express + Passport-JWT + OAuth) + `tiendanube-app-native-template-react` (frontend
  Vite + Nexo + Nimbus).

**Auth — dois tokens complementares (não trocar um pelo outro):**
1. **Session token (JWT)**: o admin gera e entrega pro iframe via `getSessionToken(nexo)`,
   **assinado com o nosso Client Secret**, com o `storeId` no payload. O front manda como
   `Authorization: Bearer <jwt>` nas chamadas ao nosso backend.
2. **OAuth access_token** (o que já pegamos no install, permanente, por loja).
   O backend **verifica o JWT com o Client Secret** → lê o `storeId` → carrega o
   access_token daquela loja → escreve metafield. **Nosso fluxo OAuth não muda; só ganha
   um guard de verificação de JWT.** Detalhe: em Developer Mode o JWT é assinado com a
   string literal `THE_SECRET`; em produção, com o Client Secret real.

**Dev local — sem ngrok:** pede-se **Developer Mode** à Nuvemshop → aparece um menu
"Testar App" no admin onde se cola `http://localhost:5173`. O iframe é carregado pelo
**nosso próprio navegador**, que resolve localhost. (Não dá pra abrir localhost direto fora
do admin — o handshake/session token só existem dentro do frame.) **O contato de parcerias
pode habilitar o Developer Mode na dup.store.**

**Config no portal (app #36078):** "Site do aplicativo" = URL do front (src do iframe);
"URL de redirecionamento" = callback OAuth (`/auth/callback`, inalterado). O checkbox de
incorporar liga o modo embedado.

**Backend embedado (inferência de engenharia — doc é silente):** front precisa ser
"iframeável" (sem `X-Frame-Options: DENY`; `frame-ancestors` liberando o domínio do admin);
backend precisa de **CORS** pra origem do iframe + header `Authorization`. Cookies não são
problema — auth é Bearer JWT, não cookie.

**Implicação de stack:** o painel embedado é um **app React (Vite)**, não o HTML vanilla do
protótipo. A lógica do backend (OAuth, escrita de metafield) é reaproveitável — ganha só o
guard de JWT + CORS. O `public/index.html` do protótipo serviu de referência de fluxo;
o painel de verdade nasce do fork do template React oficial.

Fontes: [Nexo](https://tiendanube.github.io/devhub-apps/en/docs/developer-tools/nexo/) ·
[Apps integrados](https://dev.nuvemshop.com.br/en/docs/applications/native) ·
[Authentication](https://dev.nuvemshop.com.br/en/docs/applications/authentication) ·
[Nimbus](https://tiendanube.github.io/devhub-apps/en/docs/developer-tools/nimbus/) ·
[@tiendanube/nexo (npm)](https://www.npmjs.com/package/@tiendanube/nexo) ·
[template node](https://github.com/TiendaNube/tiendanube-app-native-template-node) ·
[template react](https://github.com/TiendaNube/tiendanube-app-native-template-react)

---

## 5. Lição de casa do Dup (~20 min, único caminho bloqueante)

Nessa ordem — **trocar escopo depois exige reinstalar o app**:

1. ~~Cadastro de parceiro tecnológico~~ ✅ feito (painel dup.agency ativo)
2. ~~Loja demo~~ ✅ feita (**dup.store**)
3. ~~Criar aplicativo~~ ✅ feito (**app #36078** — obs.: nome saiu "swtcrh", letras
   trocadas; renomear pra SWTCHR em Dados básicos se quiser, é cosmético)
4. ~~**Escopos** `write_products` + `write_content` (+ `write_scripts`)~~ ✅ feito
5. ~~**Redirect URL** `http://localhost:8787/auth/callback`~~ ✅ feito
6. ~~**Passar `app_id` + `client_secret`**~~ ✅ feito (`.env` na pasta, gitignored;
   app #36078)
7. **NÃO clicar em "instalar" ainda** — ✅ entendido; a instalação é o passo conjunto
   quando o backend estiver de pé (o `code` expira em 5 min).

Extra: conta Vercel já existe (CLI instalada). Na hora do deploy, confirmar se o projeto
vai no time pessoal ou da agência.

---

## 6. O plano

### Fase 1 — agora, sem credencial
- [x] Pesquisa completa: pages, metafields, OAuth, script tags/NubeSDK, temas/Twig
      (5 de 5 agentes concluídos)
- [x] Pesquisa rodada 2 concluída: **Ipanema + Themes API** (§4.7 — metafield no template
      é o único go/no-go que sobra; Ipanema confirmado na conta; não há REST API, só CLI)
      e **Nexo + Nimbus** (§4.8 — stack do painel embedado fechada)
- [x] Reescrever a spec no modelo corrigido (v2.3)
- [ ] Scaffold do código:
  - **Backend** (Node zero-deps, deployável na Vercel depois): `/auth/callback`
    (troca code→token), rotas de leitura/gravação com roteamento por tipo de destino
    (metafields flat em products/categories/pages + produto porta-dados pra home),
    listagem de categorias/produtos/páginas pro seletor do painel
  - **Painel = app embedado no admin** (Nexo + Nimbus). Pende 1 rodada de pesquisa
    antes de desenhar: auth de sessão do iframe, dev local, publicação de app privado
    embedado. (Um protótipo standalone do fluxo existe em `public/index.html` — vale
    como referência do fluxo de edição, não como entrega.)
  - **Snipplets Twig** do bloco (imagem + texto) integrados ao **nosso tema**
    (`home.tpl`, `product.tpl`, `category.tpl`, `page.tpl`)

### Fase 2 — quando as credenciais chegarem
- [ ] Instalar app na loja demo → token capturado automaticamente
- [ ] Validar na ordem: (1) template de PRODUTO lendo metafield (caminho documentado),
      (2) categoria e página (não documentado — o risco real),
      (3) home via porta-dados oculto
- [ ] Teste empírico: tamanho máximo de value do metafield

### Fase 3 — ponta a ponta
- [ ] Critério de sucesso nos 5 destinos: editar no painel → salvar → recarregar
      storefront → conteúdo atualizado, sem tocar em código/JSON
- [ ] Atualizar a spec com tudo que foi validado
- [ ] Roteiro + gravação do vídeo de demo (material de venda)

---

## 7. Critério de sucesso (inalterado na essência, +1 destino)

Editar imagem/texto no painel, escolhendo cada um dos **5 destinos** → salvar →
recarregar o storefront → conteúdo atualizado **já no HTML servido** (view-source mostra
o conteúdo, provando server-side), sem tocar em código ou JSON.
