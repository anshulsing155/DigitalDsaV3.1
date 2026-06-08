<script lang="ts">
	/**
	 * WhyAskedHint — Inline helper text below question label
	 * ═══════════════════════════════════════════════════════════════════
	 * Shows WHY a question is asked from the lender/offer perspective.
	 * Always visible — no toggle needed.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { Info } from '$lib/utils/iconRegistry';

	interface Props {
		text: string;
	}

	let { text }: Props = $props();
</script>

<p class="why-asked-text">
	<Info size={11} class="why-asked-icon" />
	{text}
</p>

<style>
	.why-asked-text {
		display: flex;
		align-items: flex-start;
		gap: 0.3rem;
		margin: 0;
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--form-text-muted, #a8a29e);
	}

	.why-asked-text :global(.why-asked-icon) {
		margin-top: 0.15rem;
		flex-shrink: 0;
		color: var(--ddsa-primary-400, #d4a574);
	}
</style>
