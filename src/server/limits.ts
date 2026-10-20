import type { RequestHandler } from 'express'
import type { Db } from 'mongodb'
import { hash } from './auth/crypto.js'
import { HttpError } from './errors.js'

type Counter = { _id: string; count: number; expiresAt: Date }
export function persistentLimit(db: Db): RequestHandler {
  return async (req, res, next) => {
    const login = req.path === '/api/v1/auth/login'
    if (!login && ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return }
    const window = login ? 300000 : 60000
    const bucket = Math.floor(Date.now() / window)
    const key = hash(`${req.ip}:${login ? 'login' : 'write'}:${bucket}`)
    const row = await db.collection<Counter>('blog_limits').findOneAndUpdate({ _id: key }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * window) },
    }, { upsert: true, returnDocument: 'after' })
    if ((row?.count ?? 0) > (login ? 10 : 60)) {
      res.set('Retry-After', String(Math.ceil(window / 1000)))
      throw new HttpError(429, 'Too many requests. Please try again later.')
    }
    next()
  }
}
