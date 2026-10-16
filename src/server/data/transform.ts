import type { AdminBlog, Blog, BlogSummary, Page } from '../../shared/types.js'
import type { Post } from './types.js'

export function publicPost(post: Post): Blog {
  return { id: post._id.toHexString(), title: post.title, slug: post.slug,
    excerpt: post.excerpt, body: post.body, coverUrl: post.coverUrl, tags: post.tags,
    authorId: post.author.toHexString(), status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString() }
}
export function summary(post: Post): BlogSummary {
  const { body: _body, ...rest } = publicPost(post)
  return rest
}
export function adminPost(post: Post): AdminBlog {
  return { ...publicPost(post), removedReason: post.removedReason,
    removedBy: post.removedBy?.toHexString() ?? null, removedAt: post.removedAt?.toISOString() ?? null,
    moderation: post.moderation ? { ...post.moderation,
      checkedAt: post.moderation.checkedAt.toISOString(),
      reviewedBy: post.moderation.reviewedBy?.toHexString() ?? null,
      reviewedAt: post.moderation.reviewedAt?.toISOString() ?? null } : null }
}
export function pageOf<T>(items: T[], total: number, page: number, limit: number): Page<T> {
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}
