import React, { useRef, useState } from 'react'

import { cx } from './cx'
import { Spinner } from './primitives'

const DEFAULT_ACCEPT = 'image/*,.svg,video/mp4,video/webm'
const VIDEO_URL = /\.(mp4|webm)(\?|#|$)/i
const SVG_URL = /\.svg(\?|#|$)|^data:image\/svg\+xml/i

/** mime pela extensão — alguns navegadores/SOs mandam `type` vazio (acontece com .svg) e o servidor recusa */
const EXT_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

/** Garante o `type` do arquivo (a partir da extensão) antes do upload. */
function withMime(file: File): File {
  const mime = EXT_MIME[extOf(file.name || '')]
  if (!mime || file.type === mime) return file
  // SVG às vezes chega como text/xml; os demais só corrigimos quando o type vem vazio/genérico
  if (mime !== 'image/svg+xml' && file.type && file.type !== 'application/octet-stream') return file
  try {
    return new File([file], file.name, { type: mime })
  } catch (e) {
    return file
  }
}

/** URL aponta pra SVG? (preview em `contain`, sem cortar o logo) */
export function isSvgUrl(url?: string): boolean {
  return !!url && SVG_URL.test(url)
}

/** URL aponta pra vídeo (mp4/webm)? */
export function isVideoUrl(url?: string): boolean {
  return !!url && VIDEO_URL.test(url)
}

/** Confere o arquivo contra a string `accept` (mime exato, curinga "image/*" ou extensão ".mp4"). */
function accepts(file: File, accept: string): boolean {
  const type = (withMime(file).type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.charAt(0) === '.') return name.slice(-rule.length) === rule
      if (rule.slice(-2) === '/*') return type.indexOf(rule.slice(0, -1)) === 0
      return type === rule
    })
}

const IconImage = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="26" height="22" rx="3" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="11" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6 24l7-7 5 5 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export interface DropzoneProps {
  /** URL atual da mídia */
  value?: string
  /** URL nova após upload, ou undefined ao remover */
  onChange: (url: string | undefined) => void
  /** faz o upload e resolve com a URL pública (ex.: api.upload) */
  upload: (file: File) => Promise<string>
  /** legenda abaixo da caixa */
  label?: React.ReactNode
  /** default: "image/*,.svg,video/mp4,video/webm" */
  accept?: string
  /** altura mínima da caixa (default: proporção 4:3) */
  minHeight?: number
  /** largura máxima (default 380) */
  maxWidth?: number | string
}

/** Uploader: clique ou arraste → upload(file) → URL. Preview de imagem ou vídeo; chips trocar/remover. */
export function Dropzone({ value, onChange, upload, label, accept, minHeight, maxWidth }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState('')
  const acc = accept || DEFAULT_ACCEPT
  const allowsVideo = acc.indexOf('video') !== -1 || acc.indexOf('.mp4') !== -1 || acc.indexOf('.webm') !== -1

  const pick = () => {
    if (!busy && inputRef.current) inputRef.current.click()
  }

  const send = async (f?: File | null) => {
    if (!f) return
    if (!accepts(f, acc)) {
      setErr(allowsVideo ? 'Formato não aceito. Use imagem ou vídeo MP4/WebM.' : 'Formato não aceito. Use uma imagem.')
      return
    }
    setErr('')
    setBusy(true)
    try {
      const url = await upload(withMime(f))
      onChange(url)
    } catch (e) {
      setErr('Falha no upload: ' + (e && (e as Error).message ? (e as Error).message : String(e)))
    }
    setBusy(false)
  }

  const video = isVideoUrl(value)
  const svg = !video && isSvgUrl(value)

  return (
    <div style={{ flex: '1 1 240px', minWidth: 0, maxWidth: maxWidth === undefined ? 380 : maxWidth }}>
      <div
        className={cx('sw-drop', !!value && 'sw-drop--filled', drag && 'sw-drop--drag')}
        style={minHeight ? { minHeight } : undefined}
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            pick()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          send(e.dataTransfer.files && e.dataTransfer.files[0])
        }}
      >
        {value && !busy ? (
          <React.Fragment>
            {video ? (
              <video className="sw-drop__preview" src={value} muted loop autoPlay playsInline />
            ) : (
              <img
                className={cx('sw-drop__preview', svg && 'sw-drop__preview--contain')}
                src={value}
                alt=""
                style={svg ? { objectFit: 'contain', padding: 16, boxSizing: 'border-box' } : undefined}
              />
            )}
            {video ? <span className="sw-badge sw-badge--soon sw-drop__kind">vídeo</span> : null}
            <div className="sw-drop__actions">
              <button
                type="button"
                className="sw-drop__chip"
                onClick={(e) => {
                  e.stopPropagation()
                  pick()
                }}
              >
                trocar
              </button>
              <button
                type="button"
                className="sw-drop__chip"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(undefined)
                }}
              >
                remover
              </button>
            </div>
          </React.Fragment>
        ) : busy ? (
          <Spinner label="enviando…" />
        ) : (
          <React.Fragment>
            <IconImage />
            <span style={{ fontSize: 11, letterSpacing: '0.04em' }}>
              {allowsVideo ? 'clique ou arraste imagem ou vídeo' : 'clique ou arraste a imagem'}
            </span>
          </React.Fragment>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={acc}
          hidden
          onChange={(e) => {
            send(e.target.files && e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>
      {label ? <div className="sw-drop__caption">{label}</div> : null}
      {err ? <div className="sw-drop__err">{err}</div> : null}
    </div>
  )
}
