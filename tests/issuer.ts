import express from 'express'
import { generateKeyPairSync, sign } from 'node:crypto'
import type { Server } from 'node:http'
import { hash } from '../src/server/auth/crypto.js'

export async function startIssuer() {
  const app = express()
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' }
  const codes = new Map<string, { nonce: string; challenge: string; callback: string; client: string }>()
  const tokens = new Set<string>()
  let origin = ''
  let counter = 0
  let wrongAudience = false
  let revoked = false
  app.get('/.well-known/openid-configuration', (_req, res) => res.json({ issuer: origin,
    authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, jwks_uri: `${origin}/jwks`,
    response_types_supported: ['code'], subject_types_supported: ['public'], id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'] }))
  app.get('/jwks', (_req, res) => res.json({ keys: [jwk] }))
  app.get('/authorize', (req, res) => {
    const query = req.query as Record<string, string>
    const code = `test-code-${++counter}`
    codes.set(code, { nonce: query.nonce, challenge: query.code_challenge, callback: query.redirect_uri, client: query.client_id })
    const callback = new URL(query.redirect_uri)
    callback.searchParams.set('code', code); callback.searchParams.set('state', query.state)
    callback.searchParams.set('iss', origin)
    res.redirect(callback.href)
  })
  app.post('/token', (req, res) => {
    const code = codes.get(req.body.code)
    codes.delete(req.body.code)
    const challenge = Buffer.from(hash(req.body.code_verifier ?? ''), 'hex').toString('base64url')
    if (!code || code.challenge !== challenge || code.callback !== req.body.redirect_uri || code.client !== req.body.client_id) {
      res.status(400).json({ error: 'invalid_grant' }); return
    }
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const payload = Buffer.from(JSON.stringify({ iss: origin, aud: wrongAudience ? 'vetify-books' : code.client,
      sub: '111111111111111111111111', nonce: code.nonce, exp: now + 300, iat: now })).toString('base64url')
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), pair.privateKey).toString('base64url')
    const access = `test-token-${counter}`
    tokens.add(access)
    res.json({ access_token: access, token_type: 'Bearer', expires_in: 300, id_token: `${header}.${payload}.${signature}` })
  })
  app.post('/api/v1/auth/introspect', (req, res) => {
    if (revoked || !tokens.has(req.get('authorization')?.slice(7) ?? '')) { res.status(401).json({ error: 'revoked' }); return }
    res.json({ version: 2, active: true, issuer: origin, audience: 'vetify-blog', sessionValid: true,
      user: { id: '111111111111111111111111', role: 'professional', status: 'active', emailVerified: true, name: 'Main author' },
      tokenExpiresAt: new Date(Date.now() + 60000).toISOString(), validUntil: new Date(Date.now() + 25000).toISOString() })
  })
  const server: Server = await new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test issuer failed to listen')
  origin = `http://127.0.0.1:${address.port}`
  return { origin, set wrongAudience(value: boolean) { wrongAudience = value }, set revoked(value: boolean) { revoked = value },
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}
