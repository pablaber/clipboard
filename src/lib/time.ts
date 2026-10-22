/** Short "time left" text: "59 min", "23 h", "expired". */
export function timeLeft(expiresAt: string | number | Date, now: number = Date.now()): string {
	const ms = new Date(expiresAt).getTime() - now;
	if (!(ms > 0)) return 'expired';
	const minutes = Math.ceil(ms / 60_000);
	if (minutes < 60) return `${minutes} min`;
	return `${Math.floor(minutes / 60)} h`;
}

/** "Expires in 59 min" or "Expired". */
export function expiresText(expiresAt: string | number | Date, now: number = Date.now()): string {
	const left = timeLeft(expiresAt, now);
	return left === 'expired' ? 'Expired' : `Expires in ${left}`;
}

/** A lifetime in whole hours: "1 hour", "6 hours", "1 day" (exactly 24 h). */
export function durationText(ms: number): string {
	const hours = Math.round(ms / 3_600_000);
	if (hours === 24) return '1 day';
	return hours === 1 ? '1 hour' : `${hours} hours`;
}

/** "until 3:44 PM", or "until tomorrow 3:44 PM" past midnight. Local time; for spans up to 1 day. */
export function untilText(
	at: number | Date,
	now: number | Date = Date.now(),
	locale?: string
): string {
	const end = new Date(at);
	const time = end.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
	return end.toDateString() === new Date(now).toDateString()
		? `until ${time}`
		: `until tomorrow ${time}`;
}
