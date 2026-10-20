import { Router, type Request, type RequestHandler, type Response } from 'express'
import { ObjectId } from 'mongodb'
import { adminListQuerySchema, blogCreateSchema, blogListQuerySchema, blogUpdateSchema,
  decisionSchema, removeSchema } from '../shared/schemas.js'
import type { Principal } from '../shared/types.js'
import { adminPost, pageOf, publicPost, summary } from './data/transform.js'
import type { Store } from './data/store.js'
import { HttpError } from './errors.js'
import { Publishing, type Screen } from './moderation/service.js'

export type Authenticate = (req: Request) => Promise<Principal>
export function blogRoutes(store: Store, screen: Screen, authenticate: Authenticate) {
  const router = Router()
  const publishing = new Publishing(store, screen)
  const protect = (...roles: Principal['role'][]): RequestHandler => async (req, res, next) => {
    const actor = await authenticate(req)
    if (!roles.includes(actor.role)) throw new HttpError(403, 'This action requires a current professional or administrator role.')
    res.locals.actor = actor
    next()
  }
  const actor = (res: Response) => res.locals.actor as Principal
  const author = protect('professional', 'admin')
  const admin = protect('admin')
  router.get('/auth/me', async (req, res) => res.json({ data: await authenticate(req) }))
  router.get('/blogs', async (req, res) => {
    const query = blogListQuerySchema.parse(req.query)
    const result = await store.list(query, { status: 'published' })
    res.json({ data: pageOf(result.items.map(summary), result.total, query.page, query.limit) })
  })
  router.get('/blogs/:slug', async (req, res) => {
    const post = await store.posts.findOne({ slug: req.params.slug as string, status: 'published' })
    if (!post) throw new HttpError(404, 'Post not found')
    res.json({ data: publicPost(post) })
  })
  router.post('/blogs', author, async (req, res) => {
    const post = await publishing.create(blogCreateSchema.parse(req.body), actor(res))
    res.status(201).json({ data: publicPost(post) })
  })
  router.patch('/blogs/:id', author, async (req, res) => {
    const post = await publishing.edit(req.params.id as string, blogUpdateSchema.parse(req.body), actor(res))
    res.json({ data: publicPost(post) })
  })
  router.get('/author/blogs', author, async (req, res) => {
    const query = blogListQuerySchema.parse(req.query)
    const result = await store.list(query, { author: new ObjectId(actor(res).id) }, true)
    res.json({ data: pageOf(result.items.map(summary), result.total, query.page, query.limit) })
  })
  router.get('/author/blogs/:id', author, async (req, res) => {
    const post = await store.byId(req.params.id as string)
    if (post.author.toHexString() !== actor(res).id && actor(res).role !== 'admin') throw new HttpError(404, 'Post not found')
    res.json({ data: publicPost(post) })
  })
  router.get('/admin/blogs', admin, async (req, res) => {
    const query = adminListQuerySchema.parse(req.query)
    const result = await store.list(query, { ...(query.status ? { status: query.status } : {}),
      ...(query.author ? { author: new ObjectId(query.author) } : {}) }, true)
    res.json({ data: pageOf(result.items.map(p => {
      const { body: _body, ...post } = adminPost(p)
      return post
    }), result.total, query.page, query.limit) })
  })
  router.get('/admin/blogs/:id', admin, async (req, res) => {
    res.json({ data: adminPost(await store.byId(req.params.id as string)) })
  })
  router.get('/admin/blogs/:id/audit', admin, async (req, res) => {
    const query = blogListQuerySchema.parse(req.query)
    if (!/^[a-f0-9]{24}$/i.test(req.params.id as string)) throw new HttpError(404, 'Post not found')
    const filter = { targetId: new ObjectId(req.params.id as string) }
    const [items, total] = await Promise.all([
      store.audits.find(filter).sort({ at: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
      store.audits.countDocuments(filter),
    ])
    res.json({ data: pageOf(items, total, query.page, query.limit) })
  })
  for (const kind of ['hide', 'remove', 'restore', 'approve', 'retry']) {
    router.patch(`/admin/blogs/:id/${kind}`, admin, async (req, res) => {
      const body = (kind === 'remove' ? removeSchema : decisionSchema).parse(req.body)
      const post = await publishing.decide(req.params.id as string, kind, actor(res), body.reason ?? null)
      res.json({ data: adminPost(post) })
    })
  }
  router.delete('/admin/blogs/:id', admin, async (req, res) => {
    const { reason } = removeSchema.parse(req.body)
    const post = await store.byId(req.params.id as string)
    if (post.status !== 'removed') throw new HttpError(409, 'Remove the post before deleting it.')
    await store.purge(post, actor(res).id, reason)
    res.json({ data: { id: post._id.toHexString() } })
  })
  let metrics: { expires: number; counts: Record<string, number> } | undefined
  router.get('/admin/aggregates', admin, async (_req, res) => {
    if (!metrics || metrics.expires <= Date.now()) {
      const rows = await store.posts.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray()
      metrics = { expires: Date.now() + 15000, counts: Object.fromEntries(rows.map(r => [r._id, r.count])) }
    }
    res.json({ data: { counts: metrics.counts, cachedUntil: new Date(metrics.expires).toISOString() } })
  })
  return router
}
