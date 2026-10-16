import { describe, expect, it } from 'vitest';
import { formatCode, normalizeCode } from './code';

describe('normalizeCode', () => {
	it('strips spaces, dashes and other non-digits', () => {
		expect(normalizeCode('1234 5678')).toBe('12345678');
		expect(normalizeCode('1234-5678')).toBe('12345678');
		expect(normalizeCode('  12a34\t5678\n')).toBe('12345678');
		expect(normalizeCode('abc')).toBe('');
	});
});

describe('formatCode', () => {
	it('splits into two groups of four', () => {
		expect(formatCode('12345678')).toBe('1234 5678');
		expect(formatCode('00001234')).toBe('0000 1234');
	});
});
