<script>
	import { toasts } from '$lib/stores/stores';
</script>

<div class="toast-stack z-50">
	{#each $toasts as { id, message, color, icon }}
		<div class={`toast ${color}`} key={id}>
			<i class={icon}></i>
			<!-- Render the icon -->
			<span>{message}</span>
		</div>
	{/each}
</div>

<style>
	.toast-stack {
		position: fixed;
		top: 5rem;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 1000;
	}

	.toast {
		color: white;
		padding: 1rem;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		animation: fade-in-out 5s linear forwards;
	}

	@keyframes fade-in-out {
		0% {
			opacity: 0;
			transform: translateY(-10px);
		}
		10% {
			opacity: 1;
			transform: translateY(0);
		}
		90% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translateY(-10px);
		}
	}
</style>
