import { describe, expect, it } from 'vitest';
import { expiresText, timeLeft } from './time';

const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const at = (ms: number) => new Date(now + ms).toISOString();

describe('timeLeft', () => {
	it('shows minutes under an hour, rounding up', () => {
		expect(timeLeft(at(59 * MIN), now)).toBe('59 min');
		expect(timeLeft(at(59 * MIN - 1000), now)).toBe('59 min');
		expect(timeLeft(at(1000), now)).toBe('1 min');
	});

	it('shows whole hours from one hour up', () => {
		expect(timeLeft(at(HOUR), now)).toBe('1 h');
		expect(timeLeft(at(23 * HOUR + 30 * MIN), now)).toBe('23 h');
		expect(timeLeft(at(24 * HOUR), now)).toBe('24 h');
	});

	it('says expired at or past the deadline', () => {
		expect(timeLeft(at(0), now)).toBe('expired');
		expect(timeLeft(at(-MIN), now)).toBe('expired');
	});

	it('treats invalid dates as expired', () => {
		expect(timeLeft('nope', now)).toBe('expired');
	});

	it('accepts numbers and Dates', () => {
		expect(timeLeft(now + 5 * MIN, now)).toBe('5 min');
		expect(timeLeft(new Date(now + 5 * MIN), now)).toBe('5 min');
	});
});

describe('expiresText', () => {
	it('phrases the result', () => {
		expect(expiresText(at(10 * MIN), now)).toBe('Expires in 10 min');
		expect(expiresText(at(-1), now)).toBe('Expired');
	});
});
