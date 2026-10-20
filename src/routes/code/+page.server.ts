import { redirect } from '@sveltejs/kit';
import { normalizeCode } from '$lib/code';
import type { PageServerLoad } from './$types';

// The "open by code" form submits here: no code shows the form, a valid one opens the clip.
export const load: PageServerLoad = ({ url }) => {
	const raw = url.searchParams.get('code');
	if (raw === null) return {};

	const code = normalizeCode(raw);
	if (code.length === 8) redirect(303, `/${code}`);
	return { value: raw, error: 'Codes are 8 digits' };
};
