<script lang="ts">
	import { navigating } from '$app/stores';

	let visible = $state(false);
	let width = $state(0);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function startProgress() {
		visible = true;
		width = 15;
		intervalId = setInterval(() => {
			if (width < 90) {
				// Fast at first, slows as it approaches 90%
				width += (90 - width) * 0.08;
			}
		}, 100);
	}

	function completeProgress() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		width = 100;
		setTimeout(() => {
			visible = false;
			width = 0;
		}, 200);
	}

	$effect(() => {
		if ($navigating) {
			startProgress();
		} else if (visible) {
			completeProgress();
		}
	});
</script>

{#if visible}
	<div class="nav-loader" aria-hidden="true">
		<div class="nav-loader-bar" style="width: {width}%"></div>
	</div>
{/if}

<style>
	.nav-loader {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		z-index: 99999;
		pointer-events: none;
	}

	.nav-loader-bar {
		height: 100%;
		background: linear-gradient(
			90deg,
			var(--ddsa-primary-400, #cb997e),
			var(--ddsa-accent-500, #b08968)
		);
		transition: width 0.1s ease-out;
		box-shadow: 0 0 8px rgba(203, 153, 126, 0.4);
	}
</style>
