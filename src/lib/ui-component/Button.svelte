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
		btnAnimation = false
	}: Props = $props();

	// Resolve conflicts dynamically: detect overrides in incoming classes
	const hasRoundedOverride = $derived(btnClass.includes('rounded-') || btnClass.includes('rounded'));
	const hasPaddingOverride = $derived(
		btnClass.includes('px-') || btnClass.includes('py-') || btnClass.includes('p-')
	);
</script>

{#if link}
	<a href={link} class="inline-block">
		<button
			type="button"
			onclick={onClick}
			class={`typography-button w-full cursor-pointer transition-all duration-300 hover:opacity-90 md:w-auto
				${hasRoundedOverride ? '' : 'rounded-full'}
				${hasPaddingOverride ? '' : 'px-8 py-3'}
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
		onclick={onClick}
		class={`typography-button w-full cursor-pointer transition-all duration-300 hover:opacity-90 md:w-auto
			${hasRoundedOverride ? '' : 'rounded-full'}
			${hasPaddingOverride ? '' : 'px-8 py-3'}
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
