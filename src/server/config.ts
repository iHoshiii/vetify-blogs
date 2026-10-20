import { z } from 'zod'

const localUrl = z.string().url().refine(raw => {
  const u = new URL(raw)
  return !u.username && !u.password && !u.hash && !u.search &&
    (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)))
}, 'Use HTTPS, or HTTP on localhost')
const origin = localUrl.refine(raw => new URL(raw).pathname === '/', 'Expected an origin without a path')
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8104),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  MAIN_AUTH_ORIGIN: origin.default('http://localhost:8000'),
  AUTH_CLIENT_ID: z.string().min(1).default('vetify-blog'),
  AUTH_CALLBACK_URL: localUrl.default('http://localhost:5177/auth/callback'),
  CLIENT_ORIGIN: origin.default('http://localhost:5177'),
  AUTH_ENABLED: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  AUTH_SESSION_KEY: z.string().default(''),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODERATION_MODEL: z.string().min(1).default('gemini-3.5-flash'),
}).superRefine((env, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  const dbName = env.MONGODB_URI.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)(?:\?|$)/)?.[1]
  if (!dbName || /^(admin|local|config|vetify)$/i.test(dbName)) issue('Choose a separate named Blog database')
  if (new URL(env.AUTH_CALLBACK_URL).origin !== env.CLIENT_ORIGIN) issue('Callback must belong to CLIENT_ORIGIN')
  if (env.AUTH_ENABLED && !/^[a-f0-9]{64}$/i.test(env.AUTH_SESSION_KEY)) issue('SSO needs an independent 32-byte hex session key')
  if (env.NODE_ENV === 'production' && [env.MAIN_AUTH_ORIGIN, env.CLIENT_ORIGIN].some(v => !v.startsWith('https://'))) {
    issue('Production origins must use HTTPS')
  }
})
export type Config = z.output<typeof schema>
export const parseConfig = (input: Record<string, unknown>) => schema.parse(input)
