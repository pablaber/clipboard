<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import CopyButton from '$lib/CopyButton.svelte';
	import { formatCode } from '$lib/code';
	import { expiresText, timeLeft } from '$lib/time';
	import type { SubmitFunction } from '@sveltejs/kit';

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
	<textarea id="content" name="content" placeholder="Paste text here" required
		>{form?.content ?? ''}</textarea
	>
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<div class="row actions">
		<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
		{#if data.user}
			<label class="muted">
				Keep for
				<select name="ttl">
					{#each data.ttl.options as option (option.ms)}
						<option value={option.ms} selected={option.ms === data.ttl.default}>
							{option.label}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		<span class="muted">Don't paste passwords or secrets.</span>
	</div>
</form>

{#if created}
	<section class="card" aria-live="polite">
		<h2>Your code</h2>
		<p class="code">{formatCode(created.code)}</p>
		<div class="row">
			<CopyButton text={created.code} label="Copy code" />
			<span class="muted">{expiresText(created.expiresAt)}</span>
		</div>
		<div class="row link">
			<a href="/{created.code}">{link}</a>
			<CopyButton text={link} label="Copy link" />
		</div>
	</section>
{/if}

<section class="card">
	<h2>Have a code?</h2>
	<form method="GET" action="/open" class="row">
		<label class="sr" for="code">Code</label>
		<input
			id="code"
			type="text"
			name="code"
			inputmode="numeric"
			autocomplete="off"
			placeholder="1234 5678"
			required
		/>
		<button type="submit">Open</button>
	</form>
</section>

{#if data.user}
	<section class="card">
		<h2>Your clips</h2>
		{#if form?.deleteError}
			<p class="error" role="alert">{form.deleteError}</p>
		{/if}
		{#if data.clips.length === 0}
			<p class="muted">No clips yet. Paste something above.</p>
		{:else}
			<ul class="clips">
				{#each data.clips as clip (clip.code)}
					<li>
						<div class="info">
							<a href="/{clip.code}">{formatCode(clip.code)}</a>
							<span class="muted">{timeLeft(clip.expiresAt)}</span>
							<span class="preview">{clip.preview}</span>
						</div>
						<form method="POST" action="?/delete" use:enhance={deleteClip}>
							<input type="hidden" name="code" value={clip.code} />
							<button type="submit" class="secondary">Delete</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.actions {
		margin-top: 0.75rem;
	}
	.code {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
		margin: 0.25rem 0 0.75rem;
	}
	.link {
		margin-top: 0.75rem;
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
		padding: 0.5rem 0;
		border-top: 1px solid #eee;
	}
	.clips li:first-child {
		border-top: 0;
	}
	.info {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		min-width: 0;
	}
	.preview {
		flex-basis: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row input {
		flex: 1;
		min-width: 8rem;
		width: auto;
	}
</style>
