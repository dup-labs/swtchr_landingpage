# SWTCHR — Design System & Tom de Voz

> Produto de dup.agency. Plataforma de blocos configuráveis para lojas virtuais — sem ticket, sem dev, sem espera.

---

## 1. Identidade

**Tagline:** SWITCH YOUR STATE  
**Promessa central:** O jeito de operar uma loja virtual muda de vez.  
**Atribuição:** by dup.agency  
**Localização:** São Paulo · LAT -23.5505° · LON -46.6333°

---

## 2. Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `--color-ink` | `#0D1015` | Texto primário, H1, strong |
| `--color-brand` | `#639BFC` | Accent, CTA, badge, eyebrow, spinner |
| `--color-sky` | `#C5E2FA` | Destaque suave, palette decorativa |
| `--color-muted` | `#8F94A7` | Texto secundário, body copy |
| `--color-line` | `#DFE3EC` | Divisores, ícones decorativos |
| `--color-subtle` | `#C5CBE0` | Labels terciários, rodapé |
| `--color-surface` | `#F9FAFC` | Background da página |
| `--color-white` | `#ffffff` | Nav, cards, logo invertido |

**Usos compostos:**
- Badge fill: `rgba(99, 155, 252, 0.08)` + border `rgba(99, 155, 252, 0.2)`
- Card glass: `rgba(255, 255, 255, 0.55)` + `backdrop-filter: blur(16px)`
- Divisor nav: `rgba(13, 16, 21, 0.06)`

---

## 3. Tipografia

**Família:** Space Grotesk  
**Pesos carregados:** 300 · 400 · 500 · 600 · 700

### Escala

| Papel | Tamanho | Peso | Letter-spacing | Transform | Line-height |
|---|---|---|---|---|---|
| H1 / Display | `clamp(80px, 8.5vw, 128px)` | 700 | `0.06em` | uppercase | `0.92` |
| Eyebrow | `10px` | 700 | `0.22em` | uppercase | — |
| Body | `15px` | 400 | `0.01em` | — | `1.7` |
| Card copy | `14px` | 400 | `0.03em` | — | `1.75` |
| Label / caption | `11px` | 300–400 | `0.05–0.06em` | — | — |
| Badge | `9px` | 700 | `0.2em` | uppercase | — |
| Attribution | `11px` | 300 | `0.05em` | — | — |

**Regra geral:** quanto menor o texto, maior o letter-spacing. Títulos têm tracking fechado; labels e badges têm tracking muito aberto.

---

## 4. Espaçamento

| Token | Valor | Contexto |
|---|---|---|
| `--space-nav-h` | `64px` | Altura da nav |
| `--space-page-x` | `56px` | Padding horizontal desktop |
| `--space-page-x-sm` | `24px` | Padding horizontal mobile |
| `--space-bottom` | `52px` | Distância do rodapé ao conteúdo |
| `--space-divider-v` | `28px` | Margem vertical do divisor |
| `--space-eyebrow-b` | `20px` | Espaço entre eyebrow e H1 |
| `--space-badge-gap` | `8px` | Gap interno do badge |

---

## 5. Componentes

### Nav
- Altura: `64px`, fundo branco, `border-bottom: 1px solid rgba(13,16,21,0.06)`
- Esquerda: logo SVG (branco, invertido sobre fundo claro) + attribution "by dup.agency" em `--color-muted`
- Direita: badge de status

### Badge
- Shape: `border-radius: 6px`, padding `5px 14px`
- Estilo: pill com fill sutil + borda em `--color-brand`
- Dot indicador: `5px` círculo sólido na cor brand
- Tipografia: 9px, 700, uppercase, letter-spacing `0.2em`

### Card (glassmorphism)
- `border-radius: 20px`
- Background: `rgba(255,255,255,0.55)` + `backdrop-filter: blur(16px)`
- Padding: `24px 26px`
- Texto muted com `strong` em `--color-ink` peso 700

### Eyebrow + H1 + Divider
- Eyebrow (10px, brand, caps) → gap 20px → H1 (display) → Divider 40×1px `--color-line` com 28px de margem → Body copy

### Divider decorativo
- `40px` largura, `1px` altura, cor `--color-line`

### Palette dots
- Círculos de `14px` com `gap: 5px`
- Exibidos na sequência: ink → brand → sky → muted

### Ícones decorativos
- Biblioteca: **Phosphor Icons** (estilo Regular)
- Ícones em uso: `ph-fingerprint`, `ph-line-segments`, `ph-checks`, `ph-arrows-out`
- Cor: `--color-line` quando decorativos
- Tamanho decorativo: 22–36px

---

## 6. Animações

