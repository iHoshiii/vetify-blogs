import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/server/app.js'
import { parseConfig } from '../src/server/config.js'
import { seal } from '../src/server/auth/crypto.js'
import { testDatabase, input } from './setup.js'
import { startIssuer } from './issuer.js'

describe('registered main sign-in protocol against an isolated contract issuer', () => {
  const db = testDatabase()
  let issuer: Awaited<ReturnType<typeof startIssuer>>
  let app: ReturnType<typeof createApp>
  const key = '33'.repeat(32)
  beforeAll(async () => {
    issuer = await startIssuer()
    const config = parseConfig({ MONGODB_URI: 'mongodb://localhost/blog_test', NODE_ENV: 'test',
      MAIN_AUTH_ORIGIN: issuer.origin, AUTH_ENABLED: 'true', AUTH_SESSION_KEY: key })
    app = createApp(config, db.store)
  })
  afterAll(async () => issuer?.close())
  async function flow() {
    const login = await request(app).get('/api/v1/auth/login')
    expect(login.status).toBe(302)
    const auth = new URL(login.headers.location)
    expect(auth.searchParams.get('code_challenge_method')).toBe('S256')
    expect(auth.searchParams.get('client_id')).toBe('vetify-blog')
    const response = await fetch(auth, { redirect: 'manual' })
    const callback = new URL(response.headers.get('location')!)
    return { cookie: (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0], query: callback.search }
  }
  const callback = (flow: { cookie: string; query: string }) => request(app)
    .get(`/api/v1/auth/callback${flow.query}`).set('Cookie', flow.cookie)
  it('exchanges the single-use PKCE code for an opaque host-only session and honors main revocation', async () => {
    const attempt = await flow()
    const result = await callback(attempt)
    expect(result.status).toBe(302)
    expect(result.headers.location).toBe('http://localhost:5177/write')
    const cookie = (result.headers['set-cookie'] as unknown as string[]).find(c => c.startsWith('blog_session='))!
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).not.toContain('Domain=')
    expect(cookie).not.toContain('test-token')
    const browser = cookie.split(';')[0]
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', browser)).body.data.id).toBe('111111111111111111111111')
    expect((await callback(attempt)).status).toBe(400)
    issuer.revoked = true
    expect((await request(app).post('/api/v1/blogs').set('Origin', 'http://localhost:5177')
      .set('Cookie', browser).send(input)).status).toBe(401)
    issuer.revoked = false
    expect((await request(app).post('/api/v1/auth/logout').set('Origin', 'http://localhost:5177').set('Cookie', browser).send({})).status).toBe(200)
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', browser)).status).toBe(401)
    expect(await db.store.db.listCollections({ name: 'users' }).hasNext()).toBe(false)
  })
  it('rejects state tampering, expired flows, a wrong audience and PKCE tampering', async () => {
    const state = await flow()
    expect((await callback({ ...state, query: state.query.replace(/state=[^&]+/, 'state=forged') })).status).toBe(400)
    const expired = await flow()
    await db.store.db.collection('blog_auth_flows').updateMany({}, { $set: { expiresAt: new Date(0) } })
    expect((await callback(expired)).status).toBe(400)
    const audience = await flow()
    issuer.wrongAudience = true
    expect((await callback(audience)).status).toBe(401)
    issuer.wrongAudience = false
    const pkce = await flow()
    await db.store.db.collection('blog_auth_flows').updateMany({}, { $set: { verifier: seal('wrong-verifier', key) } })
    expect((await callback(pkce)).status).toBe(401)
  })
})
