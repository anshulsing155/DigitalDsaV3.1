<script lang="ts">
	import { getIcon, CircleCheck, Circle } from '$lib/utils/iconRegistry';

	interface Props {
		options?: { label: string; value: string | number; icon?: string }[];
		value?: string | number;
		gridClass?: string;
		onchange?: (value: string | number) => void;
	}

	let { options = [], value = $bindable(), gridClass = '', onchange }: Props = $props();

	let computedGridClass = $derived(
		gridClass || (options.length === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3')
	);

	function select(val: string | number) {
		value = val;
		onchange?.(val);
	}
</script>

<div class="">
	<div class={computedGridClass}>
		{#each options as opt}
			<button
				type="button"
				class={`relative flex cursor-pointer items-center gap-4 rounded-lg border px-5 py-3 transition-all duration-200 ${
					value === opt.value
						? 'border-transparent bg-gradient-to-r from-stone-500 to-neutral-500 text-white shadow-md shadow-stone-500/25'
						: 'border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] transition-all duration-200 ease-in-out hover:border-stone-400 hover:bg-[var(--form-bg-alt)]'
				}`}
				onclick={() => select(opt.value)}
				aria-pressed={value === opt.value}
			>
				<!-- Icon Logic -->
				{#if value === opt.value}
					<CircleCheck class="h-5 w-5 shrink-0" />
				{:else if opt.icon && getIcon(opt.icon)}
					{@const OptIcon = getIcon(opt.icon)}
					{#if OptIcon}
						<OptIcon class="h-5 w-5 shrink-0" />
					{/if}
				{:else}
					<Circle class="h-5 w-5 shrink-0" />
				{/if}

				<span class=" space-x-1 text-sm">{opt.label}</span>
			</button>
		{/each}
	</div>
</div>
