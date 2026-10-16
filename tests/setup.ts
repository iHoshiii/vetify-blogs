import { beforeAll, afterAll, beforeEach } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import request from 'supertest'
import { parseConfig } from '../src/server/config.js'
import { connectDatabase } from '../src/server/data/database.js'
import { Store } from '../src/server/data/store.js'
import { createApp } from '../src/server/app.js'
import { HttpError } from '../src/server/errors.js'
import type { Principal, Verdict } from '../src/shared/types.js'
import type { Screen } from '../src/server/moderation/service.js'

export const ids = { pro: '111111111111111111111111', other: '222222222222222222222222', admin: '333333333333333333333333' }
export const input = { title: 'Everyday care for older cats', excerpt: 'Small changes to watch for as your cat gets older.',
  body: 'Watch for changes to everyday routines and discuss any concerns with your veterinarian. '.repeat(3),
  tags: ['Cats', 'cats'], status: 'draft' }
export const clean: Verdict = { outcome: 'clean', categories: [], severity: 0, terms: [], notes: null, model: 'test' }
export const config = parseConfig({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://localhost/vetify_blog_test' })
export function testDatabase() {
  let mongo: MongoMemoryReplSet
  let store: Store
  let app: ReturnType<typeof createApp>
  const actors: Record<string, Principal | null> = {
    pro: { id: ids.pro, role: 'professional', name: 'Professional' },
    other: { id: ids.other, role: 'professional', name: 'Other' },
    admin: { id: ids.admin, role: 'admin', name: 'Administrator' },
    public: { id: ids.other, role: 'public', name: 'Reader' },
  }
  const screening: { run: Screen } = { run: async (): Promise<Verdict> => clean }
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    const connected = await connectDatabase(mongo.getUri('vetify_blog_test'))
    store = new Store(connected.db, connected.client)
    app = createApp(config, store, { authenticate: async req => {
      const key = req.get('x-test-actor') ?? ''
      const actor = actors[key]
      if (!actor) throw new HttpError(401, 'Invalid or revoked test session')
      return actor
    }, screen: input => screening.run(input) })
  })
  beforeEach(async () => {
    await store.posts.deleteMany({}); await store.audits.deleteMany({})
    for (const name of ['blog_limits', 'blog_sessions', 'blog_auth_flows']) await store.db.collection(name).deleteMany({})
    screening.run = async () => clean
    actors.pro = { id: ids.pro, role: 'professional', name: 'Professional' }
    actors.admin = { id: ids.admin, role: 'admin', name: 'Administrator' }
  })
  afterAll(async () => { await store?.client.close(); await mongo?.stop() })
  return { get store() { return store }, get app() { return app }, actors, screening,
    call(method: 'get' | 'post' | 'patch' | 'delete', path: string, actor?: string) {
      const call = request(app)[method](`/api/v1${path}`).set('Origin', config.CLIENT_ORIGIN)
      return actor ? call.set('x-test-actor', actor) : call
    } }
}
