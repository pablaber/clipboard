<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import CopyButton from '$lib/CopyButton.svelte';
	import { formatCode } from '$lib/code';
	import { expiresText } from '$lib/time';

	let { form } = $props();

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
	.row input {
		flex: 1;
		min-width: 8rem;
		width: auto;
	}
</style>
