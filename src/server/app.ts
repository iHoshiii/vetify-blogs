import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import type { Config } from './config.js'
import type { Store } from './data/store.js'
import { errorHandler, HttpError } from './errors.js'
import { blogRoutes, type Authenticate } from './routes.js'
import { createScreen } from './moderation/screen.js'
import type { Screen } from './moderation/service.js'
import { createIdentityCheck } from './auth/identity.js'
import { sessionReader } from './auth/session.js'
import { authRouter } from './auth/oidc.js'

export function createApp(config: Config, store: Store, overrides: { authenticate?: Authenticate; screen?: Screen } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }))
  app.use((req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== config.CLIENT_ORIGIN) {
      throw new HttpError(403, 'Request origin is not allowed.')
    }
    next()
  })
  app.use(express.json({ limit: '512kb' }))
  app.use(cookieParser())
  const check = createIdentityCheck(config)
  const authenticate = overrides.authenticate ?? sessionReader(store.db, config, check)
  app.get('/api/health', async (_req, res) => {
    await store.db.command({ ping: 1 })
    res.json({ data: { status: 'ok', authConfigured: config.AUTH_ENABLED } })
  })
  app.use('/api/v1/auth', authRouter(store.db, config, check))
  app.use('/api/v1', blogRoutes(store, overrides.screen ?? createScreen(config), authenticate))
  app.use((_req, _res) => { throw new HttpError(404, 'Not found') })
  app.use(errorHandler)
  return app
}
