import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

// `$env/dynamic/private` is read lazily (inside functions) so the build never needs secrets.
// On Workers the adapter fills it from the Worker env (vars + secrets); under `vite dev` from .env.
function config() {
	const { SUPABASE_URL, SUPABASE_SECRET_KEY } = env;
	if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
		throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
	}
	return { url: SUPABASE_URL, key: SUPABASE_SECRET_KEY };
}

// Cache headers @supabase/ssr wants on responses that write auth cookies. We don't use
// `event.setHeaders` for these: it throws if a header is already set, and setAll can run more than
// once per request or alongside a route's own `cache-control`. They're applied in the hook instead.
const pendingHeaders = new WeakMap<RequestEvent, Record<string, string>>();

/** Add the collected auth cache headers to the response, without overriding headers it already has. */
export function applyAuthHeaders(event: RequestEvent, response: Response) {
	for (const [name, value] of Object.entries(pendingHeaders.get(event) ?? {})) {
		try {
			if (!response.headers.has(name)) response.headers.set(name, value);
		} catch {
			// immutable headers (e.g. a proxied fetch response): skip
		}
	}
}

/**
 * Per-request client that stores the session in cookies. Uses the secret key so that
 * `Sb-Forwarded-For` is honoured and Supabase Auth rate-limits per end user, not per Worker egress IP.
 */
export function createAuthClient(event: RequestEvent) {
	const { url, key } = config();
	return createServerClient(url, key, {
		global: { headers: { 'Sb-Forwarded-For': event.getClientAddress() } },
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies, headers) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
				pendingHeaders.set(event, { ...pendingHeaders.get(event), ...headers });
			}
		}
	});
}

/** Plain service-role client for the `clips` table. No session handling. */
export function db() {
	const { url, key } = config();
	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
