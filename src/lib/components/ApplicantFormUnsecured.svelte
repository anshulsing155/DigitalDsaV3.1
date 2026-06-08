<script lang="ts">
	/**
	 * ApplicantFormUnsecured — Orchestrator for unsecured loan applicant steps
	 * ═══════════════════════════════════════════════════════════════════
	 * Replaces ApplicantFormSecured for Personal/Business/Professional loans.
	 * Steps: 0 = AddApplicant{Type}, 1 = Relationship, 2 = GPA, 3 = Income
	 *
	 * Directors/partners are now managed inline within AddApplicantBusiness
	 * and AddApplicantProfessional (no separate Step 0.5).
	 * ═══════════════════════════════════════════════════════════════════
	 */
	import NavigationButton from '$lib/components/NavigationButton.svelte';
	import ContradictionWarningModal from '$lib/components/ContradictionWarningModal.svelte';
	import { ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import { formState } from '$lib/state/form.svelte';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import { get } from 'svelte/store';
	import { untrack, onMount, tick } from 'svelte';
	import {
		userRelationships,
		removeRelationshipsBatch
	} from '$lib/components/relationship-capture/relationshipStore';
	import { findInvalidRelationshipIds } from '$lib/components/relationship-capture/relationshipValidator';
	import {
		detectCrossStepContradictions,
		executeContradictionCleanup,
		getRelationshipIdsToRemove,
		filterContradictionsForPage,
		runCrossFieldValidation
	} from '$lib/utils/crossStepValidator';
	import CrossFieldWarningBanner from '$lib/components/CrossFieldWarningBanner.svelte';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import type { Contradiction } from '$lib/utils/crossStepValidator';
	import type { IncomeProfileType } from '$lib/types/incomeProfile';
	import RelationShip from '$lib/components/RelationShip.svelte';
	import IncomePageNew from '$lib/components/IncomePageNew.svelte';
	import GPAOfNriApplicant from '$lib/components/GPAOfNriApplicant.svelte';
	import BusinessRunnerPage from '$lib/components/BusinessRunnerPage.svelte';
	import AddApplicantPersonal from '$lib/components/AddApplicantPersonal.svelte';
	import AddApplicantBusiness from '$lib/components/AddApplicantBusiness.svelte';
	import AddApplicantProfessional from '$lib/components/AddApplicantProfessional.svelte';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		loanCategory: 'personal' | 'business' | 'professional';
		hideNavigation?: boolean;
		isNextEnabled?: boolean;
		disabledReason?: string;
		/** When true, navigateNext() returns false to signal "exit to next schema page" instead of navigating to income sub-step */
		isSingleApplicant?: boolean;
	}

	let {
		loanCategory,
		hideNavigation = false,
		isNextEnabled = $bindable(false),
		disabledReason = $bindable(''),
		isSingleApplicant = false
	}: Props = $props();

	let step0Ref: AddApplicantPersonal | AddApplicantBusiness | AddApplicantProfessional | null =
		$state(null);
	let gpaNextEnabled = $state(false);

	// ── Cross-step contradiction warning ────────────────────────
	let showContradictionWarning = $state(false);
	let contradictionList: Contradiction[] = $state([]);
	let contradictionTarget: { view: string; pageIndex: number } | null = $state(null);
	/** Relationship IDs the user chose to keep despite soft contradictions */
	let overriddenRelationshipIds = $state(new Set<string>());

	// ── Fingerprint: skip contradiction check when nothing changed ──
	function buildContradictionFingerprint(): string {
		return (formState.applicants ?? [])
			.map(
				(a) =>
					`${a.id}|${a.applicantType}|${a.isNRI}|${a.gender}|${a.age}|${a.education}|${a.maritalStatus}|${a.onEMI}`
			)
			.join(';;');
	}
	// Deferred: capture AFTER initial $effects settle so any effect-driven
	// applicant mutations (e.g. relationship cleanup) don't cause a false
	// fingerprint mismatch on the very first Next click.
	let mountFingerprint = '';
	onMount(async () => {
		await tick();
		await Promise.resolve(); // drain microtask queue
		mountFingerprint = buildContradictionFingerprint();
	});

	// ── Derived: All individual applicants are NRI ────────────────
	const allIndividualsNRI = $derived(
		formState.applicants.some((a) => a.applicantType === 'Individual') &&
			formState.applicants
				.filter((a) => a.applicantType === 'Individual')
				.every((a: any) => a.isNRI === 'Yes')
	);

	// Determine the right view for slot 1 based on whether a business-runner
	// co-applicant exists. Sole-prop + runner → runnerPage; everything else →
	// relationShip. Mutually exclusive paths so they share the slot.
	function viewForSlotOne(): 'runnerPage' | 'relationShip' {
		const hasRunner = (formState.applicants as Array<Record<string, unknown>>).some(
			(a) => a.applicantSubType === 'business_runner'
		);
		return hasRunner ? 'runnerPage' : 'relationShip';
	}

	let currentView = $state(
		formState.applicantPageIndex == 0 || formState.applicantPageIndex == -1
			? 'addApplicant'
			: formState.applicantPageIndex == 1
				? viewForSlotOne()
				: formState.applicantPageIndex == 2
					? 'gpaPage'
					: 'incomePage'
	);

	// Sync currentView when applicantPageIndex changes externally
	$effect(() => {
		const step = formState.applicantPageIndex;
		if (step === 0 || step === -1) {
			currentView = 'addApplicant';
		} else if (step === 1) currentView = viewForSlotOne();
		else if (step === 2) currentView = 'gpaPage';
		else if (step === 3) currentView = 'incomePage';
	});

	// ── Applicant fingerprint for relationship cleanup ──────────
	const applicantFingerprint = $derived(
		(formState.applicants ?? [])
			.filter((a) => a.applicantType)
			.map((a) => `${a.id}|${a.applicantType}|${a.gender}|${a.age}|${a.age}|${a.maritalStatus}`)
			.join(';;')
	);

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		applicantFingerprint;
		const rels = get(userRelationships);
		if (rels.length === 0) return;
		const applicants = untrack(() => formState.applicants ?? []);
		const invalidIds = findInvalidRelationshipIds(applicants, rels);
		if (invalidIds.size > 0) {
			queueMicrotask(() => {
				removeRelationshipsBatch(invalidIds);
			});
		}
	});

	// ── Relay GPA completion to parent's isNextEnabled ──────────
	$effect(() => {
		if (currentView === 'gpaPage') {
			isNextEnabled = gpaNextEnabled;
		}
	});

	// ── Navigation Helpers ──────────────────────────────────────
	const hasMultipleIndividuals = $derived(
		formState.applicants.filter((val) => val.applicantType === 'Individual').length > 1
	);

	// True when an auto-added business-runner co-applicant exists. Sole-prop +
	// runner routes through the dedicated BusinessRunnerPage in slot 1 instead
	// of the multi-applicant Family Relationships page (the runner page
	// captures the relation directly — Family Relationships becomes irrelevant
	// for sole-prop cases regardless of husband/father/son/other).
	const hasBusinessRunner = $derived(
		(formState.applicants as Array<Record<string, unknown>>).some(
			(a) => a.applicantSubType === 'business_runner'
		)
	);

	function getNextTarget(): { view: string; pageIndex: number } {
		if (hasBusinessRunner) {
			return { view: 'runnerPage', pageIndex: 1 };
		}
		if (hasMultipleIndividuals) {
			return { view: 'relationShip', pageIndex: 1 };
		} else if (allIndividualsNRI) {
			return { view: 'gpaPage', pageIndex: 2 };
		} else {
			return { view: 'incomePage', pageIndex: 3 };
		}
	}

	function navigateToTarget(target: { view: string; pageIndex: number }) {
		formState.flushSave(); // Persist any pending form edits before step change
		applicantDataStore.flushPersist(); // Persist any pending applicant data before step change
		currentView = target.view;
		formState.applicantPageIndex = target.pageIndex;
	}

	function nextFromAddApplicant() {
		const isValid = step0Ref?.validateStep();
		if (!isValid) {
			setTimeout(() => scrollToFirstError(), 80);
			return;
		}

		// Skip contradiction check if applicant data hasn't changed since mount.
		// Page-scope: only contradictions owned by 'applicantPage' block Next here.
		// Issues that belong to later pages (obligations, income, credit) flow through
		// to those pages — blocking here would create catch-22s. See crossStepValidator
		// CONTRADICTION_PAGE_OWNERSHIP for the mapping.
		const currentFingerprint = buildContradictionFingerprint();
		if (mountFingerprint && currentFingerprint !== mountFingerprint) {
			const rels = get(userRelationships);
			const result = detectCrossStepContradictions(formState.applicants, rels);
			if (result.hasContradictions) {
				const ownedByThisPage = filterContradictionsForPage(
					result.contradictions,
					'applicantPage'
				);
				// Filter out relationship contradictions the user already chose to keep
				const filtered = ownedByThisPage.filter(
					(c) =>
						!(
							c.category === 'relationship_invalid' &&
							c.detail.relationshipId &&
							overriddenRelationshipIds.has(c.detail.relationshipId)
						)
				);
				if (filtered.length > 0) {
					contradictionTarget = getNextTarget();
					contradictionList = filtered;
					showContradictionWarning = true;
					return;
				}
			}
		}

		navigateToTarget(getNextTarget());
	}

	function handleContradictionProceed() {
		const contradictions = contradictionList;
		const rels = get(userRelationships);
		const cleanedApplicants = executeContradictionCleanup(formState.applicants, contradictions);
		formState.replaceApplicants(cleanedApplicants);
		for (const c of contradictions) {
			if (c.category === 'income_profile_incompatible' && c.detail.profileType) {
				const ap = cleanedApplicants[c.applicantIndex];
				if (ap?.id) {
					const remaining = (ap.selectedIncomeProfiles ?? []) as IncomeProfileType[];
					applicantDataStore.updateSelectedProfiles(ap.id, remaining);
				}
			}
		}
		const relIdsToRemove = getRelationshipIdsToRemove(contradictions, rels);
		if (relIdsToRemove.size > 0) removeRelationshipsBatch(relIdsToRemove);
		mountFingerprint = buildContradictionFingerprint();
		showContradictionWarning = false;
		contradictionList = [];
		if (contradictionTarget) {
			navigateToTarget(contradictionTarget);
			contradictionTarget = null;
		}
	}

	/** User chose "Keep & Continue" — keep soft contradictions, remove hard ones */
	function handleContradictionKeep(keptIds: Set<string>) {
		const contradictions = contradictionList;
		const rels = get(userRelationships);

		// Split: only process non-keepable contradictions for cleanup
		const hardContradictions = contradictions.filter((c) => !c.keepable);

		if (hardContradictions.length > 0) {
			const cleanedApplicants = executeContradictionCleanup(
				formState.applicants,
				hardContradictions
			);
			formState.replaceApplicants(cleanedApplicants);

			for (const c of hardContradictions) {
				if (c.category === 'income_profile_incompatible' && c.detail.profileType) {
					const ap = cleanedApplicants[c.applicantIndex];
					if (ap?.id) {
						const remaining = (ap.selectedIncomeProfiles ?? []) as IncomeProfileType[];
						applicantDataStore.updateSelectedProfiles(ap.id, remaining);
					}
				}
			}

			const relIdsToRemove = getRelationshipIdsToRemove(hardContradictions, rels);
			if (relIdsToRemove.size > 0) removeRelationshipsBatch(relIdsToRemove);
		}

		// Track kept relationships so they don't re-trigger
		for (const id of keptIds) {
			overriddenRelationshipIds.add(id);
		}
		for (const id of keptIds) {
			const rel = rels.find((r) => r.id === id);
			if (rel) {
				const reciprocal = rels.find(
					(r) => r.id !== rel.id && r.fromId === rel.toId && r.toId === rel.fromId
				);
				if (reciprocal) overriddenRelationshipIds.add(reciprocal.id);
			}
		}

		mountFingerprint = buildContradictionFingerprint();
		showContradictionWarning = false;
		contradictionList = [];
		if (contradictionTarget) {
			navigateToTarget(contradictionTarget);
			contradictionTarget = null;
		}
	}

	function handleContradictionGoBack() {
		showContradictionWarning = false;
		contradictionList = [];
		contradictionTarget = null;
	}

	// ── Relationship Navigation ─────────────────────────────────
	function handleRelationShipPrevious() {
		currentView = 'addApplicant';
		formState.applicantPageIndex = 0;
	}

	function handleRelationShipNext() {
		if (allIndividualsNRI) {
			currentView = 'gpaPage';
			formState.applicantPageIndex = 2;
		} else {
			currentView = 'incomePage';
			formState.applicantPageIndex = 3;
		}
	}

	// ── Runner-Page Navigation (sole-prop + business-runner only) ──
	function handleRunnerPagePrevious() {
		currentView = 'addApplicant';
		formState.applicantPageIndex = 0;
	}

	function handleRunnerPageNext() {
		// Sole-prop with a business runner is always domestic (NRI is locked
		// to 'No' for the proprietor), so the GPA step is never relevant —
		// skip straight to income.
		currentView = 'incomePage';
		formState.applicantPageIndex = 3;
	}

	// ── GPA Navigation ──────────────────────────────────────────
	function handleGpaPrevious() {
		if (hasBusinessRunner) {
			currentView = 'runnerPage';
			formState.applicantPageIndex = 1;
		} else if (hasMultipleIndividuals) {
			currentView = 'relationShip';
			formState.applicantPageIndex = 1;
		} else {
			currentView = 'addApplicant';
			formState.applicantPageIndex = 0;
		}
	}

	function handleGpaNext() {
		currentView = 'incomePage';
		formState.applicantPageIndex = 3;
	}

	// ── Income Navigation ───────────────────────────────────────
	function handleIncomePagePrevious() {
		if (allIndividualsNRI) {
			currentView = 'gpaPage';
			formState.applicantPageIndex = 2;
		} else if (hasBusinessRunner) {
			currentView = 'runnerPage';
			formState.applicantPageIndex = 1;
		} else if (hasMultipleIndividuals) {
			currentView = 'relationShip';
			formState.applicantPageIndex = 1;
		} else {
			currentView = 'addApplicant';
			formState.applicantPageIndex = 0;
		}
	}

	// ── Exported API (same contract as ApplicantFormSecured) ────
	/**
	 * Navigate to the next internal step.
	 * Returns `true` if handled internally (stay on applicant page),
	 * `false` if the component is done and the parent should advance
	 * to the next schema page (call goNext()).
	 */
	export function navigateNext(): boolean {
		// ── AddApplicant main view ──
		if (currentView === 'addApplicant') {
			const isValid = step0Ref?.validateStep();
			if (!isValid) {
				setTimeout(() => scrollToFirstError(), 80);
				return true; // blocked by validation
			}
			// Contradiction check — page-scoped to 'applicantPage' so issues that
			// belong to later pages don't block Next here.
			const currentFingerprint = buildContradictionFingerprint();
			if (mountFingerprint && currentFingerprint !== mountFingerprint) {
				const rels = get(userRelationships);
				const result = detectCrossStepContradictions(formState.applicants, rels);
				if (result.hasContradictions) {
					const ownedByThisPage = filterContradictionsForPage(
						result.contradictions,
						'applicantPage'
					);
					const filtered = ownedByThisPage.filter(
						(c) =>
							!(
								c.category === 'relationship_invalid' &&
								c.detail.relationshipId &&
								overriddenRelationshipIds.has(c.detail.relationshipId)
							)
					);
					if (filtered.length > 0) {
						contradictionTarget = getNextTarget();
						contradictionList = filtered;
						showContradictionWarning = true;
						return true; // showing modal
					}
				}
			}
			// Check next target
			if (isSingleApplicant) {
				const target = getNextTarget();
				if (target.view === 'incomePage') return false; // done — income on separate pages
				navigateToTarget(target);
				return true;
			}
			navigateToTarget(getNextTarget());
			return true;
		}

		// ── Relationship step ──
		if (currentView === 'relationShip') {
			if (!isNextEnabled) return true; // blocked — stay on relationship step
			handleRelationShipNext();
			// For single applicant, if we landed on incomePage, exit
			if (isSingleApplicant && formState.applicantPageIndex === 3) return false;
			return true;
		}

		// ── Business Runner step ──
		if (currentView === 'runnerPage') {
			if (!isNextEnabled) return true; // blocked — required runner fields incomplete
			handleRunnerPageNext();
			// Sole-prop is single-applicant from the form-shell's perspective even
			// though the runner gets added behind the scenes — exit to next schema page.
			if (isSingleApplicant && formState.applicantPageIndex === 3) return false;
			return true;
		}

		// ── GPA step ──
		if (currentView === 'gpaPage') {
			if (isSingleApplicant) return false; // GPA done — exit to next schema page
			handleGpaNext();
			return true;
		}

		// ── Income step (multi-applicant only) ──
		return false; // parent should call goNext()
	}

	export function navigatePrevious(): boolean {
		if (currentView === 'relationShip') {
			handleRelationShipPrevious();
			return true;
		}
		if (currentView === 'runnerPage') {
			handleRunnerPagePrevious();
			return true;
		}
		if (currentView === 'gpaPage') {
			handleGpaPrevious();
			return true;
		}
		if (currentView === 'incomePage') {
			handleIncomePagePrevious();
			return true;
		}
		return false; // Nothing to handle — page should navigate to previous wizard page
	}

	export function getIsNextEnabled() {
		return isNextEnabled;
	}

	export function validate(): boolean {
		if (currentView === 'addApplicant') {
			const isValid = step0Ref?.validateStep() ?? false;
			if (!isValid) setTimeout(() => scrollToFirstError(), 80);
			return isValid;
		}
		return true;
	}

	// Pass-through used by the unsecured-loan +page.svelte onConfirm
	// (via `handleRestoreModalConfirm` from `directorRestoreHandler.ts`).
	// AddApplicantBusiness and AddApplicantProfessional both implement
	// applyDirectorRestore — they are the unsecured loans with a Company-with-
	// directors path. Personal Loan has no Company step0, so its step0Ref
	// doesn't expose applyDirectorRestore; the optional-chain below makes this
	// a safe no-op there.
	export function applyDirectorRestore(
		companyId: string,
		directorIdx: number,
		restore: import('$lib/utils/directorRestoreHandler').DirectorRestorePayload
	): void {
		const ref = step0Ref as
			| {
					applyDirectorRestore?: (
						cid: string,
						idx: number,
						r: import('$lib/utils/directorRestoreHandler').DirectorRestorePayload
					) => void;
				}
			| null;
		ref?.applyDirectorRestore?.(companyId, directorIdx, restore);
	}

	// ── Cross-applicant advisories (NBFC single-applicant warning, etc.) ──
	// Surface warnings whose target is the applicant LIST as a whole
	// (applicantIndex === -1) on the Who's Applying step. They're advisory,
	// not blocking, so the user can still proceed — but they get visibility
	// into things like "many NBFCs prefer 2+ applicants for unsecured loans"
	// in the place where they can act on it (add a co-applicant). Reactive:
	// recomputes when the applicants array changes, so the warning appears
	// when count drops to 1 and disappears when a co-applicant is added.
	// Detected 2026-05-05.
	const crossApplicantAdvisories = $derived.by(() => {
		const applicants = formState.applicants as Record<string, any>[];
		if (!applicants || applicants.length === 0) return [];
		const result = runCrossFieldValidation(
			applicants,
			formState.applicationData as Record<string, any>
		);
		return result.warnings.filter((w) => w.applicantIndex === -1);
	});
