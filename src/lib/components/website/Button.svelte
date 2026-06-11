<script lang="ts">
	type Props = {
		btnClass?: string;
		btnName?: string;
		link?: string;
		icon?: string;
		imgAltName?: string;
		img?: string;
		imageClass?: string;
		onClick?: () => void;
		btnClick?: () => void;
		btnBorder?: string;
		btnColor?: string;
		btnAnimation?: boolean;
	};

	const {
		btnClass = '',
		btnName = '',
		link = '',
		icon = '',
		imgAltName = '',
		img = '',
		imageClass = '',
		onClick = () => {},
		btnClick,
		btnBorder = '',
		btnColor = '',
		btnAnimation = false
	}: Props = $props();

	function handleOnClick() {
		const handler = btnClick || onClick;
		if (handler) handler();
	}
</script>

{#if link}
	<a href={link} class="inline-block">
		<button
			type="button"
			onclick={handleOnClick}
			style={`${btnColor ? `background-color: ${btnColor};` : ''}${btnBorder ? `border-color: ${btnBorder}; border-width: 1px; border-style: solid;` : ''}`}
			class={`typography-button w-full cursor-pointer rounded-full
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
	</a>
{:else}
	<button
		type="button"
		onclick={handleOnClick}
		style={`${btnColor ? `background-color: ${btnColor};` : ''}${btnBorder ? `border-color: ${btnBorder}; border-width: 1px; border-style: solid;` : ''}`}
		class={`typography-button typography-button w-full cursor-pointer rounded-full
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
