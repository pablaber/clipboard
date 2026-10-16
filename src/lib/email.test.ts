import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail, normalizeOtp } from './email';

describe('normalizeEmail', () => {
	it('trims and lowercases', () => {
		expect(normalizeEmail('  Me@Example.COM \n')).toBe('me@example.com');
	});
});

describe('isValidEmail', () => {
	it('accepts ordinary addresses', () => {
		expect(isValidEmail('me@example.com')).toBe(true);
		expect(isValidEmail('a+b@sub.example.co.uk')).toBe(true);
	});

	it('rejects obvious mistakes', () => {
		for (const bad of ['', 'me', 'me@', '@example.com', 'me@example', 'me @example.com', 'a@b@c.com']) {
			expect(isValidEmail(bad), bad).toBe(false);
		}
	});

	it('rejects overlong addresses', () => {
		expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
	});
});

describe('normalizeOtp', () => {
	it('keeps only digits', () => {
		expect(normalizeOtp(' 123 456 ')).toBe('123456');
		expect(normalizeOtp('12-34-56')).toBe('123456');
		expect(normalizeOtp('abc')).toBe('');
	});
});
