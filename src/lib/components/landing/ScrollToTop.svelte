<script lang="ts">
	import { onMount } from 'svelte';
	import { scrollToTop, onScroll } from '$lib/utils/scroll';

	let isVisible = $state(false);

	onMount(() => {
		const unsubscribe = onScroll((scrollY) => {
			isVisible = scrollY > 500;
		});

		return unsubscribe;
	});

	function handleScrollToTop() {
		scrollToTop();
	}
</script>

<button
	class="scroll-to-top"
	class:scroll-to-top--visible={isVisible}
	onclick={handleScrollToTop}
	aria-label="Scroll to top"
>
	<svg
		class="scroll-to-top-icon"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		stroke-width="2.5"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
	</svg>
</button>

<style>
	.scroll-to-top {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		box-shadow:
			0 4px 14px rgba(var(--landing-accent-rgb), 0.3),
			0 2px 6px rgba(0, 0, 0, 0.15);
		transform: translateY(4rem) scale(0);
		opacity: 0;
		transition:
			transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.3s ease,
			box-shadow 0.25s ease;
		pointer-events: none;
	}

	.scroll-to-top--visible {
		transform: translateY(0) scale(1);
		opacity: 1;
		pointer-events: auto;
	}

	.scroll-to-top:hover {
		box-shadow:
			0 6px 20px rgba(var(--landing-accent-rgb), 0.45),
			0 3px 8px rgba(0, 0, 0, 0.2);
		transform: translateY(-2px) scale(1.05);
	}

	.scroll-to-top:active {
		transform: translateY(0) scale(0.95);
	}

	.scroll-to-top-icon {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
