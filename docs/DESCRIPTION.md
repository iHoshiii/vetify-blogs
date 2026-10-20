# Vetify Blog: application description

Updated 16 October 2026. Repository folder: `vetify-blogs`. Independent client,
API, authoring and moderation are implemented on `feat/independent-blog`.
Public reading works independently. Shared main sign-in remains blocked by
main's pending web SSO and version 2 introspection contract. See
[validation](VALIDATION.md) for the checks performed and remaining integration work.

## Purpose and users

Publish veterinary articles for public readers while providing authenticated
professional/admin authoring and moderated editorial control.
Its audience includes pet owners seeking information and qualified contributors.
Content must distinguish educational material from individual veterinary advice.

## Feature scope

Preserve the existing public feed/detail, slugs, tags, pagination, authored
content and loading/error/empty states. Preserve role/ownership checks and
draft/published/moderated status transitions from the implementation.
Admins manage the post moderation queue and its decision/audit evidence.
Authors cannot reverse moderator decisions by editing a status themselves.
Comments, reactions, paid subscriptions and new editorial features are not
assumed present; add them only through separate scope decisions.

## Independent architecture and ownership

React/TypeScript/Vite UI, TypeScript API and its own content database.
Suggested future origin: `https://blog.vetify.page`, not yet configured.
Blog owns posts, editorial moderation and content audit history. Main remains
the account/admin authority. Use immutable main author/moderator IDs.
Do not copy users, passwords, provider identities or main signing credentials.
Publish media deliberately; draft/private content must not leak through storage
URLs or public caches. Object storage, if needed, belongs to this app.

## Authentication and moderation

Keep public reading available where the original routes allow it. Authoring,
editing and moderation require central authentication and server authorization.
External web SSO requires the reviewed registered-client flow and is pending in
main; a shared domain/email does not establish a working login integration.
Recheck current account status, role and ownership for protected writes.
Only a current main administrator may perform Blog moderation actions.

Moderation uses the existing rules/provider behavior. Provider failures must
produce a durable safe state with clear retry/error handling.
Use persisted bounded/idempotent work if a long operation needs background jobs.
Review Markdown/HTML/URL rendering and media validation against script injection.

## Main integration and source

Port main's Blog pages, `useBlogs`/`useAdminBlogs`, Blog service/model, public/admin
routes, admin Blog editor, Blog schemas and moderation helpers actually required.
See this repository's `PROMPT.md` for the exact source map and setup checks.
Main's dashboard currently reads Blog counts directly; after extraction provide
an optional authorized aggregate interface or remove that metric from main.
Main must remain usable when Blog is down. Any main notification integration
uses a narrow authenticated API, not direct database/realtime access.

## Acceptance and migration

Test public visibility through feeds/slugs/direct IDs, ownership and all supported
moderation transitions. Prevent draft/hidden/removed leakage and client-side
admin impersonation. Test unsafe content, pagination, duplicate slugs, provider
outages and slow/error UI. Run useful existing tests independently.
Prepare a content-only migration with preserved main IDs and audit evidence;
no live deletion/migration is implied by this description.
Enable main's launch link after this destination and shared auth are validated.

## Exclusions

Main account administration, professional approval, appointments, user chat/calls,
AI consultation guidance, meal planning, documents and Anatomy are owned elsewhere.
