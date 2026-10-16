<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { form } = $props();

	let busy = $state(false);

	const enhanceForm: SubmitFunction = () => {
		busy = true;
		return async ({ update }) => {
			await update();
			busy = false;
		};
	};
</script>

<svelte:head>
	<title>Log in · Online Clipboard</title>
</svelte:head>

<h1>Log in</h1>

{#if form?.step === 'verify'}
	<form method="POST" action="?/verify" use:enhance={enhanceForm}>
		<p>Sent a code to <strong>{form.email}</strong></p>
		<input type="hidden" name="email" value={form.email} />
		<label class="sr" for="token">6-digit code</label>
		<input
			id="token"
			type="text"
			name="token"
			inputmode="numeric"
			autocomplete="one-time-code"
			maxlength="6"
			pattern={String.raw`\d{6}`}
			placeholder="123456"
			required
		/>
		{#if form.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
		<div class="row actions">
			<button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
			<a href="/login" data-sveltekit-reload>Use a different email</a>
		</div>
	</form>
{:else}
	<form method="POST" action="?/send" use:enhance={enhanceForm}>
		<p class="muted">We'll email you a 6-digit code. No password needed.</p>
		<label class="sr" for="email">Email</label>
		<input
			id="email"
			type="text"
			name="email"
			inputmode="email"
			autocomplete="email"
			placeholder="you@example.com"
			value={form?.email ?? ''}
			required
		/>
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}
		<div class="row actions">
			<button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
		</div>
	</form>
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
</style>
