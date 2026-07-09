# Plano de Execução v1 — PDP Builder embedado (SWTCHR × Nuvemshop)

> Escopo: validar o cenário COMPLETO do SWTCHR pra página de produto (PDP), **como vamos usar
> de verdade** — app embedado no admin da Nuvemshop. Só a aba Produto é construída;
> Home/Categoria/Páginas ficam "em breve".

---

## 1. A visão (como o Dup descreveu)

Aba **Produto** = builder de PDP:
1. Lista de **produtos já editados** (histórico) + botão **"Adicionar novo"**.
2. Add/editar → tela com **busca de produto** (nome ou id).
3. Escolhido o produto → **"Configurações padrão"**: banner principal com imagem **desktop**
   (uploader), imagem **mobile** (uploader), **texto** (richtext).
4. Campo **"+"** → escolher **componente de uma lista** (com print de cada, se possível) →
   campos do bloco (visibilidade, título, subtítulo, imagem…). *Por agora 1 componente:
   imagem + texto.*
5. Ao salvar, **lista de componentes com ordem** (reordenação) na mesma tela do "+".
6. 10 blocos → renderizam na PDP **depois das informações principais**, server-side.

---

## 2. Decisões fechadas (Q&A com o Dup)

- **App nasce EMBEDADO** no admin da Nuvemshop (Nexo), desde o dia 1 — pra descobrir travas cedo.
- **Tech:** framework é livre (app privado pula homologação → Nimbus/React não são obrigatórios).
  **React + Vite + Nexo** (o ecossistema é React; libs prontas de drag-and-drop e richtext cortam
  esforço), com **Nimbus opcional** pra dar cara nativa ao chrome/inputs e nossos próprios
  componentes no canvas do builder. **Backend continua zero-deps (Node).**
- **Fidelidade:** **mínimo na arquitetura, real na ferramenta, capricho por último.** Arquitetura
  (dados + render) validada simples primeiro (Fase 0, sem UI). A ferramenta é construída no fluxo
  real (busca → banner → blocos → ordem → salvar → N blocos na PDP). Drag-and-drop fino e WYSIWYG
  entram como polimento (v1 começa com ↑/↓ + richtext simples).

---

## 3. Arquitetura de dados (zera o maior risco)

**Regra de ouro: JSON fica no backend (Node); o tema recebe só HTML pré-renderizado.**
Por produto, dois metafields no namespace `swtchr`:
- **`pdp_config`** = JSON do config (banner + blocos ordenados + visibilidade). Lido/escrito pelo
  backend; o painel edita isso.
- **`pdp_html`** = HTML **já renderizado** dos blocos, na ordem. O tema faz só
  `{{ product.metafields.swtchr.pdp_html | raw }}` depois das infos principais.

No save: painel manda `pdp_config` → backend **valida + sanitiza** → renderiza `pdp_html` → grava
os dois metafields. Histórico = `GET /metafields/products?namespace=swtchr&key=pdp_config`.

---

## 4. Arquitetura do app embedado (regras da Nuvemshop confirmadas)

- **Iframe carrega qualquer web app** numa URL pública. **Única exigência dura:** handshake do
  Nexo — `nexo.create({clientId})` → `connect(nexo)` → `iAmReady(nexo)` → escutar `ACTION_NAVIGATE_SYNC`.
- **Auth em dois tokens:** (a) **session token JWT** do Nexo (`getSessionToken`, assinado com o
  Client Secret) — pego a cada request, mandado no `Authorization: Bearer` pro backend, que
  verifica; (b) **OAuth token** (longo) — o backend usa pra REST API. Em Developer Mode o JWT é
  assinado com `THE_SECRET`.
- **Nimbus/ErrorBoundary/checklist = só homologação (App Store).** App privado pula tudo (vale
  adotar ErrorBoundary mesmo assim).
- **Backend ganha só:** verificação do JWT (`node:crypto`) + CORS/OPTIONS. Sem dep nova.
- **Developer Mode** já ligado na nossa loja.

---

## 5. Complexidades & riscos

| # | Risco | De-risco |
|---|---|---|
| R1 | Tamanho do metafield (`pdp_html` de 10 blocos) | Fase 0: gravar ~50–100 KB e reler; achar teto. Se houver, chunk. |
| R2 | XSS/sanitização (richtext + HTML gerado) | Sanitizar no save (allowlist; tira `<script>`/handlers/`javascript:`). |
| R3 | Travas do iframe (não documentadas): file input/upload/download? `frame-ancestors`? TTL do JWT? altura/scroll? localhost? | Fase 0.5 (spike de casca embedada no Dev Mode). |
| R4 | UI complexa | Fasear: ↑/↓ antes de drag-and-drop; 1 componente antes de biblioteca; richtext simples antes de WYSIWYG. |
| R5 | Posição do render na PDP | Fase 0 confirma no view-source. |
| R6 | Histórico via API | Fase 0: `GET /metafields/products?namespace=swtchr`. |
| R7 | Busca de produto | Fase 0: `GET /products?q=`. |
| R8 | Imagem de produto oculto resolve no CDN | Fase 0. |
| R9 | Edição no tema live (Morelia) | Backups `.orig` + FTP; com o Dup presente. |

---

## 6. Fases

### Fase 0 — Spike de arquitetura de dados (modelo capaz; só API + tema)
Gravar `pdp_html` grande (banner + 10 blocos) `| raw` no `product.tpl` depois das infos principais
→ view-source confirma os 10 em ordem. Achar teto do metafield. Confirmar histórico, busca, imagem
de produto oculto.

### Fase 0.5 — Spike de casca embedada (descobrir travas do iframe cedo)
Hello-world React + Nexo (`connect → iAmReady`) via "Testar App". Verificar file input/upload/download,
`frame-ancestors`, TTL do JWT, altura/scroll, localhost vs túnel. Backend ganha guard JWT + CORS.

### Fase 1 — Backend do builder (barato)
`pdp_config` (banner + blocos), registry com render por tipo (`hero_image_text`), sanitização,
rotas `/api/pdp/:id`, `/api/upload`, `/api/history`, `/api/search`, `ensureAssetsProduct`.

### Fase 2 — Front do builder embedado (barato; grosso do esforço)
React+Vite+Nexo, 4 abas (3 "em breve"). Aba Produto: histórico + add → busca → configurações padrão
(2 uploaders + richtext) → "+" (picker) → lista com reordenação → salvar.

### Fase 3 — Tema (barato)
`{{ product.metafields.swtchr.pdp_html | raw }}` no `product.tpl` após infos principais. Limpar lixo.

### Fase 4 — Polimento + vídeo
Estilo dos blocos, drag-and-drop/WYSIWYG, demo gravado dentro do admin.

---

## 7. Custo / modelos
- **Capaz:** Fase 0, Fase 0.5, sanitização (R2).
- **Barato (Haiku):** Fase 1, 2, 3, estilos.

## 8. Fora de escopo v1
Biblioteca de componentes + thumbnails; campos avançados por bloco; Home/Categoria/Páginas (gated
no fork do Ipanema / Pages API); tema iterando JSON; multi-idioma; homologação.

## 9. Arquivos
`panel/` (React+Vite+Nexo); `lib/blocks.mjs` (pdp_config/html, render, sanitização, upload,
ensureAssetsProduct); `server.mjs` (guard JWT+CORS, rotas); `lib/nuvemshop.mjs` (reuso);
`theme-morelia/templates/product.tpl` + `theme/snipplets/` (`| raw`).

## 10. Depende da Nuvemshop (fora do caminho)
Fork do Ipanema (destinos não-produto), Pages API. Nada disso bloqueia a aba Produto embedada.
