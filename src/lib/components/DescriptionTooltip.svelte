<script lang="ts">
	import { Info, getIcon } from '$lib/utils/iconRegistry';
	import { openModal } from '$lib/stores/modal';

	interface Props {
		description?: string | null;
		modalWidth?: string | null;
		icon?: string | string[] | null;
		descriptionText?: string | null;
	}

	let {
		description = null,
		modalWidth = null,
		icon = null,
		descriptionText = null
	}: Props = $props();

	let hoverTimer: ReturnType<typeof setTimeout> | null = null;

	function toPascalCase(str: string | null | undefined): string {
		if (!str || typeof str !== 'string') return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	function handleMouseEnter() {
		if (!description) return;
		hoverTimer = setTimeout(() => {
			openModal(description!, modalWidth ?? undefined);
		}, 500);
	}

	function handleMouseLeave() {
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			hoverTimer = null;
		}
	}

	let IconComponents = $derived.by(() => {
		if (Array.isArray(icon)) {
			return icon.map((name) => getIcon(toPascalCase(name))).filter(Boolean);
		}
		if (icon) {
			const iconComp = getIcon(toPascalCase(icon));
			return iconComp ? [iconComp] : [];
		}
		return [];
	});
</script>

<button
	type="button"
	class="info-icon-container"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onclick={() => description && openModal(description, modalWidth ?? undefined)}
>
	<!-- Rotating ring border -->
	<span class="info-icon-ring"></span>

	<!-- Icon -->
	<span class="info-icon-inner">
		{#if IconComponents.length > 0}
			{#each IconComponents as Icon}
				<Icon class="h-3.5 w-3.5" />
			{/each}
		{:else if !descriptionText && IconComponents.length == 0}
			<Info class="h-3.5 w-3.5" />
		{/if}
	</span>

	{#if descriptionText}
		<span class="info-text-label">{descriptionText}</span>
	{/if}
</button>

<style>
	.info-text-label {
		margin-left: 4px;
		font-size: 0.7rem;
		color: var(--ddsa-primary-600);
	}
</style>
