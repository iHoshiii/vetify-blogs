# Blog port manifest

Source inspected before porting: `C:/Users/Administrator/OneDrive/Desktop/Vetify`.
The destination began with `AGENT.MD`, `CLAUDE.md`, `PROMPT.md`,
`docs/DESCRIPTION.md` and `docs/business-idea.md`. All five were read.
Source `AGENT.MD` and `docs/main-deployment/shared-auth.md` were also read.

| Source under Vetify | Destination | Handling |
| --- | --- | --- |
| `src/client/pages/blogs/blogs-page.tsx` | `src/client/feed.tsx` | Adapted feed, tags, pagination, loading/error/empty behavior |
| `src/client/pages/blogs/blog-detail-page.tsx` | `src/client/detail.tsx` | Adapted slug detail and missing state |
| `src/client/pages/blogs/_components/{blog-card,blog-body,blog-pagination,feed-states,detail-states,published-date}.tsx` | `src/client/components.tsx`, feed/detail | Reimplemented without main layout dependencies, retained safe Markdown |
| `src/client/hooks/useBlogs.ts`, `services/blogs.service.ts` | `src/client/api.ts` | Replaced main transport/cache with same-origin requests, cancellation and no-store |
| `src/client/pages/admin/blogs-page.tsx`, admin components, `hooks/useAdminBlogs.ts`, Blog portions of `services/admin.service.ts` | `src/client/admin*.tsx`, `audit.tsx` | Local moderation queue, details and decisions, no main metrics dependency |
| `src/server/routes/v1/blogs.route.ts` | `src/server/routes.ts`, `moderation/service.ts` | Same public visibility, writing roles and ownership |
| `src/server/routes/v1/admin/blogs.route.ts` | `src/server/routes.ts` | Same decisions, plus bounded audit reads and incomplete-check retry |
| `src/server/models/blogs/slug.ts` | `src/server/data/slug.ts` | Copied algorithm, removed block comments |
| `src/server/models/blogs/{types,constants,schema,repository,transform,index}.ts` | `src/server/data/`, `src/shared/` | Narrowed models and imports, stable slugs, timestamps and source indexes |
| `src/server/services/moderation/wordlist.ts` | `src/server/moderation/wordlist.ts` | Copied rules/normalization, narrowed imports, removed block comments |
| `src/server/services/moderation/{index,categories,image}.ts` | `src/server/moderation/{screen,image}.ts`, shared schemas | Preserved screen categories, Gemini prompt meaning and fail-closed outcomes |
| `src/server/services/blog-moderation.service.ts` | `src/server/moderation/service.ts`, data store | Same transitions with transactional audit and revision checks |
| Blog sections of `src/shared/{schemas,limits}.ts` | `src/shared/schemas.ts` | Preserved limits: page 9/max 50, tags 8, title 160, excerpt 320, reason 10–500 |
| `src/server/models/audit-log/` | `src/server/data/{store,types}.ts` | Blog-only durable audit, no main collections |
| `src/server/services/metrics.service.ts`, admin Blog charts | `/api/v1/admin/aggregates` | Blog-owned status counts, authorized, 15-second cache |
| Blog client/data/model/API/admin tests and moderation-wordlist tests | `tests/` | Retained behavioral cases in independent integration/UI tests |
| `src/server/scripts/seed-blogs.ts` | No executable seed | Reviewed account dependencies, synthetic fixtures only in isolated tests |

## Deliberate differences

- The source has create/edit API routes but no author editor in its Blog pages.
  A minimal author desk exposes those operations and own-private-post reads.
- A publish attempt is durably flagged before network screening. Interrupted
  checks remain private and visible for manual retry/review. No background timer
  or worker is required. Retries are explicit and rate limited, without automatic loops.
- Moderation/status updates and audit inserts share a MongoDB transaction.
  Revisions prevent a concurrent editor or screening result from undoing a decision.
  Audits retain screening snapshots as well as actor, reason and status transition.
- Even admins cannot republish a moderated post through the edit route. They
  must use approve/restore so the decision is audited explicitly.
- HTTPS covers retain external URL handling. Server screening pins checked DNS
  addresses, rechecks one redirect, caps reads at 5 MB/5 seconds and accepts
  PNG/JPEG/WebP signatures. SVG/other active image formats are rejected.
- Markdown uses `react-markdown` without raw HTML, with an explicit safe URL policy.
  Body length is additionally bounded to 200,000 characters and payload to 512 KB.
- Protected views use immutable author IDs. No main-user join or account copy.
- No comments, reactions, subscriptions, notifications or main WebSocket imports.
- Source tooling versions with audit advisories are upgraded in this repository.

Main remains unchanged. Its editor/API/queue removal and launch-link switch are
separate reviewed integration work after shared authentication passes joint tests.
