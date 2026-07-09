# SWTCHR × Nuvemshop — onde chegamos

**Loja demo**: dupstore2.lojavirtualnuvem.com.br (loja #6658474) · **Produto de teste**: Hoodie Heavy Purple (#339251604)
**Atualizado em**: 09/07/2026

O objetivo desta fase era provar duas coisas ao mesmo tempo: (1) que dá pra fazer uma loja Nuvemshop com visual e edição de nível awwwards, e (2) documentar — com prova viva — exatamente onde a plataforma trava esse nível de trabalho. A loja é a demonstração; os furos são a pauta da conversa com a Nuvemshop.

---

## 1. O que está no ar

### O tema (Morelia redesenhado por completo)

- **Design system próprio** aplicado no tema inteiro: dark #0D0D0D + paleta roxa/lilás (#897BBC, #AD61C2), degradê da marca (mint→lilás), fontes Chillax (display) + Synonym (texto), header em pills com smoke glass, fundo com cross-fade de cor por seção (data-bg/data-nav), animações de reveal.
- **Home 100% editável pelo Personalizar** — ~40 campos (textos + imagens) na seção "Home dup.store". Campo vazio cai no conteúdo do design.
- **PDP** — hero bespoke (breadcrumb, H1 display, preço), seção descritiva 100% via blocos SWTCHR, "Combina com" restylado, reviews reais.
- **Categoria** — grid 4 colunas full-bleed, banner editável pelo admin, filtros/ordenação restylados, **bloco de texto SEO editável pela descrição da categoria** (título centralizado, grid 3 colunas + último parágrafo 100%, "Leia mais/menos").
- **Páginas institucionais bespoke**: `a-marca` (versão Cinema) e `timeline-da-vida` (versão Diário de bordo) — layouts completos ativados pelo endereço da página, com **todo o conteúdo editável pelo Personalizar** (~60-70 campos + uploads cada).
- **Busca** com banner editável, páginas de login/cadastro centradas e claras, minicart restylado, newsletter, footer.
- **Reviews reais** via app Opina (único gratuito), embrulhado num bloco-slot SWTCHR ordenável, com restyle completo: estrelas em degradê, cards com sombra, Q&A e alertas no padrão da marca.
- Deploy por FTPS com validação (Playwright WebKit/Chromium + asserções numéricas), espelho versionado em git próprio (`theme-ftp-mirror/`).

### O SWTCHR (painel + backend)

- **Painel React** com o visual do Figma: sidebar, busca de produtos, editor de blocos com drag-and-drop, modal de tipos de bloco, uploaders 4:3 com **variante desktop + mobile em todo campo de imagem** (renderiza `<picture>`).
- **Blocos disponíveis**: hero imagem+texto, carrossel, lista de features, ficha técnica & cuidados, slot de reviews (Opina). Todos emitem data-bg/data-nav pra integrar no cross-fade do tema.
- **Backend zero-deps** (Node): OAuth do app, metafields `swtchr/pdp_config` (JSON) + `swtchr/pdp_html` (HTML pré-renderizado e sanitizado). **A loja funciona com o backend 100% desligado** — o tema só lê metafield.
- **Asset Host**: produto-rascunho que hospeda as imagens dos blocos no CDN da loja (não existe API de mídia — ver furo #3).
- **Protocolo de backup dos assets**: toda imagem subida ganha cópia local (`.data/assets/`) + manifesto (`.data/assets.json`) com todas as URLs publicadas e o mapa de onde cada uma está em uso. Endpoints `backup` (varredura), `status` (alarme: host vivo? URL morta?) e `restore` (recria host, re-sobe do disco, reescreve metafields). Testado com fire drill.

---

## 2. Os furos — a pauta da conversa

Cada item abaixo tem prova viva na loja. O formato da conversa: "a loja tá assim **apesar** da plataforma — olha o que precisamos gambiar. O que vocês podem fazer?"

### #1 · Metafields só chegam ao tema em produto
O Twig só expõe metafields de **produto**. Home, categoria e página institucional não conseguem ler os blocos SWTCHR — por isso a home e as páginas "editáveis" tiveram que ser feitas via `settings.txt` (Personalizar), com campos fixos.
**Pedido**: expor metafields de category/page/store nos templates.
**Prova**: PDP com blocos ordenáveis vs. home com 40 campos estáticos no Personalizar.

### #2 · Não existe API de páginas institucionais
`GET /v1/{store}/pages` → 404. As páginas a-marca e timeline-da-vida tiveram que ser criadas à mão no admin, e o layout é ativado por um hack de roteamento por URL dentro do `page.tpl`.
**Pedido**: CRUD de páginas na API (o metafield de Page já existe na API de metafields — só falta a página em si).

### #3 · Não existe API de mídia
Pra hospedar imagem de bloco no CDN, o app mantém um **produto-rascunho fantasma** ("[SWTCHR] Asset Host") e sobe as imagens como se fossem fotos dele. Qualquer integração com `write_products` (um ERP, por exemplo) pode excluir esse produto e derrubar todas as imagens — daí o protocolo de backup próprio.
**Detalhe**: toda imagem de produto tem um `store_media_uuid` na API — a infra de mídia **existe** internamente, só não é exposta.
**Pedido**: API de upload de mídia (ou, no mínimo, flag de "imagem oculta" em produto).

### #4 · Personalizar não tem listas dinâmicas
`settings.txt` só aceita campos fixos: os 5 valores da página A Marca e os 6 marcos da timeline têm quantidade travada — o lojista edita texto, mas não adiciona/remove itens. Formatação em título exigiu convenção improvisada (`|` = quebra de linha, `*palavra*` = degradê).
**Pedido**: campos repetíveis/estruturados no Personalizar (ou metafields no tema, que resolve via SWTCHR — ver #1).

### #5 · PUT de categoria é destrutivo nos campos i18n
Enviar `PUT /categories/{id}` só com `description` **zerou o name e o handle** da categoria — a URL virou 404 na hora (e o 404 ficou em cache no edge). Recuperamos, mas qualquer integrador desavisado derruba categoria de loja em produção.
**Pedido**: semântica PATCH (merge) ou ao menos documentação explícita do comportamento.

### #6 · Escopo de token é tudo-ou-nada
`write_products` vale pro catálogo inteiro. Não dá pra proteger um recurso (tipo o Asset Host) de outros apps — qualquer integração pode apagar qualquer produto.
**Pedido**: escopos granulares / proteção de recursos por app.

### #7 · Seções arrastáveis nativas: só na home e com lista fixa
O mecanismo de drag-and-drop de seções do tema (`home-section-switch`) existe, mas só funciona na home e com menu fixo de seções do tema — não é extensível por apps nem disponível em outras páginas. É exatamente o problema que o SWTCHR resolve.
**Pedido**: nada a pedir aqui — é o slide do "olha a demanda que existe".

### #8 · Miudezas que custaram horas
- Estático `.webp` servido como `application/octet-stream` → Safari recusa a imagem (tivemos que converter tudo pra jpg/png).
- Cache de página com TTL ~15min **e variância entre nós** (requests consecutivos alternam versão velha/nova) — sem API de purge.
- Editor de página institucional é um único campo rich-text — sem qualquer estrutura.

---

## 3. Próxima fase (combinado)

1. **Dup**: gerar assets reais (fotos/artes) pra produtos reais.
2. **Recadastrar a loja** com ~40 produtos de verdade na dup.store.
3. Popular os blocos SWTCHR dos produtos-chave, descrições SEO das categorias, reviews.
4. **Apresentar pra Nuvemshop**: a loja foda primeiro, a lista de furos (seção 2) depois, com o pedido claro — metafields fora de produto, API de páginas e API de mídia são os três que destravam o SWTCHR como produto.

### Pendências técnicas nossas
- `.data/` (token, config, backup de assets) está fora do git de propósito — combinar um backup externo dessa pasta.
- Rodar `POST /api/assets/backup` depois de cada leva de uploads (ou agendar).
- No recadastro: manter o Hoodie Heavy Purple ou migrar a config de blocos pros produtos novos (o painel salva por produto).
- Asset Host (#354478145) — **não excluir** no recadastro da loja.

---

## 4. Mapa do repositório

| Onde | O quê |
|---|---|
| `panel/` | Painel React (visual Figma) |
| `server.mjs` + `lib/pdp.mjs` | Backend, registry de blocos, render/sanitização |
| `lib/assets.mjs` | Protocolo de backup dos assets |
| `theme-ftp-mirror/` | Espelho do tema live (git próprio, deploy FTPS) |
| `theme-ftp-mirror/config/settings.txt` | Tudo que é editável no Personalizar |
| `theme-ftp-mirror/snipplets/dup-about-{a,b}.tpl` | Páginas A Marca e Timeline |
| `theme-ftp-mirror/snipplets/swtchr-runtime.tpl` | CSS dos blocos SWTCHR + restyle do Opina |
| `theme-ftp-mirror/static/css/dup-awwwards.tpl` | Design layer do tema inteiro |
