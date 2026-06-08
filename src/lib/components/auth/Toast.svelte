<script lang="ts">
	import { onMount } from 'svelte';
	import { uiState } from '$lib/state/ui.svelte';
	import type { ToastMessage } from '$lib/types/index.js';

	interface Props {
		toast: ToastMessage;
	}

	let { toast }: Props = $props();

	let toastElement: HTMLDivElement;

	// --- Styles/Icons Logic (moved to component structure) ---

	// Define the style classes and Lucide SVG components (as HTML strings for simplicity here)
	function getToastStyle(type: string) {
		switch (type) {
			case 'success':
				return {
					bg: 'bg-green-50 border-green-400',
					text: 'text-green-800',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`
				};
			case 'error':
				return {
					bg: 'bg-red-50 border-red-400',
					text: 'text-red-800',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-octagon"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`
				};
			case 'warning':
				return {
					bg: 'bg-yellow-50 border-yellow-400',
					text: 'text-yellow-800',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`
				};
			default: // Info/Default
				return {
					bg: 'bg-blue-50 border-blue-400',
					text: 'text-blue-800',
					icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
				};
		}
	}

	// Use $derived so styles update if toast.type changes
	let toastStyle = $derived(getToastStyle(toast.type));

	onMount(() => {
		// Auto-remove toast after duration
		const timer = setTimeout(() => {
			removeToast();
		}, toast.duration || 5000);

		return () => clearTimeout(timer);
	});

	function removeToast() {
		if (toastElement) {
			// Apply exit animation styles
			toastElement.style.transform = 'translateX(100%)';
			toastElement.style.opacity = '0';

			// Wait for animation to finish before removing from store
			setTimeout(() => {
				uiState.removeToast(toast.id);
			}, 300); // Matches the 0.3s transition time
		}
	}
</script>

<div
	bind:this={toastElement}
	class="
        w-full max-w-xs transform rounded-xl
        border-l-4 p-4 shadow-lg
        transition-all duration-300 ease-in-out md:max-w-sm
        {toastStyle.bg} {toastStyle.text}
    "
	style="transform: translateX(0); opacity: 1;"
	role="alert"
	aria-live="polite"
>
	<div class="flex items-start justify-between">
		<div class="flex flex-shrink-0 items-center">
			<span class="mr-3 text-lg" aria-hidden="true">
				{@html toastStyle.icon}
			</span>

			<p class="text-sm leading-snug font-semibold">
				{toast.message}
			</p>
		</div>

		<button
			onclick={removeToast}
			class="ml-4 flex-shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-current focus:outline-none"
			aria-label="Close notification"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-x"
			>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
		</button>
	</div>
</div>

<style>
	/* We keep a simple style block for the transition since the initial 
      and final state (translateX(0) / translateX(100%)) is handled 
      in the Svelte script for better control.
    */
	.toast-element {
		transition: all 0.3s ease-in-out;
	}
</style>
