import { z } from 'zod'

export const BLOG_STATUSES = ['draft', 'published', 'flagged', 'hidden', 'removed'] as const
export type BlogStatus = typeof BLOG_STATUSES[number]
export const MODERATION_CATEGORIES = ['nudity', 'sexual', 'slur', 'hate', 'harassment',
  'violence', 'self-harm', 'illegal'] as const
export type ModerationCategory = typeof MODERATION_CATEGORIES[number]
export const MODERATION_OUTCOMES = ['clean', 'flagged', 'unavailable'] as const
export type ModerationOutcome = typeof MODERATION_OUTCOMES[number]

export function safeHttps(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch { return false }
}
const fields = {
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().min(10).max(320),
  body: z.string().trim().min(50).max(200000),
  coverUrl: z.string().trim().max(2048).refine(safeHttps, 'Use a public HTTPS image URL').nullish(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8)
    .transform(tags => [...new Set(tags.map(tag => tag.toLowerCase()))]),
  status: z.enum(['draft', 'published']),
}
export const blogCreateSchema = z.object({ ...fields,
  tags: fields.tags.default([]), status: fields.status.default('draft') })
export const blogUpdateSchema = z.object(fields).partial().refine(patch => Object.keys(patch).length > 0)
export type BlogCreate = z.output<typeof blogCreateSchema>
export type BlogUpdate = z.output<typeof blogUpdateSchema>
export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(9),
  tag: z.string().trim().toLowerCase().min(1).max(24).optional(),
  q: z.string().trim().min(2).max(80).optional(),
})
export const adminListQuerySchema = blogListQuerySchema.extend({
  status: z.enum(BLOG_STATUSES).optional(), author: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
})
const note = z.string().trim().min(10).max(500)
export const decisionSchema = z.object({ reason: note.optional() })
export const removeSchema = z.object({ reason: note })
