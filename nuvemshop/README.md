# SWTCHR × Nuvemshop — POC Blocos Editáveis

Bloco (imagem + texto) editável via formulário, gravado em **metafields** da Nuvemshop
e renderizado **server-side pelo tema** (Twig). Sem script tag, sem fetch no front —
view-source mostra o conteúdo.

- Spec: [`poc-blocos-editaveis-nuvemshop.md`](poc-blocos-editaveis-nuvemshop.md) (v2)
- Pesquisa com fontes oficiais: [`poc-plano-e-descobertas.md`](poc-plano-e-descobertas.md)

## Rodar

Precisa só de Node ≥ 18 (zero dependências).

```bash
cp .env.example .env    # preencher NUVEMSHOP_APP_ID e NUVEMSHOP_CLIENT_SECRET
node server.mjs         # sobe painel + API em http://localhost:8787
```

Com o servidor **já rodando**, instalar o app na loja demo (link aparece no console e
no painel). O callback troca o code (expira em 5 min!) pelo token e salva em
`.data/token.json`. Pronto — painel conectado.

Depois, instalar o bloco no tema da loja demo: [`theme/INSTALL.md`](theme/INSTALL.md).

## Estrutura

```
server.mjs                       # servidor + rotas (zero deps)
lib/nuvemshop.mjs                # cliente Admin API (headers duplos, User-Agent, retry 429)
lib/blocks.mjs                   # schema, upsert de metafields, porta-dados da home
public/index.html                # painel admin standalone (visual SWTCHR)
theme/snipplets/swtchr-block.tpl # o bloco em Twig
theme/INSTALL.md                 # o que colar em cada template + tabela de validação
.data/                           # token + config locais (gitignored)
```

## Critério de sucesso

Editar em cada um dos 5 destinos (home, categoria, produto, institucional, landing)
→ salvar → recarregar o storefront → conteúdo atualizado **já no HTML servido**,
sem tocar em código ou JSON.
