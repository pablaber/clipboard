import { error, redirect } from '@sveltejs/kit';
import { normalizeCode } from '$lib/code';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const code = normalizeCode(url.searchParams.get('code') ?? '');
	if (code.length !== 8) error(400, 'Codes are 8 digits');
	redirect(303, `/${code}`);
};
