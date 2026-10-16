import { ObjectId, type Db, type Filter, type MongoClient, type ClientSession, type Sort } from 'mongodb'
import type { BlogCreate } from '../../shared/schemas.js'
import { HttpError } from '../errors.js'
import { slugify } from './slug.js'
import type { Audit, Post } from './types.js'

export class Store {
  posts
  audits
  constructor(public db: Db, public client: MongoClient) {
    this.posts = db.collection<Post>('blogs')
    this.audits = db.collection<Audit>('blog_audit')
  }
  async create(input: BlogCreate, authorId: string): Promise<Post> {
    const base = slugify(input.title)
    for (let attempt = 1; attempt <= 25; attempt++) {
      const now = new Date()
      const doc: Post = { ...input, _id: new ObjectId(),
        slug: attempt === 1 ? base : `${base}-${attempt}`, coverUrl: input.coverUrl ?? null,
        author: new ObjectId(authorId), createdAt: now, updatedAt: now, publishedAt: null,
        revision: 0, status: input.status === 'published' ? 'flagged' : 'draft',
        moderation: input.status === 'published' ? pendingVerdict() : null,
        removedBy: null, removedReason: null, removedAt: null }
      try { await this.posts.insertOne(doc); return doc }
      catch (error) {
        const e = error as { code?: number; keyPattern?: { slug?: number } }
        if (e.code !== 11000 || !e.keyPattern?.slug) throw error
      }
    }
    throw new HttpError(409, 'Too many posts share this title. Choose another title.')
  }
  async byId(id: string): Promise<Post> {
    const post = /^[a-f0-9]{24}$/i.test(id) ? await this.posts.findOne({ _id: new ObjectId(id) }) : null
    if (!post) throw new HttpError(404, 'Post not found')
    return post
  }
  async list(query: { page: number; limit: number; tag?: string; q?: string }, filter: Filter<Post>, admin = false) {
    if (query.tag) filter.tags = query.tag
    if (query.q) filter.$text = { $search: query.q }
    const sort: Sort = query.q ? { score: { $meta: 'textScore' as const }, _id: -1 as const } :
      admin ? { 'moderation.severity': -1 as const, updatedAt: -1 as const, _id: -1 as const } :
        { publishedAt: -1 as const, _id: -1 as const }
    const [items, total] = await Promise.all([
      this.posts.find(filter).sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
      this.posts.countDocuments(filter),
    ])
    return { items, total }
  }
  async change(current: Post, patch: Partial<Post>, actor: string, action: string, reason: string | null = null) {
    const session = this.client.startSession()
    try {
      return await session.withTransaction(async () => {
        const now = new Date()
        const updated = await this.posts.findOneAndUpdate(
          { _id: current._id, revision: current.revision },
          { $set: { ...patch, updatedAt: now,
            ...(patch.status === 'published' && !current.publishedAt ? { publishedAt: now } : {}) },
          $inc: { revision: 1 } }, { session, returnDocument: 'after' })
        if (!updated) throw new HttpError(409, 'Post changed. Reload before retrying.')
        await this.audit(current, updated.status, actor, action, reason, session)
        return updated
      })
    } finally { await session.endSession() }
  }
  async purge(current: Post, actor: string, reason: string) {
    const session = this.client.startSession()
    try {
      await session.withTransaction(async () => {
        await this.audit(current, 'purged', actor, 'blog.purged', reason, session)
        const result = await this.posts.deleteOne({ _id: current._id, revision: current.revision }, { session })
        if (!result.deletedCount) throw new HttpError(409, 'Post changed. Reload before retrying.')
      })
    } finally { await session.endSession() }
  }
  private async audit(post: Post, statusTo: string, actor: string, action: string,
    reason: string | null, session: ClientSession) {
    await this.audits.insertOne({ _id: new ObjectId(), action, targetId: post._id,
      actor: new ObjectId(actor), reason, at: new Date(), metadata: { slug: post.slug, title: post.title,
        authorId: post.author.toHexString(), statusFrom: post.status, statusTo } }, { session })
  }
}
export function pendingVerdict(): NonNullable<Post['moderation']> {
  return { outcome: 'unavailable', categories: [], severity: 0, terms: [],
    notes: 'Publication check incomplete. An administrator can retry or review this post.',
    model: null, checkedAt: new Date(), reviewedBy: null, reviewedAt: null }
}
