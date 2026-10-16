import { error } from '@sveltejs/kit';
import { getClip } from '$lib/server/clips';
import { limit } from '$lib/server/ratelimit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	await limit(event, 'lookup');

	const clip = await getClip(event.params.code);
	if (!clip) error(404, 'Clip expired or not found');

	event.setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
	return { code: clip.code, content: clip.content, expiresAt: clip.expiresAt };
};
