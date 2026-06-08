<script lang="ts">
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';
	import {
		RotateCcw,
		User,
		Building2,
		ChevronLeft,
		ChevronRight,
		Pencil,
		CircleAlert,
		ChartNoAxesCombined,
		CircleOff
	} from '$lib/utils/iconRegistry';
	import { onMount } from 'svelte';
	import { generateId } from '$lib/utils';
	import { afterNavigate } from '$app/navigation';
	// Director-slot context (Pitfalls #36/#37) — directorRestore is set when the
	// restore was triggered from DirectorFormModal. When present:
	//   • Filter out Individuals whose past profiles are all salaried/rental/etc
	//     (CLAUDE.md Pitfall #36 — "suggest business people only under company").
	//   • Soft-warn when the match's historical linked companies don't include
	//     the current target company (Pitfall #37).
	// Reading from the singleton store keeps the modal's prop surface stable.
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';

	// Income profile types that legitimately come up in director/partner slots.
	// Salaried-only / rental-only / freelance-only people are filtered out when
	// the user is filling a Director slot — they're noise.
	const DIRECTOR_RELEVANT_PROFILES = new Set([
		'director_company',
		'business_partnership',
		'business_proprietorship',
		'professional_practice'
	]);

	function normalizeCompanyNameForCompare(s: string | undefined): string {
		return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
	}

	let dialogEl: HTMLDialogElement | null = $state(null);

	// Open/close the native dialog when `open` prop changes
	$effect(() => {
		if (!dialogEl) return;
		if (open && matches.length > 0 && !dialogEl.open) {
			dialogEl.showModal();
		} else if ((!open || matches.length === 0) && dialogEl.open) {
			dialogEl.close();
		}
	});

	const PROFILE_LABELS: Record<string, string> = {
		salaried_regular: 'Salaried',
		salaried_contractual: 'Contractual',
		business_proprietorship: 'Proprietorship',
		business_partnership: 'Partnership',
		director_company: 'Director',
		professional_practice: 'Professional',
		pension: 'Pension',
		rental_income: 'Rental',
		freelance_consulting: 'Freelance',
		agriculture_income: 'Agriculture',
		investment_income: 'Investment',
		no_current_income: 'No Income'
	};

	interface MatchSummary {
		incomeSources: Array<{ entityName: string; profileType: string }>;
		obligations: Array<{ bankName: string; loanType: string; emi?: string }>;
		cibilScore?: number;
		totalActiveIncomeSources: number;
		totalObligations: number;
	}

	interface MatchType {
		uuid: string;
		displayName: string;
		deletedAt: number;
		data: any;
		matchSource?: 'recovery' | 'live';
		liveIndex?: number;
		isDirectorLinked?: boolean;
		linkedCompanyName?: string;
		summary?: MatchSummary;
		// Context fields for disambiguation
		directorRole?: string;
		loanProduct?: string;
		employmentType?: string;
		// Role validation warning (Phase 2)
		roleWarning?: string;
		// True when this match comes from a different loan scope (cross-loan suggestion)
		isCrossLoan?: boolean;
	}

	interface Props {
		open?: boolean;
		matches?: MatchType[];
		onConfirm: (match: MatchType) => void;
		onCancel: () => void;
	}

	let { open = false, matches = [], onConfirm, onCancel }: Props = $props();

	const modalId = generateId();
	let isRegistered = $state(false);

	// Slide index within same-person variants
	let slideIndex = $state(0);
	// Radio index for different-people list
	let selectedIndex = $state(0);

	$effect(() => {
		if (open && !isRegistered) {
			registerModal(modalId);
			isRegistered = true;
		} else if (!open && isRegistered) {
			unregisterModal(modalId);
			isRegistered = false;
		}
		return () => {
			unregisterModal(modalId);
		};
	});

	// Route change = dismissal. `restoreIntentState` is a module-level
	// singleton that persists across SvelteKit navigations — without this,
	// pressing the browser back button leaves the modal mounted by the next
	// page-render (because the singleton's `open` flag is still true). Mirror
	// of the Pitfall #39 afterNavigate fix in ConfirmModal / SameCompanyPromptModal
	// / InfoModal. Reset the singleton directly rather than calling `onCancel`
	// because the parent component owning `onCancel` may itself be mid-unmount
	// during the same nav.
	afterNavigate(() => {
		if (restoreIntentState.open) {
			restoreIntentState.reset();
		}
	});

	$effect(() => {
		if (open) {
			slideIndex = 0;
			selectedIndex = 0;
		}
	});

	// Build identity key for grouping — name + age + gender + maritalStatus
	function identityKey(m: MatchType): string {
		const d = m.data || {};
		if (d.applicantType === 'Company') {
			return `company::${(d.companyName || '').toLowerCase()}::${d.companyType || ''}`;
		}
		return `individual::${(d.fullName || '').toLowerCase()}::${d.age || ''}::${d.gender || ''}::${d.maritalStatus || ''}`;
	}

	// Determine display mode
	const displayMode = $derived.by(() => {
		if (matches.length === 0) return 'none';
		if (matches.length === 1) return 'single';
		const keys = new Set(matches.map(identityKey));
		return keys.size === 1 ? 'slides' : 'list';
	});

	const LOAN_PRODUCT_COLORS: Record<
		string,
		{ bg: string; text: string; darkBg: string; darkText: string }
	> = {
		'Secured Loan': {
			bg: 'bg-blue-100',
			text: 'text-blue-700',
			darkBg: 'dark:bg-blue-900/40',
			darkText: 'dark:text-blue-300'
		},
		'Business Loan': {
			bg: 'bg-amber-100',
			text: 'text-amber-700',
			darkBg: 'dark:bg-amber-900/40',
			darkText: 'dark:text-amber-300'
		},
		'Professional Loan': {
			bg: 'bg-purple-100',
			text: 'text-purple-700',
			darkBg: 'dark:bg-purple-900/40',
			darkText: 'dark:text-purple-300'
		},
		'Personal Loan': {
			bg: 'bg-green-100',
			text: 'text-green-700',
			darkBg: 'dark:bg-green-900/40',
			darkText: 'dark:text-green-300'
		}
	};

	const EMPLOYMENT_LABELS: Record<string, string> = {
		salaried_regular: 'Salaried',
		salaried_contractual: 'Contractual',
		business_proprietorship: 'Self-Employed',
		business_partnership: 'Partnership',
		director_company: 'Director',
		professional_practice: 'Professional',
		pension: 'Pensioner',
		rental_income: 'Rental Income',
		freelance_consulting: 'Freelancer',
		agriculture_income: 'Agriculture',
		investment_income: 'Investor',
		no_current_income: 'No Income'
	};

	/** Build context badges for a match (role, loan type, employment) */
	function getContextBadges(
		m: MatchType
	): Array<{ label: string; bg: string; text: string; darkBg: string; darkText: string }> {
		const badges: Array<{
			label: string;
			bg: string;
			text: string;
			darkBg: string;
			darkText: string;
		}> = [];

		// Director/Partner role badge (highest priority)
		if (m.linkedCompanyName && m.matchSource !== 'live') {
			const roleLabel = m.directorRole === 'partner' ? 'Partner' : 'Director';
			badges.push({
				label: `${roleLabel} of ${m.linkedCompanyName}`,
				bg: 'bg-violet-100',
				text: 'text-violet-700',
				darkBg: 'dark:bg-violet-900/40',
				darkText: 'dark:text-violet-300'
			});
		}

		// Loan product badge
		if (m.loanProduct) {
			const colors = LOAN_PRODUCT_COLORS[m.loanProduct] ?? {
				bg: 'bg-gray-100',
				text: 'text-gray-700',
				darkBg: 'dark:bg-gray-800',
				darkText: 'dark:text-gray-300'
			};
			badges.push({ label: m.loanProduct, ...colors });
		}

		// Employment type badge (only if no director badge and employment is known)
		const empType = m.employmentType || m.data?.employmentType;
		if (!m.linkedCompanyName && empType) {
			const empLabel = EMPLOYMENT_LABELS[empType] || empType;
			badges.push({
				label: empLabel,
				bg: 'bg-gray-100',
				text: 'text-gray-600',
				darkBg: 'dark:bg-gray-800',
				darkText: 'dark:text-gray-400'
			});
		}

		return badges;
	}

	function getLabel(m: MatchType) {
		const d = m.data || {};
		const applicantType = d.applicantType || 'Individual';
		let details: string;
		if (applicantType === 'Individual') {
			details =
				[d.gender, d.age ? `Age ${d.age}` : null, d.maritalStatus].filter(Boolean).join(' · ') ||
				'No details';
		} else {
			details = [d.companyType, d.businessType].filter(Boolean).join(' · ') || 'No details';
		}
		return { name: m.displayName || 'Unknown', details, applicantType };
	}

	function formatIncome(summary?: MatchSummary): string {
		if (!summary || summary.incomeSources.length === 0) return '';
		return summary.incomeSources
			.map((s) => {
				const label = PROFILE_LABELS[s.profileType] || s.profileType;
				return s.entityName ? `${s.entityName} (${label})` : label;
			})
			.join(' · ');
	}

	function formatObligations(summary?: MatchSummary): string {
		if (!summary || summary.obligations.length === 0) return '';
		return summary.obligations
			.map((o) => {
				const parts = [o.bankName, o.loanType].filter(Boolean).join(' ');
				if (o.emi) return `${parts} ₹${Number(o.emi).toLocaleString('en-IN')}/mo`;
				return parts;
			})
			.join(' · ');
	}

	// True when the restore was triggered from a Director slot (DirectorFormModal).
	// Drives the profile-relevance filter and the historical-company-overlap warning.
	const isDirectorSlot = $derived(restoreIntentState.directorRestore !== undefined);
	const directorSlotCompanyName = $derived(
		normalizeCompanyNameForCompare(restoreIntentState.directorRestore?.companyName)
	);

	// Pre-filter — when filling a Director slot, drop Individuals whose past
	// income profiles are all salaried / rental / etc. These records aren't
	// useful suggestions for a director context. Companies and Individuals with
	// at least one business/director profile are kept. Unknown summary stays
	// permissive — we only filter when we can prove no relevance.
	function isMatchRelevantForDirectorSlot(m: MatchType): boolean {
		const isCompany = (m.data as Record<string, unknown> | undefined)?.applicantType === 'Company';
		if (isCompany) return true;
		const profiles = m.summary?.incomeSources?.map((s) => s.profileType) ?? [];
		if (profiles.length === 0) return true;
		return profiles.some((p) => DIRECTOR_RELEVANT_PROFILES.has(p));
	}

	// In list mode, group matches by applicantType so People + Companies render
	// as separate visual sections. Within each group the original input order
	// (same-scope → live → cross-loan) is preserved via stable Array.sort.
	// CLAUDE.md Pitfall #35 — without this split, mixed lists (image 1 from
	// the user's screenshots: Company "qw" alongside Individual "qwerty") let
	// DSAs accidentally restore the wrong type.
	const sortedMatches = $derived.by(() => {
		const base = isDirectorSlot ? matches.filter(isMatchRelevantForDirectorSlot) : matches;
		if (displayMode !== 'list') return base;
		return [...base].sort((a, b) => {
			const aIsCompany =
				(a.data as Record<string, unknown> | undefined)?.applicantType === 'Company';
			const bIsCompany =
				(b.data as Record<string, unknown> | undefined)?.applicantType === 'Company';
			return (aIsCompany ? 1 : 0) - (bIsCompany ? 1 : 0);
		});
	});

	// Compute the historical-company-overlap soft warning for a match (Pitfall #37).
	// Only fires for director-slot restores where:
	//   • the target company is known (directorRestore.companyName is set), AND
	//   • the match is an Individual with at least one director/partner profile, AND
	//   • NONE of those past entityNames match the target company.
	// Returns '' otherwise. Display-only — doesn't block the restore.
	function historicalCompanyOverlapWarning(m: MatchType): string {
		if (!isDirectorSlot || !directorSlotCompanyName) return '';
		const isCompany = (m.data as Record<string, unknown> | undefined)?.applicantType === 'Company';
		if (isCompany) return '';
		const directorProfiles =
			m.summary?.incomeSources?.filter((s) => DIRECTOR_RELEVANT_PROFILES.has(s.profileType)) ?? [];
		if (directorProfiles.length === 0) return '';
		const targetMatched = directorProfiles.some(
			(s) => normalizeCompanyNameForCompare(s.entityName) === directorSlotCompanyName
		);
		if (targetMatched) return '';
		// No overlap — surface the historical companies so DSA can decide.
		const histNames = [...new Set(directorProfiles.map((s) => s.entityName).filter(Boolean))];
		if (histNames.length === 0) return '';
		const targetName = restoreIntentState.directorRestore?.companyName ?? 'this company';
		return `Past records show director of ${histNames.join(', ')} — not ${targetName}. Confirm this is the right person.`;
	}
	const hasIndividuals = $derived(
		sortedMatches.some(
			(m) => (m.data as Record<string, unknown> | undefined)?.applicantType !== 'Company'
		)
	);
	const hasCompanies = $derived(
		sortedMatches.some(
			(m) => (m.data as Record<string, unknown> | undefined)?.applicantType === 'Company'
		)
	);
	const showSectionHeaders = $derived(hasIndividuals && hasCompanies);

	// Currently selected match (for source-aware UI).
	// Note: list mode uses `sortedMatches[selectedIndex]` — `selectedIndex` now
	// indexes the sorted array, NOT the original `matches` prop. handleConfirm
	// passes the resolved match object up so the parent doesn't care about index.
	const selectedMatch = $derived.by(() => {
		if (displayMode === 'slides' || displayMode === 'single') return matches[slideIndex];
		return sortedMatches[selectedIndex];
	});
	const isLiveMatch = $derived(selectedMatch?.matchSource === 'live');
	const hasLiveMatches = $derived(matches.some((m) => m.matchSource === 'live'));
	const hasRecoveryMatches = $derived(matches.some((m) => m.matchSource === 'recovery'));

	function handleConfirm() {
		const match = selectedMatch;
		if (match) onConfirm(match);
	}

	function prevSlide() {
		if (slideIndex > 0) slideIndex--;
	}
	function nextSlide() {
		if (slideIndex < matches.length - 1) slideIndex++;
	}
