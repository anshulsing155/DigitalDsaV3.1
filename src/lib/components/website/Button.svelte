<script lang="ts">
	type Props = {
		btnClass?: string;
		btnName?: string;
		link?: string;
		icon?: string;
		imgAltName?: string;
		img?: string;
		imageClass?: string;
		// btnClassStyle?: string;
		onClick?: () => void;
		btnAnimation?: boolean;
		btnBorder?: string;
		btnColor?: string;
	};

	const {
		btnClass = '',
		btnName = '',
		link = '',
		icon = '',
		imgAltName = '',
		img = '',
		imageClass = '',
		// btnClassStyle = 'py-3',
		onClick = () => {},
		btnAnimation = false,
		btnBorder = '',
		btnColor = ''
	}: Props = $props();
</script>

{#if link}
	<a
		href={link}
		onclick={onClick}
		class={`typography-button inline-block text-[var(--form-text)] w-full cursor-pointer rounded-full
			px-8 py-3 transition-all text-center
			duration-300 hover:opacity-90 md:w-auto
			${btnClass}
			${btnAnimation ? 'animate-scaleLoop' : ''}`}
	>
		<span class="flex items-center justify-center gap-2">
			{btnName}

			{#if icon}
				<i class={icon}></i>
			{:else if img}
				<img src={img} alt={imgAltName} class={`h-2 ${imageClass}`} />
			{/if}
		</span>
	</a>
{:else}
	<button
		type="button"
		onclick={onClick}
		class={`typography-button w-full cursor-pointer rounded-full text-[var(--form-text)]
			px-8 py-3 transition-all
			duration-300 hover:opacity-90 md:w-auto
			${btnClass}
			${btnAnimation ? 'animate-scaleLoop' : ''}`}
	>
		<span class="flex items-center justify-center gap-2">
			{btnName}

			{#if icon}
				<i class={icon}></i>
			{:else if img}
				<img src={img} alt={imgAltName} class={`h-2 ${imageClass}`} />
			{/if}
		</span>
	</button>
{/if}
