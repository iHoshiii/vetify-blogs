# Production deployment

The blog is `https://blog.vetify.page`. The separate main application is
`https://vetify.page`. This project deploys both the Vite frontend and Express API
to one Vercel project. `/api/*` reaches the API function, while frontend deep links
such as `/blogs` and `/auth/callback` reach the React application.
The API trusts the Vercel proxy for per-client IP rate limits. See
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-forwarded-for).

## Release flow

Push or merge into `main` -> Testing -> Production.
`.github/workflows/production.yml` only runs on pushes to `main`, including merges.
It does not run on feature branches, `dev`, pull request events or tags.
Testing runs lint, unit/integration tests, type checking, both builds, a compiled
API smoke test against disposable MongoDB, and Playwright Chromium browser tests.
Production depends on successful testing and builds with Vercel's production
settings before uploading the resulting deployment with `--prebuilt --prod`.
There is no separate staging deployment in this flow.

`git.deploymentEnabled: false` in `vercel.json` disables Vercel's automatic Git
deployments so GitHub Actions controls releases. Manual dashboard/CLI deployments
remain possible and do not run this workflow. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration).

## Vercel project

1. Create a Vercel project for `iHoshiii/vetify-blogs`, with the repository root
   as Root Directory. Use the **Vite** preset and **Node.js 24.x**.
2. Use the checked-in settings: install `npm ci`, build `npm run build`, output
   `dist/client`. The `api/index.ts` function hosts Express without a port listener.
3. Set the Production Branch to `main`. Configure the environment variables below
   under Project Settings -> Environment Variables, scoped to **Production**.
4. Add `blog.vetify.page` under Project Settings -> Domains.
5. Configure GitHub credentials below before pushing these changes to `main`.
   Importing a project can create an initial deployment. Do not treat that initial
   import as a tested release. The workflow controls subsequent releases.

## Application environment variables

An ignored `.env.production` is provided locally. `.env.production.example` is the
tracked reference. Replace the MongoDB placeholders before use. Vercel does not
receive this ignored file through Git. Enter its values in the Production scope
in Vercel, or import the file using Vercel's environment variable UI.

| Variable | Production value and purpose |
| --- | --- |
| `NODE_ENV` | `production`. Vercel supplies this for production builds/runtime. Keep it in the local file for standalone API operation. |
| `MONGODB_URI` | `mongodb+srv://USER:URL_ENCODED_PASSWORD@CLUSTER/vetify_blog_production?retryWrites=true&w=majority`. Use your Atlas database user and driver connection string. Secret, server only. |
| `MAIN_AUTH_ORIGIN` | `https://vetify.page`. Main app origin, with no path, query or fragment. Production validation requires HTTPS even while SSO is disabled. |
| `CLIENT_ORIGIN` | `https://blog.vetify.page`. Exact browser origin used for CORS and write-request checks. No path or trailing slash. |
| `AUTH_CALLBACK_URL` | `https://blog.vetify.page/auth/callback`. Must belong to `CLIENT_ORIGIN` and exactly match the callback registered with main. |
| `AUTH_CLIENT_ID` | `vetify-blog`. Must match the client registration and token audience on main when SSO is enabled. This is not a client secret. |
| `AUTH_ENABLED` | `false` for the current integration. Set to `true` only after main supports the OIDC/PKCE and version 2 introspection contract and joint testing passes. |
| `AUTH_SESSION_KEY` | Leave empty while SSO is off. Before enabling SSO, generate a unique 64-character hex value using the command below. Secret, server only. |
| `GEMINI_API_KEY` | Your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). Secret, server only. Leave empty to hold publication attempts for manual admin review. |
| `GEMINI_MODERATION_MODEL` | `gemini-3.5-flash`, matching the current application default. Confirm model availability and quota in your Gemini project and test screening before relying on it. |
| `VITE_API_URL` | `/api/v1`. Public, embedded at build time. Must remain a same-origin path because the client rejects external API URLs. |
| `PORT` | `8104` for standalone Node hosting only. Omit in Vercel, which invokes the function without a port listener. |

