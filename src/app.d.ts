import type { SupabaseClient } from '@supabase/supabase-js';
import type { RateLimit } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			auth: SupabaseClient;
			user: { id: string; email: string | undefined } | null;
		}
		// The adapter's ambient types add ctx, caches and cf; we only add `env`.
		interface Platform {
			env: {
				LIMITER?: RateLimit;
				SUPABASE_URL: string;
				SUPABASE_SECRET_KEY: string;
			};
		}
	}
}

export {};
