import { describe, it, expect } from 'vitest'
import { testDatabase, input } from './setup.js'
import { BLOG_STATUSES } from '../src/shared/schemas.js'
import { createApp } from '../src/server/app.js'
import { config } from './setup.js'
import request from 'supertest'

describe('public reads and author authorization', () => {
  const db = testDatabase()
  it('keeps every nonpublic status private through feeds, slugs, IDs and cache headers', async () => {
    for (const status of BLOG_STATUSES) {
      const post = await db.store.create({ ...input, tags: [], status: 'draft' }, '111111111111111111111111')
      await db.store.posts.updateOne({ _id: post._id }, { $set: { status } })
      const detail = await db.call('get', `/blogs/${post.slug}`)
      expect(detail.status).toBe(status === 'published' ? 200 : 404)
      expect(detail.headers['cache-control']).toBe('no-store')
      expect((await db.call('get', `/blogs/${post._id}`)).status).toBe(404)
      expect((await db.call('get', `/author/blogs/${post._id}`)).status).toBe(401)
    }
    const feed = await db.call('get', '/blogs')
    expect(feed.body.data.total).toBe(1)
    expect(feed.body.data.items[0].status).toBe('published')
    expect(feed.body.data.items[0]).not.toHaveProperty('body')
    expect(feed.body.data.items[0]).not.toHaveProperty('moderation')
  })
  it('enforces anonymous, public and current professional/admin roles', async () => {
    expect((await db.call('post', '/blogs').send(input)).status).toBe(401)
    expect((await db.call('post', '/blogs', 'public').send(input)).status).toBe(403)
    const post = await db.call('post', '/blogs', 'pro').send({ ...input, author: 'forged' })
    expect(post.status).toBe(201)
    expect(post.body.data.authorId).toBe('111111111111111111111111')
    expect((await db.call('patch', `/blogs/${post.body.data.id}`, 'other').send({ title: 'Stolen post' })).status).toBe(403)
    expect((await db.call('patch', `/blogs/${post.body.data.id}`, 'admin').send({ title: 'Admin edit' })).status).toBe(200)
    db.actors.pro = { ...db.actors.pro!, role: 'public' }
    expect((await db.call('patch', `/blogs/${post.body.data.id}`, 'pro').send({ title: 'Demoted edit' })).status).toBe(403)
    db.actors.pro = null
    expect((await db.call('post', '/blogs', 'pro').send(input)).status).toBe(401)
    db.actors.admin = { ...db.actors.admin!, role: 'professional' }
    expect((await db.call('get', '/admin/blogs', 'admin')).status).toBe(403)
  })
  it('fails closed without the future main contract and rejects forged headers', async () => {
    const app = createApp(config, db.store)
    const result = await request(app).post('/api/v1/blogs').set('Origin', config.CLIENT_ORIGIN)
      .set('Authorization', 'Bearer fake').set('x-test-actor', 'admin').send(input)
    expect(result.status).toBe(503)
    expect((await request(app).get('/api/v1/blogs')).status).toBe(200)
  })
  it('validates pagination, malformed JSON, unsafe image URLs and author status', async () => {
    for (const query of ['limit=51', 'page=-1', 'page=1.2', 'q=a', 'author[x]=y']) {
      const result = await db.call('get', `/blogs?${query}`)
      expect(result.status).toBe(query.startsWith('author') ? 200 : 400)
    }
    for (const coverUrl of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://localhost/a.png']) {
      expect((await db.call('post', '/blogs', 'pro').send({ ...input, coverUrl })).status).toBe(400)
    }
    expect((await db.call('post', '/blogs', 'pro').send({ ...input, status: 'hidden' })).status).toBe(400)
    expect((await db.call('post', '/blogs', 'pro').set('Content-Type', 'application/json').send('{')).status).toBe(400)
    expect((await request(db.app).post('/api/v1/blogs').set('Origin', 'https://evil.example').send(input)).status).toBe(403)
  })
  it('paginates, searches, filters tags and disambiguates duplicate slugs concurrently', async () => {
    const created = await Promise.all(Array.from({ length: 11 }, () => db.call('post', '/blogs', 'pro').send({ ...input, status: 'published' })))
    expect(created.every(r => r.status === 201)).toBe(true)
    expect(new Set(created.map(r => r.body.data.slug)).size).toBe(11)
    expect(created[0].body.data.tags).toEqual(['cats'])
    const first = await db.call('get', '/blogs')
    const second = await db.call('get', '/blogs?page=2')
    expect(first.body.data.items).toHaveLength(9)
    expect(second.body.data.items).toHaveLength(2)
    expect(first.body.data.pages).toBe(2)
    expect((await db.call('get', '/blogs?tag=dogs')).body.data.total).toBe(0)
    expect((await db.call('get', '/blogs?q=cats')).body.data.total).toBe(11)
    const id = created[0].body.data.id
    const before = created[0].body.data
    const edited = await db.call('patch', `/blogs/${id}`, 'pro').send({ title: 'A new title about cats' })
    expect(edited.body.data.slug).toBe(before.slug)
    expect(edited.body.data.publishedAt).toBe(before.publishedAt)
    expect((await db.call('patch', `/blogs/${id}`, 'pro').send({})).status).toBe(400)
  })
})
