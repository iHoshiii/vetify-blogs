import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Request } from 'express'
import { parseConfig } from '../src/server/config.js'
import { createIdentityCheck, validateIdentity } from '../src/server/auth/identity.js'
import { hash, randomToken, seal, unseal } from '../src/server/auth/crypto.js'
import { cookieName, sessionReader, type Session } from '../src/server/auth/session.js'
import { testDatabase } from './setup.js'

const config = parseConfig({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://localhost/vetify_blog_test',
  AUTH_ENABLED: 'true', AUTH_SESSION_KEY: '11'.repeat(32) })
const payload = () => ({ version: 2, active: true, issuer: config.MAIN_AUTH_ORIGIN,
  audience: config.AUTH_CLIENT_ID, sessionValid: true,
  user: { id: '111111111111111111111111', role: 'professional', status: 'active', emailVerified: true, name: 'Author' },
  tokenExpiresAt: new Date(Date.now() + 60000).toISOString(), validUntil: new Date(Date.now() + 25000).toISOString() })
afterEach(() => vi.unstubAllGlobals())
describe('main identity boundary', () => {
  it('accepts only the reviewed v2 identity with current validity and exact issuer/audience', () => {
    expect(validateIdentity(payload(), config).id).toBe(payload().user.id)
    for (const patch of [{ version: 1 }, { active: false }, { issuer: 'https://evil.example' },
      { audience: 'vetify-books' }, { sessionValid: false },
      { validUntil: new Date(Date.now() + 90000).toISOString() },
      { tokenExpiresAt: new Date(Date.now() - 1000).toISOString() }]) {
      expect(() => validateIdentity({ ...payload(), ...patch }, config)).toThrow()
    }
    for (const patch of [{ status: 'disabled' }, { status: 'banned' }, { emailVerified: false }, { role: 'owner' }]) {
      expect(() => validateIdentity({ ...payload(), user: { ...payload().user, ...patch } }, config)).toThrow()
    }
  })
  it('fails closed on unavailable, malformed and legacy main introspection', async () => {
    const check = createIdentityCheck(config)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')))
    await expect(check('token')).rejects.toMatchObject({ status: 503 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 1 }), { status: 200 })))
    await expect(check('token')).rejects.toMatchObject({ status: 401 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{', { status: 200 })))
    await expect(check('token')).rejects.toMatchObject({ status: 401 })
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload()), { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    expect((await check('scoped-token')).role).toBe('professional')
    expect(fetcher.mock.calls[0][1].cache).toBe('no-store')
    expect(fetcher.mock.calls[0][1].headers.authorization).toBe('Bearer scoped-token')
  })
  it('validates isolated database, exact callbacks, production HTTPS and an independent key', () => {
    expect(() => parseConfig({ MONGODB_URI: 'mongodb://localhost/vetify' })).toThrow()
    expect(() => parseConfig({ MONGODB_URI: 'mongodb://localhost/' })).toThrow()
    expect(() => parseConfig({ MONGODB_URI: 'mongodb://localhost/blog', AUTH_ENABLED: 'true' })).toThrow()
    expect(() => parseConfig({ MONGODB_URI: 'mongodb://localhost/blog', CLIENT_ORIGIN: 'https://blog.example',
      AUTH_CALLBACK_URL: 'https://evil.example/callback' })).toThrow()
    expect(() => parseConfig({ MONGODB_URI: 'mongodb://localhost/blog', NODE_ENV: 'production' })).toThrow()
  })
  it('encrypts credentials and rejects modified ciphertext', () => {
    const encrypted = seal('private-token', config.AUTH_SESSION_KEY)
    expect(encrypted).not.toContain('private-token')
    expect(unseal(encrypted, config.AUTH_SESSION_KEY)).toBe('private-token')
    expect(() => unseal(encrypted, '22'.repeat(32))).toThrow()
  })
})
describe('server-owned Blog sessions', () => {
  const db = testDatabase()
  it('rechecks roles and revocation on every read and rejects substituted identities', async () => {
    const token = randomToken()
    const user = payload().user
    await db.store.db.collection<Session>('blog_sessions').insertOne({ _id: hash(token), subject: user.id,
      credential: seal('main-scoped-credential', config.AUTH_SESSION_KEY), expiresAt: new Date(Date.now() + 60000) })
    let body = payload()
    const check = vi.fn(async () => validateIdentity(body, config))
    const read = sessionReader(db.store.db, config, check)
    const req = { cookies: { [cookieName(config)]: token } } as Request
    expect((await read(req)).role).toBe('professional')
    body = { ...payload(), user: { ...user, role: 'public' } }
    expect((await read(req)).role).toBe('public')
    body = { ...payload(), sessionValid: false }
    await expect(read(req)).rejects.toMatchObject({ status: 401 })
    body = { ...payload(), user: { ...user, id: '222222222222222222222222' } }
    await expect(read(req)).rejects.toMatchObject({ status: 401 })
    expect(check).toHaveBeenCalledTimes(4)
    expect(check).toHaveBeenCalledWith('main-scoped-credential')
  })
})
