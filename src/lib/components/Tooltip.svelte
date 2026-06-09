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
		<div
			class="absolute top-4 right-0 z-50 cursor-pointer whitespace-nowrap rounded-md bg-black px-3 py-1 text-sm text-white"
			onclick={copyToClipboard}
		>
			{copied ? 'Copied!' : 'Copy'}
		</div>
	{/if}
</div>