</script>

<div>
	{#if currentView === 'addApplicant' && (formState.applicantPageIndex === 0 || formState.applicantPageIndex === -1)}
		{#if crossApplicantAdvisories.length > 0}
			<CrossFieldWarningBanner warnings={crossApplicantAdvisories} />
		{/if}
		{#if loanCategory === 'personal'}
			<AddApplicantPersonal bind:this={step0Ref} bind:isNextEnabled bind:disabledReason />
		{:else if loanCategory === 'business'}
			<AddApplicantBusiness bind:this={step0Ref} bind:isNextEnabled bind:disabledReason />
		{:else if loanCategory === 'professional'}
			<AddApplicantProfessional bind:this={step0Ref} bind:isNextEnabled bind:disabledReason />
		{/if}
	{:else if currentView === 'relationShip' && formState.applicantPageIndex === 1}
		<RelationShip bind:isNextEnabled />
	{:else if currentView === 'runnerPage' && formState.applicantPageIndex === 1}
		<BusinessRunnerPage bind:isNextEnabled />
	{:else if currentView === 'gpaPage' && formState.applicantPageIndex === 2}
		<GPAOfNriApplicant standalone bind:isNextEnabled={gpaNextEnabled} />
	{:else if currentView === 'incomePage' && formState.applicantPageIndex === 3}
		<IncomePageNew />
	{/if}
</div>

{#if !hideNavigation}
	<div class=" ">
		{#if currentView !== 'addApplicant'}
			<NavigationButton
				btnName="Previous"
				iconPosition="left"
				icon={ChevronLeft}
				onClick={() => {
					if (currentView === 'relationShip') handleRelationShipPrevious();
					else if (currentView === 'runnerPage') handleRunnerPagePrevious();
					else if (currentView === 'gpaPage') handleGpaPrevious();
					else if (currentView === 'incomePage') handleIncomePagePrevious();
				}}
				btnClass="absolute left-2 bottom-2 md:left-6 md:bottom-6 bg-grayOne hover:bg-grayOne/90 text-white "
			/>
		{/if}
		{#if currentView !== 'incomePage'}
			<NavigationButton
				btnName="Next"
				iconPosition="right"
				icon={ChevronRight}
				disabled={(currentView === 'relationShip' ||
					currentView === 'runnerPage' ||
					currentView === 'gpaPage') &&
					!isNextEnabled}
				btnClass="absolute right-2 bottom-2 md:right-6 md:bottom-6 gold-gradient text-white font-titleMedium buttonText"
				onClick={() => {
					if (currentView === 'addApplicant') nextFromAddApplicant();
					else if (currentView === 'relationShip') handleRelationShipNext();
					else if (currentView === 'runnerPage') handleRunnerPageNext();
					else if (currentView === 'gpaPage') handleGpaNext();
				}}
			/>
		{/if}
	</div>
{/if}

{#if showContradictionWarning}
	<ContradictionWarningModal
		bind:open={showContradictionWarning}
		contradictions={contradictionList}
		onProceed={handleContradictionProceed}
		onKeep={handleContradictionKeep}
		onGoBack={handleContradictionGoBack}
	/>
{/if}
