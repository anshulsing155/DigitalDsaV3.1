<script lang="ts">
	/**
	 * LanguageSelector — Compact dropdown for switching app language.
	 *
	 * Shows available Phase 1 languages (English, Hindi, Marathi) with native labels.
	 * Persists choice to localStorage + cookie immediately.
	 * Optionally saves to server via PATCH /api/user/language (when authenticated).
	 */

	import { getLanguage, setLanguage, persistLanguage, AVAILABLE_LANGUAGES } from '$lib/i18n';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { secureFetch } from '$lib/utils/csrf';

	interface Props {
		/** When true, also saves preference to server (use in authenticated contexts) */
		saveToServer?: boolean;
		/** Compact mode for sidebar/footer placement */
		compact?: boolean;
	}

	let { saveToServer = false, compact = false }: Props = $props();

	let selectedLang = $state(getLanguage());
	let isOpen = $state(false);

	// Sync selectedLang after initLanguage() runs in parent onMount
	onMount(() => {
		selectedLang = getLanguage();
	});

	const currentLabel = $derived(
		AVAILABLE_LANGUAGES.find((l) => l.code === selectedLang)?.nativeLabel ?? 'English'
	);

	async function selectLanguage(code: string) {
		const effective = setLanguage(code);
		persistLanguage(effective);
		selectedLang = effective;
		isOpen = false;

		if (saveToServer) {
			try {
				await secureFetch('/api/user/language', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ language: effective })
				});
			} catch {
				// Silently fail — local persistence already succeeded
			}
		}

		// Full page reload so all t() calls re-evaluate with the new language.
		// t() uses a module-level variable, not reactive Svelte state, so
		// client components won't automatically re-render on language change.
		if (browser) window.location.reload();
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.lang-selector')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="lang-selector relative" class:inline-block={compact}>
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors
			{compact
			? 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-bg-alt)] hover:text-[var(--dash-text)]'
			: 'border border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)] hover:bg-[var(--dash-hover)]'}"
		aria-label="Select language"
		aria-expanded={isOpen}
		aria-haspopup="listbox"
	>
		<svg
			class="h-4 w-4 flex-shrink-0 opacity-60"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20" />
			<path
				d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
			/>
		</svg>
		<span>{currentLabel}</span>
		<svg
			class="h-3 w-3 opacity-50 transition-transform"
			class:rotate-180={isOpen}
			viewBox="0 0 12 12"
			fill="currentColor"
		>
			<path d="M2 4l4 4 4-4" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute z-50 mt-1 min-w-[140px] rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-1 shadow-lg"
			class:bottom-full={compact}
			class:mb-1={compact}
			class:mt-0={compact}
			role="listbox"
			aria-label="Available languages"
		>
			{#each AVAILABLE_LANGUAGES as lang}
				{@const isActive = lang.code === selectedLang}
				<button
					type="button"
					role="option"
					aria-selected={isActive}
					onclick={() => selectLanguage(lang.code)}
					class="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors
						{isActive
						? 'bg-[var(--ddsa-primary-50)] font-medium text-[var(--ddsa-primary-700)]'
						: 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
				>
					<span class="flex-1 text-left">{lang.nativeLabel}</span>
					<span class="text-xs text-[var(--dash-text-muted)]">{lang.label}</span>
					{#if isActive}
						<svg
							class="h-3.5 w-3.5 text-[var(--ddsa-primary-600)]"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
