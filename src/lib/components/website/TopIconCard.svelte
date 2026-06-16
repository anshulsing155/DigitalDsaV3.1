<script>
	let {
		cardData = {
			heading: '',
			subHeading: '',
			para: '',
			icon: '',
			iconAltName: '',
			linkName: '',
			url: '',
			btnLink: '',
			btnName: '',
			btnColor: '',
			btnBorder: ''
		}
	} = $props();

	import Anchor from './Anchor.svelte';
	import Button from './Button.svelte';
</script>

<div class="group mt-4 flex flex-col items-start gap-4 pr-4 text-[var(--form-text)]">
	{#if cardData.icon}
		<img
			src={cardData.icon}
			alt={cardData.iconAltName || 'icon'}
			class="h-10 transition-transform duration-300 group-hover:scale-125"
		/>
	{/if}

	<div class="flex flex-col gap-4">
		{#if cardData.heading}
			<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">{cardData.heading}</h2>
		{/if}
		{#if cardData.subHeading}
			<h2 class="typography-body-md text-[var(--form-text-secondary)]">{cardData.subHeading}</h2>
		{/if}
		{#if cardData.para}
			<p class="typography-body-md text-[var(--form-text-secondary)]">{@html cardData.para}</p>
		{/if}
		{#if cardData.linkName}
			<Anchor link={cardData.url} linkName={cardData.linkName} />
		{/if}
		{#if cardData.btnName}
			<Button
				btnName={cardData.btnName}
				link={cardData.btnLink}
				btnColor={cardData.btnColor}
				btnBorder={cardData.btnBorder}
			/>
		{/if}
	</div>
</div>
