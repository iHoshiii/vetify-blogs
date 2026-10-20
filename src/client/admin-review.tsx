import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AdminBlog } from '../shared/types.js'
import { api, useResource } from './api.js'
import { BlogBody, Cover, ErrorState, Loading } from './components.js'
import { AuditTrail } from './audit.js'

export function AdminReview({ id, onChange }: { id: string; onChange: () => void }) {
  const post = useResource<AdminBlog>(`/admin/blogs/${id}`)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleted, setDeleted] = useState(false)
  async function decide(kind: string) {
    if (kind === 'purge' && !window.confirm('Permanently delete this removed article? Its audit history will remain.')) return
    setBusy(true); setError('')
    try {
      await api(`/admin/blogs/${id}${kind === 'purge' ? '' : `/${kind}`}`, {
        method: kind === 'purge' ? 'DELETE' : 'PATCH', body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
      })
      if (kind === 'purge') setDeleted(true)
      else post.reload()
      onChange()
    } catch (error) { setError((error as Error).message) }
    finally { setBusy(false) }
  }
  if (deleted) return <section className="state" role="status"><h2>Article deleted.</h2><AuditTrail id={id} /></section>
  if (post.loading) return <Loading />
  if (post.error) return <ErrorState error={post.error} retry={post.reload} />
  const p = post.data
  if (!p) return null
  return <article className="review"><div className="section-heading"><h2>{p.title}</h2>
    <span className={`status ${p.status}`}>{p.status}</span></div>
    <p className="muted">Author ID: {p.authorId}</p><Link to={`/write/${p.id}`}>Edit article</Link>
    {p.moderation && <section className="notice"><strong>Automatic check: {p.moderation.outcome}</strong>
      <p>{p.moderation.notes}</p><p>Severity: {p.moderation.severity}. Categories: {p.moderation.categories.join(', ') || 'None'}.</p>
      {p.moderation.terms.length > 0 && <p>Matched terms: {p.moderation.terms.join(', ')}</p>}
      <small>Model: {p.moderation.model ?? 'No provider response'}. Reviewed by: {p.moderation.reviewedBy ?? 'Awaiting review'}.</small></section>}
    {p.removedReason && <p className="notice">Takedown reason: {p.removedReason}</p>}
    {p.coverUrl && <Cover key={p.coverUrl} url={p.coverUrl} className="detail-cover" />}
    <p>{p.excerpt}</p><BlogBody>{p.body}</BlogBody>
    <fieldset disabled={busy} className="review-actions"><label>Decision explanation<textarea maxLength={500}
      value={reason} onChange={e => setReason(e.target.value)} placeholder="10 to 500 characters. Required for remove and permanent delete." /></label>
      <div className="button-row">
        {p.status === 'flagged' && <button onClick={() => void decide('approve')}>Approve</button>}
        {p.status === 'flagged' && p.moderation?.outcome === 'unavailable' && <button onClick={() => void decide('retry')}>Retry automatic check</button>}
        {p.status !== 'hidden' && <button onClick={() => void decide('hide')}>Hide</button>}
        {p.status !== 'removed' && <button onClick={() => void decide('remove')}>Remove</button>}
        {['hidden', 'removed'].includes(p.status) && <button onClick={() => void decide('restore')}>Restore</button>}
        {p.status === 'removed' && <button className="danger" onClick={() => void decide('purge')}>Permanently delete</button>}
      </div></fieldset>
    {busy && <p role="status">Saving decision...</p>}{error && <p className="notice error" role="alert">{error}</p>}
    <AuditTrail key={p.updatedAt} id={id} />
  </article>
}
