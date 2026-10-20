import { ObjectId } from 'mongodb'
import type { Principal, Verdict } from '../../shared/types.js'
import type { BlogCreate, BlogUpdate } from '../../shared/schemas.js'
import type { Store } from '../data/store.js'
import { pendingVerdict } from '../data/store.js'
import type { Post } from '../data/types.js'
import { HttpError } from '../errors.js'

export type Screen = (input: Pick<Post, 'title' | 'excerpt' | 'body' | 'tags' | 'coverUrl'>) => Promise<Verdict>
export class Publishing {
  constructor(private store: Store, private screen: Screen) {}
  async create(input: BlogCreate, actor: Principal) {
    const post = await this.store.create(input, actor.id)
    return input.status === 'published' ? this.check(post, actor) : post
  }
  async edit(id: string, input: BlogUpdate, actor: Principal) {
    const current = await this.store.byId(id)
    if (actor.role !== 'admin' && current.author.toHexString() !== actor.id) {
      throw new HttpError(403, 'That post belongs to someone else.')
    }
    if (['flagged', 'hidden', 'removed'].includes(current.status)) {
      if (input.status || actor.role !== 'admin') {
        throw new HttpError(403, 'Use a moderation decision before republishing this post.')
      }
    }
    const publish = (input.status ?? current.status) === 'published'
    const patch = { ...input, ...(input.coverUrl === undefined ? {} : { coverUrl: input.coverUrl }),
      ...(publish ? { status: 'flagged' as const, moderation: pendingVerdict() } : {}) }
    const updated = await this.store.change(current, patch, actor.id, 'blog.edited')
    return publish ? this.check(updated, actor) : updated
  }
  async check(post: Post, actor: Principal) {
    let verdict: Verdict
    try { verdict = await this.screen(post) }
    catch { verdict = pendingVerdict() }
    return this.store.change(post, {
      status: verdict.outcome === 'clean' ? 'published' : 'flagged',
      moderation: { ...verdict, checkedAt: new Date(), reviewedBy: null, reviewedAt: null },
    }, actor.id, 'blog.screened')
  }
  async decide(id: string, kind: string, actor: Principal, reason: string | null) {
    const current = await this.store.byId(id)
    if (kind === 'retry') {
      if (current.status !== 'flagged' || current.moderation?.outcome !== 'unavailable') {
        throw new HttpError(409, 'Only an incomplete check can be retried.')
      }
      return this.check(current, actor)
    }
    if (kind === 'approve' && current.status !== 'flagged') throw new HttpError(409, 'Post is not flagged.')
    if (kind === 'restore' && !['hidden', 'removed'].includes(current.status)) {
      throw new HttpError(409, 'Post is not hidden or removed.')
    }
    const status = kind === 'approve' ? 'published' : kind === 'hide' ? 'hidden' :
      kind === 'remove' ? 'removed' : current.publishedAt ? 'published' : 'draft'
    if (status === current.status) throw new HttpError(409, `Post is already ${status}.`)
    const patch: Partial<Post> = { status }
    if (kind === 'remove') Object.assign(patch, {
      removedBy: new ObjectId(actor.id), removedAt: new Date(), removedReason: reason })
    if (kind === 'restore') Object.assign(patch, { removedBy: null, removedAt: null, removedReason: null })
    if (current.moderation && !current.moderation.reviewedBy) {
      patch.moderation = { ...current.moderation, reviewedBy: new ObjectId(actor.id), reviewedAt: new Date() }
    }
    return this.store.change(current, patch, actor.id,
      `blog.${{ approve: 'approved', hide: 'hidden', remove: 'removed', restore: 'restored' }[kind]}`, reason)
  }
}
