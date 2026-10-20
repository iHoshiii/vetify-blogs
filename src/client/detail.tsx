import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import type { Blog } from '../shared/types.js'
import { ApiError, useResource } from './api.js'
import { BlogBody, Cover, ErrorState, Loading, PublishedDate } from './components.js'

export function Detail() {
  const { slug = '' } = useParams()
  const query = useResource<Blog>(`/blogs/${encodeURIComponent(slug)}`)
  useEffect(() => { document.title = query.data ? `${query.data.title} | Vetify` : 'Vetify Journal' }, [query.data])
  if (query.loading) return <main><Loading /></main>
  if (query.error instanceof ApiError && query.error.status === 404) return <main className="state">
    <h1>Post not found.</h1><p>This article is unavailable.</p><Link to="/blogs">Back to the journal</Link></main>
  if (query.error) return <main><ErrorState error={query.error} retry={query.reload} /></main>
  const post = query.data
  if (!post) return null
  return <main className="detail"><article><Link className="eyebrow" to="/blogs">← ALL ARTICLES</Link>
    <h1>{post.title}</h1><div className="article-meta"><PublishedDate value={post.publishedAt} />
      <span>VETIFY JOURNAL</span></div>
    <div className="tags">{post.tags.map(tag => <Link key={tag} to={`/blogs?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</div>
    {post.coverUrl && <Cover key={post.coverUrl} url={post.coverUrl} className="detail-cover" />}
    <p className="excerpt">{post.excerpt}</p><BlogBody>{post.body}</BlogBody>
    <aside className="reading-note"><p>For learning and everyday care.<small>This article is educational and does not replace individual veterinary advice.</small></p></aside>
  </article></main>
}
