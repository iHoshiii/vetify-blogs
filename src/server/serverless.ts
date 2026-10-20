import type { IncomingMessage, ServerResponse } from 'node:http'
import { parseConfig } from './config.js'
import { connectDatabase } from './data/database.js'
import { Store } from './data/store.js'
import { createApp } from './app.js'

async function initialize() {
  const config = parseConfig(process.env)
  const { db, client } = await connectDatabase(config.MONGODB_URI)
  return createApp(config, new Store(db, client))
}

export function createServerlessHandler(start = initialize) {
  let pending: ReturnType<typeof initialize> | undefined
  return async (req: IncomingMessage, res: ServerResponse) => {
    // Vercel overwrites X-Forwarded-For with the connecting client's address.
    pending ??= start().then(app => app.set('trust proxy', 1))
      .catch(error => { pending = undefined; throw error })
    try {
      const app = await pending
      app(req, res)
    } catch (error) {
      console.error('Blog initialization failed', error instanceof Error ? error.name : 'UnknownError')
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ error: 'Blog service unavailable. Please retry.' }))
    }
  }
}
