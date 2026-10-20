// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import { EditorForm } from '../src/client/editor-form.js'
import type { Blog } from '../src/shared/types.js'

const post: Blog = { id: '1', title: 'Cats in later life', slug: 'cats-in-later-life',
  excerpt: 'Habits to watch as your cat gets older.', body: 'Discuss changes to habits with your veterinarian. '.repeat(3),
  tags: ['cats'], coverUrl: null, authorId: '111111111111111111111111', status: 'draft',
  publishedAt: null, createdAt: '2026-10-14T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z' }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('author editor', () => {
  it('sends authored fields and shows a durable hold outcome without claiming publication', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...post, status: 'flagged' } })))
    vi.stubGlobal('fetch', fetcher)
    const onSave = vi.fn()
    const view = render(<MemoryRouter><EditorForm post={post} onSave={onSave} /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Save as'), { target: { value: 'published' } })
    fireEvent.submit(view.container.querySelector('form')!)
    expect(await screen.findByRole('status')).toHaveTextContent('Saved privately for moderation')
    expect(onSave).toHaveBeenCalledOnce()
    const [path, init] = fetcher.mock.calls[0]
    expect(path).toBe('/api/v1/blogs/1')
    expect(init.method).toBe('PATCH')
    const input = JSON.parse(init.body)
    expect(input.status).toBe('published')
    expect(input).not.toHaveProperty('authorId')
    expect(input).not.toHaveProperty('moderation')
  })
  it('retains the writing and provides an error when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Main authentication unavailable' }), { status: 503 })))
    const view = render(<MemoryRouter><EditorForm post={post} onSave={vi.fn()} /></MemoryRouter>)
    fireEvent.submit(view.container.querySelector('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Main authentication unavailable')
    expect(screen.getByLabelText('Article in Markdown')).toHaveValue(post.body)
    expect(screen.getByRole('button', { name: 'Save article' })).toBeEnabled()
  })
  it('disables a held professional post and omits status changes in moderator text edits', async () => {
    const view = render(<MemoryRouter><EditorForm post={{ ...post, status: 'flagged' }} readOnly onSave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByLabelText('Title')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save article' })).toBeDisabled()
    expect(screen.queryByLabelText('Save as')).toBeNull()
    view.unmount()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ...post, status: 'flagged' } }))))
    const editable = render(<MemoryRouter><EditorForm post={{ ...post, status: 'flagged' }} onSave={vi.fn()} /></MemoryRouter>)
    expect(screen.getByLabelText('Title')).toBeEnabled()
    fireEvent.submit(editable.container.querySelector('form')!)
    await screen.findByRole('status')
    const fetcher = vi.mocked(fetch)
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).not.toHaveProperty('status')
  })
})
