import { MongoClient, type IndexDescription } from 'mongodb'

export const BLOG_INDEXES: IndexDescription[] = [
  { key: { slug: 1 }, unique: true },
  { key: { status: 1, publishedAt: -1, _id: -1 } },
  { key: { author: 1, createdAt: -1 } },
  { key: { updatedAt: -1 } },
  { key: { 'moderation.severity': -1, updatedAt: -1 } },
  { key: { title: 'text', excerpt: 'text', tags: 'text' }, name: 'blog_search',
    weights: { title: 10, tags: 5, excerpt: 1 } },
]
export async function connectDatabase(uri: string) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  const db = client.db()
  await db.collection('blogs').createIndexes(BLOG_INDEXES)
  await db.collection('blog_audit').createIndex({ targetId: 1, at: -1 })
  for (const name of ['blog_sessions', 'blog_auth_flows', 'blog_limits']) {
    await db.collection(name).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  }
  return { client, db }
}
