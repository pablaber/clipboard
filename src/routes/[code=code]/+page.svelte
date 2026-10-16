<script lang="ts">
	import CopyButton from '$lib/CopyButton.svelte';
	import { formatCode } from '$lib/code';
	import { expiresText } from '$lib/time';

	let { data } = $props();
</script>

<svelte:head>
	<title>{formatCode(data.code)} · Online Clipboard</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<h1 class="code">{formatCode(data.code)}</h1>

<div class="row">
	<CopyButton text={data.content} label="Copy text" />
	<span class="muted">{expiresText(data.expiresAt)}</span>
</div>

<pre class="card">{data.content}</pre>

<style>
	.code {
		font-size: 2rem;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 70vh;
		overflow: auto;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.95rem;
	}
</style>
