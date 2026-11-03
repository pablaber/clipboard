import { error } from '@sveltejs/kit';
import { getClip } from '$lib/server/clips';
import { limit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

// The clip's full text, for copying from a list that only has previews.
export const GET: RequestHandler = async (event) => {
	await limit(event, 'lookup');

	const clip = await getClip(event.params.code);
	if (!clip) error(404, 'Clip expired or not found');

	return new Response(clip.content, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex',
			'x-content-type-options': 'nosniff'
		}
	});
};
