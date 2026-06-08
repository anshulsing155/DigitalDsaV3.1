<script lang="ts">
	let { text }: { text: string } = $props();
</script>

<div
	class="insight-card rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-4 py-3"
>
	<div class="flex items-start gap-2">
		<span class="mt-0.5 shrink-0 text-sm">💡</span>
		<p class="text-xs leading-relaxed text-[var(--form-text-secondary)]">{text}</p>
	</div>
</div>

<style>
	.insight-card {
		animation: fade-in 400ms ease-out;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
