# Plano de Execução — POC Blocos Editáveis Nuvemshop

> **O que é este arquivo:** o passo a passo acionável, em ordem, com dono de cada passo.
> O *quê/porquê* está na spec [`poc-blocos-editaveis-nuvemshop.md`](poc-blocos-editaveis-nuvemshop.md);
> a pesquisa com fontes está em [`poc-plano-e-descobertas.md`](poc-plano-e-descobertas.md).
> Legenda de dono: **[Dup]** só você faz · **[Claude]** eu faço · **[juntos]** passo conjunto.

---

## 🎯 TESE PROVADA (2026-07-07, noite) — no tema clássico Morelia via FTP

Ciclo completo validado ponta a ponta numa loja real (dupstore2):
1. App grava metafield via Admin API (`swtchr.block_image` + `swtchr.block_text` no produto 339161786).
2. Tema Morelia (Twig, customizado pela dup.agency) lê `product.metafields.swtchr.*` no `product.tpl`.
3. Conteúdo **renderizado no HTML servido** — confirmado por `curl` (sem JS): os dois valores do
   metafield aparecem em `<section class="swtchr-block">`. **Server-side de verdade.**

URL da prova: `https://dupstore2.lojavirtualnuvem.com.br/produtos/mochila-urban-transit/`
(o snippet de teste segue no ar no `product.tpl` até decidirmos reverter/polir).

**O que isso prova:** a arquitetura SWTCHR na Nuvemshop funciona — app escreve metafield, tema
renderiza server-side. Falta só reproduzir no **Ipanema** (bloqueado pelo fork gate, do lado deles).
No clássico, que é o padrão documentado, está **provado**.

---

## Resultados Fase 1 (2026-07-07 noite, no Morelia via FTP)

| Destino / capacidade | Resultado |
|---|---|
| **Produto** — `product.metafields.swtchr.*` em `product.tpl` | ✅ **Renderiza server-side** (provado no HTML servido) |
| **Categoria** — metafield E custom field | ❌ **NÃO renderiza (ambos)**. Objeto `category` no template carrega só: `id, name, description, url, sort_method, parent, seo_title, seo_description, handle, metafields`. O `metafields` **existe mas vem vazio** (`[]`) mesmo com valor gravado; `custom_fields` **nem existe** no objeto. Testado metafield (API) e custom field (criado no admin) — dump cru do `category` inteiro não tem traço de nenhum. Não há flag de visibilidade na doc. **Só produto expõe dado custom ao tema.** |
| **Página / Landing** | ⚠️ Não testável nesta loja — `GET/POST /pages` → **404** (resource de páginas gated no plano da demo) |
| **Home** — porta-dados via `get_products` | ⚠️ **Pendente** — `[id] \| get_products` (array literal) **quebra o template** (na home e na categoria). O padrão que funciona no tema lê IDs de um metafield-array (`product.metafields.ns.ids \| get_products`), não literal. Precisa implementar assim, e confirmar se `get_products` roda fora do contexto de produto. |
| **Upload de imagem** | ✅ **FUNCIONA** — `POST /products/{id}/images` (aceita `src` ou base64) → devolve URL de CDN da Nuvemshop (`dcdn-us.mitiendanube.com/...`), **hospedada na loja**. É o mecanismo do file uploader. |
| **Vídeo** | ◑ Campos `video_url` + `videos` existem no produto. Provável embed (YouTube/Vimeo), não upload hospedado — confirmar. |

**Implicação de arquitetura:** como só **produto** expõe metafield ao tema, categoria/página/home
dependem do **porta-dados** (ler o metafield de um produto via `get_products`). Isso ainda não
está funcionando (sintaxe/contexto do `get_products`) — é o principal item aberto da Fase 1.
Se o `get_products` não rodar fora da página de produto, precisamos de outra estratégia pra
não-produto (ex.: o backend injeta o conteúdo renderizado, ou um endpoint próprio lido no tema).

> ⚠️ Todas as edições de tema desta rodada foram **revertidas** (category.tpl e home.tpl voltaram
> ao original). Só o **product.tpl** mantém o snippet de demo que funciona. Backups `.orig` em
> `theme-morelia/templates/`.

---

## Estado atual (2026-07-07, noite — sessão de execução)

