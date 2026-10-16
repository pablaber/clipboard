const MAX_EMAIL_LENGTH = 254;

/** Trim and lowercase, so "  Me@Example.COM " matches the stored account. */
export function normalizeEmail(input: string): string {
	return input.trim().toLowerCase();
}

/** Deliberately simple: something@something.tld with no spaces. Supabase does the real checking. */
export function isValidEmail(email: string): boolean {
	return email.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Keep only digits, so "123 456" works for the 6-digit login code. */
export function normalizeOtp(input: string): string {
	return input.replace(/\D/g, '');
}
