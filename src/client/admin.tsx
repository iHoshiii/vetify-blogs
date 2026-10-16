import { useState } from 'react'
import type { AdminBlog, Page } from '../shared/types.js'
import { BLOG_STATUSES } from '../shared/schemas.js'
import { useResource } from './api.js'
import { AuthGate } from './auth.js'
import { ErrorState, Loading, Pagination } from './components.js'
import { AdminReview } from './admin-review.js'

function Moderation() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [id, setId] = useState('')
  const queue = useResource<Page<Omit<AdminBlog, 'body'>>>(`/admin/blogs?page=${page}${status ? `&status=${status}` : ''}`)
  const counts = useResource<{ counts: Record<string, number> }>('/admin/aggregates')
  return <main><p className="eyebrow">EDITORIAL CONTROL</p><h1>Care for what we share.</h1>
    <p className="muted">Review held articles and keep a clear record of every decision.</p>
    {counts.data && <div className="counts">{BLOG_STATUSES.map(s => <span key={s}>{s} <strong>{counts.data?.counts[s] ?? 0}</strong></span>)}</div>}
    {counts.error && <p role="status">Article counts are unavailable.</p>}
    <label className="filter">Status<select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
      <option value="">All statuses</option>{BLOG_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label>
    <div className="moderation-layout"><section className="queue" aria-label="Moderation queue">
      {queue.loading ? <Loading /> : queue.error ? <ErrorState error={queue.error} retry={queue.reload} /> :
        !queue.data?.items.length ? <p className="state">No articles in this queue.</p> : queue.data.items.map(p =>
          <button key={p.id} aria-pressed={id === p.id} className="queue-item" onClick={() => setId(p.id)}>
            <span className={`status ${p.status}`}>{p.status}</span><strong>{p.title}</strong>
            <small>{p.moderation?.outcome === 'unavailable' ? 'Check needs retry or review' : `Severity ${p.moderation?.severity ?? 0}`}</small></button>)}
      <Pagination page={page} pages={queue.data?.pages ?? 0} onPage={setPage} />
    </section>{id ? <AdminReview key={id} id={id} onChange={() => { queue.reload(); counts.reload() }} /> :
      <section className="state"><h2>Choose an article to review.</h2><p>The queue lists the highest screening severity first.</p></section>}</div>
  </main>
}
export function Admin() { return <AuthGate admin>{() => <Moderation />}</AuthGate> }
