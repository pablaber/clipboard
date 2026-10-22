import { afterEach, describe, expect, it, vi } from 'vitest';

// clips.ts imports the Supabase helper, which needs SvelteKit's virtual env module.
vi.mock('$env/dynamic/private', () => ({ env: {} }));

import {
	ANON_MAX_BYTES,
	ANON_TTL,
	USER_MAX_BYTES,
	USER_MAX_TTL,
	TTL_STEP,
	byteLength,
	generateCode,
	resolveTtl,
	validateContent
} from './clips';

afterEach(() => vi.restoreAllMocks());

function mockRandom(...values: number[]) {
	const queue = [...values];
	return vi.spyOn(crypto, 'getRandomValues').mockImplementation(((arr: Uint32Array) => {
		arr[0] = queue.shift()!;
		return arr;
	}) as never);
}

describe('generateCode', () => {
	it('always returns 8 digits', () => {
		for (let i = 0; i < 500; i++) expect(generateCode()).toMatch(/^\d{8}$/);
	});

	it('keeps leading zeros', () => {
		mockRandom(0, 1234);
		expect(generateCode()).toBe('00000000');
		expect(generateCode()).toBe('00001234');
	});

	it('rejects values in the biased tail', () => {
		// 4_200_000_000 is the first rejected value (42 * 1e8); next draw is accepted.
		const spy = mockRandom(4_200_000_000, 4_294_967_295, 4_199_999_999);
		expect(generateCode()).toBe('99999999');
		expect(spy).toHaveBeenCalledTimes(3);
	});
});

describe('resolveTtl', () => {
	const user = { id: 'u1' };

	it('gives anonymous clips 1h even if 1d is requested', () => {
		expect(resolveTtl(null)).toBe(ANON_TTL);
		expect(resolveTtl(null, USER_MAX_TTL)).toBe(ANON_TTL);
	});

	it('defaults logged-in users to 1d', () => {
		expect(resolveTtl(user)).toBe(USER_MAX_TTL);
		expect(resolveTtl(user, NaN)).toBe(USER_MAX_TTL);
	});

	it('honours any whole number of hours from 1h to 1d', () => {
		expect(resolveTtl(user, ANON_TTL)).toBe(ANON_TTL);
		expect(resolveTtl(user, 6 * TTL_STEP)).toBe(6 * TTL_STEP);
		expect(resolveTtl(user, 23 * TTL_STEP)).toBe(23 * TTL_STEP);
		expect(resolveTtl(user, USER_MAX_TTL)).toBe(USER_MAX_TTL);
	});

	it('rounds down to a whole hour, never exceeding the request', () => {
		expect(resolveTtl(user, 2 * TTL_STEP + 59 * 60_000)).toBe(2 * TTL_STEP);
		expect(resolveTtl(user, USER_MAX_TTL - 1)).toBe(23 * TTL_STEP);
	});

	it('clamps to between 1h and 1d', () => {
		expect(resolveTtl(user, USER_MAX_TTL * 7)).toBe(USER_MAX_TTL);
		expect(resolveTtl(user, 1000)).toBe(ANON_TTL);
		expect(resolveTtl(user, 0)).toBe(ANON_TTL);
		expect(resolveTtl(user, -5)).toBe(ANON_TTL);
	});
});

describe('content validation', () => {
	it('counts UTF-8 bytes, not characters', () => {
		expect(byteLength('abc')).toBe(3);
		expect(byteLength('é')).toBe(2);
		expect(byteLength('€')).toBe(3);
		expect(byteLength('😀')).toBe(4);
	});

	it('rejects empty content', () => {
		expect(validateContent('', false)).not.toBeNull();
		expect(validateContent('', true)).not.toBeNull();
	});

	it('anonymous: accepts exactly ANON_MAX_BYTES and rejects one more', () => {
		expect(validateContent('a'.repeat(ANON_MAX_BYTES), false)).toBeNull();
		expect(validateContent('a'.repeat(ANON_MAX_BYTES + 1), false)).not.toBeNull();
	});

	it('logged in: accepts exactly USER_MAX_BYTES and rejects one more', () => {
		expect(validateContent('a'.repeat(USER_MAX_BYTES), true)).toBeNull();
		expect(validateContent('a'.repeat(USER_MAX_BYTES + 1), true)).toBe(
			'Clip is too large (max 1 MB)'
		);
	});

	it('anonymous: tells the user to log in when logging in would allow the clip', () => {
		expect(validateContent('a'.repeat(ANON_MAX_BYTES + 1), false)).toBe(
			'Clip is too large (max 100 KB). Log in to save up to 1 MB.'
		);
		expect(validateContent('a'.repeat(USER_MAX_BYTES), false)).toMatch(/Log in/);
	});

	it('anonymous: over the logged-in limit too, states both limits', () => {
		expect(validateContent('a'.repeat(USER_MAX_BYTES + 1), false)).toBe(
			'Clip is too large (max 100 KB, or 1 MB when logged in)'
		);
	});

	it('rejects multi-byte text that is under the limit in characters but over in bytes', () => {
		const chars = ANON_MAX_BYTES / 2 + 1; // 2 bytes each => ANON_MAX_BYTES + 2 bytes
		expect(chars).toBeLessThan(ANON_MAX_BYTES);
		expect(validateContent('é'.repeat(chars), false)).not.toBeNull();
		expect(validateContent('é'.repeat(ANON_MAX_BYTES / 2), false)).toBeNull();
	});
});
