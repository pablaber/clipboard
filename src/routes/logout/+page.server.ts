import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals }) => {
		await locals.auth.auth.signOut();
		redirect(303, '/');
	}
};
