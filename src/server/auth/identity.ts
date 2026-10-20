import { z } from 'zod'
import type { Config } from '../config.js'
import { HttpError } from '../errors.js'
import type { Principal } from '../../shared/types.js'

export const identitySchema = z.object({
  version: z.literal(2), active: z.literal(true),
  issuer: z.string().url(), audience: z.string(),
  user: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i), role: z.enum(['public', 'professional', 'admin']),
    status: z.literal('active'), emailVerified: z.literal(true), name: z.string().max(200).nullable() }),
  sessionValid: z.literal(true), tokenExpiresAt: z.string().datetime(), validUntil: z.string().datetime(),
})
export type IdentityCheck = (token: string) => Promise<Principal>
export function validateIdentity(body: unknown, config: Config): Principal {
  const result = identitySchema.safeParse(body)
  if (!result.success) throw new HttpError(401, 'Main sign-in is invalid or incompatible.')
  const data = result.data
  const now = Date.now()
  if (data.issuer !== config.MAIN_AUTH_ORIGIN || data.audience !== config.AUTH_CLIENT_ID ||
    Date.parse(data.tokenExpiresAt) <= now || Date.parse(data.validUntil) <= now ||
    Date.parse(data.validUntil) > now + 31000) throw new HttpError(401, 'Main sign-in is invalid or expired.')
  return { id: data.user.id.toLowerCase(), role: data.user.role, name: data.user.name }
}
export function createIdentityCheck(config: Config): IdentityCheck {
  return async token => {
    let response: Response
    try {
      response = await fetch(`${config.MAIN_AUTH_ORIGIN}/api/v1/auth/introspect`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: config.AUTH_CLIENT_ID }), cache: 'no-store',
        redirect: 'error', signal: AbortSignal.timeout(5000),
      })
    } catch { throw new HttpError(503, 'Main authentication is unavailable. Please retry.') }
    if (response.status >= 500) throw new HttpError(503, 'Main authentication is unavailable. Please retry.')
    if (!response.ok) throw new HttpError(401, 'Sign in through main Vetify again.')
    try { return validateIdentity(await response.json(), config) }
    catch (error) {
      if (error instanceof HttpError) throw error
      throw new HttpError(401, 'Main sign-in response is invalid.')
    }
  }
}
