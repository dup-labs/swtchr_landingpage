import React, { useEffect } from 'react'

import css from './css'

const FONT_ID = 'swtchr-font-space-grotesk'
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap'

/**
 * Injeta o CSS global do painel (classes sw-*) e a fonte Space Grotesk.
 * O admin v4 roda o app em iframe, então CSS global não vaza pro admin.
 * Montar uma vez, na raiz (App.tsx).
 */
export default function GlobalStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(FONT_ID)) return
    const pre = document.createElement('link')
    pre.rel = 'preconnect'
    pre.href = 'https://fonts.gstatic.com'
    pre.crossOrigin = 'anonymous'
    const link = document.createElement('link')
    link.id = FONT_ID
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    document.head.appendChild(pre)
    document.head.appendChild(link)
  }, [])

  return <style id="swtchr-global-styles" dangerouslySetInnerHTML={{ __html: css }} />
}
