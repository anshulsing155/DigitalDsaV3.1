<script lang="ts">
	import { X, Plus } from 'lucide-svelte';

	let {
		values = $bindable<string[]>([]),
		label,
		placeholder = ''
	}: { values: string[]; label: string; placeholder?: string } = $props();

	let draft = $state('');

	function add() {
		const trimmed = draft.trim();
		if (!trimmed) return;
		if (values.includes(trimmed)) return;
		values = [...values, trimmed];
		draft = '';
	}

	function remove(i: number) {
		values = values.filter((_, idx) => idx !== i);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			add();
		}
	}
</script>

<div>
	<span class="text-xs font-medium text-gray-600">{label}</span>
	<div class="mt-1 flex flex-wrap gap-1.5">
		{#each values as v, i (i + v)}
			<span class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
				{v}
				<button
					type="button"
					onclick={() => remove(i)}
					aria-label="Remove {v}"
					class="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
				>
					<X size={10} />
				</button>
			</span>
		{/each}
	</div>
	<div class="mt-1.5 flex gap-1.5">
		<input
			type="text"
			bind:value={draft}
			onkeydown={handleKeydown}
			{placeholder}
			class="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
		/>
		<button
			type="button"
			onclick={add}
			disabled={!draft.trim()}
			class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
		>
			<Plus size={12} /> Add
		</button>
	</div>
</div>
