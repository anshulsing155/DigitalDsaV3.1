<script lang="ts">
	import Anchor from './Anchor.svelte';
	import Button from './Button.svelte';

	type CardData = {
		heading?: string;
		para?: string;
		icon?: string;
		iconAltName?: string;
		linkName?: string;
		url?: string;
		btnLink?: string;
		btnName?: string;
		btnClass?: string;
	};

	const {
		cardData = {
			heading: '',
			para: '',
			icon: '',
			iconAltName: '',
			linkName: '',
			url: '',
			btnLink: '',
			btnName: '',
			btnClass: ''
		}
	}: {
		cardData?: CardData;
	} = $props();
</script>

<div class="mt-4 flex items-start gap-4 pr-4">
	{#if cardData.icon}
		<img
			src={cardData.icon}
			alt={cardData.iconAltName || 'icon'}
			class="h-8"
		/>
	{/if}

	<div class="flex flex-col gap-4">
		{#if cardData.heading}
			<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
				{@html cardData.heading}
			</h2>
		{/if}

		{#if cardData.para}
			<p class="typography-body-md text-[var(--form-text-secondary)] group-hover:text-primary">
				{@html cardData.para}
			</p>
		{/if}

		{#if cardData.linkName}
			<Anchor
				link={cardData.url}
				linkName={cardData.linkName}
			/>
		{/if}

		{#if cardData.btnName}
			<Button
				btnName={cardData.btnName}
				link={cardData.btnLink}
				btnClass={cardData.btnClass}
			/>
		{/if}
	</div>
</div>