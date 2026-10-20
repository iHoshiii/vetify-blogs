# Content-only migration proposal

Proposal only. No content was exported, copied, seeded, changed or deleted.
No source environment, live database or user/auth collection was accessed.

1. Agree a maintenance window, rollback owner, access policy, retention and
   content rights. Request a reviewed content-only export from main's operator.
2. Include Blog documents and Blog-targeted audit records only. Preserve `_id`,
   immutable main author/moderator IDs, slug, body/excerpt/tags/cover URL, status,
   publication/create/update dates, moderation verdict and review/takedown trails.
   Do not include users, passwords, email/provider identity records, main tokens,
   account approval records, sessions or signing credentials.
3. Produce an export manifest with counts by status, content hashes and schema
   version. Compare slugs/IDs for duplicates and resolve conflicts explicitly.
   Never silently rewrite published slugs. Initialize each imported `revision`
   to zero. Preserve audit evidence and map only Blog-specific audit fields.
4. Inventory every external cover/body image. Confirm sharing rights and
   persistence. Draft/private media needs service-owned private storage before
   production use. No storage migration is authorized by this plan.
5. Dry-run into an isolated staging Blog replica set. Validate counts/hashes,
   IDs, timestamps, audit chronology, search indexes and every status. Verify
   nonpublic slugs and direct IDs return the same 404 as absent content.
6. Run joint main SSO tests: real registered callbacks, signup/login, explicit
   provider linking, unknown/existing-account messages, code expiry/replay,
   PKCE/nonce/client/callback tampering, role changes, account disablement,
   revoked sessions and global logout. Current main is not ready for this step.
7. Capture a backup and read-only final content delta. Import idempotently with
   unique source IDs and a recorded migration run ID. Review a comparison report
   before enabling traffic. Supply an importer only after this mapping is approved.
8. Change main's Blog launch link and disable its old authoring/API/queue in a
   separate main-repository change. Optional aggregates must degrade gracefully.
   Monitor missing media, permission failures and held moderation outcomes.
9. Keep the source snapshot read-only for the agreed rollback window. Rollback
   restores routing to the source snapshot and freezes destination writes until
   the reviewed delta-reconciliation process completes. Do not delete source posts.

Account deletion/export requests require a future narrow main-to-Blog contract.
Do not remove content by email or infer identity from mutable display names.
