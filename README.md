# Online Clipboard

Paste text on one machine, get an 8-digit code, type the code on another machine to get the text back.
Clips expire after 1 hour (up to 1 day when logged in with an emailed code).

SvelteKit 2 + Svelte 5, deployed to Cloudflare Workers (static assets), with Supabase for Postgres and Auth.
See [docs/design.md](docs/design.md) for the design and plan.

## Local development

```sh
npm install
cp .env.example .env              # used by `npm run dev` (vite dev)
cp .dev.vars.example .dev.vars    # used by `npm run preview` (wrangler dev)
# fill in SUPABASE_URL and SUPABASE_SECRET_KEY in both files (use a dev Supabase project)

npm run dev       # vite dev server (rate limiting is a no-op here)
npm run preview   # build + wrangler dev, emulates the LIMITER binding and Worker env
```

See [Supabase](#supabase) for applying the migration and the auth config.

Other scripts: `npm run check` (svelte-check), `npm test` (vitest).

## Deploy

```sh
# set SUPABASE_URL in wrangler.jsonc vars first
npx wrangler secret put SUPABASE_SECRET_KEY
npm run deploy    # npm run build && wrangler deploy
```

## Supabase

Database migrations and hosted Auth settings are both managed from the repo. `supabase/config.toml` is the single source of truth for Auth; nothing needs clicking in the dashboard except the one-time setting below.

```sh
npx supabase login
npx supabase link --project-ref ppzjawsxwfwnrorwnkdr
npm run db:push        # applies supabase/migrations
```

Fallback for the migration: paste `supabase/migrations/0001_clips.sql` into the SQL editor.

### Auth config

The root tables of `config.toml` are the local profile (`http://localhost:5173`, 6-digit email OTP valid for 1 hour, code-only email from `supabase/templates/login_code.html`). `[remotes.production]` overrides only what differs on the hosted project: site URL, a 30-emails-per-hour rate limit, and Resend SMTP. When linked to that ref, `config:push` deep-merges the override over the root and pushes the result:

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
