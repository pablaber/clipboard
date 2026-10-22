import { describe, expect, it } from 'vitest';
import { durationText, expiresText, timeLeft, untilText } from './time';

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

describe('durationText', () => {
	it('names whole hours, with 24 as one day', () => {
		expect(durationText(HOUR)).toBe('1 hour');
		expect(durationText(6 * HOUR)).toBe('6 hours');
		expect(durationText(23 * HOUR)).toBe('23 hours');
		expect(durationText(24 * HOUR)).toBe('1 day');
	});
});

describe('untilText', () => {
	// Local-time dates, so the calendar-day check does not depend on the machine's time zone.
	const morning = new Date(2026, 9, 22, 9, 44);
	const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	it('gives the time alone when it is later today', () => {
		const end = new Date(2026, 9, 22, 15, 44);
		expect(untilText(end, morning, 'en-US')).toBe(`until ${time(end)}`);
	});

	it('says tomorrow once it passes midnight', () => {
		const end = new Date(2026, 9, 23, 0, 44);
		expect(untilText(end, morning, 'en-US')).toBe(`until tomorrow ${time(end)}`);
		expect(untilText(morning.getTime() + 24 * HOUR, morning, 'en-US')).toBe(
			`until tomorrow ${time(morning)}`
		);
	});
});
