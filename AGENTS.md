# Agent guide

Working conventions for automated agents and new contributors. `README.md` is the
user-facing documentation (local setup, release setup, required repo variables and
secrets, Supabase auth config); `docs/design.md` is the original design and plan. This file
covers how to work in the repo without re-reading all of it, and the traps already hit.

## What this is

A minimal online clipboard: paste text, get an 8-digit code, open it on another machine.
Anonymous clips expire after 1 hour. Users who log in with a 6-digit emailed code choose a
1 hour or 1 day lifetime and see "Your clips" on any machine they are logged in on.

SvelteKit 2 + Svelte 5 (runes, plain CSS) on Cloudflare Workers with static assets,
Supabase Postgres and Auth, Resend as Supabase's SMTP. Production:
https://clipboard.patlab.dev. Supabase project ref: `ppzjawsxwfwnrorwnkdr`.

Pinned and expected versions: Node 24 in CI (`engine-strict=true` in `.npmrc`), SvelteKit 2,
`@sveltejs/adapter-cloudflare` 7, Supabase CLI >= 2.116 (a devDependency, so use
`npx supabase`). Do not upgrade SvelteKit or the adapter casually; see Boundaries.

## Commands

Run everything from the repository root.

```sh
npm ci                  # install; matches CI. Use npm install only to change dependencies
npm run app:bootstrap   # start this project's local Supabase stack, write .env and .dev.vars
npm run dev             # vite dev on http://localhost:5310 (rate limiting is a no-op)
npm run preview         # build + wrangler dev on http://localhost:8310 (LIMITER emulated)
npm run db:reset        # destroy local DB, replay supabase/migrations, apply seed.sql
npm run db:start        # Postgres only
npm run db:stop         # stop the local stack
npx supabase config diff   # read-only preview of hosted config changes
```

Verification: the same set CI runs (`.github/workflows/ci.yml`), so run all of it before pushing.

```sh
npm run check           # svelte-kit sync + svelte-check
npm test                # vitest run, src/**/*.test.ts
npm run build           # vite build -> .svelte-kit/cloudflare
```

