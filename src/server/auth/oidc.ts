import * as oidc from 'openid-client'
import { Router } from 'express'
import type { Db } from 'mongodb'
import type { Config } from '../config.js'
import { HttpError } from '../errors.js'
import { randomToken, hash, seal } from './crypto.js'
import { cookieName, cookieOptions, type Session } from './session.js'
import type { IdentityCheck } from './identity.js'

type Flow = { _id: string; state: string; verifier: string; nonce: string; expiresAt: Date }
export function authRouter(db: Db, config: Config, check: IdentityCheck) {
  const router = Router()
  const flowCookie = config.NODE_ENV === 'production' ? '__Host-blog_flow' : 'blog_flow'
  async function discovery() {
    if (!config.AUTH_ENABLED) throw new HttpError(503, 'Main web sign-in is awaiting integration.')
    try {
      return await oidc.discovery(new URL(config.MAIN_AUTH_ORIGIN), config.AUTH_CLIENT_ID,
        undefined, oidc.None(), { execute: config.NODE_ENV === 'production' ? [] : [oidc.allowInsecureRequests], timeout: 5 })
    } catch { throw new HttpError(503, 'Main sign-in is unavailable or not configured for Blog.') }
  }
  router.get('/login', async (_req, res) => {
    const server = await discovery()
    if (server.serverMetadata().code_challenge_methods_supported?.includes('S256') !== true) {
      throw new HttpError(503, 'Main sign-in does not support the required PKCE flow.')
    }
    const browser = randomToken()
    const state = oidc.randomState()
    const verifier = oidc.randomPKCECodeVerifier()
    const nonce = oidc.randomNonce()
    await db.collection<Flow>('blog_auth_flows').insertOne({ _id: hash(browser), state,
      verifier: seal(verifier, config.AUTH_SESSION_KEY), nonce, expiresAt: new Date(Date.now() + 300000) })
    res.cookie(flowCookie, browser, { ...cookieOptions(config), maxAge: 300000 })
    res.redirect(oidc.buildAuthorizationUrl(server, { redirect_uri: config.AUTH_CALLBACK_URL,
      scope: 'openid profile', code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256', state, nonce }).href)
  })
  router.get('/callback', async (req, res) => {
    const server = await discovery()
    const browser = req.cookies?.[flowCookie]
    if (typeof browser !== 'string') throw new HttpError(400, 'Sign-in attempt expired. Start again.')
    const flow = await db.collection<Flow>('blog_auth_flows').findOneAndDelete({ _id: hash(browser),
      expiresAt: { $gt: new Date() }, state: String(req.query.state ?? '') })
    res.clearCookie(flowCookie, cookieOptions(config))
    if (!flow) throw new HttpError(400, 'Invalid or reused sign-in attempt.')
    const callback = new URL(config.AUTH_CALLBACK_URL)
    for (const key of ['code', 'state', 'iss', 'error', 'error_description']) {
      if (typeof req.query[key] === 'string') callback.searchParams.set(key, req.query[key] as string)
    }
    let token: string
    let subject: string | undefined
    try {
      const { unseal } = await import('./crypto.js')
      const tokens = await oidc.authorizationCodeGrant(server, callback, {
        pkceCodeVerifier: unseal(flow.verifier, config.AUTH_SESSION_KEY),
        expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true,
      })
      token = tokens.access_token
      subject = tokens.claims()?.sub
    } catch { throw new HttpError(401, 'Main sign-in could not be verified. Start again.') }
    const principal = await check(token)
    if (principal.id !== subject) throw new HttpError(401, 'Main identity does not match the sign-in.')
    const browserSession = randomToken()
    await db.collection<Session>('blog_sessions').insertOne({ _id: hash(browserSession),
      credential: seal(token, config.AUTH_SESSION_KEY), subject: principal.id,
      expiresAt: new Date(Date.now() + 3600000) })
    res.cookie(cookieName(config), browserSession, { ...cookieOptions(config), maxAge: 3600000 })
    res.redirect(`${config.CLIENT_ORIGIN}/write`)
  })
  router.post('/logout', async (req, res) => {
    const token = req.cookies?.[cookieName(config)]
    if (typeof token === 'string') await db.collection<Session>('blog_sessions').deleteOne({ _id: hash(token) })
    res.clearCookie(cookieName(config), cookieOptions(config)).json({ data: { loggedOut: true } })
  })
  return router
}
