<script lang="ts">
	import AddApplicant from '$lib/components/AddApplicant.svelte';
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
		filterContradictionsForPage
	} from '$lib/utils/crossStepValidator';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import type { Contradiction } from '$lib/utils/crossStepValidator';
	import type { IncomeProfileType } from '$lib/types/incomeProfile';
	import RelationShip from '$lib/components/RelationShip.svelte';
	import IncomePageNew from '$lib/components/IncomePageNew.svelte';
	import GPAOfNriApplicant from '$lib/components/GPAOfNriApplicant.svelte';

	// ── Page Index Map ──────────────────────────────────────────────
	// 0 = AddApplicant (with inline directors), 1 = Relationship, 2 = GPA (NRI only), 3 = Profile & Financials (Income modal)

	interface Props {
		hideNavigation?: boolean;
		isNextEnabled?: boolean;
		disabledReason?: string;
		configJson?: { formLevelQuestions?: any[]; questions: any[] };
	}

	let {
		hideNavigation = false,
		isNextEnabled = $bindable(false),
		disabledReason = $bindable(''),
		configJson
	}: Props = $props();
	let addApplicantRef: AddApplicant | null = $state(null);
	let gpaNextEnabled = $state(false);

	// ── Cross-step contradiction warning ────────────────────────
	let showContradictionWarning = $state(false);
	let contradictionList: Contradiction[] = $state([]);
	/** Cached target view+index so we navigate correctly after "Proceed" */
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
	// Deferred: capture AFTER initial $effects settle
	let mountFingerprint = '';
	onMount(async () => {
		await tick();
		await Promise.resolve(); // drain microtask queue (onProperty/onEMI auto-set)
		mountFingerprint = buildContradictionFingerprint();
	});

	// ── Derived: All individual applicants are NRI ────────────────
	const allIndividualsNRI = $derived(
		formState.applicants.some((a) => a.applicantType === 'Individual') &&
			formState.applicants
				.filter((a) => a.applicantType === 'Individual')
				.every((a: any) => a.isNRI === 'Yes')
	);

	let currentView = $state(
		formState.applicantPageIndex == 0 || formState.applicantPageIndex == -1
			? 'addApplicant'
			: formState.applicantPageIndex == 1
				? 'relationShip'
				: formState.applicantPageIndex == 2
					? 'gpaPage'
					: 'incomePage'
	);

	// Sync currentView when applicantPageIndex changes externally (e.g. sidebar navigation)
	$effect(() => {
		const step = formState.applicantPageIndex;
		if (step === 0 || step === -1) {
			currentView = 'addApplicant';
		} else if (step === 1) {
			currentView = 'relationShip';
		} else if (step === 2) {
			currentView = 'gpaPage';
		} else if (step === 3) {
			currentView = 'incomePage';
		}
	});

	// ── Derived store length for deduplication ────────────────────────────
	const securedStoreLength = $derived(formState.applicants?.length ?? 0);

	// ── Auto-set onProperty/onEMI for single applicant on income page ──
	const hasRoleQuestions = $derived(
		configJson ? configJson.questions.some((q: any) => q.key === 'onProperty') : true
	);

	$effect(() => {
		if (!hasRoleQuestions) return; // Unsecured loans don't use onProperty/onEMI
		if (securedStoreLength === 1 && currentView === 'incomePage') {
			const applicant = formState.applicants[0];
			if (applicant?.onProperty !== true || applicant?.onEMI !== true) {
				queueMicrotask(() => {
					const updated = [...formState.applicants];
					updated[0] = { ...updated[0], onProperty: true, onEMI: true };
					formState.replaceApplicants(updated);
				});
			}
		}
	});

	// ── Fingerprint of Individual applicants' relationship-relevant props ──
	const applicantFingerprint = $derived(
		(formState.applicants ?? [])
			.filter((a) => a.applicantType)
			.map((a) => `${a.id}|${a.applicantType}|${a.gender}|${a.age}|${a.age}|${a.maritalStatus}`)
			.join(';;')
	);

	// ── Reactive relationship cleanup on applicant property changes ──
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		applicantFingerprint; // subscribe to fingerprint changes ONLY
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

	// ── Relay GPA completion to parent's isNextEnabled ──────────────
	$effect(() => {
		if (currentView === 'gpaPage') {
			isNextEnabled = gpaNextEnabled;
		}
	});

	// ── Navigation Helpers ──────────────────────────────────────────
	const hasMultipleIndividuals = $derived(
		formState.applicants.filter((val) => val.applicantType === 'Individual').length > 1
	);

	/** Compute where the next view should be from AddApplicant */
	function getNextTarget(): { view: string; pageIndex: number } {
		if (hasMultipleIndividuals) {
			return { view: 'relationShip', pageIndex: 1 };
		} else if (allIndividualsNRI) {
			return { view: 'gpaPage', pageIndex: 2 };
		} else {
			return { view: 'incomePage', pageIndex: 3 };
		}
	}

	/** Navigate to the computed target */
	function navigateToTarget(target: { view: string; pageIndex: number }) {
		formState.flushSave(); // Persist any pending form edits before step change
		applicantDataStore.flushPersist(); // Persist any pending applicant data before step change
		currentView = target.view;
		formState.applicantPageIndex = target.pageIndex;
	}

	function nextFromAddApplicant() {
		const isValid = addApplicantRef?.validateStep();

		if (!isValid) {
			// Let Svelte render the error banner, then scroll to it
			setTimeout(() => scrollToFirstError(), 80);
			return;
		}

		// Cross-step contradiction check — skip if applicant data hasn't changed.
		// We only block Next on contradictions whose pageOwnership === 'applicantPage'.
		// Issues that belong to later pages (obligations, income, credit) flow through
		// to those pages — blocking here would create catch-22s (e.g. user marks
		// isGuarantor=Yes on this page but can't add the Guarantor obligation entry
		// without first reaching the Obligations page). Detected 2026-05-02.
		const currentFingerprint = buildContradictionFingerprint();
		if (mountFingerprint && currentFingerprint !== mountFingerprint) {
			const rels = get(userRelationships);
			const result = detectCrossStepContradictions(formState.applicants, rels);

			if (result.hasContradictions) {
				// Page-scope: only contradictions owned by this page block Next here.
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

		// No contradictions → navigate immediately
		navigateToTarget(getNextTarget());
	}

	/** User chose "Proceed & Remove" — execute cleanup then navigate */
	function handleContradictionProceed() {
		const contradictions = contradictionList;
		const rels = get(userRelationships);

		// 1. Clean applicant data (profiles, entries, completion flags)
		const cleanedApplicants = executeContradictionCleanup(formState.applicants, contradictions);
		formState.replaceApplicants(cleanedApplicants);

		// 2. Sync applicantDataStore for each affected applicant
		for (const c of contradictions) {
			if (c.category === 'income_profile_incompatible' && c.detail.profileType) {
				const ap = cleanedApplicants[c.applicantIndex];
				if (ap?.id) {
					const remaining = (ap.selectedIncomeProfiles ?? []) as IncomeProfileType[];
					applicantDataStore.updateSelectedProfiles(ap.id, remaining);
				}
			}
		}

		// 3. Remove invalid relationships
		const relIdsToRemove = getRelationshipIdsToRemove(contradictions, rels);
		if (relIdsToRemove.size > 0) {
			removeRelationshipsBatch(relIdsToRemove);
		}

		// 4. Update fingerprint so re-visiting Step 0 won't re-trigger the same warning
		mountFingerprint = buildContradictionFingerprint();

		// 5. Close modal and navigate
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

		// 1. Clean applicant data for hard contradictions only
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

			// Remove only hard relationship contradictions
			const relIdsToRemove = getRelationshipIdsToRemove(hardContradictions, rels);
			if (relIdsToRemove.size > 0) {
				removeRelationshipsBatch(relIdsToRemove);
			}
		}

		// 2. Track kept relationships so they don't re-trigger
		for (const id of keptIds) {
			overriddenRelationshipIds.add(id);
		}
		// Also track reciprocals of kept relationships
		for (const id of keptIds) {
			const rel = rels.find((r) => r.id === id);
			if (rel) {
				const reciprocal = rels.find(
					(r) => r.id !== rel.id && r.fromId === rel.toId && r.toId === rel.fromId
				);
				if (reciprocal) overriddenRelationshipIds.add(reciprocal.id);
			}
		}

		// 3. Update fingerprint and navigate
		mountFingerprint = buildContradictionFingerprint();
		showContradictionWarning = false;
		contradictionList = [];
		if (contradictionTarget) {
			navigateToTarget(contradictionTarget);
			contradictionTarget = null;
		}
	}

	/** User chose "Go Back" — close modal, stay on Step 0 */
	function handleContradictionGoBack() {
		showContradictionWarning = false;
		contradictionList = [];
		contradictionTarget = null;
	}

	// ── Relationship Navigation ─────────────────────────────────────
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

	// ── GPA Navigation ──────────────────────────────────────────────
	function handleGpaPrevious() {
		if (hasMultipleIndividuals) {
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

	// ── Income Navigation ───────────────────────────────────────────
	function handleIncomePagePrevious() {
		if (allIndividualsNRI) {
			currentView = 'gpaPage';
			formState.applicantPageIndex = 2;
		} else if (hasMultipleIndividuals) {
			currentView = 'relationShip';
			formState.applicantPageIndex = 1;
		} else {
			currentView = 'addApplicant';
			formState.applicantPageIndex = 0;
		}
	}

	// Expose navigation methods for parent components
	export function navigateNext() {
		if (currentView === 'addApplicant') {
			nextFromAddApplicant();
		} else if (currentView === 'relationShip') {
			if (!isNextEnabled) return; // blocked — relationships incomplete
			handleRelationShipNext();
		} else if (currentView === 'gpaPage') {
			handleGpaNext();
		}
	}

	export function navigatePrevious(): boolean {
		if (currentView === 'relationShip') {
			handleRelationShipPrevious();
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

	/** Validate current step without changing navigation. Returns true if valid. */
	export function validate(): boolean {
		if (currentView === 'addApplicant') {
			const isValid = addApplicantRef?.validateStep() ?? false;
			if (!isValid) {
				setTimeout(() => scrollToFirstError(), 80);
			}
			return isValid;
		}
		return true;
	}

	/** Apply restored data from RestoreApplicantModal to a director form */
	export function applyDirectorRestore(
		companyId: string,
		dirIdx: number,
		restore: {
			data: Record<string, string>;
			lockedFields: string[];
			matchedId: string;
			source: string;
			structured?: Record<string, unknown>;
		}
	) {
		addApplicantRef?.applyDirectorRestore(companyId, dirIdx, restore);
	}
</script>

<div>
	{#if currentView === 'addApplicant' && (formState.applicantPageIndex === 0 || formState.applicantPageIndex === -1)}
		<AddApplicant
			bind:this={addApplicantRef}
			bind:isNextEnabled
			bind:disabledReason
			title="Add Applicants"
			{configJson}
		/>
	{:else if currentView === 'relationShip' && formState.applicantPageIndex === 1}
		<RelationShip bind:isNextEnabled />
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
					if (currentView === 'relationShip') {
						handleRelationShipPrevious();
					} else if (currentView === 'gpaPage') {
						handleGpaPrevious();
					} else if (currentView === 'incomePage') {
						handleIncomePagePrevious();
					}
				}}
				btnClass="absolute left-2 bottom-2 md:left-6 md:bottom-6 bg-grayOne hover:bg-grayOne/90 text-white "
			/>
		{/if}
		{#if currentView !== 'incomePage'}
			<NavigationButton
				btnName="Next"
				iconPosition="right"
				icon={ChevronRight}
				disabled={(currentView === 'relationShip' || currentView === 'gpaPage') && !isNextEnabled}
				btnClass="absolute right-2 bottom-2 md:right-6 md:bottom-6 gold-gradient text-white font-titleMedium buttonText"
				onClick={() => {
					if (currentView === 'addApplicant') {
						nextFromAddApplicant();
					} else if (currentView === 'relationShip') {
						handleRelationShipNext();
					} else if (currentView === 'gpaPage') {
						handleGpaNext();
					}
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
