import { describe, it, expect } from 'vitest'
import { testDatabase, input, ids } from './setup.js'
import { BLOG_STATUSES } from '../src/shared/schemas.js'

describe('complete moderation transition matrix', () => {
  const db = testDatabase()
  it('checks every state against every moderator decision and records every successful transition', async () => {
    const cases = ['approve', 'hide', 'remove', 'restore'] as const
    for (const from of BLOG_STATUSES) {
      for (const decision of cases) {
        const post = await db.store.create({ ...input, tags: [], status: 'draft' }, ids.pro)
        await db.store.posts.updateOne({ _id: post._id }, { $set: { status: from } })
        const allowed = decision === 'approve' ? from === 'flagged' : decision === 'hide' ? from !== 'hidden' :
          decision === 'remove' ? from !== 'removed' : ['hidden', 'removed'].includes(from)
        const result = await db.call('patch', `/admin/blogs/${post._id}/${decision}`, 'admin')
          .send({ reason: 'Reviewed the article for this transition.' })
        expect(result.status, `${from} -> ${decision}`).toBe(allowed ? 200 : 409)
        const audit = await db.store.audits.find({ targetId: post._id }).toArray()
        expect(audit.length).toBe(allowed ? 1 : 0)
        if (allowed) {
          const to = decision === 'approve' ? 'published' : decision === 'hide' ? 'hidden' : decision === 'remove' ? 'removed' : 'draft'
          expect(result.body.data.status).toBe(to)
          expect(audit[0].metadata.statusFrom).toBe(from)
          expect(audit[0].metadata.statusTo).toBe(to)
          expect(audit[0].actor.toHexString()).toBe(ids.admin)
        }
      }
    }
  })
  it('keeps an unavailable aggregate response explicit when the database query fails', async () => {
    const { vi } = await import('vitest')
    const spy = vi.spyOn(db.store.posts, 'aggregate').mockImplementationOnce(() => { throw new Error('Offline') })
    expect((await db.call('get', '/admin/aggregates', 'admin')).status).toBe(503)
    spy.mockRestore()
  })
})
