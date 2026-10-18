# Online Clipboard

Paste text on one machine, get an 8-digit code, type the code on another machine to get the text back.
Clips expire after 1 hour (up to 1 day when logged in with an emailed code).

SvelteKit 2 + Svelte 5, deployed to Cloudflare Workers (static assets), with Supabase for Postgres and Auth.
See [docs/design.md](docs/design.md) for the design and plan.

## Local development

Development runs against a local Supabase stack in Docker (Postgres, Auth, and Mailpit for login emails).

```sh
npm install
npm run app:bootstrap   # starts the stack and writes .env and .dev.vars
npm run dev             # vite dev server on http://localhost:5310 (rate limiting is a no-op here)
npm run preview         # build + wrangler dev on http://localhost:8310, emulates the LIMITER binding
```

Dev runs on port 5310, preview on 8310, and the local Supabase stack on 553xx; all fail loudly if a port is taken. The seed adds a demo clip, so http://localhost:5310/12345678 works right away.

Login codes are not emailed: open Mailpit at http://127.0.0.1:55324 and read the 6-digit code there.

To point at a hosted Supabase project instead, skip `app:bootstrap` and copy `.env.example` to `.env` and `.dev.vars.example` to `.dev.vars`, then fill in `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

### Local database

- `npm run app:bootstrap` is safe to rerun. It reuses a healthy stack and only rewrites the generated `.env` and `.dev.vars` (mode 0600, gitignored).
- `npm run db:reset` destroys the local database, replays `supabase/migrations/`, and applies `supabase/seed.sql`.
- `npm run db:start` starts only Postgres. `npm run db:stop` stops the whole stack.
- `app:bootstrap` starts a trimmed stack with `supabase start -x ...`, excluding Realtime, Studio, Edge Runtime, Logflare, Vector, Supavisor, imgproxy, Storage and postgres-meta. It keeps only what the app needs (Postgres, Auth, PostgREST, Kong and Mailpit), because the full stack can exhaust a small Docker VM's memory and make Auth time out when sending login codes. `config.toml` is untouched so it keeps matching the hosted project.
- `app:bootstrap` and `db:start` first run `scripts/free-supabase-ports.mjs`, which stops leftover `supabase_*` containers from other Supabase projects that are bound to this project's 553xx ports. It never touches containers on other ports, such as another project's default 543xx stack, or this project's own containers.

See [Supabase](#supabase) for applying the migration and the auth config to the hosted project.

Other scripts: `npm run check` (svelte-check), `npm test` (vitest).

## Releasing to production

Releases are driven by Release Please and Conventional Commits. Merging the generated release pull request is the only supported way to deploy. There is no deploy script: never run `wrangler deploy`, `wrangler secret put`, or create a tag by hand.

1. Open a pull request from a `<type>/<short-description>` branch with a title of the form `<type>: <lowercase subject>` and no scope. `.github/workflows/pr-validate.yml` rejects anything else. Allowed types: `chore`, `docs`, `feat`, `fix`, `vuln`, `misc`, `ignore`.
2. Squash merge it, with the repository set so the squash commit takes the PR title as its subject (Release Please parses that).
3. The push to `main` runs `.github/workflows/release-please.yml`, which opens or updates a release PR titled like `chore(main): release 0.1.0`. Nothing is deployed yet.
4. Check that `package.json` and `.release-please-manifest.json` moved to the expected version and the changelog reads correctly. Never hand-edit the release PR.
5. Merge the release PR. That is the only gate on the production job.

The production job, in order: links the Supabase project (failing if the committed `[remotes.production].project_id` differs from `SUPABASE_PROJECT_REF`); previews and applies migrations with `supabase db push`; pushes the hosted auth config with `supabase config push --yes` (failing if `config.toml` changes during the push or the output contains `localhost`); builds; deploys the Worker to `PRODUCTION_HOSTNAME` with `cloudflare/wrangler-action`, uploading `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as encrypted Worker bindings; then fetches `/` and `/login` and requires a success.

