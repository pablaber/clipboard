import { fail } from '@sveltejs/kit';
import { ClipValidationError, createClip, resolveTtl } from '$lib/server/clips';
import { limit } from '$lib/server/ratelimit';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async (event) => {
		await limit(event, 'create');

		const data = await event.request.formData();
		const content = data.get('content');
		const text = typeof content === 'string' ? content : '';
		const ttlField = data.get('ttl');
		const ttlFromForm =
			typeof ttlField === 'string' && ttlField !== '' ? Number(ttlField) : undefined;

		try {
			const { code, expiresAt } = await createClip({
				content: text,
				userId: event.locals.user?.id ?? null,
				ttlMs: resolveTtl(event.locals.user, ttlFromForm)
			});
			return { code, expiresAt };
		} catch (err) {
			if (err instanceof ClipValidationError) {
				return fail(400, { error: err.message, content: text });
			}
			throw err;
		}
	}
};
