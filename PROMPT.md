# Prompt: initialize the separate Blog repository

Paste everything below into the coding agent in `vetify-blog`.

---

Port Vetify's existing Blog into an independent React/TypeScript application and
server API, preserving public reading, authoring and moderation. Main source is
`C:\Users\Administrator\OneDrive\Desktop\Vetify`.
Do not change main, access/copy its real `.env`, seed live data, copy user/auth
collections, delete posts or deploy resources. Ask for a source export if needed.

## Source to inspect and port

- `src/client/pages/blogs/`, its feed/detail/components and author interactions.
- `src/client/services/blogs.service.ts` and related hooks/types.
- `src/client/pages/admin/blogs-page.tsx` and its content moderation dependencies.
- `src/server/routes/v1/blogs.route.ts`, `admin/blogs.route.ts`.
- `src/server/models/blogs/`, exported model helpers and indexing definitions.
- `src/server/services/blog-moderation.service.ts`, Blog-specific moderation
  helpers and Blog schemas currently inside `src/shared/schemas.ts`.
- Useful Blog feed/data/detail/API/model/admin/moderation tests and seed examples.
- Blog count dependencies in `src/server/services/metrics.service.ts` and the
  corresponding admin charts, to decide which aggregates this service can expose.

Inventory the actual files before copying. Preserve pagination, slugs, published
visibility, role-gated authoring, edit restrictions and current moderation states.
Preserve hold/flag/hide/remove/restore/approve behavior and its audit evidence.
Do not invent comment/reaction/subscription features that source does not implement.

## Accounts, permissions and data

Follow main `docs/main-deployment/shared-auth.md`.
Keep public posts readable without login as currently supported. Creating,
editing and moderating content requires main authentication and server checks.
Use immutable main user IDs for authors/moderators. Names are display data only.
Do not copy users, password hashes, social identities or main signing secrets.

Main owns account administration and professional approval. Blog owns post
moderation and content audit history. Only current main admins can exercise Blog
admin powers. Apply existing professional/admin author rules; do not let an
author undo a moderator's decision by editing a post status.
Recheck disabled/revoked accounts and roles for protected writes.

Blog MongoDB holds its feature data only. If main shows Blog statistics, expose
an authorized aggregate API with a bounded cache and unavailable state. Main
must not read Blog's database directly or block its dashboard when Blog is down.
If Blog events require main notifications, define a narrow authenticated event
API with idempotency; do not import main WebSocket internals or write main data.

## Content and deployment design

Keep the React/TypeScript/Vite stack, Node 24 where tooling supports it, npm and
a lockfile. Create independent API/auth/moderation/data modules and build commands.
Review Markdown/HTML/URL rendering to prevent script injection.
Moderation failures must leave a durable safe state with visible retry/error
behavior. If long-running moderation needs workers, persist jobs and use bounded
idempotent retries; do not depend on timers continuing after Lambda returns.

Keep original body/image handling when porting local behavior. If production
uses object storage, make it this service's storage and validate uploads.
Separate publicly published media from private/draft content deliberately.
Do not migrate any stored content without a reviewed plan.

Create sample environment settings, implement their validation:

```dotenv
NODE_ENV=development
PORT=8104
MONGODB_URI=<blog_database_only>
MAIN_AUTH_ORIGIN=http://localhost:8000
AUTH_CLIENT_ID=vetify-blog
AUTH_CALLBACK_URL=http://localhost:5177/auth/callback
CLIENT_ORIGIN=http://localhost:5177
GEMINI_API_KEY=<blog_moderation_key_if_required>
VITE_API_URL=/api/v1
```

Proposed production origin is `https://blog.vetify.page`; register its callback
with main. Never put private settings in VITE variables or commit real env files.
Do not create cloud resources as part of initialization.

## Acceptance

1. Provide a file port manifest and list external contract requirements.
2. Public feed/detail show only allowed states. Draft/hidden/removed content must
   not leak through slug lookup, listing, direct IDs or caching.
3. Test anonymous/professional/admin permissions, cross-author edits, disabled
   accounts and current role changes, with isolated test MongoDB.
4. Test every supported moderation transition and audit record; authors cannot
   restore rejected/held/removed content without the required moderator decision.
5. Test unsafe markup/URLs, malformed input, moderation failures, pagination,
   duplicate slugs, image failures and loading/error/empty UI states.
6. Test shared main sign-in without duplicated accounts or automatic email links.
7. Build/run independently and retain useful existing unit/API/browser tests.
8. Prepare a content-only migration proposal preserving author IDs and audit
   evidence. Document local setup, env samples and actual validation results.

Main retains a Blog launch link and optional aggregate integration, not the Blog
editor, content API, moderation queue or content database.