Generate the Blog's session encryption key locally, then paste it into Vercel:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not reuse main's signing key or database. Rotating `AUTH_SESSION_KEY` invalidates
existing encrypted Blog sessions and in-flight login state. Do not prefix secrets
with `VITE_`. Changing a Vite value requires rebuilding and deploying the client.
See [Vercel's Vite environment guidance](https://vercel.com/docs/frameworks/frontend/vite#environment-variables).

## MongoDB setup

1. Create an Atlas replica-set cluster and the separate `vetify_blog_production`
   database. Transactions are required for protected moderation writes.
2. Create a dedicated database user with `readWrite` on that database. The app
   creates its own indexes during startup, including session and rate-limit TTLs.
3. Copy the Node.js driver URI from Atlas. Replace the password, percent-encoding
   reserved characters such as `@`, `:`, `/`, `?`, `#` and `%`. Include the database
   name before `?`; `admin`, `local`, `config` and `vetify` are rejected.
4. Configure Atlas Network Access for the Vercel runtime's outbound connections.
   Use an approved IP access list or your Vercel networking option. Ordinary
   serverless deployments do not imply one fixed outbound IP. See
   [Vercel static IP guidance](https://vercel.com/docs/connectivity/static-ips)
   and [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
5. CI uses disposable MongoDB and does not need access to this production database.

## GitHub deployment credentials

In GitHub Settings -> Environments, create **production** and allow deployment
from `main`. Add these environment secrets, or use repository Actions secrets:

| GitHub secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | Create an access token at [Vercel account tokens](https://vercel.com/account/tokens) with access to the team owning this project. |
| `VERCEL_ORG_ID` | Vercel team/account ID, available as `orgId` in `.vercel/project.json` after linking. |
| `VERCEL_PROJECT_ID` | Vercel project ID, available as `projectId` in `.vercel/project.json` after linking. |

To link locally and obtain the IDs:

```powershell
npx vercel@64.7.0 login
npx vercel@64.7.0 link
```

Select the existing Blog project. `.vercel/` is ignored. Application secrets such
as `MONGODB_URI` belong in Vercel, not in the workflow YAML. The deployment job
pulls Production configuration from Vercel. See
[Vercel's GitHub Actions guide](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel).

## Name.com DNS for the .page domain

1. Add `blog.vetify.page` to the Blog Vercel project's Domains first.
2. If Name.com hosts your authoritative DNS, open Name.com -> My Domains ->
   `vetify.page` -> Manage DNS Records. If another provider hosts DNS, edit there.
3. Add a **CNAME**, Host **blog**, Answer **the exact target shown by Vercel**.
   Use a hostname only, with no `https://` or path. Remove conflicting records
   for the same `blog` host. Preserve main's apex, mail and verification records.
4. Add a TXT verification record if Vercel requests one. Wait for the domain
   configuration and HTTPS certificate to become valid in Vercel.
5. `vetify.page` belongs to the main app. If setting it up separately, add it
   to that app's Vercel project and use the apex A record Vercel supplies there.

Use Vercel's project-specific DNS values. See
[Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
and [Name.com CNAME instructions](https://www.name.com/support/articles/115004895548-adding-a-cname-record).

## First release and verification

Merge the implementation and this branch into `main`; the repository's original
`main` does not yet contain the full app. Watch Testing and Production in Actions.
After deployment, open `/blogs`, refresh a deep link, and request
`https://blog.vetify.page/api/health` and `/api/v1/blogs`. Health should return
`status: "ok"` and `authConfigured: false`. The feed starts empty.
Sign-in and author/admin operations remain unavailable until the main auth
contract is implemented. See [the integration requirements](CONTRACTS.md).

For standalone hosting after `npm run build`, load the production file explicitly:

```powershell
node --env-file=.env.production dist/server/server/index.js
```

The existing `npm start` loads `.env`, not `.env.production`. A reverse proxy must
serve the frontend and forward `/api` when using standalone hosting.
