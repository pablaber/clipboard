<script lang="ts">
	import CodeForm from '$lib/CodeForm.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Open a clip · Online Clipboard</title>
</svelte:head>

<h1>Open a clip</h1>

<CodeForm autofocus value={data.value} error={data.error} />
