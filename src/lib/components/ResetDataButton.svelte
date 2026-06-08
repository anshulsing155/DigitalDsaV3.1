<script lang="ts">
	import { Trash2 } from '$lib/utils/iconRegistry';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import { safeLocalStorage } from '$lib/utils/safeStorage';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';

	// Map route segments to storage prefixes
	// This allows us to only clear data relevant to the current form
	function getPrefix(pathname: string): string {
		const path = pathname.toLowerCase();
		// Since all loan forms currently share the same 'home-' prefixed stores in loanData.ts,
		// we must target 'home-' prefix to successfully clear data for any loan type.
		if (
			path.includes('/home-loan') ||
			path.includes('/lap') ||
			path.includes('/plot-loan') ||
			path.includes('/personal-loan') ||
			path.includes('/business-loan') ||
			path.includes('/professional-loan')
		) {
			return 'home-';
		}
		return '';
	}

	let currentPrefix = $derived(getPrefix($page.url.pathname));

	function performReset() {
		// Find all keys starting with the prefix and remove them
		const keysToRemove = safeLocalStorage.getKeysWithPrefix(currentPrefix);

		if (keysToRemove.length === 0) {
			// alert('No saved data found to clear.'); // Optional: Use a toast instead if desired
			return;
		}

		keysToRemove.forEach((key) => safeLocalStorage.removeItem(key));

		// DSA-facing reset: the user just confirmed they want a clean slate.
		// invalidateAll() can't achieve this — the form state lives in a
		// Svelte 5 rune singleton (formState in form.svelte.ts) that is only
		// hydrated from storage at module load. A full reload is the single
		// safe way to guarantee both persisted storage AND in-memory state
		// are reset together; a partial wipe would leave the form looking
		// half-cleared. Acceptable per the 2026-04-26 sweep doc.
		if (browser) window.location.reload();
	}

	function handleReset() {
		if (!currentPrefix) {
			alert('No persisted data found for this page.');
			return;
		}

		openConfirmModal(
			'Reset Form Data',
			'Are you sure you want to clear all saved form data for this loan type and reload? This action cannot be undone.',
			performReset
		);
	}
</script>

{#if currentPrefix}
	<button
		onclick={handleReset}
		class="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-red-700 focus:ring-4 focus:ring-red-300 focus:outline-none active:scale-95 dark:focus:ring-red-800"
		title="Reset Form Data"
		type="button"
	>
		<Trash2 size={24} />
	</button>
{/if}

<ConfirmModal />
