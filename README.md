# Vetify Blogs

Independent React/TypeScript/Vite journal and Node 24/Express API, extracted
from the local Vetify Blog. MongoDB stores Blog content, audit evidence,
encrypted sessions and short-lived authentication state only.

## Local setup

1. Use Node 24 and run `npm ci`.
2. Configure settings from `.env.example` in your own untracked `.env`, or
   supply environment variables. Never use main's database or signing secrets.
3. Use a separate MongoDB database with a replica set. Transactions are required
   so moderation and its audit evidence commit together. A standalone MongoDB
   server supports reading but cannot support these protected changes.
4. Run `npm run dev`. Client: `http://localhost:5177`, API port: `8104`.
   Use the configured hostname consistently because cookies are host scoped.
5. Run `npm run build` to build both applications. `npm start` starts the
   built API on loopback. Serve `dist/client` with SPA fallback and proxy `/api`
   to the API. For Vercel and production configuration, see
   [the deployment guide](docs/DEPLOYMENT.md).

The database starts empty. No seed, migration or live content operation runs
automatically. Missing Gemini settings hold publication attempts privately for
an administrator to review. Drafts do not call the provider.

## Shared accounts

`AUTH_ENABLED=false` is intentional. Public reading works independently.
Protected operations return an explicit unavailable response until main supports
the reviewed registered-client OIDC/PKCE and version 2 introspection contract.
Main currently implements version 1 and is incompatible. There is no local
login, account database, password handling or email-based account linking.

After joint integration testing, register the exact callback with main and set
`AUTH_ENABLED=true` with an independent random 32-byte hex `AUTH_SESSION_KEY`.
The default callback is `http://localhost:5177/auth/callback`. Production proposal:
`https://blogs.vetify.page/auth/callback`. The callback UI forwards the code to
the server, which exchanges it once and issues a host-only HttpOnly cookie.
Tokens remain encrypted server-side. Every protected request checks main online.
Sign out of Blog is local. Main must enforce global revocation through introspection.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite client and watched API |
| `npm run typecheck` | Client, server and test TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit, UI, isolated MongoDB and mock-issuer integration tests |
| `npm run test:e2e` | Browser tests with fixture API responses |
| `npm run test:built` | Start the compiled API against disposable MongoDB |
| `npm run build` | Type checking and independent client/server builds |

API tests use `mongodb-memory-server` to start disposable replica sets and may
download MongoDB on the first run. They never use `MONGODB_URI` from your shell.
Browser tests require a Playwright Chromium installation.

## Repository workflow

Development uses scope-specific branches. Merge the application and production
setup into `main` to release. Only pushes to `main` trigger testing followed by
the Vercel production deployment. See [the deployment guide](docs/DEPLOYMENT.md)
for required Vercel variables, GitHub secrets and Name.com DNS records.

See [port manifest](docs/PORT_MANIFEST.md), [external contracts](docs/CONTRACTS.md),
[migration proposal](docs/MIGRATION.md) and [validation](docs/VALIDATION.md).
