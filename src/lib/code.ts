/** Strip everything but digits, so "1234-5678" and "1234 5678" both work. */
export function normalizeCode(input: string): string {
	return input.replace(/\D/g, '');
}

/** "12345678" -> "1234 5678" */
export function formatCode(code: string): string {
	return `${code.slice(0, 4)} ${code.slice(4)}`;
}
