import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals }) => {
		// 'local' only ends this session; the default 'global' would log the user out on every machine.
		await locals.auth.auth.signOut({ scope: 'local' });
		redirect(303, '/');
	}
};
