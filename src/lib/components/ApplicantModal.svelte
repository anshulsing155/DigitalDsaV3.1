<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title?: string;
		onClose?: () => void;
		children?: Snippet;
	}

	let { open = false, title = '', onClose = () => {}, children }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
	>
		<div
			class="
        flex max-h-[85vh] w-[90vw]
        max-w-[900px] flex-col rounded-xl bg-[var(--form-bg-card)]
        shadow-xl
        sm:w-[85vw]
        md:w-[70vw] lg:w-[60vw]
      "
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-[var(--form-bg-card)] px-4 py-3 pb-5 sm:px-6"
			>
				{#if title}
					<h2 class="text-lg font-semibold text-[var(--form-text)] sm:text-xl">{title}</h2>
				{/if}

				<button
					class="rounded-full p-2 text-[var(--form-text-muted)] hover:bg-[var(--form-bg-alt)]"
					onclick={onClose}
				>
					✕
				</button>

				<div
					class="pointer-events-none absolute right-0 bottom-0 left-0 h-4 bg-gradient-to-b from-[var(--form-border)] to-transparent"
				></div>
			</div>

			<div class="overflow-y-auto p-4 sm:p-6">
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
{/if}
