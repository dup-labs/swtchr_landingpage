import type { PublishResult } from '../api/types'
import type { ShellState } from './ShellContext'

/**
 * Toast do espelho no catálogo (swtchr_data) depois de publicar.
 * Sem `mirror` (nenhuma PDP de produto na publicação) → não diz nada.
 */
export function notifyMirror(result: PublishResult | null | undefined, notify: ShellState['notify']) {
  const rows = result && result.mirror ? result.mirror : []
  if (!rows.length) return
  const failed = rows.filter((r) => !r.ok)
  const warned = rows.filter((r) => r.ok && r.warning)
  if (failed.length) {
    const list = failed
      .slice(0, 3)
      .map((r) => r.linkText + (r.error ? ' (' + r.error + ')' : ''))
      .join('; ')
    notify(
      'Publicado, mas o espelho no catálogo falhou em ' + failed.length + ' produto(s): ' + list + (failed.length > 3 ? '…' : ''),
      'err',
      9000
    )
    return
  }
  const n = rows.length
  notify(
    'Conteúdo de ' + n + ' produto(s) espelhado no catálogo (swtchr_data)' +
      (warned.length ? ' — atenção: ' + warned.map((r) => r.linkText + ' ' + r.warning).join('; ') : ''),
    warned.length ? 'info' : 'ok',
    warned.length ? 8000 : 5000
  )
}
