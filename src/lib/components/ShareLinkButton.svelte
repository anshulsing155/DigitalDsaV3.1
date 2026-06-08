<script lang="ts">
	/**
	 * ShareLinkButton — Generate & manage shareable form links
	 * ═══════════════════════════════════════════════════════════════════
	 * Shown in the case detail page for DSA users.
	 * Allows creating a token-based link that can be shared with the
	 * applicant for self-fill via WhatsApp, SMS, or copy-paste.
	 *
	 * Features:
	 *   - Section toggles (Income, Credit, Obligations, Documents)
	 *   - One-click link generation
	 *   - Copy to clipboard
	 *   - WhatsApp share
	 *   - Link status display (active, expired, used)
	 *   - Revoke existing links
	 *   - Feature gate awareness (Pro feature badge for free tier)
	 *
	 * Restored from _archive/ with feature-gate prop added.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';
	import {
		Check,
		AlertCircle,
		MoveUpRight,
		RotateCcw,
		Phone,
		X,
		ChevronDown,
		ChevronUp
	} from '$lib/utils/iconRegistry';

	interface Props {
		/** Application ID for the current case */
		applicationId: string;
		/** Applicant index within the application */
		applicantIndex: number;
		/** Applicant name (for display & WhatsApp message) */
		applicantName?: string;
		/** Whether the feature is enabled (from server feature gate check) */
		featureEnabled?: boolean;
	}

	let {
		applicationId,
		applicantIndex,
		applicantName = 'Applicant',
		featureEnabled = true
	}: Props = $props();

	// ── Section Toggles ─────────────────────────────────────────
	let includeSections = $state({
		income: true,
		credit: true,
		obligations: true,
		documents: false
	});

	let showOptions = $state(false);

	let activeSections = $derived(
		(Object.entries(includeSections) as [string, boolean][]).filter(([, v]) => v).map(([k]) => k)
	);

	let sectionLabels: Record<string, string> = {
		income: 'Income Sources',
		credit: 'Credit Score',
		obligations: 'Obligations',
		documents: 'Document Upload'
	};

	// ── State ────────────────────────────────────────────────────
	let isGenerating = $state(false);
	let shareUrl = $state('');
	let error = $state('');
	let copied = $state(false);
	let showPanel = $state(false);

	// ── Generate Link ────────────────────────────────────────────
	async function generateLink() {
		if (activeSections.length === 0) {
			error = 'Please select at least one section to share';
			return;
		}

		isGenerating = true;
		error = '';

		try {
			const sectionList = activeSections.join(', ');
			const res = await secureFetch('/api/share-link/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-csrf-token': getCsrfToken()
				},
				body: JSON.stringify({
					applicationId,
					applicantIndex,
					sections: activeSections,
					customTitle: `Income & Credit Information — ${applicantName}`,
					customSubtitle: `Please fill in the following sections accurately: ${sectionList}. This helps us process your loan application faster.`,
					requiresOtp: true,
					expiryHours: 72,
					maxUses: 10
				})
			});

			const result = await res.json();

			if (result.success) {
				shareUrl = result.shareUrl;
				showPanel = true;
				showOptions = false;
			} else {
				error = result.error || 'Failed to generate link';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			isGenerating = false;
		}
	}

	// ── Copy to Clipboard ────────────────────────────────────────
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			// Fallback for older browsers
			const input = document.createElement('input');
			input.value = shareUrl;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}

	// ── Share via WhatsApp ───────────────────────────────────────
	function shareWhatsApp() {
		const docNote = includeSections.documents
			? '\n\nYou can also upload supporting documents like salary slips, ITR, etc.'
			: '';
		const message = encodeURIComponent(
			`Hi ${applicantName},\n\nPlease fill in your income and credit details using this secure form:\n${shareUrl}${docNote}\n\nThis link is valid for 72 hours.`
		);
		if (browser) window.open(`https://wa.me/?text=${message}`, '_blank');
	}

	// ── Get CSRF token from cookie ───────────────────────────────
	function getCsrfToken(): string {
		const match = document.cookie.match(/csrf-token=([^;]+)/);
		return match?.[1] || '';
	}
</script>

