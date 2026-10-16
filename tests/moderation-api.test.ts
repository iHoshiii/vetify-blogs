import { describe, it, expect, vi } from 'vitest'
import { testDatabase, input, clean } from './setup.js'

describe('moderation decisions and durable evidence', () => {
  const db = testDatabase()
  async function create(status = 'published') {
    const result = await db.call('post', '/blogs', 'pro').send({ ...input, status })
    expect(result.status).toBe(201)
    return result.body.data as { id: string; slug: string; publishedAt: string | null }
  }
  const reason = 'Reviewed the content against the publication rules.'
  const decision = (id: string, kind: string) => db.call('patch', `/admin/blogs/${id}/${kind}`, 'admin').send({ reason })
  it('supports hide, remove, restore, approve and permanent deletion with surviving audits', async () => {
    const live = await create()
    expect((await decision(live.id, 'approve')).status).toBe(409)
    for (const kind of ['hide', 'restore', 'remove', 'restore', 'remove']) {
      const result = await decision(live.id, kind)
      expect(result.status).toBe(200)
      expect(result.body.data.publishedAt).toBe(live.publishedAt)
      if (kind !== 'restore') expect((await db.call('get', `/blogs/${live.slug}`)).status).toBe(404)
      expect((await db.call('patch', `/blogs/${live.id}`, 'pro').send({ status: 'published' })).status).toBe(kind === 'restore' ? 200 : 403)
    }
    expect((await db.call('delete', `/admin/blogs/${live.id}`, 'admin').send({ reason })).status).toBe(200)
    expect((await db.call('get', `/admin/blogs/${live.id}`, 'admin')).status).toBe(404)
    const trail = await db.call('get', `/admin/blogs/${live.id}/audit?limit=50`, 'admin')
    expect(trail.body.data.items.some((a: { action: string }) => a.action === 'blog.purged')).toBe(true)
    const removal = trail.body.data.items.find((a: { action: string }) => a.action === 'blog.removed')
    expect(removal.reason).toBe(reason)
    expect(removal.metadata.statusTo).toBe('removed')
    expect(removal.actor).toBe('333333333333333333333333')
    expect((await db.call('get', `/admin/blogs/${live.id}/audit`, 'pro')).status).toBe(403)
  })
  it('restores never-published posts to draft and validates transitions and explanations', async () => {
    const draft = await create('draft')
    expect((await decision(draft.id, 'restore')).status).toBe(409)
    expect((await decision(draft.id, 'approve')).status).toBe(409)
    expect((await db.call('delete', `/admin/blogs/${draft.id}`, 'admin').send({ reason })).status).toBe(409)
    expect((await db.call('patch', `/admin/blogs/${draft.id}/remove`, 'admin').send({})).status).toBe(400)
    expect((await db.call('patch', `/admin/blogs/${draft.id}/hide`, 'admin').send({ reason: 'tiny' })).status).toBe(400)
    expect((await decision(draft.id, 'hide')).status).toBe(200)
    expect((await decision(draft.id, 'hide')).status).toBe(409)
    expect((await decision(draft.id, 'restore')).body.data.status).toBe('draft')
  })
  it('holds provider failures, blocks author escape and supports visible manual retry or approval', async () => {
    db.screening.run = async () => { throw new Error('Provider down') }
    const post = await create()
    expect((await db.call('get', `/blogs/${post.slug}`)).status).toBe(404)
    expect((await db.call('patch', `/blogs/${post.id}`, 'pro').send({ title: 'Avoid the decision' })).status).toBe(403)
    expect((await db.call('patch', `/blogs/${post.id}`, 'admin').send({ status: 'published' })).status).toBe(403)
    const details = await db.call('get', `/admin/blogs/${post.id}`, 'admin')
    expect(details.body.data.moderation.outcome).toBe('unavailable')
    db.screening.run = async () => clean
    expect((await decision(post.id, 'retry')).body.data.status).toBe('published')
    db.screening.run = async () => ({ ...clean, outcome: 'flagged', severity: .95, categories: ['hate'] })
    const flagged = await create()
    expect((await decision(flagged.id, 'retry')).status).toBe(409)
    const approved = await decision(flagged.id, 'approve')
    expect(approved.body.data.status).toBe('published')
    expect(approved.body.data.moderation.outcome).toBe('flagged')
    expect(approved.body.data.moderation.reviewedBy).toBe('333333333333333333333333')
  })
  it('rolls back a moderation decision when its audit cannot be persisted', async () => {
    const post = await create()
    const spy = vi.spyOn(db.store.audits, 'insertOne').mockRejectedValueOnce(new Error('Audit unavailable'))
    expect((await decision(post.id, 'remove')).status).toBe(503)
    spy.mockRestore()
    expect((await db.store.byId(post.id)).status).toBe('published')
    expect(await db.store.audits.countDocuments({ action: 'blog.removed' })).toBe(0)
  })
  it('hides a pending edit immediately and prevents a late check from undoing an admin decision', async () => {
    const post = await create()
    let release!: () => void
    let started!: () => void
    const ready = new Promise<void>(resolve => { started = resolve })
    const wait = new Promise<void>(resolve => { release = resolve })
    db.screening.run = async () => { started(); await wait; return clean }
    const pending = db.call('patch', `/blogs/${post.id}`, 'pro').send({ body: input.body + ' Updated.' }).then(r => r)
    await ready
    expect((await db.call('get', `/blogs/${post.slug}`)).status).toBe(404)
    expect((await decision(post.id, 'remove')).status).toBe(200)
    release()
    expect((await pending).status).toBe(409)
    expect((await db.store.byId(post.id)).status).toBe('removed')
  })
})
