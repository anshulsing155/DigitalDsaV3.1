<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { formatCurrency } from '$lib/i18n';
	import { loanTypeLabel } from '$lib/config/loanTypeLabels';
	import {
		DROP_REASONS,
		DROP_REASON_LABELS,
		type DropReason
	} from '$lib/types/case';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// ── Server data ──────────────────────────────────────────────
	const layoutData = $derived(
		$page.data as {
			caseData: {
				case_id: string;
				label: string;
				applicant_name?: string;
				stage: string;
				stage_label: string;
				loan: {
					type: string;
					amount_required?: number;
					tenure_years?: number;
					purpose?: string;
				};
				lender_applications: any[];
				optional_contact?: {
					full_name?: string;
					mobile?: string;
					email?: string;
				};
				source?: {
					type?: string;
					label?: string;
				};
				notes?: string;
				is_sample: boolean;
				created_at: string;
				updated_at: string;
				editFormURL?: string | null;
				form_snapshot_version?: number;
			};
			availableTransitions: Array<{ value: string; label: string }>;
			stageLabels: Record<string, string>;
		}
	);

	const caseData = $derived(layoutData.caseData);
	const currentPath = $derived($page.url.pathname);

	// Item 19 — quota-aware Edit Application gating. Read from $page.data
	// (populated by dashboard/dsa/+layout.server.ts → getQuotaState). Null
	// on sample cases, demo, or quota-load failure → button stays enabled
	// (fail-open UX consistent with /api/evaluate-and-persist's gate).
	const quotaState = $derived(
		($page.data as { quotaState?: { editFormDisabled?: boolean } | null }).quotaState ?? null
	);
	const editDisabled = $derived(quotaState?.editFormDisabled === true);
	const basePath = $derived(`/dashboard/dsa/cases/${caseData.case_id}`);

	// ── Stage change state ──────────────────────────────────────
	let showStageDropdown = $state(false);
	let stageChanging = $state(false);
	let stageError = $state('');
	let stageSuccess = $state('');

	// F.4 — drop-reason dialog state. Opened when a user picks "Dropped"
	// from the stage dropdown; closed (without an API call) on cancel.
	// The actual PATCH only fires after the user picks a reason + clicks
	// "Drop" in the dialog. The server has the same Zod refinement —
	// this client-side gate is UX, not security.
	let dropDialogOpen = $state(false);
	let dropReason = $state<DropReason | ''>('');
	let dropReasonNote = $state('');

	function startStageChange(newStage: string) {
		// Reset any prior state from a previous click.
		stageError = '';
		stageSuccess = '';
		if (newStage === 'dropped') {
			dropReason = '';
			dropReasonNote = '';
			dropDialogOpen = true;
			showStageDropdown = false;
			return;
		}
		void changeStage(newStage);
	}

	function cancelDropDialog() {
		dropDialogOpen = false;
		dropReason = '';
		dropReasonNote = '';
	}

	async function confirmDrop() {
		if (!dropReason) return; // button is disabled, but defensive
		if (dropReason === 'other' && !dropReasonNote.trim()) return;
		dropDialogOpen = false;
		await changeStage('dropped', {
			drop_reason: dropReason,
			...(dropReasonNote.trim() && { drop_reason_note: dropReasonNote.trim() })
		});
	}

	async function changeStage(
		newStage: string,
		extras: { drop_reason?: DropReason; drop_reason_note?: string } = {}
	) {
		stageChanging = true;
		stageError = '';
		stageSuccess = '';

		try {
			const res = await secureFetch(`/api/cases/${caseData.case_id}/stage`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ stage: newStage, ...extras })
			});

			const result = await res.json();

			if (result.success) {
				stageSuccess = `Stage updated to ${layoutData.stageLabels[newStage] || newStage}`;
				showStageDropdown = false;
				// Reload to reflect new state
				setTimeout(() => {
					stageSuccess = '';
					goto(currentPath, { invalidateAll: true });
				}, 1000);
			} else {
				stageError = result.error || 'Failed to update stage';
			}
		} catch {
			stageError = 'Network error. Please try again.';
		} finally {
			stageChanging = false;
		}
	}

	// Drop button enabled only when a reason is selected AND, for 'other',
	// a non-empty note is supplied.
	let canConfirmDrop = $derived(
		dropReason !== '' &&
			(dropReason !== 'other' || dropReasonNote.trim().length > 0) &&
			!stageChanging
	);

	// Close dropdown on outside click
	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.stage-dropdown-container')) {
			showStageDropdown = false;
		}
	}

	// ── Stage badge colors ──────────────────────────────────────
	const stageColors: Record<string, string> = {
		intake: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]',
		profiling:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]',
		file_building:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]',
		submitted:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]',
		processing:
			'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] border-[var(--dash-border)]',
		query:
			'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)] border-[var(--dash-contrast-ghost-border)]',
		sanctioned:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]',
		disbursed:
			'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] border-[var(--dash-btn-ghost-border)]',
		rejected: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border-[var(--dash-border)]',
		dropped: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border-[var(--dash-border)]',
		closed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)] border-[var(--dash-border)]'
	};

	// ── Tab navigation ──────────────────────────────────────────
	const tabs = $derived([
		{ label: 'Overview', href: basePath, icon: 'overview', disabled: false },
		{ label: 'Results', href: `${basePath}/results`, icon: 'results', disabled: false },
		{ label: 'File Builder', href: `${basePath}/file-builder`, icon: 'file', disabled: false },
		{ label: 'Queries', href: `${basePath}/queries`, icon: 'query', disabled: true },
		{ label: 'Communicate', href: `${basePath}/communicate`, icon: 'communicate', disabled: true },
		{ label: 'Timeline', href: `${basePath}/timeline`, icon: 'timeline', disabled: false }
	]);

	// ── Breadcrumbs ────────────────────────────────────────────
	const activeTab = $derived(
		tabs.find((t) => !t.disabled && t.href !== basePath && currentPath.startsWith(t.href))
	);
	const breadcrumbs = $derived(() => {
		const crumbs: { label: string; href?: string }[] = [
			{ label: 'Cases', href: '/dashboard/dsa/cases' },
			{ label: caseData.label, href: basePath }
		];
		if (activeTab) {
			crumbs.push({ label: activeTab.label });
		}
		return crumbs;
	});

	function isActiveTab(tabHref: string): boolean {
		if (tabHref === basePath) {
			return currentPath === basePath;
		}
		return currentPath.startsWith(tabHref);
	}

	// ── Format helpers ────────────────────────────────────────── Cr`;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pb-20 lg:pb-0"
	onclick={handleOutsideClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') showStageDropdown = false;
	}}
