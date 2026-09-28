# components — UI kit do painel swtchr

Porte do painel Nuvemshop. Tudo exportado por `components/index.ts`. Estilo = classes `sw-*` em `styles/css.ts` (injetado por `<GlobalStyles />` no App — não importe CSS).

```ts
import { Button, Card, Field, Input, Select, ColorField, Dropzone, BlockCard, DraftBar, PreviewPane, EditorSplit } from '../components'
import { SortableList, SortableItem, DragHandle, arrayMove, uid } from '../dnd'
import { useShell } from '../shell/ShellContext' // session, draft, refreshDraft, dirty/setDirty, focus/setFocus, notify
```

| Componente | Props |
|---|---|
| `Button` | `variant?: 'primary'\|'soft'\|'ghost'\|'link'\|'danger'`, `loading?`, `small?` + atributos de `<button>` (type default `button`) |
| `Card` | `title?`, `actions?`, `tight?`, `flat?` + atributos de `<div>` |
| `Modal` | `title`, `onClose`, `footer?`, `width?`, children. Fecha no Esc e clique fora |
| `Toggle` | `checked`, `onChange(bool)`, `label?`, `disabled?`, `testid?` |
| `Segmented` | `options: {value,label}[]`, `value`, `onChange(value)` |
| `Spinner` | `label?` (sem label = só o círculo) |
| `EmptyState` | `title?`, children (texto), `action?` |
| `Badge` | `tone?: 'brand'\|'ok'\|'warn'\|'danger'\|'muted'\|'soon'`, `dot?`, `title?` |
| `Field` | `label?`, `help?`, `error?`, `htmlFor?`, `full?` (linha inteira em `.sw-fields`), `toggle?`, children |
| `Input` | `value`, `onChange(value: string, e)`, `pill?`, `invalid?` + atributos de `<input>` |
| `TextArea` | `value`, `onChange(value, e)`, `invalid?`, `rows?` |
| `Select` | `value`, `onChange(value, e)`, `options?: {value,label,disabled?}[]` (ou `<option>` children), `placeholder?` (opção vazia), `invalid?` |
| `ColorField` | `value?`, `onChange(value)` (`''` = herda), `label?`, `help?`, `allowTokens?: string[]` (chips que gravam o nome do token), `placeholder?` |
| `SpacingCross` | `margin?`, `padding?` (`{t,r,b,l}` strings), `onChange('margin'\|'padding', sides)` |
| `Dropzone` | `value?: string`, `onChange(url \| undefined)`, `upload(file) => Promise<string>`, `label?`, `accept?` (default `image/*,video/mp4,video/webm`), `minHeight?`, `maxWidth?`. Preview de imagem ou vídeo; chips trocar/remover |
| `Message` | `kind?: 'info'\|'ok'\|'err'`, `box?`, children — mensagem inline |
| `useToasts()` + `ToastStack` | já montados no App; nas views use `useShell().notify(text, kind?, ms?)` |
| `BlockPreview` | `type` ($componentKey), `native?` (desenho de cadeado). Keys com arte: `PREVIEW_KEYS` |
| `BlockCard` | `title`, `previewKey`, `locked?` (nativa: cadeado, não expande, ainda arrasta), `hidden?`, `meta?`, `badges?`, `open?`, `onToggleOpen?`, `dragHandleProps?`, `actions?`, children = corpo aberto |
| `BlockPickerModal` | `components: ComponentDef[]` (mostra só `swtchr: true` salvo `includeNative`), `onAdd(def)`, `onClose`, `title?`, `soon?: {key,label}[]`. `cleanTitle(t)` tira o prefixo "swtchr · " |
| `EditorSplit` | `form`, `preview?`, `rail?` — grid formulário + preview sticky. No modo foco (`useShell().focus`) o formulário fica escondido (montado) e a coluna vira a trilha `rail` (~76px, use `.sw-rail` + `.sw-rail__item`/`__thumb`/`__glyph`); <1200px o foco só esconde o formulário |
| `PreviewPane` | `url?`, `busy?`, `device?`/`onDeviceChange?` (`'desktop'\|'mobile'`, 100% vs 390px), `reloadKey?` (muda → recarrega iframe), `caption?`, `unsaved?`, `live?: {type, payload} | Array<{type, payload}>`. Botão "Foco ⤢"/"Sair do foco" alterna `focus` do shell (Esc sai). `live` = preview ao vivo via postMessage (abaixo) |
| `DraftBar` | `title?`, `status: 'clean'\|'dirty'\|'draft'\|'live'`, `statusText?`, `onSave?`, `onDiscard?`, `onPublish?`, `saving?`, `discarding?`, `publishing?`, `extra?` |
| `Logo` | `color?`, `height?` (22), `className?` |
| `cx(...)` | junta classes |

## dnd (`app/dnd`)

`SortableList { ids, onReorder(from, to) }` · `SortableItem { id, disabled?, children: ({ dragHandleProps, isDragging }) => node }` · `DragHandle {...dragHandleProps, disabled?}` · `arrayMove(arr, from, to)` · `uid()`.

## Classes úteis sem componente

`sw-fields` (grid fluido de campos), `sw-settings-grid`, `sw-slide*` (itens repetíveis), `sw-acc__head`/`sw-acc__chevron(--open)` (accordion), `sw-row*`, `sw-label`, `sw-h3`, `sw-eyebrow`, `sw-meta`, `sw-stack`, `sw-inline`, `sw-spread`, `sw-divider`, `anim-up`/`anim-fade` (com `--delay`).

## Modo foco e preview ao vivo

- **Foco** é estado global (`ShellContext.focus`/`setFocus`): `.sw-shell--focus` (232px → 76px, sidebar em pílulas abreviadas) e `.sw-editor--focus` (formulário → trilha). Trocar de aba ou Esc sai do foco. Cada view passa sua trilha em `EditorSplit rail` (Home: thumbs dos blocos; Tema: grupos) e, no clique, chama `setFocus(false)` e rola até o item depois da transição (~380ms).
- **Preview ao vivo** (`PreviewPane live`): painel → iframe `postMessage({ source: 'swtchr-admin', type: live.type, props: live.payload }, origin da url)` quando o JSON de `live` muda (na hora se nada foi enviado nos últimos 150ms; senão no fim da janela), no `onLoad` e A CADA `{ source: 'swtchr-store', type: 'swtchr:ready' }` recebido (conferido `event.source === iframe.contentWindow`; pode vir várias vezes — section que monta tarde pede reenvio; nunca recarrega o iframe). O auto-retry (tela de senha da VTEX) só recarrega um iframe que nunca mandou `ready`. Depois do `ready` mostra o badge "ao vivo". `live` aceita um objeto OU um array de `{type, payload}`: cada item vira um `postMessage` próprio, na ordem (objeto único continua igual). O Tema manda um array: `{ type: 'swtchr:theme', payload: data da SwtchrTheme (toData) }` + `{ type: 'swtchr:global', payload: { sections: [{ key: 'SwtchrHeader', data }, { key: 'SwtchrFooter', data }] } }` (só as sections presentes; a loja escuta em `useLiveGlobal`). A Home tem TODO.
