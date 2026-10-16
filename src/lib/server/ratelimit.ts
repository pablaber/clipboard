import { error, type RequestEvent } from '@sveltejs/kit';

/** Throws a 429 when the client exceeds the `LIMITER` binding. No-op when the binding is absent (vite dev). */
export async function limit(event: RequestEvent, action: string) {
	const result = await event.platform?.env?.LIMITER?.limit({
		key: `${action}:${event.getClientAddress()}`
	});
	if (result && result.success === false) error(429, 'Too many requests — slow down');
}
