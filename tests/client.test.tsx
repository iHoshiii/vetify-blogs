// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Feed } from '../src/client/feed.js'
import { Detail } from '../src/client/detail.js'
import { BlogBody, Cover } from '../src/client/components.js'
import { AuthGate } from '../src/client/auth.js'

const post = { id: '1', title: 'Care for older cats', slug: 'care-for-older-cats', excerpt: 'Things to watch for.',
  coverUrl: null, tags: ['cats'], publishedAt: '2026-10-14T00:00:00.000Z', authorId: 'author', status: 'published',
  body: 'Healthy daily routines for cats.', createdAt: '2026-10-14T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z' }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(status < 400 ? { data } : { error: data }), { status })
beforeEach(() => { vi.stubGlobal('scrollTo', vi.fn()) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const feed = () => render(<MemoryRouter><Feed /></MemoryRouter>)
describe('public reading states and safe rendering', () => {
  it('shows slow loading and an honest empty state', async () => {
    let complete!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { complete = resolve })))
    feed()
    expect(screen.getByRole('status')).toHaveTextContent('Loading articles')
    complete(reply({ items: [], total: 0, page: 1, limit: 9, pages: 0 }))
    expect(await screen.findByRole('heading', { name: 'The journal is taking shape.' })).toBeInTheDocument()
  })
  it('retries failed feeds and paginates without retaining stale content', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply('Temporarily unavailable', 503))
      .mockResolvedValueOnce(reply({ items: [post], total: 10, page: 1, limit: 9, pages: 2 }))
      .mockResolvedValueOnce(reply({ items: [{ ...post, id: '2', title: 'Page two article' }], total: 10, page: 2, limit: 9, pages: 2 }))
    vi.stubGlobal('fetch', fetcher)
    feed()
    expect(await screen.findByRole('alert')).toHaveTextContent('Temporarily unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: post.title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Page two article' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: post.title })).not.toBeInTheDocument()
  })
  it('renders safe Markdown without active markup or unsafe URLs', () => {
    const { container } = render(<BlogBody>{'<script>alert(1)</script>\n\n[click](javascript:alert%281%29)\n\n![image](data:image/svg+xml,evil)\n\n[good](https://example.com)\n\n**Helpful**'}</BlogBody>)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Helpful').tagName).toBe('STRONG')
    expect(screen.getByRole('link', { name: 'good' })).toHaveAttribute('rel', 'noopener noreferrer')
  })
  it('uses a fallback after an image fails', () => {
    const { container } = render(<Cover url="https://example.com/image.png" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.cover-placeholder')).toBeInTheDocument()
  })
  it('shows an identical missing article state on a private or absent slug', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('Post not found', 404)))
    render(<MemoryRouter initialEntries={['/blogs/hidden']}><Routes>
      <Route path="/blogs/:slug" element={<Detail />} /></Routes></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Post not found.' })).toBeInTheDocument()
    expect(screen.queryByText(post.body)).toBeNull()
  })
  it('keeps protected UI unavailable on an auth outage or insufficient role', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply('Main sign-in awaiting integration', 503)))
    const view = render(<AuthGate>{() => <p>Protected editor</p>}</AuthGate>)
    expect(await screen.findByRole('heading', { name: 'Sign-in is unavailable.' })).toBeInTheDocument()
    expect(screen.queryByText('Protected editor')).toBeNull()
    view.unmount()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ id: '1', role: 'professional', name: 'Author' })))
    render(<AuthGate admin>{() => <p>Moderation secrets</p>}</AuthGate>)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Only current administrators'))
    expect(screen.queryByText('Moderation secrets')).toBeNull()
  })
})
