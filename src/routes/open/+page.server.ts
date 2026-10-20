import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Legacy form target; /code now handles opening by code.
export const load: PageServerLoad = ({ url }) => {
	redirect(308, `/code${url.search}`);
};
