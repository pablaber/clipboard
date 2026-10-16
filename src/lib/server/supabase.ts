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
				if (Object.keys(headers).length > 0) event.setHeaders(headers);
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
