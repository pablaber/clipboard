<script lang="ts">
	import '@fontsource-variable/archivo';
	import '@fontsource-variable/jetbrains-mono';
	import '../app.css';
	import { BrandIcon, LogInIcon, LogOutIcon, UserIcon } from '$lib/icons';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>Online Clipboard</title>
</svelte:head>

<header>
	<div class="bar">
		<a class="brand" href="/">
			<span class="logo"><BrandIcon /></span>
			Online Clipboard
		</a>
		<nav>
			{#if data.user}
				<span class="muted email with-icon"><UserIcon /><span class="truncate">{data.user.email}</span></span>
				<form method="POST" action="/logout">
					<button type="submit" class="secondary"><LogOutIcon />Log out</button>
				</form>
			{:else}
				<a class="nav-link with-icon" href="/login"><LogInIcon />Log in</a>
			{/if}
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		border-bottom: var(--border);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 1rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		flex: none;
		font-weight: 900;
		font-size: 1.2rem;
		letter-spacing: -0.02em;
		text-decoration: none;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		background: var(--color-pink);
		border: var(--border);
		border-radius: var(--radius);
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		margin-left: auto;
	}
	.email {
		min-width: 0;
	}
	@media (max-width: 30rem) {
		.email {
			display: none;
		}
	}
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.nav-link {
		font-weight: 700;
		text-decoration: none;
	}
	.nav-link:hover {
		text-decoration: underline;
	}
	main {
		max-width: var(--content-width);
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}
</style>
