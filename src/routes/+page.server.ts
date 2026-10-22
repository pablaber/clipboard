import { fail } from '@sveltejs/kit';
import { normalizeCode } from '$lib/code';
import {
	ANON_TTL,
	ClipLimitError,
	ClipValidationError,
	TTL_STEP,
	USER_MAX_TTL,
	createClip,
	deleteClip,
	listClips,
	resolveTtl
} from '$lib/server/clips';
import { limit } from '$lib/server/ratelimit';
import type { Actions, PageServerLoad } from './$types';

// Passed to the page so it never hard-codes the TTL values.
const ttl = { min: ANON_TTL, max: USER_MAX_TTL, step: TTL_STEP, default: USER_MAX_TTL };

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (!locals.user) return { clips: [], ttl };
	setHeaders({ 'cache-control': 'private, no-store' });
	return { clips: await listClips(locals.user.id), ttl };
};

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
				ttlMs: resolveTtl(event.locals.user, ttlFromForm),
				clientIp: event.getClientAddress()
			});
			return { code, expiresAt };
		} catch (err) {
			if (err instanceof ClipValidationError) {
				return fail(400, { error: err.message, content: text });
			}
			if (err instanceof ClipLimitError) {
				return fail(429, { error: err.message, content: text });
			}
			throw err;
		}
	},

	delete: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { deleteError: 'Log in to delete clips' });

		const raw = (await request.formData()).get('code');
		const code = normalizeCode(typeof raw === 'string' ? raw : '');
		if (code.length !== 8) return fail(400, { deleteError: 'Codes are 8 digits' });

		await deleteClip(locals.user.id, code);
		return { deleted: code };
	}
};
