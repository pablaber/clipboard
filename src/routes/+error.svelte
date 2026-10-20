<script lang="ts">
	import { page } from '$app/state';
	import { BackIcon, ErrorIcon, NotFoundIcon } from '$lib/icons';

	const messages: Record<number, string> = {
		400: "That doesn't look right. Check it and try again.",
		404: 'Expired or not found',
		429: 'Slow down — try again in a minute'
	};

	const message = $derived(messages[page.status] ?? 'Something went wrong. Please try again.');
	// For 400s, prefer the specific message (e.g. "Codes are 8 digits").
	const detail = $derived(page.status === 400 ? page.error?.message : undefined);
</script>

<svelte:head>
	<title>{page.status} · Online Clipboard</title>
</svelte:head>

<section class="card tone-yellow">
	<h1 class="code with-icon">
		{#if page.status === 404}<NotFoundIcon />{:else}<ErrorIcon />{/if}{page.status}
	</h1>
	<p class="message">{detail ?? message}</p>
</section>
<p><a class="with-icon" href="/"><BackIcon />Back to the clipboard</a></p>

<style>
	.code {
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.message {
		font-size: 1.15rem;
		font-weight: 700;
		margin: 0;
	}
</style>