</script>

<dialog bind:this={dialogEl} class="modal-dialog" aria-modal="true">
	<div class="modal-overlay">
		<div class="modal-container">
			<!-- Header -->
			<div class="modal-header bg-ddsa-gradient-primary">
				<div class="header-icon">
					{#if hasLiveMatches && !hasRecoveryMatches}
						<CircleAlert class="h-5 w-5" />
					{:else}
						<RotateCcw class="h-5 w-5" />
					{/if}
				</div>
				<div>
					<h3 class="text-labelQuestion !m-0 text-[var(--bg-header-text)]">
						{#if hasLiveMatches && !hasRecoveryMatches}
							Existing Applicant Found
						{:else if !hasLiveMatches && hasRecoveryMatches}
							Previous Record Found
						{:else}
							Matching Records Found
						{/if}
					</h3>
					<p class="descriptionText text-[var(--bg-header-subtext)]">
						{#if displayMode === 'slides'}
							Same person · {matches.length} income variants saved
						{:else if displayMode === 'list'}
							{matches.length} matching records
						{:else if isLiveMatch}
							This person is already in your application
						{:else}
							Restore basic info?
						{/if}
					</p>
				</div>
			</div>

			<!-- Content -->
			<div class="modal-content">
				{#if displayMode === 'single' || displayMode === 'slides'}
					{@const m = matches[displayMode === 'slides' ? slideIndex : 0]}
					{@const lbl = getLabel(m)}
					{@const inc = formatIncome(m.summary)}
					{@const obl = formatObligations(m.summary)}

					<!-- Identity (same for all slides) -->
					<div class="identity-row">
						<div class="identity-icon">
							{#if lbl.applicantType === 'Company'}
								<Building2 class="h-5 w-5" />
							{:else}
								<User class="h-5 w-5" />
							{/if}
						</div>
						<div>
							<div class="flex items-center gap-2">
								<p class="text-labelText font-titleMedium !m-0 text-[var(--form-text-label)]">
									{lbl.name}
								</p>
								{#if m.matchSource === 'live' && m.isDirectorLinked}
									<span
										class="tinyText inline-flex shrink-0 items-center rounded-full bg-violet-100 px-1.5 py-0.5 whitespace-nowrap text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
									>
										Director of {m.linkedCompanyName || 'Company'}
									</span>
								{:else if m.matchSource === 'live'}
									<span
										class="tinyText inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 whitespace-nowrap text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
									>
										Already added
									</span>
								{/if}
							</div>
							<p class="alertText text-[var(--form-text-muted)]">{lbl.details}</p>
							<!-- Context badges (recovery matches only) -->
							{#if getContextBadges(m).length > 0}
								<div class="context-badges">
									{#each getContextBadges(m) as badge}
										<span
											class="tinyText inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 whitespace-nowrap {badge.bg} {badge.text} {badge.darkBg} {badge.darkText}"
										>
											{badge.label}
										</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					{#if displayMode === 'slides'}
						<div class="slide-header">
							<span class="tinyText text-[var(--form-text-muted)]"
								>Income variant {slideIndex + 1} of {matches.length}</span
							>
							<div class="slide-dots">
								{#each matches as _, i}
									<button
										type="button"
										class="dot {i === slideIndex ? 'active' : ''}"
										onclick={() => (slideIndex = i)}
										aria-label="Variant {i + 1}"
									></button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Income / Obligations / CIBIL for this variant -->
					<div class="variant-box">
						{#if inc}
							<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
								<span><ChartNoAxesCombined class="inline-flex h-4 w-4 shrink-0" /> </span>
								{inc}
							</p>
						{:else}
							<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
								<span><CircleOff class="inline-flex h-4 w-4 shrink-0" /> </span> No income recorded
							</p>
						{/if}

						{#if obl}
							<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
								<Building2 class="inline-flex h-4 w-4 shrink-0" />
								{obl}
							</p>
						{/if}

						{#if m.summary?.cibilScore}
							<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
								CIBIL: {m.summary.cibilScore}
							</p>
						{/if}
					</div>

					<!-- Role compatibility warning -->
					{#if m.roleWarning}
						<div class="role-warning">
							<CircleAlert class="h-3.5 w-3.5 shrink-0" />
							<span class="alertText">{m.roleWarning}</span>
						</div>
					{/if}

					<!-- Historical-company-overlap soft warning (Pitfall #37) -->
					{#if historicalCompanyOverlapWarning(m)}
						<div class="role-warning historical-overlap-warning">
							<CircleAlert class="h-3.5 w-3.5 shrink-0" />
							<span class="alertText">{historicalCompanyOverlapWarning(m)}</span>
						</div>
					{/if}

					{#if displayMode === 'slides'}
						<!-- Prev / Next navigation -->
						<div class="slide-nav">
							<button
								type="button"
								class="nav-btn font-titleMedium buttonText"
								onclick={prevSlide}
								disabled={slideIndex === 0}
							>
								<ChevronLeft class="h-4 w-4" /> Prev
							</button>
							<span class="tinyText text-center text-[var(--form-text-muted)]"
								>Select the variant that matches this client</span
							>
							<button
								type="button"
								class="nav-btn font-titleMedium buttonText"
								onclick={nextSlide}
								disabled={slideIndex === matches.length - 1}
							>
								Next <ChevronRight class="h-4 w-4" />
							</button>
						</div>
					{/if}
				{:else}
					<!-- Different matches — radio list, grouped by People / Companies -->
					<p class="font-titleMedium descriptionText mb-2 text-[var(--form-text-label)]">
						Multiple matches found. Pick the right one:
					</p>
					<div class="match-list">
						{#each sortedMatches as m, idx}
							{@const lbl = getLabel(m)}
							{@const inc = formatIncome(m.summary)}
							{@const mIsCompany =
								(m.data as Record<string, unknown> | undefined)?.applicantType === 'Company'}
							{@const prevIsCompany =
								idx > 0 &&
								(sortedMatches[idx - 1].data as Record<string, unknown> | undefined)
									?.applicantType === 'Company'}
							{@const isFirstCrossLoan =
								m.isCrossLoan &&
								(idx === 0 || !sortedMatches[idx - 1].isCrossLoan || mIsCompany !== prevIsCompany)}
							<!-- Section headers when BOTH People and Companies are present.
								 First People header before idx 0 (when first entry is Individual);
								 Companies header at the type transition. Singles-type lists get
								 no headers (the radio context is already obvious). -->
							{#if showSectionHeaders && idx === 0 && !mIsCompany}
								<div
									class="section-header font-titleMedium alertText text-[var(--form-text-label)]"
								>
									People
								</div>
							{/if}
							{#if showSectionHeaders && mIsCompany && (idx === 0 || !prevIsCompany)}
								<div
									class="section-header font-titleMedium alertText text-[var(--form-text-label)]"
								>
									Companies
								</div>
							{/if}
							{#if isFirstCrossLoan}
								<div
									class="cross-loan-divider font-titleMedium alertText text-[var(--form-text-label)]"
								>
									<span>From other loans</span>
								</div>
							{/if}
							<button
								type="button"
								class="match-card {selectedIndex === idx ? 'selected' : ''} {m.isCrossLoan
									? 'cross-loan'
									: ''}"
								onclick={() => (selectedIndex = idx)}
							>
								<div class="match-inner">
									<div class="radio-circle {selectedIndex === idx ? 'active' : ''}">
										{#if selectedIndex === idx}
											<div class="radio-dot"></div>
										{/if}
									</div>
									<div class="match-info">
										<div class="match-name-row">
											{#if lbl.applicantType === 'Company'}
												<Building2 class="h-5 w-5 shrink-0" />
											{:else}
												<User class="h-5 w-5 shrink-0" />
											{/if}
											<span class="match-name">{lbl.name}</span>
											{#if m.matchSource === 'live' && m.isDirectorLinked}
												<span
													class="tinyText inline-flex shrink-0 items-center rounded-full bg-violet-100 px-1.5 py-0.5 whitespace-nowrap text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
												>
													Director
												</span>
											{:else if m.matchSource === 'live'}
												<span
													class="tinyText inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 whitespace-nowrap text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
												>
													Added
												</span>
											{/if}
										</div>
										<p class="alertText text-[var(--form-text-muted)]">{lbl.details}</p>
										<!-- Context badges for list items -->
										{#if getContextBadges(m).length > 0}
											<div class="context-badges">
												{#each getContextBadges(m) as badge}
													<span
														class="tinyText inline-flex shrink-0 items-center rounded-full px-1 {badge.bg} {badge.text} {badge.darkBg} {badge.darkText}"
													>
														{badge.label}
													</span>
												{/each}
											</div>
										{/if}
										{#if inc}
											<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
												<span><ChartNoAxesCombined class="inline-flex h-4 w-4 shrink-0" /> </span>
												{inc}
											</p>
										{/if}
										{#if m.summary?.cibilScore}
											<p class="text-labelText font-titleMedium !m-0 text-[var(--ddsa-primary-500)]">
												CIBIL: {m.summary.cibilScore}
											</p>
										{/if}
										{#if m.roleWarning}
											<div class="role-warning">
												<CircleAlert class="h-3.5 w-3.5 shrink-0" />
												<span class="alertText">{m.roleWarning}</span>
											</div>
										{/if}
										{#if historicalCompanyOverlapWarning(m)}
											<div class="role-warning historical-overlap-warning">
												<CircleAlert class="h-3.5 w-3.5 shrink-0" />
												<span class="alertText">{historicalCompanyOverlapWarning(m)}</span>
											</div>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}

				<p class="tinyText mt-2 text-[var(--form-text-muted)]">
					{#if isLiveMatch}
						<span><CircleAlert class="inline h-4 w-4 shrink-0" /> </span> This applicant is already in
						your form. Edit their details instead of adding a duplicate.
					{:else}
						<span><CircleAlert class="inline h-4 w-4 shrink-0" /> </span> All previously entered data
						(details, income, obligations) will be restored. Compatibility is checked when you proceed.
					{/if}
				</p>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button class="btn-deny buttonText text-[var(--form-text-muted)]" onclick={onCancel}
					>Not this person</button
				>
				<button
					class="btn-restore bg-ddsa-gradient-primary buttonText text-[var(--bg-header-text)]"
					onclick={handleConfirm}
				>
					{#if isLiveMatch}
						<Pencil class="h-4 w-4" />
						Edit Existing
					{:else}
						<RotateCcw class="h-4 w-4" />
						{displayMode === 'slides' ? 'Use this variant' : 'Restore'}
					{/if}
				</button>
			</div>
		</div>
	</div>
</dialog>

<style>
	.modal-dialog {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		border: none;
		padding: 0;
		margin: 0;
		background: transparent;
	}
	.modal-dialog::backdrop {
		background: rgba(0, 0, 0, 0.6);
	}
	.modal-overlay {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding: 1rem;
		animation: fadeIn 0.2s ease-out;
	}
	.modal-container {
		background: var(--color-bg-main);
		border-radius: 1rem;
		width: 100%;
		max-width: 26rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
	}
	.modal-header {
		/* background: linear-gradient(135deg, #374151 0%, #1f2937 100%); */
		color: var(--bg-header-text);
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.header-icon {
		background: var(--bg-header-icon-bg);
		padding: 0.625rem;
		border-radius: 50%;
		color: var(--bg-header-icon-color);
	}
	.header-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-lg);
		color: #fff;
		margin: 0;
	}
	.header-subtitle {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		color: #d1d5db;
		margin: 0;
	}
	.modal-content {
		padding: 1.25rem 1.5rem;
	}

	/* Identity row */
	.identity-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.identity-icon {
		background: var(--ddsa-primary-50);
		padding: 0.5rem;
		border-radius: 50%;
		color: var(--ddsa-primary-500);
	}
	.role-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.25);
		color: #92400e;
		font-family: var(--font-paragraph);
		font-size: var(--font-size-xs, 0.75rem);
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}
	.historical-overlap-warning {
		background: rgba(244, 114, 182, 0.08);
		border-color: rgba(244, 114, 182, 0.25);
		color: #9d174d;
	}
	:global(.dark) .historical-overlap-warning {
		background: rgba(244, 114, 182, 0.1);
		border-color: rgba(244, 114, 182, 0.2);
		color: #f9a8d4;
	}
	:global(.dark) .role-warning {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.2);
		color: #fbbf24;
	}
	.context-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.25rem;
	}
	.identity-name {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-base);
		color: var(--color-text-main);
		margin: 0;
	}
	.identity-details {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		color: var(--color-text-light);
		margin: 0.125rem 0 0 0;
	}

	/* Slide header */
	.slide-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.slide-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-xs, 0.75rem);
		color: var(--color-text-light);
	}
	.slide-dots {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		border: none;
		background: var(--color-border);
		cursor: pointer;
		padding: 0;
		transition: background 0.2s;
	}
	.dot.active {
		background: var(--ddsa-primary-500);
	}

	/* Variant box */
	.variant-box {
		background: var(--ddsa-primary-50);
		/* border: 1px solid var(--ddsa-accent-500); */
		border-radius: 0.625rem;
		padding: 0.75rem;
		margin-bottom: 0.75rem;
	}
	/* :global(.dark) .variant-box {
		background: rgba(55, 65, 81, 0.25);
		border-color: rgba(55, 65, 81, 0.4);
	} */
	.variant-row {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		margin: 0.25rem 0 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.variant-row:first-child {
		margin-top: 0;
	}
	.income-row {
		color: var(--color-text-main);
	}
	.obligation-row {
		color: var(--color-text-light);
	}
	.cibil-row {
		font-family: var(--font-title);
		font-weight: 500;
		color: var(--color-text-light);
	}
	.muted {
		color: var(--color-text-light);
		font-style: italic;
	}

	/* Slide nav */
	.slide-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		/* font-family: var(--font-titleMedium);
		font-size: var(--font-size-13);
		color: var(--form-text-secondary); */
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		transition: background 0.15s;
	}
	.nav-btn:hover:not(:disabled) {
		background: rgba(55, 65, 81, 0.08);
	}
	.nav-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.nav-hint {
		font-family: var(--font-paragraph);
		font-size: 0.65rem;
		color: var(--color-text-light);
		text-align: center;
		flex: 1;
	}

	/* List mode */
	.list-hint {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		color: var(--color-text-light);
		margin: 0 0 0.75rem 0;
	}
	.match-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 14rem;
		overflow-y: auto;
	}
	.match-card {
		width: 100%;
		text-align: left;
		padding: 0.75rem;
		border-radius: 0.625rem;
		border: 2px solid var(--form-border);
		background: var(--color-bg-main);
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.match-card.selected {
		border-color: var(--ddsa-primary-500);
		background: var(--ddsa-primary-100);
	}
	.match-card.cross-loan {
		border-color: var(--color-border);
		border-style: dashed;
		opacity: 0.9;
	}
	.cross-loan-divider {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.25rem 0;
	}
	.cross-loan-divider span {
		/* font-family: var(--font-paragraph);
		font-size: var(--font-size-11);
		font-weight: 600;
		color: var(--color-text-lighter); */
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}
	.cross-loan-divider::before,
	.cross-loan-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-border);
	}
	.section-header {
		/* font-family: var(--font-titleMedium);
		font-size: var(--font-size-12, 0.75rem);
		font-weight: 700; */
		text-transform: uppercase;
		/* letter-spacing: 0.08em; */
		/* color: var(--form-text-secondary); */
		margin: 0.25rem 0 0.125rem 0;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--form-border);
	}
	.section-header:not(:first-child) {
		margin-top: 0.625rem;
	}
	.match-inner {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
	}
	.radio-circle {
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 50%;
		border: 2px solid var(--color-grayThree);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}
	.radio-circle.active {
		border-color: var(--form-text-secondary);
	}
	.radio-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--form-text-secondary);
	}
	.match-info {
		flex: 1;
		min-width: 0;
	}
	.match-name-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.match-name {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-base);
		color: var(--color-text-main);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.match-details {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		color: var(--color-text-light);
		margin: 0.125rem 0 0 0;
	}
	.match-income {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-xs, 0.75rem);
		color: var(--color-text-light);
		margin: 0.125rem 0 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.match-cibil {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-xs, 0.75rem);
		color: var(--color-text-light);
		margin: 0.125rem 0 0 0;
	}

	/* Restore note */
	.restore-note {
		font-family: var(--font-paragraph);
		font-size: 0.7rem;
		color: var(--color-text-light);
		margin: 0.5rem 0 0 0;
	}

	/* Footer */
	.modal-footer {
		padding: 1rem 1.5rem;
		background: var(--ddsa-primary-50);
		display: flex;
		gap: 0.75rem;
	}
	.btn-deny {
		flex: 1;
		padding: 0.75rem 1rem;
		/* font-family: var(--font-titleMedium);
		font-size: var(--font-size-14); */
		border-radius: 0.75rem;
		border: 1px solid var(--ddsa-accent-300);
		background: var(--ddsa-primary-50);
		/* color: var(--color-text-main); */
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-deny:hover {
		background: var(--ddsa-primary-100);
		border-color: var(--ddsa-accent-500);
	}
	.btn-restore {
		flex: 1;
		padding: 0.75rem 1rem;
		/* font-family: var(--font-titleMedium);
		font-size: var(--font-size-14); */
		border-radius: 0.75rem;
		border: none;
		/* background: linear-gradient(135deg, #374151 0%, #1f2937 100%); */
		/* color: #fff; */
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}
	.btn-restore:hover {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
		opacity: 0.9;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
