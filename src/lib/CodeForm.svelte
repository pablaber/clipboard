<script lang="ts">
	import { ErrorIcon, OpenIcon } from '$lib/icons';

	let {
		autofocus = false,
		value = '',
		error
	}: { autofocus?: boolean; value?: string; error?: string } = $props();
</script>

<!-- A plain GET to /code, so opening by code works without JavaScript. -->
<form method="GET" action="/code">
	<div class="row">
		<label class="sr" for="code">Code</label>
		<!-- Only autofocused on /code, where this input is the whole page. -->
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="code"
			type="text"
			name="code"
			inputmode="numeric"
			autocomplete="off"
			placeholder="1234 5678"
			required
			{autofocus}
			{value}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? 'code-error' : undefined}
		/>
		<button type="submit">Open<OpenIcon /></button>
	</div>
	{#if error}
		<p class="error" id="code-error" role="alert"><ErrorIcon />{error}</p>
	{/if}
</form>

<style>
	.row input {
		flex: 1;
		min-width: 8rem;
		width: auto;
	}
</style>
