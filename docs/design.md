# Online Clipboard — Design & Initial Plan

## Context

The repo is empty (just an initial commit). The goal is a deliberately minimal online clipboard:
paste text on machine A → get an 8‑digit numeric code → type the code on machine B → get the text.
Clips expire after **1 hour**. Users can optionally **log in with an emailed code**. When logged in,
their clips last up to **1 day** and show up in a "Your clips" list on any machine where they're logged in,
so they don't need the code.

Constraints: be as simple as possible, use Svelte, Cloudflare, and Supabase.

**Confirmed with user:** Cloudflare **Workers + static assets** (not Pages); logged-in users **choose 1h or 1d**; login emails sent with **Resend** from the user's own domain.

---

## Stack (recommended)

| Concern | Choice | Why |
|---|---|---|
| Web framework | **SvelteKit 2 + Svelte 5**, TypeScript, plain CSS | Small, form actions work without client JS, first-class Cloudflare adapter |
| Hosting | **Cloudflare Workers + Static Assets** via `@sveltejs/adapter-cloudflare` | Cloudflare now points new projects to Workers rather than Pages, and new features land there first. The adapter targets both, so moving to Pages later only changes config. Static asset requests are free. Workers also has the **Rate Limiting binding**, which this design needs. |
| DB | **Supabase Postgres**: one table plus a `pg_cron` purge job | Simple to run; cron handles expiry |
| Auth | **Supabase Auth email OTP** (`signInWithOtp` → `verifyOtp`, `type: 'email'`) | Built in. No passwords, no magic-link redirects |
| Email delivery | **Resend** as custom SMTP in Supabase | Supabase's built-in mailer only sends to your own team's addresses, at 2 per hour, so it can't serve real users |

---

## Key design decisions

1. **Server-only Supabase access.** The browser never talks to Supabase, and no Supabase key ever ships to the client.
   - The `clips` table has RLS enabled with **zero policies**. Only the server, using the secret key (`sb_secret_…`, i.e. service_role), can read or write it.
   - Result: anyone guessing codes has to go through our Worker, where rate limiting applies. There's no way around it by calling Supabase directly.
   - All logic (code generation, TTL rules, ownership) lives in one small TypeScript module.
2. **Codes.** 8 random digits from `crypto.getRandomValues`, stored as `text` so leading zeros survive.
   - Codes display as `1234 5678`. Input accepts spaces and dashes.
   - Uniqueness comes from a `UNIQUE` index plus insert‑retry on conflict (Postgres error `23505`, up to 5 tries).
   - Lookups always filter `expires_at > now()`, so expired rows awaiting purge never leak.
3. **Expiry.** `expires_at` is set by the server:
   - Anonymous clips: `now + 1h`.
   - Logged‑in users pick 1h or 1d (default 1d).
   - The limits are constants in `clips.ts` (`ANON_TTL`, `USER_MAX_TTL`), so extending them later is a one-line change.
   - `pg_cron` deletes expired rows every 5 minutes.
4. **Rate limiting.** One Cloudflare `ratelimits` binding, 20 requests per 60s, keyed by `"<action>:<client IP>"`. It applies to code lookup, clip creation, and login send/verify, and returns 429 when exceeded.
5. **Auth from a Worker.** Supabase Auth limits sign-in and verify requests per IP (30 per 5 minutes). All Worker subrequests share Cloudflare egress IPs, so every user would land in one bucket. Fix:
   - Enable **IP address forwarding** in Supabase (Auth → Rate Limits).
   - Send `Sb-Forwarded-For: <client IP>` from the auth client. This only works with a **secret** key, which fits decision 1.
6. **"Saved sessions"** = Supabase refresh-token cookies set by `@supabase/ssr` on the server. They are long-lived, so a user stays logged in on each machine. When a logged‑in user creates a clip, `user_id` is set. The home page lists their unexpired clips and re-fetches on window focus (`invalidateAll` on `visibilitychange`), so a clip pasted on machine A appears on machine B without a manual refresh. No Realtime needed.
7. **Limits and safety:**
   - Text only, ≤100 KB (DB check plus server check).
   - Responses with clip content get `Cache-Control: no-store`.
   - A small "don't paste secrets" note on the page.
   - Known trade-off: 10⁸ codes plus rate limiting is fine for casual use but is not secret-grade. Burn-after-read is a natural later addition.
8. **Login codes vs clip codes.** Keep Supabase's email OTP at **6 digits**, distinct from the 8-digit clip codes, to avoid confusion.

---

## Data model — `supabase/migrations/0001_clips.sql`

```sql
create table public.clips (
  id          bigint generated always as identity primary key,
  code        text not null unique check (code ~ '^[0-9]{8}$'),
  content     text not null check (octet_length(content) between 1 and 100000),
  user_id     uuid references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index clips_user_idx    on public.clips (user_id, created_at desc);
create index clips_expires_idx on public.clips (expires_at);

alter table public.clips enable row level security;   -- no policies: server-only
revoke all on public.clips from anon, authenticated;   -- browser roles never touch this table
grant select, insert, delete on public.clips to service_role;

create extension if not exists pg_cron;
select cron.schedule('purge-expired-clips', '*/5 * * * *',
  $$delete from public.clips where expires_at < now()$$);
```

