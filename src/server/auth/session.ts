import type { Db } from 'mongodb'
import type { Request } from 'express'
import type { Config } from '../config.js'
import { HttpError } from '../errors.js'
import { hash, unseal } from './crypto.js'
import type { IdentityCheck } from './identity.js'

export type Session = { _id: string; credential: string; subject: string; expiresAt: Date }
export const cookieName = (config: Config) => config.NODE_ENV === 'production' ? '__Host-blog_session' : 'blog_session'
export const cookieOptions = (config: Config) => ({ httpOnly: true, secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/' })
export function sessionReader(db: Db, config: Config, check: IdentityCheck) {
  return async (req: Request) => {
    if (!config.AUTH_ENABLED) throw new HttpError(503, 'Main web sign-in is awaiting integration. Public articles are available.')
    const token = req.cookies?.[cookieName(config)]
    if (typeof token !== 'string' || token.length > 128) throw new HttpError(401, 'Sign in to continue.')
    const session = await db.collection<Session>('blog_sessions').findOne({ _id: hash(token), expiresAt: { $gt: new Date() } })
    if (!session) throw new HttpError(401, 'Sign in to continue.')
    let credential: string
    try { credential = unseal(session.credential, config.AUTH_SESSION_KEY) }
    catch { throw new HttpError(401, 'Sign in to continue.') }
    const principal = await check(credential)
    if (principal.id !== session.subject) throw new HttpError(401, 'Sign in through main Vetify again.')
    return principal
  }
}
