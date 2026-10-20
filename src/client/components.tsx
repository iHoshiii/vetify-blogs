import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { safeHttps } from '../shared/schemas.js'

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return <div className="state" role="alert"><h2>We couldn’t load this.</h2><p>{error.message}</p>
    {retry && <button onClick={retry}>Try again</button>}</div>
}
export function Loading() {
  return <div className="state" role="status" aria-live="polite"><span className="spinner" />Loading articles...</div>
}
export function Cover({ url, className = '' }: { url: string | null; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!url || !safeHttps(url) || failed) return <div className={`cover-placeholder ${className}`} aria-hidden="true">V.</div>
  return <img src={url} alt="" className={`cover ${className}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
}
export function BlogBody({ children }: { children: string }) {
  return <div className="prose"><ReactMarkdown skipHtml urlTransform={url => {
    if (safeHttps(url) || (/^\/(?!\/)/.test(url) && !url.includes('\\')) || url.startsWith('#')) return url
    return ''
  }} components={{
    a: ({ href, children }) => <a href={href || undefined} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }) => src && safeHttps(src) ?
      <img src={src} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" /> : null,
  }}>{children}</ReactMarkdown></div>
}
export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages < 2 && page <= 1) return null
  return <nav className="pagination" aria-label="Pagination">
    <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {page} of {Math.max(1, pages)}</span>
    <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </nav>
}
export function PublishedDate({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{new Intl.DateTimeFormat('en', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Singapore',
  }).format(new Date(value))}</time> : <span>Unpublished</span>
}
