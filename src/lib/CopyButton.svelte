<script lang="ts">
	import { CopiedIcon, CopyIcon } from '$lib/icons';

	let {
		text,
		label = 'Copy',
		primary = false
	}: { text: string; label?: string; primary?: boolean } = $props();

	let supported = $state(false);
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		supported = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
		return () => clearTimeout(timer);
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1500);
	}
</script>

{#if supported}
	<button
		type="button"
		class={{ secondary: !primary && !copied, success: copied }}
		onclick={copy}
		aria-live="polite"
	>
		{#if copied}<CopiedIcon />Copied!{:else}<CopyIcon />{label}{/if}
	</button>
{/if}