- ✅ Pesquisa completa (5 frentes + rodada 2: Ipanema, Nexo/Nimbus)
- ✅ App #36078 instalado na dup.store · **token OAuth capturado** (loja #6658474)
- ✅ **Escrita de metafield validada ponta a ponta** — gravado + relido `swtchr.block_text`
      e `swtchr.block_image` no produto 339161786 via API real. **Metade da tese provada.**
- ✅ CLI de tema autorizada · Ipanema draft (#13715944) puxado · estrutura mapeada ·
      snippet de teste pronto em `blocks/product-info.tpl` (local)
- ⛔ **BLOQUEIO: fork do Ipanema está gated** — `theme fork` → HTTP 400 *"Forking not yet
      allowed. Coming soon..."*. Sem fork não dá pra editar `blocks/`/`sections/`, então o
      **render server-side no Ipanema não pôde ser provado ainda**. Não é o nosso approach —
      é gate de plataforma.
- 🧪 **Testado o desvio via `theme create` (ideia do Dup) — não escapa do gate.** Deletamos
      o draft antigo, criamos um Ipanema novo (id **13878588** "SWTCHR POC") e o push de bloco
      foi recusado igual (`Skipped (not forked)`, `forked: false`). Confirma que o gate é da
      **conta inteira** e vale pra qualquer tema seccionável, criado ou não. Loja voltou ao
      estado limpo: Morelia (no ar) + um Ipanema draft limpo pronto pra editar quando o fork
      ligar. Limite de 2 instalações por loja também confirmado (HTTP 409).
- 🆕 **Requisito novo do Dup:** campo de imagem = **file uploader hospedando na loja**, não
      URL externa (ver spec). Spike de pesquisa pendente pro mecanismo.

### Diagnóstico final do bloqueio (investigado a fundo, 07/07 noite)

A doc oficial diz que "fork é opcional" e a de api-workflow não menciona fork — o que gerou
dúvida legítima. Fomos na fonte + testamos empíricamente. Conclusão: **a doc está certa sobre
o modelo pretendido, mas as features de escrita de código do tema seccionável estão em rollout
e retornam "not yet" na conta.** Duas evidências:
- `theme fork` → HTTP 400 *"Forking not yet allowed. Coming soon"* (servidor)
- push de `custom/` → *"push is not yet supported for this folder"* (CLI v2.0.5, a latest)

Sem fork: só dá push em `templates/*.json`, `config/settings_data.json` e `custom/` — e desses,
nenhum roda Twig (é onde `{{ product.metafields.swtchr.* }}` teria que morar). O `custom/`, que
seria a brecha, também está "not yet". `richtext`/`html` settings renderizam HTML estático, não
avaliam Twig. Ou seja: **não há hoje nenhum caminho pra injetar a leitura de metafield no Ipanema
via API** — é gate de plataforma em rollout, não erro de doc nem falha de arquitetura nossa.

### Como destravar o render (próxima sessão, budget fresco)
1. **Pedir ao contato de parcerias pra habilitar o fork** na conta (a mensagem já diz
   "coming soon" — provavelmente é um flag). Caminho preferido: prova no próprio Ipanema.
2. **OU** teste no tema clássico Morelia (metafield documentado/provado) via **FTP** —
   precisa abrir o FTP no admin e pegar credenciais; é o tema no ar, então fazer com o Dup
   presente. Confirma nosso pipeline nesta loja mesmo sem esperar o fork.
- Tudo o mais da Fase 0 já está pronto: token, escrita, CLI, snippet, ponto de injeção.

⏭️ **Próximo: destravar o render (fork via parcerias ou FTP no clássico)**

---

## Fase 0 — Provar a tese (GO/NO-GO) · ~1h

**Pergunta que esta fase responde:** metafield escrito por app renderiza **server-side**
numa section do Ipanema? É o único risco de plataforma que sobra. Não precisa do painel
bonito — só token + tema + uma escrita de metafield.

| # | Passo | Dono |
|---|---|---|
| 0.1 | `node server.mjs` sobe o backend em localhost:8787 | [Claude] |
| 0.2 | Abrir a URL de instalação do app → clicar "instalar" na dup.store → o callback captura o token (janela de 5 min) | [juntos] |
| 0.3 | Instalar a CLI (`npm i -g @tiendanube/cli`) e rodar `theme authorize` (login na dup.store no navegador, colar o token Base64) | [juntos] |
| 0.4 | Forkar/puxar o Ipanema via CLI; adicionar snippet lendo `{{ product.metafields.swtchr.block_text }}` numa section de produto; `push` | [Claude] |
| 0.5 | Escrever um metafield de teste num produto (via backend ou curl) | [Claude] |
| 0.6 | Recarregar a página do produto → **view-source** → o texto está no HTML? | [juntos] |

**Critério de sucesso:** o conteúdo aparece no HTML servido (não injetado por JS).
→ **tese provada no Ipanema. Segue pra Fase 1.**

**Se não renderizar** (improvável, mas não documentado):
- Fallback A: repetir 0.4–0.6 no **tema clássico** (onde o metafield é documentado/provado)
  — prova o conceito enquanto isola se o problema é específico do Ipanema.
- Fallback B: perguntar ao contato de parcerias o comportamento esperado no Ipanema.
- Registrar o resultado em [`theme/INSTALL.md`](theme/INSTALL.md) (tabela de validação).

---

## Fase 1 — 5 destinos ponta a ponta · ~2–3h

Com a tese verde, provar o critério de sucesso da POC nos 5 destinos. Ordem = do
documentado pro incerto.

| # | Destino | Mecânica | Dono |
|---|---|---|---|
| 1.1 | **Produto** | já validado na Fase 0 | [Claude] |
| 1.2 | **Categoria** | metafield em `categories` + `category.metafields.*` em `category.tpl` | [Claude] |
| 1.3 | **Institucional** | metafield em `pages` + `page.metafields.*` em `page.tpl` | [Claude] |
| 1.4 | **Landing** | mesmo recurso `pages` (semântica diferente no painel) | [Claude] |
| 1.5 | **Home** | metafield no produto porta-dados + `get_products` no `home.tpl` | [Claude] |
| 1.6 | Teste de limite: tamanho máx. do value (1KB/10KB/100KB) | [Claude] |

**Entregável:** editar título em cada um dos 5 → salvar → recarregar → aparece no HTML.
Se categoria/página não lerem direto no template, ativar o fallback do porta-dados
(documentar em [`theme/INSTALL.md`](theme/INSTALL.md)).

---

## Fase 2 — Painel embedado (Nexo + Nimbus) · ~1–2 dias

Trocar o protótipo HTML pelo painel real dentro do admin.

| # | Passo | Dono |
|---|---|---|
| 2.1 | Forkar os templates oficiais (`tiendanube-app-native-template-react` + `-node`) | [Claude] |
| 2.2 | Reaproveitar a lógica de metafield do protótipo no backend do template; adicionar **guard de JWT** (verifica session token com Client Secret) + **CORS** | [Claude] |
| 2.3 | Front: seletor dos 5 destinos + busca do registro + form imagem/texto, no visual SWTCHR (Nimbus opcional, é app privado) | [Claude] |
| 2.4 | Configurar "Site do aplicativo" no portal; testar via menu "Testar App" → localhost | [juntos] |
| 2.5 | Fluxo completo dentro do admin: editar → salvar → ver no storefront | [juntos] |

---

## Fase 3 — Material de venda · ~2h

| # | Passo | Dono |
|---|---|---|
| 3.1 | Roteiro do vídeo: editar bloco no admin → publicar → resultado no storefront, nos 5 destinos | [Claude] |
| 3.2 | Gravar a tela fazendo o ciclo completo | [Dup] |
| 3.3 | Atualizar a spec com tudo que a POC validou (seção "Resultados") | [Claude] |

---

## Apêndice — Norte da v1 (NÃO é POC, registrado pra não perder)

- **Home sem porta-dados**: backend grava conteúdo direto nos theme settings
  (`settings_data.json`) via a **CLI** de temas (não há REST API pública). Pré: confirmar
  que push não conflita com o Personalizar (mesmo arquivo → last-writer-wins).
- **Bloco como section nativa do Ipanema**: o bloco vira section com `{% schema %}`,
  editável pelo nosso app E pelo Personalizar. Migração não toca o app — muda só o
  destino da gravação.
- Perguntas abertas pro contato de parcerias: metafield em section do Ipanema (Fase 0
  responde na prática), conflito settings×Personalizar, backend falando com a API de temas.

---

## Dependências (o que trava o quê)

- Fase 0 trava tudo (é o go/no-go). Fases 1 e 2 podem correr em paralelo depois dela —
  a Fase 1 valida a plataforma, a Fase 2 constrói a interface. Fase 3 fecha.
- Nada aqui espera resposta do contato de parcerias: o Developer Mode já está ligado e o
  metafield-no-Ipanema a gente testa na Fase 0.
