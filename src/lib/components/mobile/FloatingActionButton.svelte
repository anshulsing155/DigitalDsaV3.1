<script lang="ts">
	interface Props {
		onClick?: (event: MouseEvent) => void;
	}

	let { onClick = () => {} }: Props = $props();

	function handleClick(event: MouseEvent) {
		onClick(event);
	}
</script>

<button
	aria-label="Apply"
	class="fixed right-5 bottom-16 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 active:scale-[0.98]"
	onclick={handleClick}
	style="margin-bottom: env(safe-area-inset-bottom);"
>
	<svg
		class="h-7 w-7"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg
	>
</button>