>
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- BREADCRUMBS                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-4">
		<Breadcrumbs crumbs={breadcrumbs()} />
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CASE HEADER                                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		class="mb-6 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2.5">
					<h1 class="truncate text-lg font-bold text-[var(--dash-text)] md:text-xl">
						{caseData.applicant_name || caseData.label}
					</h1>
					{#if caseData.is_sample}
						<span
							class="shrink-0 rounded bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
						>
							Sample
						</span>
					{/if}
				</div>
				<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
					{#if caseData.applicant_name}<span>{caseData.label}</span> · {/if}<span class="font-mono">{caseData.case_id}</span>
				</p>
				<div
					class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--dash-text-secondary)]"
				>
					<span
						class="rounded-md bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
					>
						{loanTypeLabel(caseData.loan.type)}
					</span>
					{#if caseData.loan.amount_required}
						<span class="font-semibold text-[var(--dash-text)]">
							{formatCurrency(caseData.loan.amount_required, true)}
						</span>
					{/if}
					{#if caseData.loan.tenure_years}
						<span class="text-[var(--dash-text-muted)]">|</span>
						<span>{caseData.loan.tenure_years} yrs</span>
					{/if}
				</div>
			</div>

			<!-- Header actions cluster: prominent "Edit Application" button +
			     Stage badge. The Edit button used to be a tiny ghost-styled
			     "Edit" inline with the loan amount metadata — easy to miss.
			     Promoted 2026-06-01 per owner direction. -->
			<div class="flex shrink-0 items-center gap-2">
				{#if caseData.editFormURL && !caseData.is_sample}
					<a
						href={editDisabled ? undefined : caseData.editFormURL}
						aria-disabled={editDisabled}
						tabindex={editDisabled ? -1 : 0}
						title={editDisabled
							? 'Monthly limit reached — re-evaluating an edit burns compute your plan does not cover. Upgrade to keep editing.'
							: 'Edit application — re-evaluates lenders after you save'}
						class="header-edit-btn {editDisabled ? 'header-edit-btn--disabled' : ''}"
						onclick={(e) => editDisabled && e.preventDefault()}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
						</svg>
						Edit Application
					</a>
				{/if}

				<!-- Stage badge with dropdown -->
				<div class="stage-dropdown-container relative">
				<button
					onclick={() => {
						if (layoutData.availableTransitions.length > 0) {
							showStageDropdown = !showStageDropdown;
						}
					}}
					class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all {stageColors[
						caseData.stage
					] ||
						'border-[var(--dash-border)] bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'} {layoutData
						.availableTransitions.length > 0
						? 'cursor-pointer hover:shadow-sm'
						: 'cursor-default'}"
				>
					{caseData.stage_label}
					{#if layoutData.availableTransitions.length > 0}
						<svg
							class="h-3.5 w-3.5 transition-transform {showStageDropdown ? 'rotate-180' : ''}"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19.5 8.25l-7.5 7.5-7.5-7.5"
							/>
						</svg>
					{/if}
				</button>

				{#if showStageDropdown}
					<div
						class="absolute top-full right-0 z-20 mt-1 min-w-[180px] rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] py-1 shadow-xl"
					>
						<p
							class="px-3 py-1.5 text-[12px] font-semibold tracking-wide text-[var(--dash-text-muted)] uppercase"
						>
							Move to
						</p>
						{#each layoutData.availableTransitions as transition}
							<button
								onclick={() => startStageChange(transition.value)}
								disabled={stageChanging}
								class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)] disabled:opacity-50"
							>
								<span
									class="h-2 w-2 rounded-full {stageColors[transition.value]?.split(' ')[0] ||
										'bg-[var(--dash-border)]'}"
								></span>
								{transition.label}
							</button>
						{/each}
					</div>
				{/if}
				</div>
			</div>
		</div>

		<!-- Stage change feedback -->
		{#if stageError}
			<div
				class="mt-3 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
			>
				{stageError}
			</div>
		{/if}
		{#if stageSuccess}
			<div
				class="mt-3 rounded-lg bg-[var(--dash-btn-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-accent-text)]"
			>
				{stageSuccess}
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- TAB NAVIGATION                                             -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-6 overflow-x-auto">
		<nav class="flex min-w-max border-b border-[var(--dash-border)]">
			{#each tabs as tab}
				{@const active = !tab.disabled && isActiveTab(tab.href)}
				{@const iconClass = 'h-4 w-4'}
				{#if tab.disabled}
					<span
						class="relative flex cursor-default items-center gap-1.5 px-4 py-3 text-sm font-medium text-[var(--dash-text-muted)]"
						title="Coming soon"
					>
						{#if tab.icon === 'file'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/></svg
							>
						{:else if tab.icon === 'query'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
								/></svg
							>
						{:else if tab.icon === 'communicate'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
								/></svg
							>
						{:else}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
								/></svg
							>
						{/if}
						{tab.label}
						<!-- Lock icon indicates this feature is not yet available (tooltip shows "Coming soon") -->
						<svg
							class="ml-0.5 h-3 w-3 opacity-40"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
							/>
						</svg>
					</span>
				{:else}
					<a
						href={tab.href}
						class="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
							{active
							? 'text-[var(--ddsa-accent-500)]'
							: 'text-[var(--dash-text-secondary)] hover:text-[var(--dash-text)]'}"
					>
						{#if tab.icon === 'overview'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
								/></svg
							>
						{:else if tab.icon === 'results'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
								/></svg
							>
						{:else if tab.icon === 'file'}
							<svg
								class={iconClass}
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/></svg
							>
						{/if}
						{tab.label}
						{#if active}
							<span
								class="absolute right-0 bottom-0 left-0 h-0.5 rounded-t bg-[var(--ddsa-accent-500)]"
							></span>
						{/if}
					</a>
				{/if}
			{/each}
		</nav>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CHILD PAGE CONTENT                                         -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{@render children()}
</div>

<!-- F.4 — Drop-reason dialog. Opens when the DSA selects "Dropped"
     from the stage dropdown. "Drop" stays disabled until a reason is
     picked + (for "Other") a note is entered. Cancel reverts without
     touching the case. Server has the same Zod refinement as a hard
     gate — this dialog is UX. -->
{#if dropDialogOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="drop-dialog-title"
	>
		<div
			class="w-full max-w-md rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6 shadow-2xl"
		>
			<h2
				id="drop-dialog-title"
				class="text-base font-semibold text-[var(--dash-text)]"
			>
				Why are you dropping this case?
			</h2>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				This helps the CRM Win/Loss report show where deals are being lost.
			</p>

			<fieldset class="mt-4 space-y-2">
				<legend class="sr-only">Drop reason</legend>
				{#each DROP_REASONS as reason}
					<label
						class="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-[var(--dash-text)] hover:bg-[var(--dash-hover)]"
					>
						<input
							type="radio"
							name="drop-reason"
							value={reason}
							bind:group={dropReason}
							class="mt-1"
						/>
						<span>{DROP_REASON_LABELS[reason]}</span>
					</label>
				{/each}
			</fieldset>

			{#if dropReason === 'other'}
				<label class="mt-3 block text-sm text-[var(--dash-text)]">
					Describe what happened
					<textarea
						bind:value={dropReasonNote}
						rows="2"
						maxlength="500"
						placeholder="e.g. customer moved to a different city mid-process"
						class="mt-1 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-3 py-2 text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-accent-500)] focus:outline-none"
					></textarea>
				</label>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onclick={cancelDropDialog}
					disabled={stageChanging}
					class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm font-medium text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmDrop}
					disabled={!canConfirmDrop}
					class="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					title={!canConfirmDrop
						? dropReason === ''
							? 'Pick a reason first'
							: 'Add a note describing what happened'
						: ''}
				>
					{stageChanging ? 'Dropping…' : 'Drop case'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@media (max-width: 768px) {
		/* Item 19 — promoted Edit Application button in header actions cluster.
	   Same scale and weight as the Stage badge button it sits next to. */
	.header-edit-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 0.5rem;
		background: var(--dash-btn-bg);
		color: var(--dash-btn-text);
		font-size: 0.8125rem;
		font-weight: 600;
		text-decoration: none;
		transition: filter 120ms ease;
	}
	.header-edit-btn:hover {
		filter: brightness(1.05);
	}
	.header-edit-btn--disabled {
		cursor: not-allowed;
		opacity: 0.55;
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
	}
	.header-edit-btn--disabled:hover {
		filter: none;
	}

	:global(.stage-dropdown-container .absolute) {
			right: 0;
			left: auto;
		}
	}
</style>
