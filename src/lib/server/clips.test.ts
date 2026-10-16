import { afterEach, describe, expect, it, vi } from 'vitest';

// clips.ts imports the Supabase helper, which needs SvelteKit's virtual env module.
vi.mock('$env/dynamic/private', () => ({ env: {} }));

import {
	ANON_TTL,
	MAX_BYTES,
	USER_MAX_TTL,
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

	it('honours the two valid choices', () => {
		expect(resolveTtl(user, ANON_TTL)).toBe(ANON_TTL);
		expect(resolveTtl(user, USER_MAX_TTL)).toBe(USER_MAX_TTL);
	});

	it('clamps to at most 1d and never exceeds the request', () => {
		expect(resolveTtl(user, USER_MAX_TTL * 7)).toBe(USER_MAX_TTL);
		expect(resolveTtl(user, 2 * ANON_TTL)).toBe(ANON_TTL);
		expect(resolveTtl(user, 1000)).toBe(ANON_TTL);
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
		expect(validateContent('')).not.toBeNull();
	});

	it('accepts exactly MAX_BYTES and rejects one more', () => {
		expect(validateContent('a'.repeat(MAX_BYTES))).toBeNull();
		expect(validateContent('a'.repeat(MAX_BYTES + 1))).not.toBeNull();
	});

	it('rejects multi-byte text that is under the limit in characters but over in bytes', () => {
		const chars = MAX_BYTES / 2 + 1; // 2 bytes each => MAX_BYTES + 2 bytes
		expect(chars).toBeLessThan(MAX_BYTES);
		expect(validateContent('é'.repeat(chars))).not.toBeNull();
		expect(validateContent('é'.repeat(MAX_BYTES / 2))).toBeNull();
	});
});
