# Instalação do bloco no tema da loja demo

O tema da Nuvemshop é Twig (arquivos `.tpl`). A edição é feita via FTP do admin ou
pela CLI oficial. **Uma vez instalado, nunca mais se toca no tema** — todo o conteúdo
passa a vir dos metafields editados no painel.

## 1. Acesso ao código do tema

**Opção A — FTP do admin** (mais direto):
Admin da loja → Loja online → Design → **Editar o código** → **Abrir FTP** → usar as
credenciais num cliente FTP (FileZilla etc.).

> Atenção (pra conversa com cliente, não pra loja demo): loja com FTP aberto **para de
> receber atualização automática de tema** até fechar o FTP.

**Opção B — CLI oficial** (melhor DX, sincroniza no save):

```bash
npm i -g @tiendanube/cli
tiendanube theme ftp setup   # pede as credenciais FTP do admin
tiendanube theme ftp pull    # baixa o tema
tiendanube theme ftp watch   # sobe cada save e recarrega o storefront
```

## 2. Subir o snipplet

Copiar `theme/snipplets/swtchr-block.tpl` deste repo para `snipplets/swtchr-block.tpl`
no tema.

## 3. Incluir nos templates (ordem de validação da POC)

### 3.1 `product.tpl` — PRIMEIRO (caminho 100% documentado)

Onde quiser que o bloco apareça (ex.: depois da descrição):

```twig
{% include "snipplets/swtchr-block.tpl" with {swtchr_owner: product} %}
```

### 3.2 `category.tpl` — o risco real da POC

```twig
{% include "snipplets/swtchr-block.tpl" with {swtchr_owner: category} %}
```

### 3.3 `page.tpl` — institucional E landing page (mesmo template)

```twig
{% include "snipplets/swtchr-block.tpl" with {swtchr_owner: page} %}
```

### 3.4 `home.tpl` — via produto porta-dados

O primeiro save de Home no painel cria o produto porta-dados e mostra o ID
(também fica em `.data/config.json`). Colar no `home.tpl`:

```twig
{% set swtchr_holder = ['SEU_ID_AQUI'] | get_products | first %}
{% include "snipplets/swtchr-block.tpl" with {swtchr_owner: swtchr_holder} %}
```

## 4. Validar (em cada destino)

1. Editar no painel (`http://localhost:8787`) → salvar
2. Recarregar a página correspondente do storefront
3. **View-source** deve mostrar o conteúdo dentro de `<section class="swtchr-block">` —
   isso prova renderização server-side, sem fetch no front

## 5. Se categoria/página NÃO renderizarem

`category.metafields`/`page.metafields` no template não são documentados (products é).
Se não funcionarem, o fallback é o mecanismo da home: um produto porta-dados por destino,
lido via `| get_products`. Registrar o resultado na spec (seção "Resultados").

## 6. Registro do que a POC validar

| Teste | Resultado | Data |
|---|---|---|
| `product.metafields` renderiza em `product.tpl` | — | — |
| `category.metafields` renderiza em `category.tpl` | — | — |
| `page.metafields` renderiza em `page.tpl` (institucional) | — | — |
| `page.metafields` renderiza em `page.tpl` (landing) | — | — |
| `get_products` hidrata produto oculto (home) | — | — |
| Tamanho máximo do value (1KB / 10KB / 100KB) | — | — |