`db:push` and `config:push` exist for first-time setup only; never run them against
production for a routine change (see Releases). There is no lint or format step yet (#8).

## Layout

| Path                          | What lives there                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/lib/server/clips.ts`     | all clip logic: code generation, TTL constants and rules, validation, create/get/list/delete    |
| `src/lib/server/supabase.ts`  | `createAuthClient` (`@supabase/ssr`, cookies), `db()` (service-role client), `applyAuthHeaders` |
| `src/lib/server/ratelimit.ts` | `limit(event, action)` over the `LIMITER` binding                                               |
| `src/hooks.server.ts`         | per-request auth client, `locals.user` from `getClaims()`, applies auth cache headers           |
| `src/app.d.ts`                | `Locals` (`auth`, `user`) and `Platform.env` (`LIMITER`, `SUPABASE_*`) types                    |
| `src/lib/*.ts`                | pure, browser-safe helpers: `code`, `email` (incl. OTP), `time` (each with a `.test.ts`)        |
| `src/lib/CopyButton.svelte`   | the only shared component; renders nothing without `navigator.clipboard`                        |
| `src/params/code.ts`          | `code` route matcher: exactly 8 digits                                                          |
| `src/routes/+page.*`          | home: create/delete actions, code form, "Your clips"                                            |
| `src/routes/[code=code]/`     | clip page: rate-limited lookup, 404 if expired or missing                                       |
| `src/routes/open/`, `logout/` | redirect-only routes (`+page.server.ts` load plus stub `+page.svelte`)                          |
| `src/routes/login/`           | `send` and `verify` actions (email OTP)                                                         |
| `src/routes/+layout.svelte`   | header and the shared global CSS (`.card`, `.error`, `.muted`, `.row`)                          |
| `src/routes/+error.svelte`    | one error page for 400/404/429/other                                                            |
| `supabase/migrations/`        | numbered SQL migrations (`0001_clips.sql`)                                                      |
| `supabase/config.toml`        | local profile (root) plus `[remotes.production]` overrides                                      |
| `supabase/templates/`         | `login_code.html`: the login email, code only                                                   |
| `supabase/seed.sql`           | local-only demo clip `12345678`                                                                 |
| `scripts/`                    | `free-supabase-ports.mjs`, `write-local-supabase-env.mjs` (used by `app:bootstrap`)             |
| `wrangler.jsonc`              | Worker entry, assets, `LIMITER` binding, dev port; deliberately no `vars`                       |
| `.github/workflows/`          | `ci.yml`, `pr-validate.yml`, `release-please.yml` (also the production deploy)                  |

## Where changes belong

- **Clip rules live in `src/lib/server/clips.ts`, never in routes or components.** Codes,
  TTLs (`ANON_TTL`, `USER_MAX_TTL`), size limit (`MAX_BYTES`), validation and ownership
  checks are there. Routes parse the form, call it, and shape the response. The home page
  receives the TTL options from its load function so the UI never hard-codes them.
- **Keep pure logic Supabase-free.** Helpers that need no database (`generateCode`,
  `resolveTtl`, `validateContent`) are exported and unit tested; put new pure logic the
  same way so it stays testable.
- **Auth state comes from `event.locals`.** `locals.user` (`{ id, email } | null`) is set in
  the hook; `locals.auth` is the cookie-backed Supabase client. Do not build another client
  per route.
- **Reads of Supabase env go through `supabase.ts`.** `SUPABASE_URL` and
  `SUPABASE_SECRET_KEY` are read lazily from `$env/dynamic/private` inside functions, so
  the build needs no secrets. Do not read them at module top level.
- **Worker bindings via `event.platform.env`** (typed in `app.d.ts`). Add new bindings to
  `wrangler.jsonc` and `Platform.env` together.

## Boundaries

- **Server-only Supabase.** The browser never talks to Supabase and no key ships to the
  client. Do not add `PUBLIC_` Supabase vars, a browser client, or universal `+page.ts`
  loads that fetch from Supabase. Why: the `clips` table is reachable only through our
  Worker, where rate limiting applies.
- **New tables: RLS on, zero policies, explicit grants.** Do copy `0001_clips.sql`: `alter
  table ... enable row level security`, `revoke all on ... from anon, authenticated`, and
  `grant ... to service_role` for only the operations used. Why: "Automatically expose new
  tables" is OFF on the hosted project, so a missing grant fails in production with
  permission errors. Locally `auto_expose_new_tables` is not set in `config.toml` (the CLI
  falls back to `true`), so the same mistake works on your machine and only breaks after
  deploy. Review grants by hand.
- **Rate limit every user-triggered lookup, create and login action.** Call
  `await limit(event, '<action>')` first. Current actions: `lookup`, `create`, `login-send`,
  `login-verify`; the key is `<action>:<client IP>`, 20 per 60 s from `wrangler.jsonc`, and it
  throws a 429. Why: 8 digits is guessable without it. The binding is absent under `vite dev`
  so `limit` is a no-op there; use `npm run preview` to exercise it. `delete` (requires login)
  and the redirect-only `/open` are not limited.
- **Auth client uses the SECRET key plus `Sb-Forwarded-For: <client IP>`.** Why: all Worker
  subrequests share Cloudflare egress IPs, so without it every user shares one Supabase Auth
  rate-limit bucket. IP forwarding is enabled once on the hosted project via the dashboard
  or Management API; it cannot be expressed in `config.toml` (README, "IP address
  forwarding").
- **Never call `event.setHeaders` inside `setAll`.** Cache headers from `@supabase/ssr` are
  collected in a `WeakMap` and applied by `applyAuthHeaders` in the hook, only when the
  response does not already have that header. Why: SvelteKit throws "header already set" when
  `setAll` collides with a route that sets `cache-control`.
- **Logout is `signOut({ scope: 'local' })`.** Why: the default `global` scope would log the
  user out on every machine.
- **Redirect-only or error-only pages use a `+page.server.ts` load plus a stub
  `+page.svelte`, not `+server.ts`.** Why: SvelteKit does not render `+error.svelte` for
  errors thrown from `+server.ts`. See `open/` and `logout/`.
- **Pages with clip content set `cache-control: no-store` and `x-robots-tag: noindex`**
  (see `[code=code]/+page.server.ts`); the logged-in home load sets `private, no-store`.
  `static/robots.txt` allows only `/`. A new route that shows clip data must do the same.
- **Forms must work without JavaScript.** Use real `<form method>` plus a form action, then
  add `use:enhance` progressively. The "Have a code?" form is a plain GET to `/open` for
  this reason. Do not move submission logic into client `fetch` calls.
- **Text only, at most 100 KB.** Enforced twice: `validateContent` (UTF-8 bytes, not
  characters) and the table check `octet_length(content) between 1 and 100000`. Change both.
- **The login code and the clip code are different things.** Login is a 6-digit Supabase
  email OTP (`otp_length = 6` in `config.toml`); clip codes are 8 digits. Keep them
  distinct, and keep the email template code-only (no links, `{{ .Token }}`).
- **Do not upgrade to SvelteKit 3 / adapter-cloudflare 8 as a drive-by.** Adapter 8 removes
  `event.platform`, which `ratelimit.ts` and `app.d.ts` depend on. That is issue #10.

## Local development

`npm run app:bootstrap` starts this project's Supabase stack and writes `.env` (read by
`vite dev`) and `.dev.vars` (read by `wrangler dev`/`npm run preview`), both gitignored, mode
0600. It is safe to rerun. To use a hosted project instead, copy `.env.example` and
`.dev.vars.example` and fill in the two values.

- Ports: dev 5310 and preview 8310 (dev fails instead of moving on, `strictPort`), local
  Supabase 553xx. Login codes are not emailed: read them in Mailpit at http://127.0.0.1:55324.
  The seed clip is `12345678`, so http://localhost:5310/12345678 works immediately.
- `app:bootstrap` runs `supabase start -x ...` to leave out Realtime, Studio, Edge Runtime,
  Logflare, Vector, Supavisor, imgproxy, storage-api and postgres-meta. The full stack can
  exhaust a small Docker VM's memory and make Auth time out sending login codes.
- **Never disable local services by editing `config.toml`.** `config push` compares api,
  auth, database, pooler, realtime and storage, so e.g. `[realtime] enabled = false` would be
  pushed to production. Use `-x` instead.
- `free-supabase-ports.mjs` stops containers named `supabase_*` that hold this project's
  553xx ports but belong to another project id. It never touches other ports.
- Other projects' Supabase stacks (e.g. torch-league on 543xx) may share the same Docker
  (Colima) VM. Never stop, reset or prune another project's containers. Kill processes you
  started by PID, never `pkill -f`. If Supabase cannot reach Docker, start Colima
  (`colima start`) first.
- Known quirk: agent worktrees nested inside the main checkout (for example
  `.claude/worktrees/...`) can break vite and vitest tsconfig resolution ("Tsconfig not
  found"). Run test and build from a copy outside the main checkout.

## Supabase config and migrations

- `supabase/config.toml` is the only Supabase config. Root tables are the local profile;
  `[remotes.production]` overrides the site URL (`SUPABASE_AUTH_SITE_URL`), `email_sent`
  (30/hour) and Resend SMTP, using whole-value `env()` references.
- **`[remotes.production].project_id` must be the literal project ref**, not `env(...)`
  (remote selection compares before substitution; otherwise `config push` silently pushes
  the local profile). The root `project_id = "clipboard"` is just the local stack name. The
  release job fails if the literal ref differs from `SUPABASE_PROJECT_REF`.
- **Values shared with production must match the hosted project**, or `config push` changes
  prod. Examples already in the file: pooler `default_pool_size = 15`, `max_client_conn =
  200`, and `[storage.vector] enabled = false` (the hosted free tier rejects it with a 402).
  `enable_signup` must stay `true`: users are created on first login.
- Always run `npx supabase config diff` (read-only) before changing `config.toml`.
- **Migrations:** add a new numbered file in `supabase/migrations/` (e.g. `0002_<name>.sql`).
  Never edit an applied migration. They reach production only through the release job.
  Test locally with `npm run db:reset`.
- Expired clips are filtered out by every query (`expires_at > now()`); `pg_cron` deletes the
  rows every 5 minutes (`purge-expired-clips`, in `0001`). New queries over `clips` must keep
  the filter.

## Code style

- TypeScript strict, tabs, single quotes. Match surrounding files (no formatter is wired up yet).
- Svelte 5 runes only: `$props()`, `$state`, `$derived`, `$effect`. No legacy `export let` or
  stores.
- Plain CSS. Shared styles are `:global` rules in `+layout.svelte`; page-specific styles go in
  the page's `<style>`. No CSS framework.
- Use SvelteKit's generated `./$types` for loads and actions.
- Form actions return `fail(status, { ... })` for user errors; unexpected failures throw
  `Error`, which renders `+error.svelte`. Throw `ClipValidationError` for rejected clip
  input.
- Normalize user input with the helpers (`normalizeCode`, `normalizeEmail`, `normalizeOtp`)
  so spaces and dashes are accepted.

## Testing

- Vitest covers pure helpers in `src/**/*.test.ts`, next to the code. Importing a server
  module that touches Supabase needs `vi.mock('$env/dynamic/private', () => ({ env: {} }))`
  first (see `clips.test.ts`).
- Add a unit test whenever you add or change pure logic (TTL rules, code/format helpers,
  validation).
- There are no e2e tests yet (#9). Manual QA against the local stack: save in a normal
  window and open the code in incognito; open by code with spaces or dashes; the 404 page;
  about 25 rapid lookups give 429 on `npm run preview`; log in via Mailpit; "Your clips" in
  two browsers (refreshes on window focus); delete; logout (other browser stays logged in).

## Pull requests

- Branch `<type>/<short-description>`; never push to `main`.
- **PR title: `<type>: <lowercase subject>`, no scope.** Types: `feat`, `fix`, `chore`,
  `docs`, `vuln`, `misc`, `ignore`. Enforced by `pr-validate.yml`. Choose the type by the
  intended release note: `ignore` is hidden from the changelog, and `misc` has no changelog
  section.
- **Squash merge only**, with the PR title as the commit subject (Release Please parses it).
  Branches are deleted on merge.
- Commit messages: single line, lowercase start, concise, no `Co-Authored-By`.
- PR descriptions are short and follow `.github/pull_request_template.md` (description with
  `Closes #n`, what changed, manual testing steps; do not list automated checks).
- Stacked PRs need a rebase after each squash merge: `git rebase --onto origin/main
  <old parent tip>`.
- Update this file when a change alters conventions, commands, architecture or constraints.

## Releases

Release Please opens a release PR (`chore(main): release x.y.z`) after merges to `main`.
**Merging it is the only deploy path. Never deploy by hand:** no `wrangler deploy`, no
`wrangler secret put`, no hand-made tags, no hand-edited release PR. The job, in order:
link the Supabase project (guard on the literal ref), `db push` (dry run, then apply),
`config push` (fails if `config.toml` changes during the push or the output contains
`localhost`), build, `wrangler deploy --domain`, then a smoke test of `/` and `/login`.

- Production env arrives as Worker secrets (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) uploaded
  by the release job, which is why `wrangler.jsonc` has no `vars`. Do not add them there.
- If the job fails because a variable or secret is missing or wrong, fix only that setting and
  re-run the failed job. If code, a migration or `config.toml` must change, open a normal `fix:`
  PR.
- Required repo variables and secrets are listed in the README.

## Manual (human) steps

Anything irreversible or production-facing (secrets, hosted Supabase config, deploys,
Supabase or Cloudflare dashboard settings) is a human step: describe it, do not do it. When
handing over shell commands, have the block prompt for each value interactively instead of
leaving `<PLACEHOLDER>`s (zsh): `read -r 'VAR?Prompt: '`, and `read -rs 'VAR?Prompt: '; echo`
for secrets, then `export`. Fill in known values (the project ref, the repo) directly.

## Gotchas

- `vite dev` has no `LIMITER`, so a "working" local dev server proves nothing about rate
  limiting; check with `npm run preview`.
- A 429 from Supabase Auth (`error.status === 429`) is mapped to a friendly message in the
  login actions; keep that mapping when touching them.
- `vite.config.ts` pins the `preview` port to 5310 too, but `npm run preview` is
  `wrangler dev` on 8310 (`wrangler.jsonc`), not `vite preview`.
- `docs/design.md` is the original plan and is partly stale (for example it describes
  `open/+server.ts` and `auth.signOut()`); the code is the source of truth.

## Open follow-ups

#7 use `client-id` instead of `app-id` for `create-github-app-token`; #8 add prettier and
eslint with a CI lint step; #9 Playwright smoke tests; #10 upgrade to SvelteKit 3 and
adapter-cloudflare 8.
