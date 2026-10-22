import { db } from './supabase';

export const ANON_TTL = 60 * 60 * 1000; // 1 hour
export const USER_MAX_TTL = 24 * 60 * 60 * 1000; // 1 day
export const TTL_STEP = 60 * 60 * 1000; // logged-in users pick whole hours
export const ANON_MAX_BYTES = 100_000; // 100 KB
export const USER_MAX_BYTES = 1_000_000; // 1 MB
export const ANON_CLIPS_PER_HOUR = 5; // per client IP; also enforced by the clips_anon_limit trigger

const MAX_INSERT_TRIES = 5;
const PREVIEW_LENGTH = 80;
const UNIQUE_VIOLATION = '23505';
const ANON_LIMIT_REACHED = 'P0429'; // raised by enforce_anon_clip_limit()

export class ClipValidationError extends Error {}
export class ClipLimitError extends Error {}

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
 * Anonymous clips always get ANON_TTL. Logged-in users choose a whole number of hours from ANON_TTL
 * to USER_MAX_TTL (default USER_MAX_TTL); other values round down to a whole hour, then clamp.
 */
export function resolveTtl(user: { id: string } | null, requestedMs?: number): number {
	if (!user) return ANON_TTL;
	if (requestedMs === undefined || !Number.isFinite(requestedMs)) return USER_MAX_TTL;
	const hours = Math.floor(requestedMs / TTL_STEP) * TTL_STEP;
	return Math.min(USER_MAX_TTL, Math.max(ANON_TTL, hours));
}

export function byteLength(text: string): number {
	return new TextEncoder().encode(text).length;
}

function maxBytes(loggedIn: boolean): number {
	return loggedIn ? USER_MAX_BYTES : ANON_MAX_BYTES;
}

function formatBytes(bytes: number): string {
	return bytes >= 1_000_000 ? `${bytes / 1_000_000} MB` : `${bytes / 1000} KB`;
}

/**
 * Returns an error message, or null if the content is acceptable (1..maxBytes UTF-8 bytes).
 * Anonymous clips that only a logged-in user could save get a hint to log in.
 */
export function validateContent(content: string, loggedIn: boolean): string | null {
	const bytes = byteLength(content);
	if (bytes < 1) return 'Clip is empty';
	if (bytes <= maxBytes(loggedIn)) return null;
	const anon = formatBytes(ANON_MAX_BYTES);
	const user = formatBytes(USER_MAX_BYTES);
	if (loggedIn) return `Clip is too large (max ${user})`;
	if (bytes <= USER_MAX_BYTES) return `Clip is too large (max ${anon}). Log in to save up to ${user}.`;
	return `Clip is too large (max ${anon}, or ${user} when logged in)`;
}

/** Hex SHA-256 of the client IP, so anonymous rate limiting never stores the raw address. */
export async function hashIp(ip: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- database ----

export async function createClip(input: {
	content: string;
	userId: string | null;
	ttlMs: number;
	/** Client IP; counts toward ANON_CLIPS_PER_HOUR when userId is null. */
	clientIp: string;
}): Promise<{ code: string; expiresAt: string }> {
	const invalid = validateContent(input.content, input.userId !== null);
	if (invalid) throw new ClipValidationError(invalid);

	const expiresAt = new Date(Date.now() + input.ttlMs).toISOString();
	const creatorIpHash = input.userId === null ? await hashIp(input.clientIp) : null;
	for (let attempt = 0; attempt < MAX_INSERT_TRIES; attempt++) {
		const code = generateCode();
		const { error } = await db().from('clips').insert({
			code,
			content: input.content,
			user_id: input.userId,
			creator_ip_hash: creatorIpHash,
			expires_at: expiresAt
		});
		if (!error) return { code, expiresAt };
		if (error.code === ANON_LIMIT_REACHED) {
			throw new ClipLimitError(
				`You can save ${ANON_CLIPS_PER_HOUR} clips an hour without logging in. Log in to save more.`
			);
		}
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
