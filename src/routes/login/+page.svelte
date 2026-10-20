<script lang="ts">
	import { enhance } from '$app/forms';
	import { BackIcon, ErrorIcon, LogInIcon, MailIcon, SendIcon } from '$lib/icons';
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
		<p class="with-icon sent"><MailIcon /><span>Sent a code to <strong>{form.email}</strong></span></p>
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
			<p class="error" role="alert"><ErrorIcon />{form.error}</p>
		{/if}
		<div class="row actions">
			<button type="submit" disabled={busy}><LogInIcon />{busy ? 'Checking…' : 'Log in'}</button>
			<a class="with-icon" href="/login" data-sveltekit-reload><BackIcon />Use a different email</a>
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
			<p class="error" role="alert"><ErrorIcon />{form.error}</p>
		{/if}
		<div class="row actions">
			<button type="submit" disabled={busy}><SendIcon />{busy ? 'Sending…' : 'Send code'}</button>
		</div>
	</form>
{/if}

<style>
	.actions {
		margin-top: 0.9rem;
	}
	.sent {
		align-items: flex-start;
	}
	.sent :global(.lucide-icon) {
		margin-top: 0.2em;
	}
	#token {
		font-family: var(--font-mono);
		letter-spacing: 0.1em;
	}
</style>
