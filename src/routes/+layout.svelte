<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head>
	<title>Online Clipboard</title>
</svelte:head>

<header>
	<a class="brand" href="/">Online Clipboard</a>
	<nav>
		{#if data.user}
			<span class="muted email">{data.user.email}</span>
			<form method="POST" action="/logout">
				<button type="submit" class="secondary">Log out</button>
			</form>
		{:else}
			<a href="/login">Log in</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		line-height: 1.5;
		color: #1a1a1a;
		background: #fafafa;
	}
	:global(a) {
		color: #2457c5;
	}
	:global(h1) {
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	:global(h2) {
		font-size: 1.1rem;
		margin: 0 0 0.5rem;
	}
	:global(textarea),
	:global(input[type='text']) {
		width: 100%;
		font: inherit;
		padding: 0.6rem 0.7rem;
		border: 1px solid #c4c4c4;
		border-radius: 6px;
		background: #fff;
		color: inherit;
	}
	:global(textarea) {
		min-height: 10rem;
		resize: vertical;
	}
	:global(button) {
		font: inherit;
		padding: 0.5rem 1rem;
		border: 1px solid #2457c5;
		border-radius: 6px;
		background: #2457c5;
		color: #fff;
		cursor: pointer;
	}
	:global(button.secondary) {
		background: #fff;
		color: #2457c5;
	}
	:global(button:disabled) {
		opacity: 0.6;
		cursor: default;
	}
	:global(.card) {
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
	}
	:global(.error) {
		color: #b00020;
		margin: 0.5rem 0;
	}
	:global(.muted) {
		color: #666;
		font-size: 0.9rem;
	}
	:global(.row) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem;
	}
	.brand {
		font-weight: 600;
		font-size: 1.1rem;
		color: inherit;
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-left: auto;
		text-align: right;
	}
	.email {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1rem 3rem;
	}
</style>