---

## App structure

```
src/
  app.d.ts                     Locals { auth: SupabaseClient; user: { id, email } | null }, Platform.env.LIMITER
  hooks.server.ts              per-request auth client (cookies + Sb-Forwarded-For); locals.user via auth.getClaims()
  lib/server/supabase.ts       createAuthClient(event) [@supabase/ssr createServerClient]; db() [supabase-js, secret key, no session]
  lib/server/clips.ts          generateCode, createClip, getClip, listClips, deleteClip, TTL constants
  lib/server/ratelimit.ts      limit(event, action) → error(429) on failure (no-op if binding absent in dev)
  lib/code.ts                  normalizeCode (strip non-digits), formatCode ("1234 5678")
  params/code.ts               matcher: /^\d{8}$/
  routes/
    +layout.server.ts          return { user }
    +layout.svelte             header: app name, "Log in" / email + "Log out"
    +page.svelte               paste textarea + Save; "Have a code?" input; result card (big code + copy + link);
                               if logged in: TTL select + "Your clips" list (code, preview, time left, delete)
    +page.server.ts            load: listClips(user); actions: create, delete
    [code=code]/+page.server.ts  load: rate-limit, getClip or 404; set no-store
    [code=code]/+page.svelte     content in <pre>, Copy button, "expires in …"
    open/+server.ts            GET ?code= → normalize → redirect /{code} (makes the "Have a code?" form work without JS)
    login/+page.server.ts      actions: send (signInWithOtp), verify (verifyOtp → cookies → redirect /)
    login/+page.svelte         step 1 email, step 2 6-digit code
    logout/+page.server.ts     action: auth.signOut() → redirect /
wrangler.jsonc                 main/assets per adapter docs, nodejs_als flag, ratelimits binding (no vars; env arrives as deploy-time secrets)
```

Env: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, both uploaded as Worker secrets by the release job. Locally these go in `.dev.vars` / `.env`, both gitignored.

---

## Implementation steps

1. **Scaffold.** `npx sv create` (minimal, TS) and add `@sveltejs/adapter-cloudflare`, `@supabase/supabase-js`, `@supabase/ssr`, `wrangler`. Add `wrangler.jsonc` and `.gitignore` entries. Commit `docs/design.md` (this document).
2. **Supabase project.**
   - Create the project, then `npx supabase link --project-ref <ref>` and `npm run db:push` to run the migration.
   - Auth settings live in `supabase/config.toml` (6-digit OTP, `{{ .Token }}` templates in `supabase/templates/login_code.html`, Resend SMTP under `[remotes.production]`). Apply with `npm run config:push` (see README for the env vars).
   - Auth → Rate Limits: enable IP forwarding (one-time; not expressible in `config.toml`).
3. **Server libs.** `supabase.ts`, `clips.ts`, `ratelimit.ts`, `code.ts`, `hooks.server.ts`, `app.d.ts`.
4. **Clip flow.** Home page create action, `[code]` route, `open` redirect, copy-to-clipboard button.
5. **Auth flow.** Login (send/verify), logout, user in layout, "Your clips" list with delete, TTL select, refetch on focus.
6. **Polish.** Minimal CSS, mobile-friendly large code display, error states (404 "expired or not found", 429 "slow down").
7. **Deploy.**
   - Deploys only through the release pipeline: Release Please opens a release PR, and merging it migrates the DB, pushes the Supabase config, and runs `wrangler deploy --domain` with `SUPABASE_URL` and `SUPABASE_SECRET_KEY` uploaded as Worker secrets. See README "Releasing to production".

---

## Verification

- **Unit (Vitest):** `normalizeCode`/`formatCode`; `generateCode` always gives 8 digits and keeps leading zeros; TTL selection (anon → 1h even if a longer TTL is requested; user → clamped to ≤1d).
- **Local end-to-end:** run with `npm run build && npx wrangler dev` so the rate-limit binding and env are emulated, against a dev Supabase project.
  - Paste in a normal window, open the code in an incognito window, and confirm the content and copy button work.
  - Typing `1234-5678` or `1234 5678` in "Have a code?" resolves.
  - An unknown code returns 404.
  - Run `update clips set expires_at = now() - interval '1 minute'` and confirm the clip now 404s. After ≤5 min the cron job removes the row (`cron.job_run_details` shows runs).
  - About 25 rapid lookups give 429.
  - Log in with the emailed 6-digit code. Create a clip with a 1d TTL and check that it appears in "Your clips" in a second logged-in browser after focusing the window. Delete removes it. Log out clears it.
  - Confirm the browser bundle and network tab contain no Supabase URL or key.
- **Prod smoke test** after deploy: repeat the core paste → code → retrieve and login flows on the deployed domain.

---

## Later (out of scope now)

Burn-after-read, longer TTLs for accounts, file/image clips, QR code for the link, Turnstile on login, Supabase Realtime for instant updates.
