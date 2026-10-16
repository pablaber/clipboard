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
