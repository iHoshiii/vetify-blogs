import type { ObjectId } from 'mongodb'
import type { BlogStatus } from '../../shared/schemas.js'
import type { Verdict } from '../../shared/types.js'

export type Post = {
  _id: ObjectId
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string | null
  tags: string[]
  author: ObjectId
  status: BlogStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  revision: number
  moderation: (Verdict & { checkedAt: Date; reviewedBy: ObjectId | null; reviewedAt: Date | null }) | null
  removedBy: ObjectId | null
  removedReason: string | null
  removedAt: Date | null
}
export type Audit = {
  _id: ObjectId
  action: string
  targetId: ObjectId
  actor: ObjectId
  reason: string | null
  at: Date
  metadata: { slug: string; title: string; authorId: string; statusFrom: BlogStatus; statusTo: string }
  screening: Post['moderation']
}