<div class="relative">
	{#if !featureEnabled}
		<!-- Feature gated: show Pro badge -->
		<div
			class="flex items-center gap-3 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-alt)] px-4 py-3"
		>
			<div
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-stone-400 to-neutral-500"
			>
				<svg
					class="h-4 w-4 text-white"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
					/>
				</svg>
			</div>
			<div>
				<p class="text-sm font-semibold text-[var(--ddsa-secondary-900)]">
					Share Form with Applicant
				</p>
				<p class="text-xs text-[var(--dash-text-muted)]">
					Upgrade to <span class="font-semibold text-stone-600 dark:text-stone-400">Pro</span> to share
					forms directly with applicants
				</p>
			</div>
		</div>
	{:else if !showPanel}
		<!-- Generate Section -->
		<div class="flex flex-col gap-3">
			<!-- Main Generate Button + View All -->
			<div class="flex items-center gap-2">
				<button
					onclick={generateLink}
					disabled={isGenerating || activeSections.length === 0}
					class="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4
						py-2 text-sm font-medium text-white shadow-sm
						transition-all duration-200
						hover:from-blue-600 hover:to-blue-700
						disabled:cursor-not-allowed disabled:opacity-50"
				>
					<MoveUpRight class="h-4 w-4" />
					{isGenerating ? 'Generating...' : 'Share Form with Applicant'}
				</button>

				<!-- Options Toggle -->
				<button
					onclick={() => {
						showOptions = !showOptions;
					}}
					class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3
						py-2 text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
				>
					{#if showOptions}
						<ChevronUp class="h-3.5 w-3.5" />
					{:else}
						<ChevronDown class="h-3.5 w-3.5" />
					{/if}
					Options
				</button>

				<!-- View All Links -->
				<a
					href="/dashboard/dsa/shared-links"
					class="flex items-center gap-1 rounded-lg border border-[var(--dash-border)] px-3
						py-2 text-xs font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--ddsa-accent-500)]"
				>
					View All Links
				</a>
			</div>

			<!-- Section Toggles (collapsible) -->
			{#if showOptions}
				<div
					class="animate-in flex flex-col gap-2.5 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] p-3"
				>
					<p class="mb-0.5 text-xs font-semibold text-[var(--dash-text-secondary)]">
						Sections to include:
					</p>

					{#each Object.entries(sectionLabels) as [key, label]}
						<label class="group flex cursor-pointer items-center gap-2.5">
							<input
								type="checkbox"
								bind:checked={includeSections[key as keyof typeof includeSections]}
								class="h-4 w-4 cursor-pointer rounded border-[var(--dash-border)]
									text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
							/>
							<span
								class="text-sm text-[var(--dash-text)] transition-colors group-hover:text-[var(--ddsa-secondary-900)]"
							>
								{label}
							</span>
							{#if key === 'documents'}
								<span
									class="rounded-full border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[10px] text-[var(--dash-text-muted)]"
									>Optional</span
								>
							{/if}
						</label>
					{/each}

					{#if includeSections.documents}
						<p
							class="mt-0.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
						>
							Document upload section will show relevant document slots based on the applicant's
							income types (salary slips, ITR, bank statements, etc.). All uploads are optional.
						</p>
					{/if}
				</div>
			{/if}

			{#if error}
				<div class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
					<AlertCircle class="h-3.5 w-3.5" />
					<span>{error}</span>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Share Panel -->
		<div
			class="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
		>
			<div class="mb-3 flex items-start justify-between gap-3">
				<div>
					<p class="text-sm font-semibold text-blue-900 dark:text-blue-300">Share Link Generated</p>
					<p class="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
						Valid for 72 hours. Applicant will verify via OTP.
					</p>
					<div class="mt-1.5 flex flex-wrap gap-1">
						{#each activeSections as section}
							<span
								class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
							>
								{sectionLabels[section] || section}
							</span>
						{/each}
					</div>
				</div>
				<button
					onclick={() => {
						showPanel = false;
						shareUrl = '';
					}}
					class="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- URL Display -->
			<div
				class="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-2 dark:border-blue-800 dark:bg-[var(--dash-bg-card)]"
			>
				<input
					type="text"
					value={shareUrl}
					readonly
					class="flex-1 truncate bg-transparent text-xs text-[var(--dash-text)] outline-none"
				/>
				<button
					onclick={copyLink}
					class="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors
						{copied
						? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
						: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/40'}"
				>
					{#if copied}
						<Check class="h-3.5 w-3.5" />
						Copied!
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3.5 w-3.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
								d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
							/></svg
						>
						Copy
					{/if}
				</button>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				<button
					onclick={shareWhatsApp}
					class="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white
						transition-colors hover:bg-green-700"
				>
					<Phone class="h-4 w-4" />
					Share via WhatsApp
				</button>
				<button
					onclick={generateLink}
					disabled={isGenerating}
					class="flex items-center gap-1.5 rounded-lg bg-[var(--dash-bg-alt)] px-4 py-2 text-xs font-medium text-[var(--dash-text)]
						transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
				>
					<RotateCcw class="h-3.5 w-3.5" />
					New Link
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.animate-in {
		animation: slideDown 0.15s ease-out;
	}
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
