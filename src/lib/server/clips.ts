import { db } from './supabase';

export const ANON_TTL = 60 * 60 * 1000; // 1 hour
export const USER_MAX_TTL = 24 * 60 * 60 * 1000; // 1 day
export const MAX_BYTES = 100_000;

const MAX_INSERT_TRIES = 5;
const PREVIEW_LENGTH = 80;
const UNIQUE_VIOLATION = '23505';

export class ClipValidationError extends Error {}

// ---- pure helpers (no Supabase) ----

/** 8 random digits, leading zeros kept. Rejection sampling avoids modulo bias. */
export function generateCode(): string {
	const range = 1e8;
	const limit = Math.floor(2 ** 32 / range) * range; // largest multiple of range below 2^32
	const buf = new Uint32Array(1);
	do {
		crypto.getRandomValues(buf);
	} while (buf[0] >= limit);
	return String(buf[0] % range).padStart(8, '0');
}

/**
 * Anonymous clips always get ANON_TTL. Logged-in users choose between ANON_TTL and USER_MAX_TTL
 * (default USER_MAX_TTL); any other value snaps down to the largest valid choice not above it.
 */
export function resolveTtl(user: { id: string } | null, requestedMs?: number): number {
	if (!user) return ANON_TTL;
	if (requestedMs === undefined || !Number.isFinite(requestedMs)) return USER_MAX_TTL;
	return requestedMs >= USER_MAX_TTL ? USER_MAX_TTL : ANON_TTL;
}

export function byteLength(text: string): number {
	return new TextEncoder().encode(text).length;
}

/** Returns an error message, or null if the content is acceptable (1..MAX_BYTES UTF-8 bytes). */
export function validateContent(content: string): string | null {
	const bytes = byteLength(content);
	if (bytes < 1) return 'Clip is empty';
	if (bytes > MAX_BYTES) return `Clip is too large (max ${MAX_BYTES / 1000} KB)`;
	return null;
}

// ---- database ----

export async function createClip(input: {
	content: string;
	userId: string | null;
	ttlMs: number;
}): Promise<{ code: string; expiresAt: string }> {
	const invalid = validateContent(input.content);
	if (invalid) throw new ClipValidationError(invalid);

	const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
	for (let attempt = 0; attempt < MAX_INSERT_TRIES; attempt++) {
		const code = generateCode();
		const { error } = await db().from('clips').insert({
			code,
			content: input.content,
			user_id: input.userId,
			expires_at: expiresAt
		});
		if (!error) return { code, expiresAt };
		if (error.code !== UNIQUE_VIOLATION) throw new Error(`Failed to save clip: ${error.message}`);
	}
	throw new Error('Failed to save clip: could not find a free code');
}

export async function getClip(
	code: string
): Promise<{ code: string; content: string; expiresAt: string } | null> {
	const { data, error } = await db()
		.from('clips')
		.select('code, content, expires_at')
		.eq('code', code)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();
	if (error) throw new Error(`Failed to load clip: ${error.message}`);
	return data && { code: data.code, content: data.content, expiresAt: data.expires_at };
}

export async function listClips(
	userId: string
): Promise<{ code: string; preview: string; expiresAt: string }[]> {
	const { data, error } = await db()
		.from('clips')
		.select('code, content, expires_at')
		.eq('user_id', userId)
		.gt('expires_at', new Date().toISOString())
		.order('created_at', { ascending: false });
	if (error) throw new Error(`Failed to list clips: ${error.message}`);
	return data.map((row) => ({
		code: row.code,
		preview: row.content.replace(/\s+/g, ' ').trim().slice(0, PREVIEW_LENGTH),
		expiresAt: row.expires_at
	}));
}

/** Deletes the clip only if it belongs to userId. */
export async function deleteClip(userId: string, code: string): Promise<void> {
	const { error } = await db().from('clips').delete().eq('code', code).eq('user_id', userId);
	if (error) throw new Error(`Failed to delete clip: ${error.message}`);
}