| Nome | Descrição | Easing | Duração |
|---|---|---|---|
| `fadeIn` | `opacity: 0 → 1` | `ease-out` | `0.5–0.6s` |
| `slideUp` | `opacity: 0 + translateY(18px) → estado final` | `cubic-bezier(0.2, 0, 0, 1)` | `0.8s` |
| `spin` | Rotação contínua (loader) | `linear` | `0.9s infinite` |

**Delays escalonados:** 0.15s · 0.25s · 0.5s · 0.55s · 0.6s · 0.7s (hero primeiro, decorações por último)

**Interatividade:**
- Desktop: `mousemove` mapeia posição X para frame do vídeo (0–59)
- Touch/mobile: ping-pong automático pelos frames a `7.5 frames/s`
- Total: 60 frames capturados do vídeo a `jpeg 0.85`

---

## 7. Layout

- **Canvas:** `100vw × 100vh`, `overflow: hidden` — experiência imersiva, sem scroll
- **Grid:** posicionamento absoluto com âncoras fixas (left/right `56px`, bottom `52px`)
- **Headline:** lado esquerdo, verticamente centrada em `top: 30%`
- **Card:** lado direito, espelhado
- **Personagem/vídeo:** centralizado, ancorado ao `bottom: 0`
- **Nav:** sobreposta no topo (z-index 20)

**Mobile (≤768px):**
- Padding reduz para `24px`
- Card, arrows e icon-dec desaparecem
- Headline ocupa `left: 24px` com texto sobre o vídeo em fullscreen

---

## 8. Tom de Voz

### Personalidade
SWTCHR fala como alguém que já perdeu tempo demais com burocracia e resolveu o problema de vez. Direto, confiante, sem firulas. Não explica o óbvio nem pede licença para ser assertivo.

### Princípios

**1. Curto e certeiro**  
Cada frase carrega peso. Nada de introductions, nada de hedge. Se pode ser dito em 5 palavras, não usa 10.

**2. Ritmo por repetição**  
Usa anáfora e listas paralelas para criar cadência: *"Sem ticket. Sem dev. Sem espera."* — o padrão cria momentum mesmo no silêncio entre as frases.

**3. Definitivo, não tentativo**  
*"muda de vez"* — não "pode mudar", não "ajuda a mudar". A linguagem é afirmativa. Sem condicionais desnecessários.

**4. Code-switch estratégico**  
Nome da marca em inglês (`SWTCHR`), tagline em inglês (`SWITCH YOUR STATE`), copy operacional em PT-BR. O inglês sinaliza produto global; o português cria proximidade com o operador de loja brasileiro.

**5. Nenhuma palavra morna**  
Evitar: *solução*, *inovador*, *intuitivo*, *fácil*, *robusto*, *ecossistema*. Preferir verbos e substantivos concretos.

### Exemplos de voz

| Errado | Certo |
|---|---|
| "Uma solução inovadora para e-commerce" | "O jeito de operar uma loja virtual muda de vez." |
| "Configure facilmente seus blocos" | "Blocos configuráveis direto no painel." |
| "Sem precisar de um desenvolvedor" | "Sem ticket. Sem dev. Sem espera." |
| "Estamos quase prontos para lançar" | "O site está quase pronto." |

### Hierarquia de cópia

```
EYEBROW       → posiciona o contexto em caps (ex: SWITCH YOUR STATE)
H1            → statement principal, sem verbo, impactante
DIVIDER       → pausa visual
BODY          → uma ideia só, ≤ 2 linhas
STRONG        → a frase que não pode ser ignorada
```

---

## 9. Referências de Marca

- **Logotipo:** wordmark SVG customizado, todas as letras em uppercase com traços geométricos
- **Logotipo em uso:** branco sobre fundos escuros, `filter: invert(1)` sobre fundos claros
- **Handle:** @swtchr
- **Atribuição:** by dup.agency
- **Localização:** São Paulo aparece como coordenadas — não como texto, como dado
- **Rodapé técnico:** *"cores — espaçamentos — alinhamentos"* como manifesto visual minimalista

---

## 10. Decisões de Produto (confirmadas)

### Tema
- **Light mode only** — sem dark mode no roadmap
- Paleta: fundo claro `#F9FAFC`, tons azuis (`#639BFC`, `#C5E2FA`) e cinzas (`#8F94A7`, `#DFE3EC`, `#C5CBE0`)
- Elementos de destaque podem usar tons mais fortes dentro da paleta existente

### Efeitos visuais
- **Glassmorphism e liquid glass** são recursos ativos — usar em cards, overlays e elementos elevados
- Sem gradientes de marca por enquanto — paleta sólida; gradientes serão amadurecidos em versão futura

### Carrossel / conteúdo social
- **CTA padrão:** lista de espera · link na bio
- **Quantidade de slides:** 4–8 por carrossel
- **Handle:** @swtchr
