<script lang="ts">
	import CopyButton from '$lib/CopyButton.svelte';
	import { formatCode } from '$lib/code';
	import { ExpiresIcon } from '$lib/icons';
	import { expiresText } from '$lib/time';

	let { data } = $props();
</script>

<svelte:head>
	<title>{formatCode(data.code)} · Online Clipboard</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<h1 class="code">{formatCode(data.code)}</h1>

<div class="row">
	<CopyButton text={data.content} label="Copy text" primary />
	<span class="muted with-icon"><ExpiresIcon />{expiresText(data.expiresAt)}</span>
</div>

<pre class="card tone-sunken">{data.content}</pre>

<style>
	.code {
		font-size: clamp(2.4rem, 10vw, 3rem);
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 70vh;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 0.92rem;
	}
</style>
