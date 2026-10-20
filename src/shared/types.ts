import type { BlogStatus, ModerationCategory, ModerationOutcome } from './schemas.js'

export type Verdict = {
  outcome: ModerationOutcome
  categories: ModerationCategory[]
  severity: number
  terms: string[]
  notes: string | null
  model: string | null
}
export type Principal = {
  id: string
  role: 'public' | 'professional' | 'admin'
  name: string | null
}
export type Blog = {
  id: string
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string | null
  tags: string[]
  authorId: string
  status: BlogStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}
export type BlogSummary = Omit<Blog, 'body'>
export type Page<T> = { items: T[]; total: number; page: number; limit: number; pages: number }
export type AdminBlog = Blog & {
  moderation: (Verdict & { checkedAt: string; reviewedBy: string | null; reviewedAt: string | null }) | null
  removedReason: string | null
  removedBy: string | null
  removedAt: string | null
}