If the job fails because a variable or secret was missing or wrong, fix only that setting and rerun the failed job. If code, a migration or `config.toml` must change, open a normal `fix:` PR and let Release Please cut the next patch.

### Required repository configuration

Pull requests run `.github/workflows/ci.yml` (tests, `svelte-check`, build) and the title check, which need no configuration.

| Variable                    | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `RELEASE_PLEASE_APP_ID`     | GitHub App that lets the release PR trigger CI and validation |
| `SUPABASE_PROJECT_REF`      | Project to link; must match `[remotes.production].project_id` |
| `SUPABASE_URL`              | Hosted project URL, uploaded as a Worker binding              |
| `CLOUDFLARE_ACCOUNT_ID`     | Account that owns the Worker                                  |
| `PRODUCTION_HOSTNAME`       | Custom domain, for example `clip.example.com` (no scheme)     |
| `SUPABASE_SMTP_ADMIN_EMAIL` | Sender address on the domain verified in Resend               |

| Secret                          | Purpose                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `RELEASE_PLEASE_APP_PRIVATE_KEY`| Private key for the GitHub App                            |
| `SUPABASE_ACCESS_TOKEN`         | Supabase CLI token for link, `db push` and `config push`  |
| `SUPABASE_DB_PASSWORD`          | Hosted database password for `db push`                    |
| `SUPABASE_SECRET_KEY`           | `sb_secret_...` key, uploaded as a Worker binding         |
| `CLOUDFLARE_API_TOKEN`          | Token allowed to deploy Workers and attach the hostname   |
| `RESEND_API_KEY`                | Sending-only Resend key for Supabase Auth SMTP            |

Store these as repository variables and secrets; do not paste them into the Supabase or Cloudflare dashboards.

## Supabase

Database migrations and hosted Auth settings are both managed from the repo. `supabase/config.toml` is the single source of truth for Auth; nothing needs clicking in the dashboard except the one-time setting below.

```sh
npx supabase login
npx supabase link --project-ref ppzjawsxwfwnrorwnkdr
npm run db:push        # applies supabase/migrations
```

Fallback for the migration: paste `supabase/migrations/0001_clips.sql` into the SQL editor.

### Auth config

The release job pushes this config automatically (see [Releasing to production](#releasing-to-production)). The manual `config:push` below is for local use and the first-time setup.

The root tables of `config.toml` are the local profile (`http://localhost:5310`, 6-digit email OTP valid for 1 hour, code-only email from `supabase/templates/login_code.html`). `[remotes.production]` overrides only what differs on the hosted project: site URL, a 30-emails-per-hour rate limit, and Resend SMTP. When linked to that ref, `config:push` deep-merges the override over the root and pushes the result:

```sh
RESEND_API_KEY=... SUPABASE_SMTP_ADMIN_EMAIL=login@<domain> SUPABASE_AUTH_SITE_URL=https://<host> npm run config:push
```

Use a Resend key restricted to a verified sending domain, and never commit it. `config push` shows a diff and asks for confirmation before writing; `npx supabase config diff` previews it.

Two requirements fail silently (the CLI pushes the local profile to production instead):

1. `[remotes.production].project_id` must be the literal project ref, not `env(...)`. Remote selection compares it before env substitution. The ref is not a secret; it is in the public Supabase URL.
2. The Supabase CLI must be 2.116.0 or newer. 2.106.0 through 2.115.0 drop `[remotes.*]`. Keep the pinned `supabase` dev dependency at or above that.

### IP address forwarding (one-time)

The Worker sends `Sb-Forwarded-For` so Auth rate-limits per end user instead of per Cloudflare egress IP. This is not expressible in `config.toml`, so enable it once, either in Dashboard -> Authentication -> Rate Limits, or via the Management API (token from https://supabase.com/dashboard/account/tokens):

```sh
curl -X PATCH "https://api.supabase.com/v1/projects/ppzjawsxwfwnrorwnkdr/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"security_sb_forwarded_for_enabled": true}'
```
