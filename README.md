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

Apply `supabase/migrations/0001_clips.sql` to your Supabase project (SQL editor or `supabase db push`).

Other scripts: `npm run check` (svelte-check), `npm test` (vitest).

## Deploy

```sh
# set SUPABASE_URL in wrangler.jsonc vars first
npx wrangler secret put SUPABASE_SECRET_KEY
npm run deploy    # npm run build && wrangler deploy
```
