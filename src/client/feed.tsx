import { Link, useSearchParams } from 'react-router-dom'
import type { BlogSummary, Page } from '../shared/types.js'
import { useResource } from './api.js'
import { Cover, ErrorState, Loading, Pagination, PublishedDate } from './components.js'

export function Feed() {
  const [params, setParams] = useSearchParams()
  const candidate = Number(params.get('page'))
  const page = Number.isInteger(candidate) && candidate > 0 ? candidate : 1
  const tag = params.get('tag') ?? ''
  const q = params.get('q') ?? ''
  const search = new URLSearchParams({ page: String(page) })
  if (tag) search.set('tag', tag)
  if (q) search.set('q', q)
  const feed = useResource<Page<BlogSummary>>(`/blogs?${search}`)
  const go = (page: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(page)); setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <main>
    <section className="intro">
      <p className="eyebrow">THE VETIFY JOURNAL</p><div className="intro-row">
        <h1>Practical pet<br />care notes<span>.</span></h1>
        <p>For the animals in your life.<br />Thoughtful reads on their health,<br />habits, and everyday care.</p>
      </div>
    </section>
    <div className="feed-toolbar"><p><span className="live-dot" />{tag ? `Tagged: ${tag}` : 'From the journal'}
      {(tag || q) && <Link to="/blogs">Clear filters</Link>}</p>
      <form key={q} onSubmit={event => {
        event.preventDefault()
        const query = String(new FormData(event.currentTarget).get('q') ?? '').trim()
        const next = new URLSearchParams(params); next.delete('page')
        if (query) next.set('q', query); else next.delete('q')
        setParams(next)
      }}><label className="sr-only" htmlFor="search">Search articles</label>
        <input id="search" name="q" type="search" minLength={2} maxLength={80} placeholder="Search the journal" defaultValue={q} />
        <button type="submit" aria-label="Search articles">Search</button></form>
    </div>
    {feed.loading ? <Loading /> : feed.error ? <ErrorState error={feed.error} retry={feed.reload} /> :
      !feed.data?.items.length ? <div className="state"><p className="eyebrow">ROOM FOR NEW IDEAS</p>
        <h2>{tag || q ? 'No articles match yet.' : 'The journal is taking shape.'}</h2>
        <p>{tag || q ? 'Try another search or browse all articles.' : 'Published articles will appear here. Come back for practical notes on animal care.'}</p>
        {(tag || q) && <Link to="/blogs">Browse all articles</Link>}</div> :
        <div className="article-grid">{feed.data.items.map((post, i) => <article key={post.id} className="article-card">
          <Link className="image-link" to={`/blogs/${post.slug}`} aria-label={`Read ${post.title}`}><Cover key={post.coverUrl} url={post.coverUrl} />
            <span className="article-number">{String((page - 1) * 9 + i + 1).padStart(2, '0')}</span></Link>
          <div className="article-meta"><PublishedDate value={post.publishedAt} /><span>VETIFY JOURNAL</span></div>
          <h2><Link to={`/blogs/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p>
          <div className="card-bottom"><div className="tags">{post.tags.map(t => <Link key={t} to={`/blogs?tag=${encodeURIComponent(t)}`}>{t}</Link>)}</div>
            <Link to={`/blogs/${post.slug}`} aria-label={`Read ${post.title}`}>Read ↗</Link></div>
        </article>)}</div>}
    <Pagination page={page} pages={feed.data?.pages ?? 0} onPage={go} />
    <aside className="reading-note"><span>✳</span><p>A little knowledge. A lot of care.<small>Educational articles support informed care. They do not replace an examination by your veterinarian.</small></p></aside>
  </main>
}
