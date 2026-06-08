<script lang="ts">
	type CardData = {
		heading?: string;
		para?: string;
		icon?: string;
		iconAltName?: string;
		linkName?: string;
		url?: string;
		btnLink?: string;
		btnName?: string;
		btnColor?: string;
		btnBorder?: string;
		color?: string;
	};

	type Props = {
		cardData?: CardData;
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
			btnColor: '',
			btnBorder: '',
			color: ''
		}
	}: Props = $props();
</script>

<a href={cardData.url}>
	<div
		class="flex h-[15rem] flex-col items-center justify-center gap-6 transition-all duration-300 group lg:h-[30rem] lg:max-h-[30rem] {cardData.color
			? 'bg-darkColor/80'
			: 'bg-darkColor'}"
	>
		{#if cardData.icon}
			<img
				src={cardData.icon}
				alt={cardData.iconAltName || 'icon'}
				class="h-12 transition-transform duration-300 group-hover:scale-125"
			/>
		{/if}

		<h2 class="text-wrap text-center typography-h3 text-primary">
			{@html cardData.heading}
		</h2>
	</div>
</a>