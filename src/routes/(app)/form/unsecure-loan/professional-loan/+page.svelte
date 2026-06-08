<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { assertLoanRoute } from '$lib/utils/loanRouteGuard.svelte';
	import { isReloadOfCurrentPath } from '$lib/utils/isReloadOfCurrentPath';
	import { computePageIndexOnRemount } from '$lib/utils/loanPageIndexRestore';
	import { page } from '$app/stores';
	import { secureFetch } from '$lib/utils/csrf';
	import { formState } from '$lib/state/form.svelte';
	import SessionResumeModal from '$lib/components/SessionResumeModal.svelte';
	import FormLoadingOverlay from '$lib/components/form-wizard/FormLoadingOverlay.svelte';
	import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { clearFormAndGotoPicker } from '$lib/utils/clearFormAndGotoPicker';
	import gstStateCodes from '$lib/config/gstStateCodes.json';
	import { writable } from 'svelte/store';
	import type { Answers, LoanDataStore } from '$lib/types/formTypes';
	import type { PageResponse, ClientQuestion } from '$lib/types/formEngine';
	import type { PageData } from './$types';
	import TextField from '$lib/components/TextField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import CheckboxField from '$lib/components/CheckboxField.svelte';
	import MultipleSelectField from '$lib/components/MultipleSelectField.svelte';

	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { deviceState } from '$lib/stores/device.svelte';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { inputErrorsState } from '$lib/stores/inputErrors.svelte';
	import {
		buildEvaluationAnswers,
		getServerError as getServerErrorShared,
		clearStaleValidationErrors,
		getClientWarning,
		buildErrorSummary,
		deriveVisiblePages,
		deriveCurrentPage,
		deriveVisibleQuestions,
		deriveQuestionGroups,
		generateTenureOptions,
		collectPayload,
		getFilteredOptions,
		clearStaleOptionValues,
		fetchDependentCityOptions as fetchDependentCityShared,
		hasInputErrors as hasInputErrorsShared,
		getPincodeContext as getPincodeContextShared,
		isFieldAnswered,
		isQuestionAnswered
	} from '$lib/utils/formWizardEngine';
	import { professionalLoanConfig } from '$lib/config/wizardConfigs/professionalLoan';
	// Applicant form (unified system)
	import ApplicantFormUnsecured from '$lib/components/ApplicantFormUnsecured.svelte';
	// Flattened income components (single-applicant path)
	import IncomeProfileSelector from '$lib/components/IncomeProfileSelector.svelte';
	import IncomeSourceForm from '$lib/components/IncomeSourceForm.svelte';
	import IncomeSourceEntries from '$lib/components/IncomeSourceEntries.svelte';
	import CreditScoreSection from '$lib/components/CreditScoreSection.svelte';
	import ObligationCapture from '$lib/components/ObligationCapture.svelte';
	import CompanyFinancials from '$lib/components/CompanyFinancials.svelte';
	import ApplicantProfilePage from '$lib/components/ApplicantProfilePage.svelte';
	import {
		handleProfileSelectionChange,
		handleAddEntry,
		handleUpdateEntry,
		handleDeleteEntry,
		handleCreditScoreChange,
		handleObligationUpdate
	} from '$lib/utils/unsecuredApplicantHandlers';
	import {
		computeSectionCompletion,
		areAllTabsComplete,
		areAllCompanyTabsComplete,
		getObligationsDisabledReason,
		getCaseLevelDisabledReason
	} from '$lib/utils/incomeTabState';
	import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';

	import { securedClone } from '$lib/utils/securedClone';
	import { buildCombinedAnswersUnsecured, stableReference } from '$lib/utils/combinedAnswersMemo';
	import { validateCompanyOwnershipTotals } from '$lib/utils/sameCompanySync';
	import { getCleanPayload, getCasePayload } from '$lib/stores/cleanPayloadStore.svelte';
	import { confirmAndSubmit } from '$lib/utils/confirmAndSubmit';
	import { reconcileBeforeSubmit } from '$lib/utils/preSubmitReconciler';
	import { setupUnsavedGuard } from '$lib/utils/formUnsavedGuard';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { BehaviorTelemetry } from '$lib/utils/behaviorTelemetry';
	import {
		FormShell,
		FormStepContainer,
		FormNavigationBar,
		createWizardState,
		CityLoadingOverlay
	} from '$lib/components/form-wizard';
	import SaveIndicator from '$lib/components/form-wizard/SaveIndicator.svelte';
	import {
		professionalLoanSections,
		professionalLoanDCSections
	} from '$lib/config/wizardSections/professionalLoan';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import { createFormAutoScroll } from '$lib/utils/formAutoScroll';
	import RestoreApplicantModal from '$lib/components/RestoreApplicantModal.svelte';
	import HoneypotField from '$lib/components/form/HoneypotField.svelte';
	import { dev } from '$app/environment';
	import clientLogger from '$lib/utils/clientLogger';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import { applicantState, type RecoveryScope } from '$lib/state/applicant.svelte';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import { restoreRelationshipsForApplicant } from '$lib/utils/restoreRelationships';
	import {
		prefillApplicantRestore,
		commitApplicantRestore,
		cancelApplicantRestore,
		type PendingRestore
	} from '$lib/utils/applicantRestoreHandler';
	import { handleRestoreModalConfirm } from '$lib/utils/directorRestoreHandler';
	import PendingRestoreBanner from '$lib/components/PendingRestoreBanner.svelte';
	import { v4 as uuidv4 } from 'uuid';
	import PincodeTypeahead from '$lib/components/PincodeTypeahead.svelte';
	import LocationGroup from '$lib/components/LocationGroup.svelte';

	const telemetry = new BehaviorTelemetry();

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const obligationKeysName = writable({
		existingLoanType: '',
		bankName: '',
		selectedToClose: '',
		EMIs: '',
		limit: '',
		tenure: '',
		sanctionedTenure: '',
		interestRate: '',
		remainingTenure: '',
		utilizedAmount: '',
		sanctionedLimit: '',
		remainingLimit: '',
		obligations: []
	});

	let selectedLoan = $state('');
	let currentPageIndex = $state(0);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let submitValidationErrors = $state<Array<{ label: string; pageIndex: number }>>([]);
	let gstStateError = $state('');
	let payloads = $state<Record<string, unknown[]>>({});
	let direction = $state<1 | -1>(1);
	let formSessionId = $state<string | undefined>(undefined);

	// Applicant form state (unified system)
	let applicantFormRef: ApplicantFormUnsecured | null = $state(null);
	let applicantNextEnabled = $state(false);
	let applicantDisabledReason = $state('');
	let isSingleApplicant = $derived(formState.applicants.length <= 1);
	// Seed with initial value; updated inside the $effect below as a change-detector.
	// svelte-ignore state_referenced_locally
	let prevSingleApplicant = $state(isSingleApplicant);
	$effect(() => {
		const current = isSingleApplicant;
		if (current !== prevSingleApplicant) {
			prevSingleApplicant = current;
			evaluating = true;
			evaluateOnServer(untrack(() => currentPageIndex));
		}
	});

	// 2-phase restore state
	let pendingRestore: PendingRestore | null = $state(null);

	function confirmAndTrackUndo() {
		if (!pendingRestore) return;
		commitApplicantRestore(pendingRestore);
		pendingRestore = null;
	}

	let checkEveryApplicantNRI = $derived(
		formState.applicants?.length > 0
			? formState.applicants.every((item) => (item as any)?.isNRI === 'Yes')
			: false
	);

	// User-facing reason explaining why the Existing Loans (obligations) page's
	// Next button is disabled — surfaced via FormNavigationBar.disabledReason.
	// See business-loan +page.svelte for the canonical comment (Issue #8).
	let obligationsDisabledReason = $derived.by(() => {
		if (currentPage?.id !== 'obligationsPage' || !isSingleApplicant) return '';
		const applicant = (formState.applicants[0] ?? {}) as Record<string, unknown>;
		const loanScope = combinedAnswers.loanType?.toString() ?? '';
		const caseHasDcClosure = (formState.applicants as Record<string, unknown>[]).some((a) => {
			const obs = (a?.obligations ?? []) as Array<Record<string, unknown>>;
			return obs.some((o) => o.selectedToClose === 'Will be closed by Top-up amount');
		});
		return getObligationsDisabledReason(applicant, { loanScope, caseHasDcClosure });
	});

	// Pitfall #53: case-level reason for multi-applicant DC routes (see BL +page.svelte for rationale).
	let caseLevelDisabledReason = $derived.by(() => {
		const loanScope = combinedAnswers.loanType?.toString() ?? '';
		return getCaseLevelDisabledReason(
			formState.applicants as Array<Record<string, unknown>>,
			{
				loanScope,
				onApplicantListPage: currentPage?.id === 'applicantPage' && !isSingleApplicant
			}
		);
	});

	// Aggregate per-Company ownership invariant — see plot-loan/+page.svelte
	// for the rationale. Helper short-circuits when no Company applicants
	// exist, so this is inert on individual-only flows.
	let companyOwnershipViolations = $derived(
		validateCompanyOwnershipTotals(
			formState.applicants as Array<Record<string, unknown>>
		)
	);

	let ownershipDisabledReason = $derived.by(() => {
		if (companyOwnershipViolations.length === 0) return '';
		const first = companyOwnershipViolations[0];
		if (companyOwnershipViolations.length === 1) return first.message;
		const extra = companyOwnershipViolations.length - 1;
		return `${first.message} (+${extra} more company total${extra === 1 ? '' : 's'} over 100%)`;
	});

	let incomeValueCheck = $derived.by(() => {
		if (!formState.applicants?.length) return false;
		const loanScope = combinedAnswers.loanType?.toString() ?? '';
		// DC case-level closure flag — true if ANY applicant has a "Close by
		// this new loan" entry. Lets a debt-free co-applicant clear the
		// obligations tab in joint DC cases without inventing fake debt.
		const caseHasDcClosure = (formState.applicants as any[]).some((a) => {
			const obs = (a?.obligations ?? []) as Array<Record<string, unknown>>;
			return obs.some((o) => o.selectedToClose === 'Will be closed by Top-up amount');
		});
		// Compute completion directly — don't rely on __completion flags
		// which may be stale due to untracked batch effects.
		let check = formState.applicants.every((item: any) => {
			if (item?.applicantType === 'Company') {
				return areAllCompanyTabsComplete(item);
			}
			// Resolve classification: stored value OR derive for Professional Loan directors
			let classification = item?.applicantClassification as string | undefined;
			if (!classification && item?.linkedCompanyId) {
				// Professional Loan directors linked to a company are always non-financial
				classification = 'co_applicant_non_financial';
			}
			const completion = computeSectionCompletion(item, {
				requireResidencePattern: false,
				applicantClassification: classification,
				loanScope,
				caseHasDcClosure
			});
			return areAllTabsComplete(item, completion);
		});
		if (checkEveryApplicantNRI) {
			check = check && formState.applicationData?.gpaValidate;
		}
		if (check && companyOwnershipViolations.length > 0) {
			check = false;
		}
		return check;
	});

	// State for flattened income wizard pages (single-applicant path)
	let editingEntry = $state<IncomeSourceEntry | null>(null);
	let profileSelectionError = $state<string | null>(null);
	let companyFinancialsComplete = $state(false);

	// Derived state for income components
	let currentApplicant = $derived(formState.applicants[0] ?? {});
	let selectedProfiles = $derived<IncomeProfileType[]>(
		(currentApplicant?.selectedIncomeProfiles as IncomeProfileType[]) ?? []
	);
	let incomeEntries = $derived<IncomeSourceEntry[]>(
		(currentApplicant?.incomeEntries as IncomeSourceEntry[]) ?? []
	);
	let answersContext = $derived({
		...currentApplicant,
		...formState.applicationData,
		isNRI: currentApplicant?.isNRI ?? 'No'
	});

	// Bridge: sync primary applicant's professional detail fields to loan-level answers
	// professionalCategory is now a loan-level schema question — NOT synced from applicant
	// These 5 detail fields are still per-applicant and need bridging for getDynamicGuidance
	const PROFESSIONAL_BRIDGE_KEYS = [
		'professionalQualification',
		'registrationCouncilType',
		'practiceVintage',
		'practiceType',
		'registrationStatus'
	] as const;

	$effect(() => {
		const primary = formState.applicants[0];
		if (!primary) return;
		for (const key of PROFESSIONAL_BRIDGE_KEYS) {
			const val = (primary as Record<string, unknown>)[key];
			if (
				val !== undefined &&
				(formState.applicationData as Record<string, unknown>)[key] !== val
			) {
				(formState.applicationData as Record<string, unknown>)[key] = val;
			}
		}
	});
	// Session resume state
	let showResumeModal = $state(false);
	let resumeIndexPending = $state<number | null>(null);
	let resumeHandled = $state(false);
	const initialSavedPageIndex = formState.professionalLoanPageIndex;
	let formReady = $state(false);

	// Guards for preventing infinite loops in effects
	let lastAnswersHash = '';
	let lastPageIndex = -1;
	let lastBackHistoryState = '';

	// svelte-ignore state_referenced_locally — intentional: capture SSR initial page once, overwritten by evaluateOnServer
	let serverPage = $state<PageResponse | null>(data.formEngine?.initialPage ?? null);
	let evaluating = $state(false);
	let showCityLoadingModal = $state(false);
	let evaluateTimer: ReturnType<typeof setTimeout> | null = null;

	// ── Server evaluation functions ──────────────────────────────
	async function evaluateOnServer(pageIndex: number) {
		// Build evaluation answers using shared utility -- includes applicant metadata,
		// income profiles, obligations, and loan-type-specific extra fields
		const answers = buildEvaluationAnswers(selectedLoan, (raw) => ({
			facilityType: raw.facilityType ?? ''
		}));

		try {
			evaluating = true;
			const payload = {
				loanType: 'Professional Loan',
				pageIndex,
				answers,
				behaviorSignals: telemetry.getSignals()
			};
			if (dev) {
				// eslint-disable-next-line no-console
				console.log(
					`[FormEngine] Evaluate payload (page ${pageIndex}):`,
					JSON.stringify(payload, null, 2)
				);
			}
			const res = await secureFetch('/api/form/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (res.ok) {
				const result = await res.json();
				if (result.success && result.data) {
					serverPage = result.data as PageResponse;
					if (result.sessionId) formSessionId = result.sessionId;
				}
			}
		} catch (err) {
			clientLogger.debug({ err }, '[FormEngine] Client evaluate error');
			submitError = 'Unable to load form data. Please check your connection and try again.';
		} finally {
			evaluating = false;
		}
	}

	// See home-loan +page.svelte for the rationale on the 1500ms window.
	function debouncedEvaluate(pageIndex: number) {
		if (evaluateTimer) clearTimeout(evaluateTimer);
		evaluateTimer = setTimeout(() => evaluateOnServer(pageIndex), 1500);
	}

	function getServerError(questionId: string): string | undefined {
		return getServerErrorShared(serverPage, questionId);
	}

	/** Client-side warning evaluation — instant reactivity from schema conditions. */
	function getWarning(question: ClientQuestion): string | null {
		return getClientWarning(question, combinedAnswers as Record<string, unknown>);
	}

	let errorSummary = $derived.by(() =>
		buildErrorSummary(serverPage, visibleQuestions, currentAnswers)
	);

	$effect(() => {
		if (!resumeHandled) return;
		if (currentPageIndex !== lastPageIndex) {
			lastPageIndex = currentPageIndex;
			formState.professionalLoanPageIndex = currentPageIndex;
		}
	});

	// ── Server-driven derived state ──────────────────────────────
	let visiblePages = $derived(deriveVisiblePages(serverPage));

	let currentPage = $derived(deriveCurrentPage(serverPage));

	let visibleQuestions = $derived(
		deriveVisibleQuestions(serverPage, selectedLoan, formSessionId ?? '')
	);

	let questionGroups = $derived(deriveQuestionGroups(visibleQuestions));

	// Custom pages for single-applicant flattened flow
	const CUSTOM_INCOME_PAGES = new Set([
		'incomeProfilesPage',
		'incomeDetailsPage',
		'companyFinancialsPage',
		'creditScorePage',
		'obligationsPage'
	]);

	// Applicant profile page completion state
	let applicantProfileComplete = $state(false);

	let isNextEnabled = $derived.by(() => {
		// applicantPage: ApplicantFormUnsecured controls via binding
		if (currentPage?.id === 'applicantPage') {
			if (isSingleApplicant) return applicantNextEnabled;
			return formState.applicantPageIndex === 3 ? incomeValueCheck : applicantNextEnabled;
		}

		// Applicant profile page
		if (currentPage?.id === 'applicantProfilePage') {
			return applicantProfileComplete;
		}

		// Company financials page — uses its own completion via onComplete callback
		if (currentPage?.id === 'companyFinancialsPage' && isSingleApplicant) {
			return companyFinancialsComplete;
		}

		// Flattened income wizard pages (single-applicant path)
		if (currentPage?.id && CUSTOM_INCOME_PAGES.has(currentPage.id) && isSingleApplicant) {
			const completion = computeSectionCompletion(formState.applicants[0], {
				requireResidencePattern: false,
				loanScope: combinedAnswers.loanType?.toString() ?? ''
			});
			const keyMap: Record<string, string> = {
				incomeProfilesPage: 'income_profiles',
				incomeDetailsPage: 'income_details',
				creditScorePage: 'credit_score',
				obligationsPage: 'obligations_details'
			};
			return (completion as Record<string, boolean>)[keyMap[currentPage.id]] ?? false;
		}

		// Client-side pageComplete: all required visible questions answered.
		// isQuestionAnswered handles compound location questions (state+city)
		// where the bindsTo key is never directly written.
		const requiredVisible = visibleQuestions.filter((q) => q.required);
		let enabled =
			visibleQuestions.length > 0 &&
			requiredVisible.every((q) => isQuestionAnswered(q, currentAnswers));
		if (enabled && hasInputErrors()) {
			enabled = false;
		}
		// Block when server-side validation rules (validation.condition) report errors
		// on the current page's visible questions. See home-loan +page.svelte for context.
		if (enabled && (serverPage?.validationErrors?.length ?? 0) > 0) {
			enabled = false;
		}
		if (enabled && pincodeError) {
			enabled = false;
		}
		return enabled;
	});

	// Server-driven pages with 5+ visible questions: keep Next enabled, validate on click
	let answeredCount = $derived(
		visibleQuestions.filter((q) => isQuestionAnswered(q, currentAnswers)).length
	);

	let useValidateOnClick = $derived(
		!currentPage?.id?.startsWith('applicant') &&
			currentPage?.id !== 'incomeDetailsPage' &&
			visibleQuestions.length >= 5 &&
			answeredCount >= 5
	);
	let showValidationHint = $state(false);

	// Once the page was fully answered, clearing a field should re-disable Next
	let wasPageComplete = $state(false);
	$effect(() => {
		if (isNextEnabled) wasPageComplete = true;
	});
	$effect(() => {
		currentPage?.id;
		wasPageComplete = false;
	});

	// Clear validation hint reactively when all questions are answered
	$effect(() => {
		if (isNextEnabled && showValidationHint) {
			showValidationHint = false;
		}
	});

	let pincodeError = $state('');

	/** Scoped to current page's visible questions only. */
	function hasInputErrors(): boolean {
		return hasInputErrorsShared(visibleQuestions, inputErrorsState);
	}

	let currentAnswers = $derived(
		((formState.loanData as LoanDataStore)[selectedLoan] ?? {}) as Answers
	);

	// Memoized combinedAnswers (CP-5): returns the SAME object reference when
	// shallow values haven't changed, preventing unnecessary downstream re-renders.
	let previousCombined: Answers = {} as Answers;
	let combinedAnswers = $derived.by(() => {
		const next = buildCombinedAnswersUnsecured(
			currentAnswers,
			selectedLoan,
			formState.applicants,
			isSingleApplicant,
			false /* no NRI bridge for Professional Loan */
		);
		return stableReference(next, previousCombined, (ref) => {
			previousCombined = ref;
		});
	});

	// ── Option-level stale value clearing ──────────────────────────
	// Auto-clear radio/select/multi-select values when option-level showWhen hides the selected option
	let lastClearedKeys = new Set<string>();
	$effect(() => {
		lastClearedKeys = clearStaleOptionValues(
			visibleQuestions,
			combinedAnswers as Record<string, unknown>,
			currentAnswers as Record<string, unknown>,
			lastClearedKeys,
			(k, v) => updateAnswerByKey(k, v as any)
		);
	});

	const wizard = createWizardState({
		sectionConfig: professionalLoanSections,
		getSectionConfig: () => {
			const lt = currentAnswers.loanType as string;
			const isDC = lt === 'Debt Consolidation' || lt === 'Debt Consolidation with Extra Funds';
			return isDC ? professionalLoanDCSections : professionalLoanSections;
		},
		getVisiblePages: () => visiblePages,
		getAnswers: () => currentAnswers,
		getCombinedAnswers: () => combinedAnswers,
		isQuestionVisible: () => true,
		resolveBindsTo: (q: any) => q.bindsTo || q.id,
		selectedLoan: () => selectedLoan,
		getApplicantsStore: () => formState.applicants as unknown as Array<Record<string, unknown>>,
		getRelationships: () => $userRelationships,
		getApplicantStep: () => formState.applicantPageIndex,
		getRelationshipCount: () => $userRelationships.length,
		getApplicantCount: () => formState.applicants.length,
		getCurrentPageId: () => currentPage?.id,
		getIsNextEnabled: () => {
			if (currentPage?.id === 'applicantPage') {
				return formState.applicantPageIndex === 3 ? incomeValueCheck : applicantNextEnabled;
			}
			return isNextEnabled;
		},
		// See personal-loan/+page.svelte for the full reasoning. Same pattern
		// applied here so NRI applicants can complete the GPA gate.
		getGpaValidate: () => !!formState.applicationData?.gpaValidate
	});

	function handleWizardNavigate(pageIndex: number) {
		const newIndex = pageIndex;
		direction = newIndex > currentPageIndex ? 1 : -1;
		currentPageIndex = newIndex;
		submitError = null;
		submitValidationErrors = [];
		telemetry.reset();
	}

	$effect(() => {
		const backHistoryState = JSON.stringify({
			pageName: (formState.legacyBackHistory as any)?.pageName,
			pageNumber: (formState.legacyBackHistory as any)?.pageNumber
		});
		const hasResumeRequest = resumeIndexPending !== null;

		if (backHistoryState === lastBackHistoryState && !hasResumeRequest) return;
		lastBackHistoryState = backHistoryState;

		if ((formState.legacyBackHistory as any)?.pageName == 'OfferPage') {
			const storedPayloads = (formState.legacyBackHistory as any).payLoadsData;
			if (storedPayloads) {
				payloads = JSON.parse(storedPayloads as string);
			}
			const pageNum = Number((formState.legacyBackHistory as any)?.pageNumber) || 0;
			formState.replaceLegacyBackHistory({});
			evaluateOnServer(pageNum).finally(() => {
				formReady = true;
			});
			currentPageIndex = pageNum;
		} else if (resumeIndexPending !== null) {
			const targetIndex = resumeIndexPending;
			resumeIndexPending = null;
			evaluateOnServer(targetIndex).finally(() => {
				formReady = true;
			});
			currentPageIndex = targetIndex;
		}
	});

	// Re-evaluate server page whenever currentPageIndex changes
	const hadServerPage = untrack(() => !!serverPage);
	let lastEvaluatedPageIndex = hadServerPage ? 0 : -1;
	$effect(() => {
		if (!resumeHandled) return;
		if (currentPageIndex !== lastEvaluatedPageIndex && selectedLoan) {
			lastEvaluatedPageIndex = currentPageIndex;
			evaluateOnServer(currentPageIndex);
		}
	});

	// ── Auto-scroll + auto-focus for newly revealed questions ──
	const autoScroll = createFormAutoScroll();
	let lastPageForScroll = $state(-1);

	$effect(() => {
		if (currentPageIndex !== lastPageForScroll) {
			lastPageForScroll = currentPageIndex;
			autoScroll.reset();
		}
		autoScroll.update(visibleQuestions, currentAnswers);
	});

	// ── Payload collection ───────────────────────────────────────
	function payLoad(pageIndex: number) {
		collectPayload(payloads, pageIndex, visibleQuestions);
	}

	async function handleSubmit() {
		// Refresh completion data from server before checking
		await evaluateOnServer(currentPageIndex);
		await tick();

		if (!wizard.allSectionsComplete) {
			const allIncomplete = wizard.getAllIncompleteSections(visiblePages);
			if (allIncomplete.length > 0) {
				submitValidationErrors = allIncomplete.map((s) => ({
					label: s.sectionLabel,
					pageIndex: s.pageIndex
				}));
				submitError = null;
				return;
			}
		}
		submitValidationErrors = [];

		validateApplicantForm();
		payLoad(-1);
		try {
			isSubmitting = true;
			submitError = null;

			// Dev: log payload snapshots for debugging
			if (dev) {
				// eslint-disable-next-line no-console
				console.groupCollapsed('[CasePayload] Final — before submission');
				// eslint-disable-next-line no-console
				console.log(getCasePayload());
				// eslint-disable-next-line no-console
				console.groupEnd();
				// eslint-disable-next-line no-console
				console.groupCollapsed('[CleanPayload → API] Final — before submission');
				// eslint-disable-next-line no-console
				console.log(getCleanPayload());
				// eslint-disable-next-line no-console
				console.groupEnd();
			}

			// ── Reconcile applicantDataStore → formState before submission ──
			reconcileBeforeSubmit(formState, applicantDataStore as any);

			// ── Submit to server for evaluation + persistence ──
			const editCaseId = new URL(window.location.href).searchParams.get('edit');

			const result = await confirmAndSubmit(
				{
					loanType: 'Professional Loan',
					loanDisplayName: 'Professional Loan',
					formStateJson: formState.toJSON(),
					relationships: $userRelationships.map((r: any) => ({
						fromId: r.fromId,
						toId: r.toId,
						relationType: r.relationType,
						category: r.category ?? ''
					})),
					editCaseId: editCaseId || undefined
				},
				{
					quotaState: data.confirmModalCtx?.quotaState ?? null,
					inFlightCase: data.confirmModalCtx?.inFlightCase ?? null
				}
			);

			// "Review details" — DSA dismissed the pre-submit modal to keep editing.
			// Not an error, just abort the submit silently; finally{} clears isSubmitting.
			if (result.cancelled) return;

			if (!result.success) {
				submitError = result.error || 'Failed to submit application. Please try again.';
			}
		} catch (error) {
			clientLogger.debug({ err: error }, 'Submission error');
			submitError =
				error instanceof Error ? error.message : 'Failed to submit application. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	// GST validation functions (data validation, not schema evaluation)
	function validateGSTState(gstNumber: string): string | null {
		if (!gstNumber) return 'required';

		if (gstNumber.length !== 15) return 'lengthError';

		const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{1}Z[A-Z0-9]{1}$/;
		if (!gstPattern.test(gstNumber.toUpperCase())) return 'message';

		const stateCode = gstNumber.substring(0, 2);
		const stateName = gstStateCodes[stateCode as keyof typeof gstStateCodes];
		if (!stateName) return 'message';

		return null;
	}

	let gstDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	function updateStateFromGST(gstNumber: string): void {
		if (gstDebounceTimer) clearTimeout(gstDebounceTimer);
		gstDebounceTimer = setTimeout(() => {
			const errorKey = validateGSTState(gstNumber);
			if (errorKey) {
				updateAnswerByKey('residenceStateName', '');
				gstStateError = '';
			} else {
				const stateName = gstStateCodes[gstNumber.substring(0, 2) as keyof typeof gstStateCodes];
				updateAnswerByKey('residenceStateName', stateName);
				gstStateError = '';
			}
		}, 300);
	}

	function updateAnswerByKey<
		T extends string | number | boolean | (string | number)[] | null
	>(key: string, value: T): void {
		const d = formState.loanData as LoanDataStore;
		const currentLoanData = (d as any)[selectedLoan] ?? {};
		formState.replaceLoanData({
			...d,
			[selectedLoan]: {
				...currentLoanData,
				[key]: value
			},
			loanName: selectedLoan
		});

		// Per-keystroke server validation removed (S104). See home-loan
		// +page.svelte for the canonical comment.
		// Reactively clear stale cross-field validation errors so a corrected
		// field re-enables Next immediately (Pitfall #21). Skip while
		// evaluateOnServer is mid-flight so its freshly-loaded errors aren't
		// wiped. Authoritative re-check still runs on Next-click.
		if (!evaluating) serverPage = clearStaleValidationErrors(serverPage);
	}

	function updateAnswer(
		question: ClientQuestion,
		value: string | number | boolean | (string | number)[] | null
	): void {
		if (question.id === 'q1_loanName') {
			selectedLoan = value as string;
			currentPageIndex = 0;
		}

		const key = (question as any).bindsTo || question.id;
		updateAnswerByKey(key, value);

		if (key === 'applicantIsNRI') {
			updateAnswerByKey('ApplicantIsNRI', value);
		}

		if (key === 'GSTNumber') {
			updateStateFromGST(value as string);
		}

		if (key === 'residenceStateName') {
			updateAnswerByKey('residenceCityName', '');
			updateAnswerByKey('residencePincode', '');
		} else if (key === 'businessStateName') {
			updateAnswerByKey('businessCityName', '');
			updateAnswerByKey('businessPincode', '');
		} else if (key === 'TypeOfResidence') {
			updateAnswerByKey('typeOfResidence', value);
		} else if (key === 'addressSameOrNot' && value === 'Yes') {
			updateAnswerByKey(
				'businessStateName',
				(currentAnswers as Answers)['residenceStateName'] || ''
			);
			updateAnswerByKey('businessCityName', (currentAnswers as Answers)['residenceCityName'] || '');
		}

		// Fetch dependent options when state changes (state→city resolution)
		if (key === 'businessStateName') {
			showCityLoadingModal = true;
			fetchDependentCityOptions(key, value as string);
		}
	}

	// ── Targeted option fetch for state→city dependencies ──
	const cityQuestionMap = professionalLoanConfig.cityQuestionMap;

	async function fetchDependentCityOptions(stateKey: string, _stateValue: string) {
		try {
			await fetchDependentCityShared(
				stateKey,
				selectedLoan,
				{ ...currentAnswers } as Record<string, unknown>,
				cityQuestionMap,
				serverPage
			);
		} finally {
			showCityLoadingModal = false;
		}
	}

	onMount(() => {
		if (!assertLoanRoute('Professional Loan')) return;
		telemetry.attach();
		const unsavedGuard = setupUnsavedGuard(
			() => formState.isDirty && !isSubmitting,
			(onProceed) =>
				dialogState.openConfirmModal(
					'Unsaved Changes',
					'You have unsaved progress on this form. Leaving now will discard your current page entries.',
					onProceed,
					{ confirmLabel: 'Leave anyway', cancelLabel: 'Stay on page' }
				)
		);

		// ── Edit mode: load snapshot and restore state ──────────
		const editCaseId = new URL(window.location.href).searchParams.get('edit');
		if (editCaseId) {
			resumeHandled = true;
			formReady = true;
			(async () => {
				try {
					const res = await fetch(`/api/cases/${editCaseId}/snapshots?limit=1`);
					if (!res.ok) {
						goto(`/dashboard/dsa/cases/${editCaseId}?error=edit_failed`);
						return;
					}
					const result = await res.json();
					if (result.success && result.data?.snapshots?.length > 0) {
						formState.fromJSON(securedClone(result.data.snapshots[0].payload));
						selectedLoan = 'Professional Loan';
						return;
					}
				} catch (err) {
					clientLogger.debug({ err }, 'Failed to load snapshot for edit');
				}
				goto(`/dashboard/dsa/cases/${editCaseId}?error=edit_failed`);
			})();
			return () => {
				telemetry.destroy();
				unsavedGuard.destroy();
			};
		}

		// ── Normal mode ────────────────────────────────────────
		// Pitfall #42: only count F5 on THIS path as a reload.
		const isBrowserReload = isReloadOfCurrentPath();
		if (isBrowserReload) sessionStorage.removeItem('__resumeHandledHere');
		const alreadyHandled = sessionStorage.getItem('__resumeHandledHere');

		if (!alreadyHandled && isBrowserReload && initialSavedPageIndex > 0) {
			showResumeModal = true;
		} else {
			// Browser-back from results / evaluating re-mounts this page as a
			// client-side navigation (no reload, so no resume modal). Without
			// the next line, the sync $effect would write currentPageIndex (0)
			// back into formState.professionalLoanPageIndex, destroying the
			// user's place in the form. Rehydrating BEFORE flipping
			// resumeHandled makes the sync effect's first read a no-op.
			const restored = computePageIndexOnRemount(initialSavedPageIndex, showResumeModal);
			if (restored !== null) currentPageIndex = restored;
			resumeHandled = true;
			formReady = true;
		}

		if (!showResumeModal && !formState.loanData?.loanName) {
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
			return () => {
				telemetry.destroy();
				unsavedGuard.destroy();
			};
		}
		selectedLoan = 'Professional Loan';
		formState.clearForLoanType('professional');
		formState.setApplicationField('loanCategory' as any, 'professional' as any);

		return () => {
			telemetry.destroy();
			unsavedGuard.destroy();
		};
	});

	function handleResumeChoice(choice: 'resume' | 'restart' | 'clear') {
		showResumeModal = false;

		if (choice === 'resume') {
			resumeIndexPending = initialSavedPageIndex;
			resumeHandled = true;
		} else if (choice === 'restart') {
			resumeHandled = true;
			formReady = true;
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		} else if (choice === 'clear') {
			formReady = true;
			clearFormAndRedirect();
		}
	}

	function clearFormAndRedirect() {
		dialogState.openConfirmModal(
			'Clear this form?',
			'All entered data on this form will be permanently removed and you will be returned to the loan-type selector. This cannot be undone.',
			async () => {
				dialogState.closeConfirmModal();
				await clearFormAndGotoPicker();
			},
			{ confirmLabel: 'Clear form', cancelLabel: 'Cancel' }
		);
	}

	function goNext(): void {
		direction = 1;
		evaluating = true;
		submitValidationErrors = [];
		showCityLoadingModal = false;
		// Skip payload collection for the applicant form page (it manages its own store writes)
		if (
			![
				'applicantPage',
				'applicantProfilePage',
				'incomeProfilesPage',
				'incomeDetailsPage',
				'companyFinancialsPage',
				'creditScorePage',
				'obligationsPage'
			].includes(currentPage?.id ?? '')
		) {
			payLoad(currentPageIndex);
		}
		formState.replaceApplicationData({
			...(formState.applicationData as any),
			checkUnsecureData: false
		});
		const fromPageId = currentPage?.id;
		if (currentPageIndex < (visiblePages?.length ?? 1) - 1) currentPageIndex += 1;
		syncApplicantStepOnEntry(fromPageId, 'forward');

		if (dev) {
			// eslint-disable-next-line no-console
			console.groupCollapsed(`[CasePayload] After page ${currentPageIndex}`);
			// eslint-disable-next-line no-console
			console.log(getCasePayload());
			// eslint-disable-next-line no-console
			console.groupEnd();
			// eslint-disable-next-line no-console
			console.groupCollapsed(`[CleanPayload → API] After page ${currentPageIndex}`);
			// eslint-disable-next-line no-console
			console.log(getCleanPayload());
			// eslint-disable-next-line no-console
			console.groupEnd();
		}
	}

	function goPrev(): void {
		direction = -1;
		evaluating = true;
		submitValidationErrors = [];
		showCityLoadingModal = false;
		// Reset applicant sub-step ONLY when leaving the applicant page
		if (visiblePages?.[currentPageIndex]?.id === 'applicantPage') {
			formState.applicantPageIndex =
				formState.applicationData?.applicationStructure == 'individual'
					? 0
					: formState.applicantPageIndex;
		}
		formState.replaceApplicationData({
			...(formState.applicationData as any),
			checkUnsecureData: false
		});
		const fromPageId = currentPage?.id;
		if (currentPageIndex > 0) {
			currentPageIndex -= 1;
			syncApplicantStepOnEntry(fromPageId, 'backward');
		} else {
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		}
	}

	function syncApplicantStepOnEntry(fromPageId: string | undefined, dir: 'forward' | 'backward') {
		const step = wizard.resolveApplicantStepOnEntry(fromPageId, dir, visiblePages?.[currentPageIndex]?.id);
		if (step !== null) formState.setApplicantPageIndex(step);
	}

	let isLastPage = $derived(!evaluating && currentPageIndex === (visiblePages?.length ?? 1) - 1);

	function getPincodeContext(bindsTo: string) {
		return getPincodeContextShared(bindsTo);
	}

	function onTextFieldInput(val: string | string[], question: ClientQuestion) {
		if (Array.isArray(val)) {
			if (
				question.uiType === 'number' ||
				question.type === 'currency' ||
				question.type === 'tenure-input'
			) {
				const numArray = val.map((v) => {
					if (typeof v === 'string') {
						const numericVal = v.replace(/,/g, '');
						const n = /^\d*$/.test(numericVal) ? Number(numericVal) : 0;
						return isNaN(n) ? 0 : n;
					}
					return typeof v === 'number' ? v : 0;
				});
				updateAnswer(question, numArray);
			} else {
				updateAnswer(question, val);
			}
		} else {
			if (
				question.uiType === 'number' ||
				question.type === 'currency' ||
				question.type === 'tenure-input'
			) {
				const numVal = val === '' ? null : Number(val.replace(/,/g, ''));
				handleNumberInput(numVal, question);
			} else {
				updateAnswer(question, val);
			}
		}
	}

	function handleNumberInput(value: number | null, question: ClientQuestion) {
		// Pass `null` through verbatim — coercing to 0 left a "0" in the cleared
		// field instead of clearing it (Issue #1/#4 sibling on unsecured pages).
		updateAnswer(question, value);
	}

	function updateTitle(questionId: string, value: string) {
		const key = `${questionId}_title`;
		updateAnswerByKey(key, value);
	}

	$effect(() => {
		const hash = JSON.stringify(currentAnswers);
		if (hash !== lastAnswersHash) {
			lastAnswersHash = hash;
			formState.replaceApplicationData({ ...formState.applicationData, ...currentAnswers } as any);
		}
	});

	// Bridge: sync ObligationsRunning from applicantsStore to loanData
	// so that obligationsPage showWhen condition can evaluate it
	$effect(() => {
		const val = formState.applicants[0]?.ObligationsRunning;
		if (val !== undefined && val !== (currentAnswers as Answers).ObligationsRunning) {
			updateAnswerByKey('ObligationsRunning', val as string);
		}
	});

	function validateApplicantForm() {
		formState.replaceApplicationData({
			...(formState.applicationData as any),
			checkUnsecureData: true
		});
	}

	let lockedProfiles = $derived.by(() => {
		const applicant = formState.applicants[0] as any;
		if (!applicant) return [];

		const locked: IncomeProfileType[] = [];

		// Professional loan mandatory profile
		locked.push('professional_practice');

		// Include auto-created profiles if any
		const autoTypes = ((applicant.incomeEntries ?? []) as IncomeSourceEntry[])
			.filter((e) => e.autoCreated && !(e as any).orphaned)
			.map((e) => e.profileType);

		return [...new Set([...locked, ...autoTypes])];
	});
</script>

<Seo
	title="Professional Loan Application Form - DigitalDSA"
	description="Professional Loan Application Form - Apply for a Professional Loan with ease. Fill out our comprehensive form to get started on your loan journey today."
/>

<FormShell
	wizardState={wizard}
	currentPageId={serverPage?.pageId}
	onNavigate={handleWizardNavigate}
	{visiblePages}
	{currentPageIndex}
	totalPages={visiblePages?.length ?? 0}
	loanProduct={selectedLoan}
	onClearForm={clearFormAndRedirect}
	answers={combinedAnswers}
>
	{@const editCaseId = $page.url.searchParams.get('edit')}
	{#if editCaseId}
		<div
			class="mx-auto mb-3 w-full max-w-4xl rounded-lg border border-blue-200 bg-blue-50 px-4 py-2"
		>
			<p class="text-xs font-medium text-blue-800">
				Editing case <span class="font-mono">{editCaseId}</span> — changes will create a new version
			</p>
		</div>
	{/if}
	<div class="form-container mx-auto flex w-full max-w-4xl flex-col items-center justify-center">
		<div class="flex w-full flex-col">
			{#if deviceState.isMobile || deviceState.isNative}
				<div class="flex w-full items-center justify-center rounded-t-xl bg-primary py-2">
					<FormLogo />
				</div>
			{/if}
			<div
				class="inset-1 flex flex-col gap-4 {deviceState.isMobile || deviceState.isNative
					? 'rounded-b-xl'
					: 'rounded-xl'} px-2 py-4 md:p-6"
			>
				<div class="flex items-center justify-between">
					<h2 class="text-titleText">
						{serverPage?.pageTitle || 'Loan Application'}
					</h2>
					<SaveIndicator {evaluating} />
					{#if !deviceState.isMobile && !deviceState.isNative}
						<FormLogo />
					{/if}
				</div>

				<FormStepContainer pageId={currentPage?.id} {direction} {evaluating}>
					{#if currentPage?.id === 'applicantPage'}
						{#if pendingRestore}
							<PendingRestoreBanner
								displayName={pendingRestore.displayName}
								onConfirm={confirmAndTrackUndo}
								onCancel={() => {
									try {
										cancelApplicantRestore(pendingRestore!);
									} catch {
										/* ignore */
									}
									pendingRestore = null;
								}}
							/>
						{/if}
						<!-- Block form interaction until user answers the restore prompt -->
						<div class={pendingRestore ? 'pointer-events-none opacity-40' : ''}>
							<ApplicantFormUnsecured
								loanCategory="professional"
								bind:this={applicantFormRef}
								bind:isNextEnabled={applicantNextEnabled}
								bind:disabledReason={applicantDisabledReason}
								hideNavigation={true}
								{isSingleApplicant}
							/>
						</div>
						<!-- /pendingRestore block -->
					{:else if currentPage?.id === 'applicantProfilePage'}
						<ApplicantProfilePage
							bind:isComplete={applicantProfileComplete}
							loanCategory="professional"
						/>
					{:else if currentPage?.id === 'incomeProfilesPage' && isSingleApplicant}
						<IncomeProfileSelector
							{selectedProfiles}
							{answersContext}
							onSelectionChange={handleProfileSelectionChange}
							{lockedProfiles}
							bind:error={profileSelectionError}
							loanName="Professional Loan"
						/>
					{:else if currentPage?.id === 'incomeDetailsPage' && isSingleApplicant}
						<div class="flex flex-col gap-6">
							<IncomeSourceForm
								{selectedProfiles}
								existingEntries={incomeEntries}
								onAddEntry={handleAddEntry}
								professionalCategory={formState.applicants[0]?.professionalCategory as string}
								onUpdateEntry={(e) => {
									handleUpdateEntry(e);
									editingEntry = null;
								}}
								{editingEntry}
								onCancelEdit={() => (editingEntry = null)}
							/>
							<IncomeSourceEntries
								entries={incomeEntries}
								onEdit={(e) => (editingEntry = e)}
								onDelete={handleDeleteEntry}
							/>
						</div>
					{:else if currentPage?.id === 'companyFinancialsPage' && isSingleApplicant}
						<CompanyFinancials
							applicantIndex={0}
							onComplete={(complete) => (companyFinancialsComplete = complete)}
						/>
					{:else if currentPage?.id === 'creditScorePage' && isSingleApplicant}
						<CreditScoreSection
							creditScore={formState.applicants[0]?.creditScore ?? ''}
							whyLowCredit={formState.applicants[0]?.whyPrimaryLowCredit ?? []}
							creditHistoryStatus={formState.applicants[0]?.creditHistoryStatus ?? ''}
							emiBounceCount={formState.applicants[0]?.emiBounceCount ?? ''}
							defaultSettlementStatus={formState.applicants[0]?.defaultSettlementStatus ?? ''}
							recentEnquiryCount={formState.applicants[0]?.recentEnquiryCount ?? ''}
							bounceReason={formState.applicants[0]?.bounceReason ?? ''}
							defaultReason={formState.applicants[0]?.defaultReason ?? ''}
							enquiryReason={formState.applicants[0]?.enquiryReason ?? ''}
							creditFactorAnswers={formState.applicants[0]?.creditFactorAnswers ?? {}}
							creditFactorReasons={formState.applicants[0]?.creditFactorReasons ?? {}}
							onAnswerChange={handleCreditScoreChange}
						/>
					{:else if currentPage?.id === 'obligationsPage' && isSingleApplicant}
						<ObligationCapture
							loanProduct="Professional Loan"
							loanScope={combinedAnswers.loanType?.toString() ?? ''}
							bind:currentAnswers={formState.applicants[0]}
							onupdateApplicant={handleObligationUpdate}
							allApplicants={formState.applicants}
							currentApplicantIndex={0}
							onObligationsRunningChange={(val) => updateAnswerByKey('ObligationsRunning', val)}
						/>
					{:else}
						{#snippet questionRenderer(question: import('$lib/types/formEngine').ClientQuestion)}
							<div data-question-id={question.domId ?? question.id}>
								{#if question.type === 'location'}
									<LocationGroup
										{question}
										currentAnswers={currentAnswers as Record<string, unknown>}
										onUpdate={(key, value) => updateAnswerByKey(key, value)}
									/>
								{:else if question.type === 'radio'}
									<RadioField
										id={question.id}
										name={question.id}
										label={question.question}
										description={question.description ?? ''}
										descriptionHeader={(question as any).descriptionHeader}
										radioClass={(question as any).radioClass}
										optionContainerClass={(question as any).optionContainerClass}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={currentAnswers[question.bindsTo]?.toString() ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										getOptionValue={(opt: any) => opt.value as any}
										getOptionLabel={(opt: any) => opt.label as any}
										warning={getWarning(question)}
										required={question.required ?? false}
									/>
								{:else if question.type === 'text' && question.fieldType === 'pincode'}
									{@const ctx = getPincodeContext(question.bindsTo)}
									<PincodeTypeahead
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										descriptionHeader={(question as any).descriptionHeader ?? ''}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										stateValue={currentAnswers[ctx.stateKey]?.toString() || ''}
										cityValue={currentAnswers[ctx.cityKey]?.toString() || ''}
										source={ctx.source}
										required={question.required ?? false}
										onInput={(val) => updateAnswer(question, val)}
										onSelect={(pincode) => {
											updateAnswer(question, pincode);
										}}
										onerror={(err) => {
											pincodeError = err;
										}}
									/>
								{:else if question.type === 'currency'}
									<TextField
										loanName="Professional Loan"
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={((question.uiMeta as Record<string, unknown>)?.readonly as boolean) ??
											false}
										error={getServerError(question.id) || undefined}
										onInput={(value: any) => onTextFieldInput(value, question)}
										icon={(question.uiMeta as any)?.icon ?? 'indian-rupee'}
										placeholder={(question.uiMeta as any)?.placeholder || ''}
										uiType="number"
										enableNumberToWords={!(question.uiMeta as any)?.hideNumberInWords}
										fieldType={question.fieldType}
										minLimit={question.minLimit}
										maxLimit={question.maxLimit}
									/>
								{:else if question.type === 'text'}
									<TextField
										loanName="Professional Loan"
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={Array.isArray((question.uiMeta as any)?.placeholder)
											? (currentAnswers[question.bindsTo] ??
												new Array((question.uiMeta as any).placeholder.length).fill(''))
											: currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={((question.uiMeta as Record<string, unknown>)?.readonly as boolean) ??
											false}
										error={getServerError(question.id) || undefined}
										onInput={(value: any) => onTextFieldInput(value, question)}
										placeholder={((question.uiMeta as Record<string, unknown>)?.placeholder as
											| string
											| string[]) ?? ''}
										icon={((question.uiMeta as Record<string, unknown>)?.icons ??
											(question.uiMeta as Record<string, unknown>)?.icon) as string | string[]}
										showTitleDropdown={((question.uiMeta as Record<string, unknown>)
											?.showTitleDropdown as boolean) ?? false}
										title={(combinedAnswers as any)['title'] ?? ''}
										onTitleChange={(val: any) => updateTitle(question.id, val)}
										uiType={question.uiType ?? 'text'}
										enableNumberToWords={(question.uiMeta as any)?.showNumberInWords ?? false}
										fieldType={question.fieldType}
									/>
								{:else if question.type === 'tenure-select'}
									{@const unit = question.tenureUnit ?? 'years'}
									{@const genOptions = generateTenureOptions(
										question.minLimit ?? 1,
										question.maxLimit ?? 30,
										unit
									)}
									<SelectField
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										selectClass={(question as any).selectClass}
										options={question.options?.length
											? getFilteredOptions(question.options, combinedAnswers)
											: genOptions}
										value={(currentAnswers as any)[question.bindsTo] ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										required={question.required ?? false}
										icon={(question.uiMeta as any)?.icon ??
											(unit === 'months' ? 'calendar-days' : 'calendar-range')}
									/>
								{:else if question.type === 'tenure-input'}
									{@const unit = question.tenureUnit ?? 'years'}
									{@const unitLabel = unit === 'months' ? 'Months' : 'Years'}
									<TextField
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										error={getServerError(question.id) || undefined}
										onInput={(value: any) => onTextFieldInput(value, question)}
										icon={(question.uiMeta as any)?.icon ??
											(unit === 'months' ? 'calendar-days' : 'calendar-range')}
										placeholder={(question.uiMeta as any)?.placeholder ||
											`Enter tenure in ${unitLabel}`}
										uiType="number"
										fieldType={question.fieldType}
										minLimit={question.minLimit}
										maxLimit={question.maxLimit}
										minLimitMessage={question.minLimit
											? `Minimum tenure is ${question.minLimit} ${unitLabel}`
											: undefined}
										maxLimitMessage={question.maxLimit
											? `Maximum tenure is ${question.maxLimit} ${unitLabel}`
											: undefined}
									/>
								{:else if question.type === 'select'}
									<SelectField
										id={question.id}
										label={question.question ?? ''}
										subLabel={(question as any).subLabel}
										description={question.description ?? ''}
										selectClass={(question as any).selectClass}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={(currentAnswers as any)[question.bindsTo] ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										required={question.required ?? false}
										disabled={(question.uiMeta as any)?.readonly ?? false}
										icon={(question.uiMeta as any)?.icon}
										warning={getWarning(question)}
									/>
								{:else if question.type === 'derivedSelect'}
									<SelectField
										id={question.id}
										label={question.question ?? ''}
										subLabel={(question as any).subLabel}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={(currentAnswers as any)[question.bindsTo] ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										required={question.required ?? false}
										icon={(question.uiMeta as any)?.icon}
										disabled={(question.id === 'q2_residenceCityName' &&
											!(currentAnswers as any)['residenceStateName']) ||
											(question.id === 'q5_businessCityName' &&
												!(currentAnswers as any)['businessStateName'])}
									/>
								{:else if question.type === 'checkbox'}
									<CheckboxField
										id={question.id}
										label={question.question ?? ''}
										checked={!!(currentAnswers as any)[question.bindsTo]}
										error={getServerError(question.id) || undefined}
										onChange={(checked: boolean) => updateAnswer(question, checked)}
									/>
								{:else if question.type === 'multiple-select'}
									<MultipleSelectField
										id={question.id}
										label={question.question ?? ''}
										description={question.description ?? ''}
										multipleSelectClass={(question as any).multipleSelectClass}
										options={getFilteredOptions(question.options, combinedAnswers)}
										selectedValues={Array.isArray((currentAnswers as any)[question.bindsTo])
											? ((currentAnswers as any)[question.bindsTo] as (string | number)[])
											: []}
										error={getServerError(question.id) || undefined}
										onChange={(values: any) => updateAnswer(question, values)}
										required={question.required ?? false}
									/>
								{/if}

								{#if question.whyAsked}
									<p class="mt-2 text-xs leading-relaxed text-(--form-text-muted)">
										{question.whyAsked}
									</p>
								{/if}
							</div>
						{/snippet}

						<div class="mb-12 flex flex-col gap-20">
							{#each questionGroups as group (group.groupId ?? group.questions[0]?.id ?? '')}
								{#if group.groupId}
									<div class="question-group-card">
										{#if group.groupTitle}<h3 class="question-group-title">
												{group.groupTitle}
											</h3>{/if}
										<div class="question-group-body">
											{#each group.questions as question (question.id)}
												{@render questionRenderer(question)}
											{/each}
										</div>
									</div>
								{:else}
									{#each group.questions as question (question.id)}
										{@render questionRenderer(question)}
									{/each}
								{/if}
							{/each}
						</div>
					{/if}
				</FormStepContainer>
				<HoneypotField sessionId={formSessionId} />
			</div>
		</div>
	</div>

	{#snippet navigation()}
		{@const onApplicantPage = currentPage?.id === 'applicantPage'}
		{@const applicantStep = formState.applicantPageIndex}
		<FormNavigationBar
			showPrevious={true}
			showNext={onApplicantPage
				? isSingleApplicant
					? !isLastPage
					: applicantStep === 3
						? !isLastPage
						: true
				: !isLastPage}
			showSubmit={onApplicantPage
				? isSingleApplicant
					? isLastPage
					: applicantStep === 3 && isLastPage
				: isLastPage}
			nextDisabled={onApplicantPage
				? applicantStep === 3
					? !incomeValueCheck
					: !applicantNextEnabled
				: useValidateOnClick && !wasPageComplete && !hasInputErrors()
					? false
					: !isNextEnabled}
			disabledReason={onApplicantPage
				? ownershipDisabledReason || applicantDisabledReason || caseLevelDisabledReason
				: obligationsDisabledReason || caseLevelDisabledReason}
			submitDisabled={onApplicantPage
				? isSingleApplicant
					? !isNextEnabled
					: !incomeValueCheck
				: !isNextEnabled}
			{isSubmitting}
			{submitError}
			{errorSummary}
			{showValidationHint}
			incompleteErrors={submitValidationErrors}
			onErrorNavigate={(pageIndex) => {
				submitValidationErrors = [];
				submitError = null;
				handleWizardNavigate(pageIndex);
			}}
			submitLabel="Show Offers"
			onPrevious={() => {
				if (onApplicantPage) {
					const handled = applicantFormRef?.navigatePrevious();
					if (!handled) goPrev();
				} else {
					goPrev();
				}
			}}
			onNext={async () => {
				if (onApplicantPage && isSingleApplicant) {
					const handled = applicantFormRef?.navigateNext();
					if (!handled) goNext();
					return;
				}
				if (onApplicantPage && applicantStep < 3) {
					applicantFormRef?.navigateNext();
					return;
				}
				if (onApplicantPage && applicantStep === 3) {
					if (incomeValueCheck) {
						goNext();
					} else {
						scrollToFirstError();
					}
					return;
				}

				// Standard form page — flush any pending debounced evaluate so
				// cross-field validation rules see the very latest answers. See
				// home-loan +page.svelte for the canonical comment.
				await evaluateOnServer(currentPageIndex);
				await tick();

				if (isNextEnabled) {
					showValidationHint = false;
					goNext();
				} else if (useValidateOnClick) {
					showValidationHint = true;
					scrollToFirstError();
					const navMsg = document.querySelector('.nav-message-hint');
					if (navMsg) {
						navMsg.classList.add('animate-pulse');
						setTimeout(() => navMsg.classList.remove('animate-pulse'), 2000);
					}
				} else {
					validateApplicantForm();
					scrollToFirstError();
				}
			}}
			onSubmit={handleSubmit}
		/>
	{/snippet}
</FormShell>

<RestoreApplicantModal
	open={restoreIntentState.open}
	matches={restoreIntentState.matches || []}
	onConfirm={(match: any) => {
		// Route director-modal-triggered restores to applyDirectorRestore on the
		// form ref. Pre-fix this silently no-op'd — `currentIndex` is undefined for
		// director-slot restores and `prefillApplicantRestore` bailed at the early
		// guard without resetting the intent, leaving the modal stuck open. The
		// handler checks `restoreIntentState.directorRestore` and dispatches
		// accordingly; otherwise it falls through to the applicant-list prefill
		// below. Mirrors business-loan/+page.svelte.
		handleRestoreModalConfirm(match, applicantFormRef ?? null, (m) => {
			const result = prefillApplicantRestore(m as any);
			if (!result) return null;
			pendingRestore = result.pending;
			return result.cardId;
		});
	}}
	onCancel={() => {
		const matchUUIDs = restoreIntentState.matches?.map((m) => m.uuid) ?? [];
		if (matchUUIDs.length > 0) {
			applicantState.denyRecoveryByUUIDs(matchUUIDs);
		}
		restoreIntentState.reset();
	}}
/>

<FormLoadingOverlay visible={!formReady} />
<SessionResumeModal open={showResumeModal} onSelect={handleResumeChoice} />

<CityLoadingOverlay show={showCityLoadingModal} />

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
	}
	.question-group-card {
		border: 1px solid var(--form-border, #e5e7eb);
		border-radius: 12px;
		background: var(--form-group-bg, rgba(250, 250, 250, 0.5));
		padding: 1.5rem;
	}
	.question-group-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--form-text, #1f2937);
		margin: 0 0 1rem 0;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--form-border, #e5e7eb);
	}
	.question-group-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	:global(.dark) .question-group-card {
		background: rgba(30, 30, 30, 0.5);
		border-color: #333;
	}
	:global(.dark) .question-group-title {
		color: #e5e7eb;
		border-color: #333;
	}
</style>
