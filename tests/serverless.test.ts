import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createServerlessHandler } from '../src/server/serverless.js'
import { createApp } from '../src/server/app.js'
import { config, testDatabase } from './setup.js'

describe('Vercel API entry point', () => {
  const db = testDatabase()

  it('shares initialization across concurrent requests and retains API paths and queries', async () => {
    const start = vi.fn(async () => createApp(config, db.store))
    const handler = createServerlessHandler(start)
    const [health, feed] = await Promise.all([
      request(handler).get('/api/health'),
      request(handler).get('/api/v1/blogs?page=2'),
    ])
    expect(health.status).toBe(200)
    expect(feed.status).toBe(200)
    expect(feed.body.data.page).toBe(2)
    expect(start).toHaveBeenCalledTimes(1)
    const protectedResponse = await request(handler).post('/api/v1/blogs').set('Origin', config.CLIENT_ORIGIN).send({})
    expect(protectedResponse.status).toBe(503)
    expect((await request(handler).get('/api/missing')).status).toBe(404)
  })

  it('returns an uncached error without exposing secrets and retries failed initialization', async () => {
    const start = vi.fn().mockRejectedValueOnce(new Error('private database credentials'))
      .mockResolvedValue(createApp(config, db.store))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const handler = createServerlessHandler(start)
      const failed = await request(handler).get('/api/health')
      expect(failed.status).toBe(503)
      expect(failed.headers['cache-control']).toBe('no-store')
      expect(failed.text).not.toContain('private database credentials')
      expect((await request(handler).get('/api/health')).status).toBe(200)
      expect(start).toHaveBeenCalledTimes(2)
    } finally {
      log.mockRestore()
    }
  })
})
