import type { Page } from '../shared/types.js'
import { useResource } from './api.js'
import { ErrorState, Loading, Pagination } from './components.js'
import { useState } from 'react'

type Audit = { _id: string; action: string; actor: string; at: string; reason: string | null;
  metadata: { statusFrom: string; statusTo: string } }
export function AuditTrail({ id }: { id: string }) {
  const [page, setPage] = useState(1)
  const audit = useResource<Page<Audit>>(`/admin/blogs/${id}/audit?page=${page}`)
  return <section className="audit"><h3>Decision history</h3>
    {audit.loading ? <Loading /> : audit.error ? <ErrorState error={audit.error} retry={audit.reload} /> :
      !audit.data?.items.length ? <p>No recorded decisions.</p> : <ol>{audit.data.items.map(a => <li key={a._id}>
        <strong>{a.action}</strong><p>{a.metadata.statusFrom} → {a.metadata.statusTo}</p>
        <small>By {a.actor}, {new Date(a.at).toISOString()}</small>{a.reason && <p>{a.reason}</p>}</li>)}</ol>}
    <Pagination page={page} pages={audit.data?.pages ?? 0} onPage={setPage} />
  </section>
}
