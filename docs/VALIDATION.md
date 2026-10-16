# Validation results

Executed locally on 16 October 2026 with Node 24.13.0 and npm 11.6.2.
No main files, real environment settings, live data or hosted resources changed.

| Check | Result |
| --- | --- |
| `npm test` | 33 tests passed across 8 files |
| `npm run test:e2e` | 3 Chromium browser checks passed |
| `npm run build` | TypeScript, Vite client and independent server build passed |
| `npm run lint` | Passed |
| `npm run test:built` | Compiled API startup, health and anonymous empty feed passed with disposable MongoDB |
| `npm audit` | 0 vulnerabilities |
| `npm ls vite vitest @vitejs/plugin-react react-router-dom` | Consistent dependency tree, no invalid peers |
| `git diff --check` | Passed |
| Source/test file size check | 45 files checked, none over 160 lines |

## Coverage exercised

- Anonymous feed/detail, private statuses, direct IDs, matching 404s, no-store
  headers and body/moderation omission from public summaries.
- Pagination defaults and bounds, concurrent duplicate slugs, lowercase tags,
  text search, stable slugs/publication timestamps and malformed input.
- Anonymous/public/professional/admin permissions, ownership, demotion, disabled
  or revoked identities, forged headers and blocked main-v1 authentication.
- Every source status against approve/hide/remove/restore, with status/actor
  audit assertions. Removed-only purge and audit retention after deletion.
- Unavailable moderation persisted privately, explicit retry/manual approval,
  author restrictions, screening snapshots and a late screen/admin-decision race.
- Transaction rollback when audit insertion fails, and an explicit unavailable
  response when aggregate queries fail.
- Wordlist normalization, provider clean/flagged/malformed/inconsistent/error
  responses, absent provider configuration and unreadable covers.
- Unsafe Markdown/URLs, private IPv4/IPv6 destinations, credentials in URLs,
  active image formats, failed image fallback and origin restrictions.
- Browser-bound PKCE/state/nonce code exchange against a local mock OIDC issuer,
  signed ID-token validation, wrong audience, expired/replayed flows, PKCE/state
  tampering, opaque HttpOnly sessions, online revocation and local logout.
- UI slow/loading/error/retry/empty states, safe article rendering, paging,
  unavailable authoring, insufficient role, editor errors/hold outcomes and
  disabled editing for moderated professional posts.
- Browser feed/detail navigation, pagination and error/empty states at desktop,
  plus 390-pixel mobile layout without horizontal overflow. Desktop/mobile
  screenshots were inspected. Screenshots and traces are untracked test artifacts.

API tests use disposable MongoDB replica sets. The built-server smoke test also
uses its own replica set. Browser checks use synthetic route responses, not
real posts. No test contacts main's real authentication or a live Gemini account.

## Remaining integration work

Actual main web SSO is unavailable. The mock-issuer tests prove Blog's contract
implementation, not compatibility with current main. Joint signup/provider
linking, real registered callback tampering, real account/session revocation and
global logout acceptance remain pending in main. Keep `AUTH_ENABLED=false`.

Production Gemini access/model availability, content/rights review, immutable
or private media storage, hosting and any content migration have not been
validated. See [external contracts](CONTRACTS.md) and [migration proposal](MIGRATION.md).
The source Blog remains in main until a separately reviewed integration change.
