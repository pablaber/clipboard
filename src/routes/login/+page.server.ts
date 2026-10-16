import { fail, redirect } from '@sveltejs/kit';
import { isValidEmail, normalizeEmail, normalizeOtp } from '$lib/email';
import { limit } from '$lib/server/ratelimit';
import type { Actions, PageServerLoad } from './$types';

const RATE_LIMITED = 'Too many attempts — wait a bit';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	send: async (event) => {
		await limit(event, 'login-send');

		const data = await event.request.formData();
		const raw = data.get('email');
		const email = normalizeEmail(typeof raw === 'string' ? raw : '');
		if (!isValidEmail(email)) {
			return fail(400, { step: 'email', email, error: 'Enter a valid email address' });
		}

		const { error } = await event.locals.auth.auth.signInWithOtp({
			email,
			options: { shouldCreateUser: true }
		});
		if (error) {
			if (error.status === 429) return fail(429, { step: 'email', email, error: RATE_LIMITED });
			return fail(400, { step: 'email', email, error: "Couldn't send a code. Please try again." });
		}
		return { step: 'verify', email };
	},

	verify: async (event) => {
		await limit(event, 'login-verify');

		const data = await event.request.formData();
		const rawEmail = data.get('email');
		const rawToken = data.get('token');
		const email = normalizeEmail(typeof rawEmail === 'string' ? rawEmail : '');
		const token = normalizeOtp(typeof rawToken === 'string' ? rawToken : '');
		if (!isValidEmail(email)) {
			return fail(400, { step: 'email', email, error: 'Enter a valid email address' });
		}
		if (token.length !== 6) {
			return fail(400, { step: 'verify', email, error: 'Enter the 6-digit code from your email' });
		}

		const { error } = await event.locals.auth.auth.verifyOtp({ email, token, type: 'email' });
		if (error) {
			if (error.status === 429) return fail(429, { step: 'verify', email, error: RATE_LIMITED });
			return fail(400, { step: 'verify', email, error: 'That code is wrong or has expired' });
		}
		redirect(303, '/');
	}
};
