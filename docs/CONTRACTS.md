# External contracts and integration blockers

## Main sign-in, proposed and unavailable in current main

The inspected main `docs/main-deployment/shared-auth.md` describes required
registered-client Authorization Code + PKCE work. Its present browser/native
authentication and version 1 introspection do not satisfy that contract.
Blog therefore defaults to `AUTH_ENABLED=false`. Do not enable it merely because
both applications share a domain, or copy main's symmetric signing secret.

Blog uses maintained `openid-client` for discovery, PKCE S256, state, nonce and
ID-token signature/issuer/audience verification. Main must provide OIDC discovery,
authorization/token/JWKS endpoints, exact client/callback registration, atomic
single-use code exchange and client-scoped credentials. The client is currently
configured as a public PKCE client with token endpoint authentication `none`.
If main selects confidential-client authentication, review the adapter/config
together before enabling it. No endpoint is claimed to exist in present main.

Required `POST {MAIN_AUTH_ORIGIN}/api/v1/auth/introspect` request:

```json
{"clientId":"vetify-blog"}
```

The scoped main token is supplied in the server's Authorization Bearer header.
The proposed response is the following raw object, not main's current v1 envelope:

```json
{
  "version": 2,
  "active": true,
  "issuer": "https://vetify.page",
  "audience": "vetify-blog",
  "user": {
    "id": "immutable-24-character-main-object-id",
    "role": "professional",
    "status": "active",
    "emailVerified": true,
    "name": "Display only"
  },
  "sessionValid": true,
  "tokenExpiresAt": "2026-10-16T12:00:00.000Z",
  "validUntil": "2026-10-16T11:30:25.000Z"
}
```

Dates above are illustrative. `validUntil` must be current and at most 30 seconds
ahead. Main must recheck current role, verification, disabled/banned/deleted
state, session version, password-change revocation and global logout. Blog makes
an online check on every protected request and caches no identity results.
The OIDC subject must match this immutable user ID. Roles: `public`,
`professional`, `admin`. Source Blog uses the professional role as its author
capability. Main retains approval and account administration.

Flow state is browser-bound through a host-only HttpOnly cookie. MongoDB consumes
it once, with a five-minute validity check independent of TTL cleanup. Sensitive
PKCE verifiers and access tokens are AES-GCM encrypted with Blog's own key.
Only hashed random session IDs are stored. Cookie max age is one hour, while
each request still checks the main credential expiry. There is no refresh-token
flow. Expired credentials require sign-in again. Logout here is local only.

Main owns all signup, account linking and recovery screens. Preserve its messages
`Create an account first to use the app.` and
`Account already exist. Please login` when implementing those main flows.
Blog has no email matching or identity creation path.

## Optional main dashboard integration

`GET /api/v1/admin/aggregates` is currently for a current authenticated main admin
through a Blog session. It returns `{data:{counts,cachedUntil}}`, with at most a
15-second count cache and no HTTP caching. Errors return 503 with an unavailable
message. Main must use a timeout and show unavailable without blocking other charts.
Machine-to-machine credentials and richer daily/window series are not implemented.
Review that authentication contract if main needs server-to-server metrics.
Main must never query Blog MongoDB. Main notifications are not implemented by
the source Blog, so no event endpoint or realtime dependency is introduced.

## Media and moderation

Source stores Markdown and external cover URLs. There is no file upload API or
object storage provisioning. Draft URLs are private in Blog responses but an
external host's URL can remain public independently of Blog. Do not put secret
images on publicly accessible external hosts. Future private uploads require
service-owned storage and access-controlled draft objects before publishing.
External images can change after screening, as in the source. Immutable media
storage and a publication-copy policy require separate production review.

Gemini receives article text and covers for screening. A missing key, invalid
answer, provider outage or unreadable cover leaves a durable private flagged post.
Admins can retry incomplete checks or explicitly approve after manual review.
The configured source model is `gemini-3.5-flash`, availability must be checked
with this service's provider account before enabling automated publication.

References: [OAuth security BCP](https://www.rfc-editor.org/rfc/rfc9700.html),
[openid-client](https://github.com/panva/openid-client),
[react-markdown security](https://github.com/remarkjs/react-markdown#security).
