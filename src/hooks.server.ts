import type { Handle } from '@sveltejs/kit';
import { applyAuthHeaders, createAuthClient } from '$lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = createAuthClient(event);

	const { data, error } = await event.locals.auth.auth.getClaims();
	event.locals.user =
		!error && data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
	applyAuthHeaders(event, response);
	return response;
};
