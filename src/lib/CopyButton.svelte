<script lang="ts">
	let { text, label = 'Copy' }: { text: string; label?: string } = $props();

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
	<button type="button" class="secondary" onclick={copy} aria-live="polite">
		{copied ? 'Copied!' : label}
	</button>
{/if}
