<script lang="ts">
	import { CopiedIcon, CopyIcon, ErrorIcon } from '$lib/icons';

	let {
		text,
		label = 'Copy',
		primary = false,
		iconOnly = false
	}: {
		/** The text, or a function that fetches it when the button is clicked. */
		text: string | (() => Promise<string>);
		label?: string;
		primary?: boolean;
		/** A low-emphasis row action: `label` becomes the accessible name. */
		iconOnly?: boolean;
	} = $props();

	let supported = $state(false);
	let copied = $state(false);
	let failed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const status = $derived(copied ? 'Copied!' : failed ? 'Copy failed' : label);

	$effect(() => {
		supported =
			typeof navigator !== 'undefined' &&
			(typeof text === 'string'
				? !!navigator.clipboard?.writeText
				: !!navigator.clipboard?.write && typeof ClipboardItem !== 'undefined');
		return () => clearTimeout(timer);
	});

	// Safari only allows a clipboard write that starts during the click, so text that still has to
	// be fetched goes in as a promise rather than being awaited first.
	function write(source: string | (() => Promise<string>)) {
		if (typeof source === 'string') return navigator.clipboard.writeText(source);
		const blob = source().then((value) => new Blob([value], { type: 'text/plain' }));
		return navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
	}

	async function copy() {
		try {
			await write(text);
			copied = true;
			failed = false;
		} catch {
			copied = false;
			failed = true;
		}
		clearTimeout(timer);
		timer = setTimeout(() => (copied = failed = false), 1500);
	}
</script>

{#if supported}
	<button
		type="button"
		class={{
			secondary: !primary && !iconOnly && !copied,
			ghost: iconOnly && !copied,
			'icon-only': iconOnly,
			success: copied
		}}
		onclick={copy}
		aria-live="polite"
		aria-label={iconOnly ? status : undefined}
		title={iconOnly ? (copied || failed ? status : 'Copy') : undefined}
	>
		{#if copied}<CopiedIcon />{:else if failed}<ErrorIcon />{:else}<CopyIcon />{/if}
		{#if !iconOnly}{status}{/if}
	</button>
{/if}
