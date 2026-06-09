<script lang="ts">
	type Props = {
		linkName?: string;
		hoverLink?: string;
	};

	const {
		linkName = '',
		hoverLink = ''
	}: Props = $props();

	let isHovered = $state(false);
	let copied = $state(false);

	async function copyToClipboard() {
		if (!hoverLink) return;

		try {
			await navigator.clipboard.writeText(hoverLink);

			copied = true;

			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
	class="relative flex w-full"
	onmouseover={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<div class="text-center text-xs">
		{#if linkName.includes('undefined')}
			<p class="invisible text-black">
				Source: Freepik
			</p>
		{:else}
			<p class="invisible">
				{@html linkName}
			</p>
		{/if}
	</div>

	{#if isHovered}
		<button
			type="button"
			class="absolute top-4 right-0 z-50 cursor-pointer whitespace-nowrap rounded-md bg-black px-3 py-1 text-sm text-white border-0"
			onclick={copyToClipboard}
		>
			{copied ? 'Copied!' : 'Copy'}
		</button>
	{/if}
</div>