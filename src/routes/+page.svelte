<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import CodeForm from '$lib/CodeForm.svelte';
	import CopyButton from '$lib/CopyButton.svelte';
	import { formatCode } from '$lib/code';
	import {
		DeleteIcon,
		ErrorIcon,
		ExpiresIcon,
		KeepForIcon,
		LinkIcon,
		SaveIcon,
		TimeLeftIcon,
		WarningIcon
	} from '$lib/icons';
	import { durationText, expiresText, timeLeft, untilText } from '$lib/time';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';

	let { data, form } = $props();

	// Keep "Your clips" fresh across machines: refetch whenever the window regains focus.
	$effect(() => {
		if (!data.user) return;
		const refresh = () => {
			if (document.visibilityState === 'visible') invalidateAll();
		};
		document.addEventListener('visibilitychange', refresh);
		return () => document.removeEventListener('visibilitychange', refresh);
	});

	// On success just reload the list, so the "Your code" card from a create stays visible.
	const deleteClip: SubmitFunction = () => async ({ result }) => {
		if (result.type === 'success') await invalidateAll();
		else await applyAction(result);
	};

	let saving = $state(false);

	// ⌘/Ctrl+Enter in the textarea saves. requestSubmit runs validation and goes through enhance,
	// but ignores the button's disabled state, so guard on saving to avoid double submits.
	function saveOnModEnter(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
		if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.isComposing) return;
		event.preventDefault();
		if (!saving) event.currentTarget.form?.requestSubmit();
	}

	// Set after mount so the server render and hydration match; no JS means no shortcut hint.
	let modKey = $state<string | null>(null);
	$effect(() => {
		const nav = navigator as Navigator & { userAgentData?: { platform: string } };
		const platform = nav.userAgentData?.platform ?? navigator.platform;
		modKey = /mac|iphone|ipad/i.test(platform) ? '⌘' : 'Ctrl';
	});

	// Chosen lifetime in ms. Kept across saves, so several clips in a row get the same one.
	let ttl = $state(untrack(() => data.ttl.default));

	// The "until 3:44 PM" hint uses the browser's clock and time zone, so it only renders after
	// mount. Tick so it stays right while the page is open.
	let now = $state<number | null>(null);
	$effect(() => {
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	const created = $derived(
		form?.code && form.expiresAt ? { code: form.code, expiresAt: form.expiresAt } : null
	);
	const link = $derived(created ? `${page.url.origin}/${created.code}` : '');
</script>

<h1>Paste text, get a code</h1>

<form
	method="POST"
	action="?/create"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
>
	<label class="sr" for="content">Text to share</label>
	<textarea
		id="content"
		name="content"
		placeholder="Paste text here"
		required
		aria-keyshortcuts="Meta+Enter Control+Enter"
		onkeydown={saveOnModEnter}>{form?.content ?? ''}</textarea
	>
	{#if form?.error}
		<p class="error" role="alert"><ErrorIcon />{form.error}</p>
	{/if}
	{#if data.user}
		<div class="keep-for">
			<p class="with-icon">
				<KeepForIcon /><label for="ttl">Keep for</label>
				<strong>{durationText(ttl)}</strong>
				{#if now !== null}<span class="muted">{untilText(now + ttl, now)}</span>{/if}
			</p>
			<input
				id="ttl"
				name="ttl"
				type="range"
				min={data.ttl.min}
				max={data.ttl.max}
				step={data.ttl.step}
				bind:value={ttl}
				defaultValue={ttl}
				aria-valuetext={durationText(ttl)}
			/>
			<p class="range-ends muted" aria-hidden="true">
				<span>{durationText(data.ttl.min)}</span><span>{durationText(data.ttl.max)}</span>
			</p>
		</div>
	{/if}
	<div class="row actions">
		<button type="submit" disabled={saving}>
			<SaveIcon />{saving ? 'Saving…' : 'Save'}
			{#if modKey}<kbd class="shortcut" aria-hidden="true">{modKey} ↵</kbd>{/if}
		</button>
		<span class="muted with-icon hint"><WarningIcon />Don't paste passwords or secrets.</span>
	</div>
</form>

{#if created}
	<section class="card tone-yellow" aria-live="polite">
		<h2>Your code</h2>
		<p class="code">{formatCode(created.code)}</p>
		<div class="row">
			<CopyButton text={created.code} label="Copy code" />
			<span class="with-icon"><ExpiresIcon />{expiresText(created.expiresAt)}</span>
		</div>
		<div class="row link">
			<a class="with-icon" href="/{created.code}"><LinkIcon />{link}</a>
			<CopyButton text={link} label="Copy link" />
		</div>
	</section>
{/if}

<section class="card tone-blue">
	<h2>Have a code?</h2>
	<CodeForm />
</section>

{#if data.user}
	<section class="card">
		<h2>Your clips</h2>
		{#if form?.deleteError}
			<p class="error" role="alert"><ErrorIcon />{form.deleteError}</p>
		{/if}
		{#if data.clips.length === 0}
			<p class="muted">No clips yet. Paste something above.</p>
		{:else}
			<ul class="clips">
				{#each data.clips as clip (clip.code)}
					<li>
						<div class="info">
							<a class="code-tag" href="/{clip.code}">{formatCode(clip.code)}</a>
							<span class="muted with-icon"><TimeLeftIcon />{timeLeft(clip.expiresAt)}</span>
							<span class="preview">{clip.preview}</span>
						</div>
						<form method="POST" action="?/delete" use:enhance={deleteClip}>
							<input type="hidden" name="code" value={clip.code} />
							<button
								type="submit"
								class="ghost icon-only"
								aria-label="Delete {formatCode(clip.code)}"
								title="Delete"
							>
								<DeleteIcon />
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.keep-for {
		margin-top: 0.9rem;
	}
	.keep-for p {
		flex-wrap: wrap;
		margin: 0;
	}
	.keep-for input {
		margin: 0.6rem 0 0.25rem;
	}
	.range-ends {
		display: flex;
		justify-content: space-between;
	}
	.actions {
		margin-top: 0.9rem;
	}
	@media (min-width: 40rem) {
		.hint {
			margin-left: auto;
		}
	}
	.link {
		justify-content: space-between;
		margin-top: 1rem;
		word-break: break-all;
	}
	.clips {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.clips li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-top: var(--border);
	}
	.clips li:first-child {
		border-top: 0;
		padding-top: 0;
	}
	.info {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.75rem;
		min-width: 0;
	}
	.preview {
		flex-basis: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
