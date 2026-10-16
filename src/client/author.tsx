import { Link, useParams } from 'react-router-dom'
import type { Blog, BlogSummary, Page } from '../shared/types.js'
import { useResource } from './api.js'
import { AuthGate } from './auth.js'
import { ErrorState, Loading, Pagination } from './components.js'
import { EditorForm } from './editor-form.js'
import { useState } from 'react'

function ExistingEditor({ id }: { id: string }) {
  const query = useResource<Blog>(`/author/blogs/${encodeURIComponent(id)}`)
  if (query.loading) return <Loading />
  if (query.error) return <ErrorState error={query.error} retry={query.reload} />
  return <EditorForm key={`${id}:${query.data?.updatedAt}`} post={query.data} onSave={query.reload} />
}
function AuthorDesk() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const posts = useResource<Page<BlogSummary>>(`/author/blogs?page=${page}`)
  return <main>
    <div className="workspace-links"><Link to="/write">New article</Link><Link to="/admin">Moderation</Link></div>
    {id ? <ExistingEditor id={id} /> : <EditorForm onSave={posts.reload} />}
    <section className="author-posts"><h2>Your articles</h2>
      {posts.loading ? <Loading /> : posts.error ? <ErrorState error={posts.error} retry={posts.reload} /> :
        !posts.data?.items.length ? <p>No articles yet. Save a draft above to get started.</p> :
          posts.data.items.map(post => <Link className="post-row" key={post.id} to={`/write/${post.id}`}>
            <span>{post.title}</span><span className={`status ${post.status}`}>{post.status}</span></Link>)}
      <Pagination page={page} pages={posts.data?.pages ?? 0} onPage={setPage} />
    </section>
  </main>
}
export function Author() { return <AuthGate>{() => <AuthorDesk />}</AuthGate> }
