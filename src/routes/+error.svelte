<script lang="ts">
	import { page } from '$app/state';

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

<h1>{page.status}</h1>
<p>{detail ?? message}</p>
<p><a href="/">Back to the clipboard</a></p>
