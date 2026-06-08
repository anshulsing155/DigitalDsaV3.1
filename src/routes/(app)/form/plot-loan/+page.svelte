<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { assertLoanRoute } from '$lib/utils/loanRouteGuard.svelte';
	import { isReloadOfCurrentPath } from '$lib/utils/isReloadOfCurrentPath';
	import { computePageIndexOnRemount } from '$lib/utils/loanPageIndexRestore';
	import { page } from '$app/stores';
	import { secureFetch } from '$lib/utils/csrf';
	import { formState } from '$lib/state/form.svelte';
	import { ToWords } from 'to-words';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { HOME_ONLY_KEYS, LAP_ONLY_KEYS } from '$lib/config/securedLoanKeys.js';
	import TextField from '$lib/components/TextField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import MultipleSelectField from '$lib/components/MultipleSelectField.svelte';
	import DatePickerYearAndMonth from '$lib/components/DatePickerYearAndMonth.svelte';

	import { deviceState } from '$lib/stores/device.svelte';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import type { Answers, LoanDataStore } from '$lib/types/formTypes';
	import type { PageResponse, ClientQuestion, ClientOption } from '$lib/types/formEngine';
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
		toIndianNumber,
		isArrayFullyValid,
		getFieldValidationError,
		fetchDependentCityOptions as fetchDependentCityShared,
		hasInputErrors as hasInputErrorsShared,
		getPincodeContext as getPincodeContextShared,
		getFilteredOptions,
		clearStaleOptionValues,
		downpaymentPercentage,
		isFieldAnswered,
		isQuestionAnswered
	} from '$lib/utils/formWizardEngine';
	import { plotLoanConfig } from '$lib/config/wizardConfigs/plotLoan';
	import ApplicantFormSecured from '$lib/components/ApplicantFormSecured.svelte';
	import ApplicantProfilePage from '$lib/components/ApplicantProfilePage.svelte';
	import IncomeProfileSelector from '$lib/components/IncomeProfileSelector.svelte';
	import IncomeSourceForm from '$lib/components/IncomeSourceForm.svelte';
	import IncomeSourceEntries from '$lib/components/IncomeSourceEntries.svelte';
	import CreditScoreSection from '$lib/components/CreditScoreSection.svelte';
	import ObligationCapture from '$lib/components/ObligationCapture.svelte';
	import { computeSectionCompletion } from '$lib/utils/incomeTabState';
	import { deriveLegacyEmploymentType } from '$lib/config/incomeProfiles';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
	import RestoreApplicantModal from '$lib/components/RestoreApplicantModal.svelte';
	import SessionResumeModal from '$lib/components/SessionResumeModal.svelte';
	import FormLoadingOverlay from '$lib/components/form-wizard/FormLoadingOverlay.svelte';
	import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
	import { type RecoveryScope } from '$lib/state/applicant.svelte';
	import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
	import { restoreRelationshipsForApplicant } from '$lib/utils/restoreRelationships';
	import {
		prefillApplicantRestore,
		commitApplicantRestore,
		cancelApplicantRestore,
		type PendingRestore
	} from '$lib/utils/applicantRestoreHandler';
	import PendingRestoreBanner from '$lib/components/PendingRestoreBanner.svelte';
	import {
		clearAllRelationships,
		userRelationships
	} from '$lib/components/relationship-capture/relationshipStore';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { clearFormAndGotoPicker } from '$lib/utils/clearFormAndGotoPicker';
	import { getCleanPayload, getCasePayload } from '$lib/stores/cleanPayloadStore.svelte';
	import { confirmAndSubmit } from '$lib/utils/confirmAndSubmit';
	import { reconcileBeforeSubmit } from '$lib/utils/preSubmitReconciler';
	import { setupUnsavedGuard } from '$lib/utils/formUnsavedGuard';
	import { dialogState } from '$lib/state/dialog.svelte';
	import {
		FormShell,
		FormStepContainer,
		FormNavigationBar,
		createWizardState,
		CityLoadingOverlay
	} from '$lib/components/form-wizard';
	import SaveIndicator from '$lib/components/form-wizard/SaveIndicator.svelte';
	import { plotLoanSections } from '$lib/config/wizardSections/plotLoan';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import { createFormAutoScroll } from '$lib/utils/formAutoScroll';
	import {
		handleRestoreModalConfirm,
		handleRestoreModalCancel
	} from '$lib/utils/directorRestoreHandler';
	import type { PageData } from './$types';
	import { BehaviorTelemetry } from '$lib/utils/behaviorTelemetry';
	import HoneypotField from '$lib/components/form/HoneypotField.svelte';
	import { dev } from '$app/environment';
	import clientLogger from '$lib/utils/clientLogger';
	import { securedClone } from '$lib/utils/securedClone';
	import { buildCombinedAnswersSecured, stableReference } from '$lib/utils/combinedAnswersMemo';
	import { validateCompanyOwnershipTotals } from '$lib/utils/sameCompanySync';
	import PincodeTypeahead from '$lib/components/PincodeTypeahead.svelte';
	import LocationGroup from '$lib/components/LocationGroup.svelte';
	import { v4 as uuidv4 } from 'uuid';

	const telemetry = new BehaviorTelemetry();

	// ATS (Agreement to Sell) auto-calculation mode constants.
	// Fields are readonly when the system is computing them ("ATS Ready = No" +
	// "ATS value mode = Suggestion Required"). Editable when user picks "By Myself".
	// These match option values in the plot-loan schema (q_isATSReady / q_ATSvalue).
	const ATS_READY_NO = 'No';
	const ATS_MODE_SUGGESTION = 'Suggestion Required';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Component state
	const toWords = new ToWords();
	let selectedLoan = $state<string>('');
	let currentPageIndex = $state<number>(0);
	let numberWordsMap = $state<Record<string, string>>({});
	let resultData = $state<unknown>(null);
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);
	let submitValidationErrors = $state<Array<{ label: string; pageIndex: number }>>([]);
	let gstStateError = $state('');
	let payloads = $state<Record<string, unknown[]>>({});
	let direction = $state<1 | -1>(1);
	let formSessionId = $state<string | undefined>(undefined);

	// Session resume state
	let showResumeModal = $state(false);
	let resumeIndexPending = $state<number | null>(null);
	let resumeHandled = $state(false);
	const initialSavedPageIndex = formState.plotLoanPageIndex;
	let formReady = $state(false);

	// Guards for preventing infinite loops in effects
	let lastAnswersHash = '';
	let lastATSCalc = '';
	// Tracks the last seen `ATSvalue` (Suggestion Required / By Myself). Used by
	// the ATS-suggestion $effect to detect when the user just toggled INTO
	// Suggestion Required mode, so it can recompute even when propCost /
	// requireDownPayment haven't changed.
	let lastATSMode = '';
	let lastPageIndex = -1;
	let lastBackHistoryState = '';

	// svelte-ignore state_referenced_locally — intentional: capture SSR initial page once, overwritten by evaluateOnServer
	let serverPage = $state<PageResponse | null>(data.formEngine?.initialPage ?? null);
	let evaluating = $state(false);
	let showCityLoadingModal = $state(false);
	let evaluateTimer: ReturnType<typeof setTimeout> | null = null;

	async function evaluateOnServer(pageIndex: number) {
		// Build evaluation answers using shared utility — includes applicant metadata,
		// income profiles, obligations, and plot-specific extra fields (LAPType)
		const answers = buildEvaluationAnswers(selectedLoan, plotLoanConfig.extraPayloadFields);

		try {
			evaluating = true;
			const payload = {
				loanType: 'Plot Loan',
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

					// ── First-incomplete-page gate ──────────────────────────────
					if (direction === 1 && serverPage.visiblePageMap) {
						for (let i = 0; i < pageIndex && i < serverPage.visiblePageMap.length; i++) {
							const pg = serverPage.visiblePageMap[i];
							if (!pg.complete && !CUSTOM_COMPLETION_PAGES.has(pg.id)) {
								// Jump back to the first incomplete prior page. NO submitError —
								// the bottom-nav amber "Missing : <field>" warning (driven by
								// errorSummary for the now-current page) already tells the DSA
								// exactly what's missing, with reactive clearing as they fill it.
								// A second red "Please complete X before continuing" line on top
								// of the amber one is redundant AND goes stale because nothing
								// clears submitError when the field gets answered.
								currentPageIndex = i;
								return;
							}
						}
					}
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
			formState.plotLoanPageIndex = currentPageIndex;
		}
	});

	let requireDownPayment = $state<number>(0);

	// ── Derived state from server page ──────────────────────────
	let visiblePages = $derived(deriveVisiblePages(serverPage));

	let currentPage = $derived(deriveCurrentPage(serverPage));

	let visibleQuestions = $derived(
		deriveVisibleQuestions(serverPage, selectedLoan, formSessionId ?? '')
	);

	let questionGroups = $derived(deriveQuestionGroups(visibleQuestions));

	// ── Initialize area unit defaults when area questions become visible ──
	$effect(() => {
		for (const q of visibleQuestions) {
			if ((q.uiMeta as any)?.showAreaUnitDropdown) {
				const key = q.bindsTo || q.id;
				const unitKey = `${key}Unit`;
				if (!(currentAnswers as any)[unitKey]) {
					updateAnswerByKey(unitKey, 'Feet');
				}
			}
		}
	});

	// ── Custom pages for single-applicant flattened flow ──────────
	const CUSTOM_INCOME_PAGES = new Set([
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]);

	// Pages with custom completion logic — skip in first-incomplete-page gate
	const CUSTOM_COMPLETION_PAGES = new Set([
		'tellUsApplyingPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]);

	let isNextEnabled = $derived.by(() => {
		// Single-applicant profile page
		if (currentPage?.id === 'applicantProfilePage' && isSingleApplicant) {
			return singleApplicantProfileComplete;
		}
		// Single-applicant flattened income pages
		if (currentPage?.id && CUSTOM_INCOME_PAGES.has(currentPage.id) && isSingleApplicant) {
			const completion = computeSectionCompletion(formState.applicants[0]);
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
		if (enabled && Object.values(pincodeErrors).some((e) => e)) {
			enabled = false;
		}
		if (enabled && currentPage?.id === 'tellUsApplyingPage') {
			enabled = isArrayFullyValid(formState.applicants);
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

	let pincodeErrors = $state<Record<string, string>>({});

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
		const next = buildCombinedAnswersSecured(currentAnswers, selectedLoan, formState.applicants);
		return stableReference(next, previousCombined, (ref) => {
			previousCombined = ref;
		});
	});

	// Auto-clear stale radio/select/multi-select values when option-level showWhen hides selected options
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
		sectionConfig: plotLoanSections,
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
			if (currentPage?.id === 'tellUsApplyingPage') {
				return formState.applicantPageIndex >= 3 ? incomeValueCheck : applicantNextEnabled;
			}
			return isNextEnabled;
		},
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

	function handleApplicantStepChange(step: number) {
		formState.setApplicantPageIndex(step);
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

	function updateAnswerByKey<
		T extends string | number | boolean | (string | number)[] | null
	>(key: string, value: T): void {
		const data = formState.loanData as LoanDataStore;
		const currentLoanData = (data as any)[selectedLoan] ?? {};
		formState.replaceLoanData({
			...data,
			[selectedLoan]: {
				...(currentLoanData as any),
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

		// flagKey resolution: when a radio/select option carries a flagKey object,
		// persist those derived values so downstream showWhen / payload reads can
		// see them. E.g. q0_plotCurrentState='vacant_plot' auto-sets
		// constructionProgress='not_started' — so the redundant Q2 is hidden but
		// the field still reaches the lender payload. Mirrors home-loan's handler.
		// IMPORTANT: skip boolean flagKeys whose key matches the question's own
		// contextKey — otherwise they would overwrite the string answer ("Yes"/"No")
		// with true/false and break downstream comparisons.
		if (question.options && typeof value === 'string') {
			const selectedOpt = question.options.find((o: ClientOption) => String(o.value) === value);
			if (selectedOpt?.flagKey) {
				const contextKey = question.contextKey;
				for (const [flagK, flagV] of Object.entries(
					selectedOpt.flagKey as Record<string, unknown>
				)) {
					if (typeof flagV === 'boolean' && flagK === contextKey) continue;
					updateAnswerByKey(flagK, flagV as string | number | boolean);
				}
			}
		}

		if (key === 'propertyStateName') {
			updateAnswerByKey('propertyCityName', '');
			updateAnswerByKey('propertyPincode', '');
		} else if (key === 'residenceStateName') {
			updateAnswerByKey('residenceCityName', '');
			updateAnswerByKey('residencePincode', '');
		} else if (key === 'residenceOptionSame') {
			if (value === 'Yes') {
				updateAnswerByKey(
					'residenceStateName',
					(currentAnswers['propertyStateName'] as string) || ''
				);
				updateAnswerByKey(
					'residenceCityName',
					(currentAnswers['propertyCityName'] as string) || ''
				);
			} else if (value === 'No') {
				updateAnswerByKey('residenceStateName', '');
				updateAnswerByKey('residenceCityName', '');
				updateAnswerByKey('residencePincode', '');
			}
		}

		if (value == 'Individual / Sole-Proprietor') {
			updateAnswerByKey('numberOfDirectorOrApplicant', 1);
		} else if (value == 'Couple') {
			updateAnswerByKey('numberOfDirectorOrApplicant', 2);
		} else if (value === 'Family') {
			// Cannot pass null to updateAnswerByKey
		}

		// Fetch dependent options when state changes (state→city resolution)
		if (key === 'propertyStateName' || key === 'residenceStateName') {
			showCityLoadingModal = true;
			fetchDependentCityOptions(key, value as string);
		}
	}

	// ── Targeted option fetch for state→city dependencies ──
	const cityQuestionMap = plotLoanConfig.cityQuestionMap;

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

	function payLoad(pageIndex: number) {
		collectPayload(payloads, pageIndex, visibleQuestions);
	}

	function goNext(): void {
		direction = 1;
		evaluating = true;
		submitError = null;
		submitValidationErrors = [];
		const currentPid = visiblePages?.[currentPageIndex]?.id ?? '';
		if (
			currentPid !== 'basicInfoPage' &&
			currentPid !== 'loanStructurePage' &&
			currentPid !== 'tellUsApplyingPage' &&
			!CUSTOM_INCOME_PAGES.has(currentPid)
		) {
			payLoad(currentPageIndex);
		}
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
		submitError = null;
		submitValidationErrors = [];
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

	function onTextFieldInput(val: string, question: ClientQuestion) {
		if (
			question.uiType === 'number' ||
			question.type === 'currency' ||
			question.type === 'tenure-input'
		) {
			if (question.fieldType === 'percentage') {
				if (/^\d*\.?\d*$/.test(val) || val === '') {
					const numVal = val === '' ? null : Number(val);
					handleNumberInput(numVal, question);
				}
			} else {
				if (/^\d*$/.test(val) || val === '') {
					const numVal = val === '' ? null : Number(val);
					handleNumberInput(numVal, question);
				}
			}
		} else {
			updateAnswer(question, val);
			numberWordsMap = {
				...numberWordsMap,
				[question.id]: ''
			};
		}
	}

	function getPincodeContext(bindsTo: string) {
		return getPincodeContextShared(bindsTo);
	}

	function handleNumberInput(value: number | number[] | null, question: ClientQuestion) {
		// `null` here means the user cleared the field — pass it through so
		// updateAnswer wipes the stored answer (Issue #1/#4).
		updateAnswer(question, value);

		if (
			typeof value === 'number' &&
			!isNaN(value) &&
			((question.uiMeta as Record<string, unknown> | undefined)?.showNumberInWords === true ||
				question.type === 'currency')
		) {
			numberWordsMap = {
				...numberWordsMap,
				[question.id]: `${toWords.convert(value)}`
			};
		} else {
			numberWordsMap = {
				...numberWordsMap,
				[question.id]: ''
			};
		}
	}

	function updateTitle(questionId: string, value: string) {
		const key = `${questionId}_title`;
		updateAnswerByKey(key, value);
	}

	onMount(() => {
		if (!assertLoanRoute('Plot Loan')) return;
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
						goto(`/form/plot-loan?error=edit_failed`);
						return;
					}
					const result = await res.json();
					if (result.success && result.data?.snapshots?.length > 0) {
						formState.fromJSON(securedClone(result.data.snapshots[0].payload));
						selectedLoan = 'Plot Loan'; // matches commonPage.json loanName value
						return;
					}
				} catch (err) {
					clientLogger.debug({ err }, 'Failed to load snapshot for edit');
				}
				goto(`/dashboard/dsa/cases/${editCaseId}`);
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
			// back into formState.plotLoanPageIndex, destroying the user's
			// place in the form. Rehydrating BEFORE flipping resumeHandled
			// makes the sync effect's first read a no-op.
			const restored = computePageIndexOnRemount(initialSavedPageIndex, showResumeModal);
			if (restored !== null) currentPageIndex = restored;
			resumeHandled = true;
			formReady = true;
		}

		if (!showResumeModal && !formState.loanData?.loanName) {
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		} else {
			selectedLoan = 'Plot Loan';
			formState.clearForLoanType('secured');
			formState.setApplicationField('loanCategory' as any, 'secured' as any);
			formState.clearApplicationFields([...HOME_ONLY_KEYS, ...LAP_ONLY_KEYS]);
		}

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

	$effect(() => {
		const hash = JSON.stringify(currentAnswers);
		if (hash !== lastAnswersHash) {
			lastAnswersHash = hash;
			formState.replaceApplicationData({ ...formState.applicationData, ...currentAnswers } as any);
		}
	});

	// ── Down payment calculation effects ──────────────────────────
	$effect(() => {
		if (currentAnswers.propertyType !== '') {
			if (currentAnswers.propCost <= 3333333) {
				requireDownPayment = +Math.ceil(currentAnswers.propCost * 0.1).toFixed(0);
			}
			if (currentAnswers.propCost > 3333333 && currentAnswers.propCost <= 9375000) {
				requireDownPayment = +Math.ceil(currentAnswers.propCost * 0.2).toFixed(0);
			}
			if (currentAnswers.propCost > 9375000) {
				requireDownPayment = +Math.ceil(currentAnswers.propCost * 0.25).toFixed(0);
			}
		}
	});

	function roundNum(num: number, round: number): number {
		return Math.round(num / round) * round;
	}

	$effect(() => {
		const mode = (currentAnswers.ATSvalue as string | undefined) ?? '';
		// Detect a fresh transition INTO "Suggestion Required" mode — without this,
		// the calcKey guard below would skip recompute when the user toggled
		// "Suggestion Required" → "By Myself" → cleared fields → "Suggestion Required",
		// because propCost / requireDownPayment haven't changed across those steps.
		// Tracking the mode lets us distinguish "same inputs, same mode" (skip — avoids
		// the infinite loop after updateAnswerByKey) from "same inputs, just toggled
		// back into this mode" (must recompute and overwrite whatever the user left
		// in the fields).
		const modeChanged = mode !== lastATSMode;
		lastATSMode = mode;

		if (currentAnswers.ATSReady == ATS_READY_NO && mode === ATS_MODE_SUGGESTION) {
			const calcKey = `${currentAnswers.propCost}-${requireDownPayment}`;
			if (calcKey === lastATSCalc && !modeChanged) return;
			lastATSCalc = calcKey;

			updateAnswerByKey(
				'agreementSellValue',
				roundNum((currentAnswers.propCost - requireDownPayment) / 0.9, 100)
			);
			updateAnswerByKey(
				'depositAsPerATS',
				roundNum(roundNum((currentAnswers.propCost - requireDownPayment) / 0.9, 100) * 0.1, 100)
			);
		}
	});

	// ── OPC effect ──────────────────────────
	$effect(() => {
		if (
			currentAnswers['tellUsApplying'] === 'Company (Non-individual entity)' &&
			currentAnswers['typeOfCompany'] === 'One Person Company (OPC)' &&
			currentAnswers['numberOfDirectorOrApplicant'] !== 1
		) {
			updateAnswerByKey('numberOfDirectorOrApplicant', 1);
		}
	});

	// ── Sync applicants data to the main form store ──────────────────────
	let lastApplicantsSync = '';
	$effect(() => {
		if (formState.applicants && formState.applicants.length > 0) {
			const snapshot = JSON.stringify(formState.applicants);
			if (snapshot !== lastApplicantsSync) {
				lastApplicantsSync = snapshot;
				updateAnswerByKey('allApplicantDetails', formState.applicants as any);
			}
		}
	});

	// ── Submission ──────────────────────────
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

		payLoad(-1);
		try {
			isSubmitting = true;
			submitError = null;

			// (S214, TECH-DEBT-CLEANUP D7) The `loanTransaction` accumulator below +
			// `payloadNew` / `payload` constructions further down were originally
			// shaped for the now-archived `bank-loan-management` external API in
			// src/lib/services/_archive/homeLoanApi-S214.ts. Nothing in the live
			// tree sends the payload anywhere — actual submission goes through
			// `confirmAndSubmit({ formStateJson: formState.toJSON(), ... })` (see
			// docs/OFFERS-ARCHITECTURE.md for the live flow). The PascalCase
			// fields LoanName / LoanType / PlotLoanActivity in `payloadNew` below
			// are the literal "bank-loan-management shim" called out by spec D7.
			//
			// Full removal of the surrounding scaffolding is BLOCKED by
			// src/lib/testing/__tests__/plotEquityPayloadPatchLock.test.ts which
			// ratifies the Plot & Equity conditional + `purchaseType = 'Direct Sale'`
			// + `differentATSandPV = 'Yes'` assignments existing in this file.
			// Reforming that lock test (per CLAUDE.md §16 Rule #16 — locks should
			// guard canonical state, not transitional state) is a separate concern;
			// the patches in question target a local `payload` variable that never
			// reaches the engine, which is the bug the lock test should actually
			// be catching. Tracked in TECH-DEBT-CLEANUP-2026-05-31.md §6 as a
			// future Plot & Equity payload-patch reform item.
			//
			// S214 scope: validation refactor at line ~1069 (reads `currentAnswers`
			// directly instead of the dead `payload.loanTransaction.LoanName/LoanType`
			// fields) is the only change here. The rest of the dead scaffolding
			// stays in place until the Plot & Equity reform lands.

			let loanTransaction: Record<string, unknown> = {};

			for (const [, value] of Object.entries(payloads) as [
				string,
				Array<Record<string, unknown>>
			][]) {
				for (let i = 0; i < value.length; i++) {
					const question = value[i].bindsTo as string;
					const contextKey = value[i].contextKey as string;

					const currentAnswer = currentAnswers[question];

					loanTransaction = { ...loanTransaction, [contextKey]: currentAnswer };
				}
			}

			const mapemploymentType = (empType: string | undefined): string => {
				if (!empType) return '';
				return empType.replace(/\s+/g, '');
			};

			const safeArray = (value: unknown, fallback: unknown[] = []): unknown[] => {
				return Array.isArray(value) ? value : fallback;
			};

			// Prepare the formatted payload for PLOT loan
			const payloadNew = {
				loanTransaction: {
					LoanName: currentAnswers.loanName,
					LoanType: currentAnswers.loanVariant || 'Plot & Construction Loan',
					PlotLoanActivity: currentAnswers.loanType,
					numberOfDirectorOrApplicant: Number(currentAnswers.numberOfDirectorOrApplicant) || 1,
					ContinuityProof: 'Yes',
					...loanTransaction
				},
				allApplicantDetails: (currentAnswers as any).allApplicantDetails.map((applicant: any) => ({
					...applicant,
					employmentType: mapemploymentType(applicant.employmentType as any),
					RelationWithPrimary: applicant.yourRelationship || 'Primary Applicant',
					companyName: applicant.companyName || '',
					existingRoleOfPerson:
						applicant?.existingRoleOfPerson ||
						'Loan repayment and having name on the property papers',
					netIncome: Number(applicant.fixedSalary) || 0,
					fixedSalary: Number(applicant.fixedSalary) || 0,
					grossIncome: Number(applicant.grossIncome) || 0,
					monthlyOtherIncome: Number(applicant.monthlyOtherIncome) || 0,
					age: Number(applicant.age) || Number(applicant.companyAge) || 0,
					obligations: applicant.obligation === 'Yes' ? (applicant.obligations ?? []) : [],
					financialsTable: applicant.financialsTable || null,
					turnOver: safeArray((applicant.financialsTable as any)?.turnOver, [0, 0, 0]),
					netProfitArray: safeArray((applicant.financialsTable as any)?.netProfitArray, [0, 0, 0]),
					depreciationArray: safeArray(
						(applicant.financialsTable as any)?.depreciationArray,
						[0, 0, 0]
					)
				}))
			};

			let payload;
			payload = $state.snapshot(payloadNew) as typeof payloadNew;

			if (
				currentAnswers.tellUsApplying === 'Couple' &&
				Array.isArray(payload.allApplicantDetails)
			) {
				payload.allApplicantDetails[1].RelationWithPrimary = 'Spouse';
			}

			// (S215, 2026-06-02) Two payload-patch blocks removed here:
			//   1. `purchaseType === 'Resale'` → set differentATSandPV='Yes'
			//   2. `loanVariant === 'Plot & Equity Loan'` → set purchaseType='Direct Sale',
			//      differentATSandPV='Yes'
			// Both mutated this local `payload` variable, but `confirmAndSubmit` is
			// called below with `formStateJson: formState.toJSON()` — the patched
			// payload was discarded after the client-side validation that follows.
			// Patch #1 was additionally dead from inception (case mismatch — form
			// values are lowercase 'resale', engine-canonical is capitalized 'Resale').
			// Patch #2 fired correctly post-S207 loanType→loanVariant rename but
			// still never reached the engine. Plot & Equity Phases 2-4 (LEND-1) will
			// redesign the payload + engine integration for the 3-cap structure; the
			// semantic intent (forced purchaseType + differentATSandPV semantics for
			// Plot & Equity) is the right thing to model at the form/builder/enricher
			// layer there, not as a local-payload mutation here.
			// See: PITFALLS.md #71, TECH-DEBT-CLEANUP-2026-05-31 §6, ADR-0021,
			// plotEquityPayloadPatchLock.test.ts (canonical-absence lock).

			if (Array.isArray(payload.allApplicantDetails)) {
				payload.allApplicantDetails.forEach((applicant) => {
					delete applicant.currentBankName;
					delete applicant.currentEmi;
					delete applicant.currentInterestRate;
					delete applicant.currentLoanType;
					delete applicant.currentSelectedToClose;
					delete applicant.currentTenure;
					delete applicant.currentTotalLimit;
					delete applicant.utilizedAmount;
					delete applicant.sanctionedTenure;
					delete applicant.sanctionedLimit;
					delete applicant.remainingLimit;
					delete applicant.currentSanctionedLimit;
					delete applicant.currentSanctionedTenure;
					delete applicant.currentUtilizedAmount;
					delete applicant.editingLoanIdx;
				});
			}

			if (Array.isArray(payload.allApplicantDetails)) {
				payload.allApplicantDetails.forEach((applicant) => {
					if (
						applicant.employmentType !== 'Self-employed(Professional)' &&
						applicant.employmentType !== 'Self-employed(Businessman)' &&
						applicant.employmentType !== 'Self-employed(Other)'
					) {
						delete applicant.netProfitArray;
						delete applicant.turnOver;
						delete applicant.depreciationArray;
						delete applicant?.professionType;
						delete applicant.incomeTaxAvailableThreeFinancialYear;
					} else {
						delete applicant.monthlyOtherIncome;
						delete applicant.grossIncome;
						delete applicant.fixedSalary;
						delete applicant.netIncome;
					}
				});
			}

			if (currentAnswers.tellUsApplying !== 'Company (Non-individual entity)') {
				if (Array.isArray(payload.allApplicantDetails) && payload.allApplicantDetails[0]) {
					delete payload.allApplicantDetails[0].companyName;
					delete payload.allApplicantDetails[0].companyAge;
				}
			}

			// ── Dev: payload snapshots ──
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

			const validationErrors: string[] = [];
			// (S214, D7) Read from canonical `currentAnswers` directly. Previously
			// read from `payload.loanTransaction.LoanName / LoanType` which were
			// the bank-loan-management API-shape PascalCase shim fields. The
			// PascalCase fields in `payloadNew.loanTransaction` are still defined
			// above but only because the surrounding scaffolding is blocked from
			// removal by plotEquityPayloadPatchLock.test.ts — see comment block
			// at the top of `handleSubmit`.
			if (!currentAnswers.loanName)
				validationErrors.push('Loan Name is required — go to "How Can We Help?"');
			if (!currentAnswers.loanType)
				validationErrors.push('Loan Type is required — go to "How Can We Help?"');

			if (!formState.applicants || formState.applicants.length === 0) {
				validationErrors.push(
					'No applicant added — go to the "Applicants" section and add at least one applicant'
				);
				const applicantIdx = visiblePages?.findIndex((p) => p.id === 'tellUsApplyingPage') ?? -1;
				if (applicantIdx !== -1) currentPageIndex = applicantIdx;
			} else {
				const applicant = formState.applicants[0] as Record<string, unknown>;
				const missing: string[] = [];
				const isCompanyApplicant = applicant.applicantType === 'Company';
				if (!isCompanyApplicant && !applicant.fullName) missing.push('name');
				if (!isCompanyApplicant && !applicant.employmentType) missing.push('employment type');
				if (missing.length > 0) {
					validationErrors.push(
						`Applicant 1 is missing: ${missing.join(', ')} — go to "Applicants" section`
					);
					const applicantIdx = visiblePages?.findIndex((p) => p.id === 'tellUsApplyingPage') ?? -1;
					if (applicantIdx !== -1) currentPageIndex = applicantIdx;
				}
			}

			if (validationErrors.length > 0) {
				clientLogger.debug({ validationErrors }, 'Validation errors');
				submitError = validationErrors.join(' | ');
				return;
			}

			// ── Reconcile applicantDataStore → formState before submission ──
			reconcileBeforeSubmit(formState, applicantDataStore as any);

			// ── Submit to server for evaluation + persistence ──
			const editCaseId = new URL(window.location.href).searchParams.get('edit');
			// `confirmAndSubmit` takes loanName as `loanType` (param is misnamed —
			// consistent across all 6 loan +page.svelte files; see lap/+page.svelte:1052,
			// home-loan/+page.svelte:1725). Prior to fix this pulled `currentAnswers.loanType`
			// (the scope: 'New Loan' / 'Balance Transfer Only') with a variant fallback
			// 'Plot & Construction Loan' — both wrong. Mirror the canonical pattern.

			const result = await confirmAndSubmit(
				{
					loanType: 'Plot Loan',
					loanDisplayName: 'Plot Loan',
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
				throw new Error(result.error || 'Evaluation failed');
			}
		} catch (error) {
			clientLogger.debug({ err: error }, 'Submission error');
			submitError =
				error instanceof Error ? error.message : 'Failed to submit application. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	let applicantFormRef: ApplicantFormSecured | null = $state(null);
	let applicantNextEnabled = $state(false);
	let applicantDisabledReason = $state('');
	let singleApplicantProfileComplete = $state(false);

	// 2-phase restore state
	let pendingRestore: PendingRestore | null = $state(null);

	function confirmAndTrackUndo() {
		if (!pendingRestore) return;
		commitApplicantRestore(pendingRestore);
		pendingRestore = null;
	}

	// ── Single-applicant flattened income flow state ──────────────
	let editingEntry = $state<IncomeSourceEntry | null>(null);
	let profileSelectionError = $state<string | null>(null);

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

	let currentApplicantData = $derived(formState.applicants[0] ?? {});
	let selectedProfiles = $derived<IncomeProfileType[]>(
		(currentApplicantData?.selectedIncomeProfiles as IncomeProfileType[]) ?? []
	);
	let incomeEntries = $derived<IncomeSourceEntry[]>(
		(currentApplicantData?.incomeEntries as IncomeSourceEntry[]) ?? []
	);
	let answersContext = $derived({
		...(currentApplicantData ?? {}),
		...(formState.applicationData ?? {}),
		isNRI: currentApplicantData?.isNRI ?? 'No'
	});

	// ── Locked profiles for single-applicant secured loans ──────
	let singleLockedProfiles = $derived.by((): IncomeProfileType[] => {
		if (!isSingleApplicant) return [];
		const mandatoryTypes: IncomeProfileType[] = [];
		if (currentApplicantData?.applicantSubType === 'sole_proprietor') {
			mandatoryTypes.push('business_proprietorship' as IncomeProfileType);
		}
		return mandatoryTypes;
	});

	$effect(() => {
		if (singleLockedProfiles.length === 0) return;
		const current = (currentApplicantData?.selectedIncomeProfiles as IncomeProfileType[]) ?? [];
		const missing = singleLockedProfiles.filter((p) => !current.includes(p));
		if (missing.length > 0) {
			const withoutExclusive = current.filter((p) => p !== 'no_current_income');
			const merged = [...withoutExclusive, ...missing];
			const newList = [...formState.applicants];
			newList[0] = {
				...newList[0],
				selectedIncomeProfiles: merged,
				employmentType: deriveLegacyEmploymentType(merged)
			};
			formState.replaceApplicants(newList);
		}
	});

	// ── Single-applicant income handlers ─────────────────────────
	// Stash for recoverable entries when a profile is deselected
	let stashedEntries = $state<Record<string, IncomeSourceEntry[]>>({});

	function handleProfileSelectionChange(profiles: IncomeProfileType[]) {
		const list = formState.applicants;
		const newList = [...list];
		const current = newList[0];
		const prevProfiles = (current.selectedIncomeProfiles ?? []) as IncomeProfileType[];
		const currentEntries = (current.incomeEntries ?? []) as IncomeSourceEntry[];

		// Find removed profiles
		const removedProfiles = prevProfiles.filter((p: IncomeProfileType) => !profiles.includes(p));
		// Find newly added profiles (may have been stashed)
		const addedProfiles = profiles.filter((p: IncomeProfileType) => !prevProfiles.includes(p));

		// Stash entries for removed profiles
		if (removedProfiles.length > 0) {
			const newStash = { ...stashedEntries };
			for (const rp of removedProfiles) {
				const entriesToStash = currentEntries.filter(
					(e: IncomeSourceEntry) => e.profileType === rp
				);
				if (entriesToStash.length > 0) {
					newStash[rp] = entriesToStash;
				}
			}
			stashedEntries = newStash;
		}

		// Remove entries for deselected profiles
		let updatedEntries = currentEntries.filter(
			(e: IncomeSourceEntry) => !removedProfiles.includes(e.profileType)
		);

		// Restore stashed entries for re-selected profiles
		for (const ap of addedProfiles) {
			if (stashedEntries[ap] && stashedEntries[ap].length > 0) {
				updatedEntries = [...updatedEntries, ...stashedEntries[ap]];
				const newStash = { ...stashedEntries };
				delete newStash[ap];
				stashedEntries = newStash;
			}
		}

		newList[0] = {
			...current,
			selectedIncomeProfiles: profiles,
			employmentType: deriveLegacyEmploymentType(profiles),
			incomeEntries: updatedEntries
		};
		formState.replaceApplicants(newList);
		profileSelectionError = null;
	}

	function handleAddEntry(entry: IncomeSourceEntry) {
		const newList = [...formState.applicants];
		const current = newList[0];
		const entries = [...(current.incomeEntries ?? []), entry];
		newList[0] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);
	}

	function handleUpdateEntry(entry: IncomeSourceEntry) {
		const newList = [...formState.applicants];
		const current = newList[0];
		const entries = (current.incomeEntries ?? []).map((e: IncomeSourceEntry) =>
			e.id === entry.id ? entry : e
		);
		newList[0] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);
		editingEntry = null;
	}

	function handleDeleteEntry(entryId: string) {
		const newList = [...formState.applicants];
		const current = newList[0];
		const entries = (current.incomeEntries ?? []).filter(
			(e: IncomeSourceEntry) => e.id !== entryId
		);
		newList[0] = { ...current, incomeEntries: entries };
		formState.replaceApplicants(newList);
	}

	function handleCreditScoreChange(answers: Record<string, unknown>) {
		const newList = [...formState.applicants];
		const mapped: Record<string, unknown> = {};
		if ('creditScore' in answers) mapped.creditScore = answers.creditScore;
		if ('whyLowCredit' in answers) mapped.whyPrimaryLowCredit = answers.whyLowCredit;
		if ('creditFactorsAnswered' in answers)
			mapped.creditFactorsAnswered = answers.creditFactorsAnswered;
		if ('creditFactorAnswers' in answers) mapped.creditFactorAnswers = answers.creditFactorAnswers;
		if ('creditFactorReasons' in answers) mapped.creditFactorReasons = answers.creditFactorReasons;
		// Graduated credit signal fields — persist for navigation restore
		if ('creditHistoryStatus' in answers) mapped.creditHistoryStatus = answers.creditHistoryStatus;
		if ('emiBounceCount' in answers) mapped.emiBounceCount = answers.emiBounceCount;
		if ('defaultSettlementStatus' in answers)
			mapped.defaultSettlementStatus = answers.defaultSettlementStatus;
		if ('recentEnquiryCount' in answers) mapped.recentEnquiryCount = answers.recentEnquiryCount;
		if ('bounceReason' in answers) mapped.bounceReason = answers.bounceReason;
		if ('defaultReason' in answers) mapped.defaultReason = answers.defaultReason;
		if ('enquiryReason' in answers) mapped.enquiryReason = answers.enquiryReason;
		newList[0] = { ...newList[0], ...mapped };
		formState.replaceApplicants(newList);
	}

	function handleObligationUpdate(data: Record<string, any>) {
		const newList = [...formState.applicants];
		newList[0] = { ...newList[0], ...data };
		formState.replaceApplicants(newList);
	}

	let checkEveryApplicantNRI = $derived(
		formState.applicants?.length > 0
			? formState.applicants.every((item) => (item as any)?.isNRI === 'Yes')
			: false
	);

	// ── Completion flag sync for single-applicant flattened flow ──
	$effect(() => {
		if (!isSingleApplicant) return;
		const applicant = formState.applicants[0];
		if (!applicant) return;
		const completion = computeSectionCompletion(applicant);
		const allComplete =
			completion.income_profiles &&
			completion.income_details &&
			completion.credit_score &&
			(applicant.ObligationsRunning !== 'Yes' || completion.obligations_details);
		if (applicant.__completion !== allComplete) {
			queueMicrotask(() => {
				const newList = [...formState.applicants];
				newList[0] = { ...newList[0], __completion: allComplete };
				formState.replaceApplicants(newList);
			});
		}
	});

	// Aggregate cross-applicant ownership invariant: per-Company totals must
	// stay <= 100%. Surfaces drift introduced after the DirectorCards commit
	// step (inline edits, name-matched auto-linked Individuals, restore).
	// See validateCompanyOwnershipTotals docs for the rationale.
	let companyOwnershipViolations = $derived(
		validateCompanyOwnershipTotals(
			formState.applicants as Array<Record<string, unknown>>
		)
	);

	let incomeValueCheck = $derived.by(() => {
		if (!formState.applicants?.length) return false;

		let check = formState.applicants.every((item: any) => {
			if (item?.applicantType === 'Company') {
				return item?.companyCompletion === true || item?.__completion === true;
			}
			return item?.__completion === true;
		});

		if (checkEveryApplicantNRI) {
			check = check && formState.applicationData?.gpaValidate;
		}

		// Block Next when any Company's declared ownership across its linked
		// Individuals exceeds 100%. Pitfall #26 — Next must surface a reason.
		if (check && companyOwnershipViolations.length > 0) {
			check = false;
		}

		return check;
	});

	// Reason surfaced on the disabled Next button when ownership is over.
	// Derived (not effect-written) so it doesn't race with ApplicantFormSecured,
	// which also drives applicantDisabledReason via bind.
	let ownershipDisabledReason = $derived.by(() => {
		if (companyOwnershipViolations.length === 0) return '';
		const first = companyOwnershipViolations[0];
		if (companyOwnershipViolations.length === 1) return first.message;
		const extra = companyOwnershipViolations.length - 1;
		return `${first.message} (+${extra} more company total${extra === 1 ? '' : 's'} over 100%)`;
	});
</script>

<Seo
	title="Plot Loan Application Form - DigitalDSA"
	description="Complete your Plot Loan application form online with DigitalDSA. Fast, secure, and easy process tailored for you."
/>

<FormShell
	wizardState={wizard}
	currentPageId={serverPage?.pageId}
	onNavigate={handleWizardNavigate}
	onApplicantStepChange={handleApplicantStepChange}
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
				<div class="flex w-full items-center justify-center rounded-t-xl bg-black py-2">
					<FormLogo />
				</div>
			{/if}
			<div
				class="inset-1 flex flex-col gap-4 {deviceState.isMobile || deviceState.isNative
					? 'rounded-b-xl'
					: 'rounded-xl'} px-2 py-4 md:p-6"
			>
				<div class="flex items-center justify-between">
					<div class="flex flex-col">
						<h2 class="text-titleText dark:text-white">
							{serverPage?.pageTitle || 'Loan Application'}
						</h2>
						<SaveIndicator {evaluating} />
						{#if serverPage?.pageDescription}
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								{@html serverPage?.pageDescription || ''}
							</p>
						{/if}
					</div>

					{#if !deviceState.isMobile && !deviceState.isNative}
						<FormLogo />
					{/if}
				</div>

				<FormStepContainer pageId={currentPage?.id} {direction} {evaluating}>
					{#if currentPage?.id == 'tellUsApplyingPage'}
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
							<ApplicantFormSecured
								bind:this={applicantFormRef}
								bind:isNextEnabled={applicantNextEnabled}
								bind:disabledReason={applicantDisabledReason}
								hideNavigation={true}
							/>
						</div>
						<!-- /pendingRestore block -->
					{:else if currentPage?.id === 'applicantProfilePage' && isSingleApplicant}
						<ApplicantProfilePage bind:isComplete={singleApplicantProfileComplete} />
					{:else if currentPage?.id === 'incomeProfilesPage' && isSingleApplicant}
						<IncomeProfileSelector
							{selectedProfiles}
							{answersContext}
							onSelectionChange={handleProfileSelectionChange}
							bind:error={profileSelectionError}
							loanName="Plot Loan"
							lockedProfiles={singleLockedProfiles}
						/>
					{:else if currentPage?.id === 'incomeDetailsPage' && isSingleApplicant}
						<div class="flex flex-col gap-6">
							<IncomeSourceForm
								{selectedProfiles}
								existingEntries={incomeEntries}
								onAddEntry={handleAddEntry}
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
						<!--
							S210: Pre-fix this read `combinedAnswers.loanVariant?.toString()` —
							that fed Plot's variant data into a scope-axis prop, so the
							BT-warning / Top-up-warning / DC-auto-imply substring checks never
							fired for Plot Loan. Now matches the other 5 loans' pattern
							(SCOPE from `loanType`). Closes D-incoming-5.
						-->
						<ObligationCapture
							loanProduct="Plot Loan"
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
										labelDescription={(question as any).labelDescription ?? ''}
										description={question.description ?? ''}
										descriptionText={(question as any).descriptionText}
										descriptionHeader={(question as any).descriptionHeader}
										modalWidth={(question as any).modalWidth}
										radioClass={(question as any).radioClass}
										labelClass={(question as any).labelClass}
										selectedClass={(question as any).selectedClass}
										optionContainerClass={(question as any).optionContainerClass}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={currentAnswers[question.bindsTo]?.toString() ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => {
											updateAnswer(question, value);
										}}
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
											pincodeErrors[question.bindsTo] = err;
										}}
									/>
								{:else if question.type === 'text' && question.uiType === 'monthYear'}
									<!-- MonthYearModal-backed date picker (Pitfall #19) -->
									<div class={(question as any).textFieldClass || ''}>
										{#if question.question}
											<label for={question.id} class="text-labelQuestion">
												{question.question}
												{#if question.required}<span class="label-required">*</span>{/if}
											</label>
										{/if}
										<DatePickerYearAndMonth
											id={question.id}
											questionId={question.bindsTo}
											value={currentAnswers[question.bindsTo]?.toString() || ''}
											minYear={(question.uiMeta as any)?.minYear ?? 2000}
											maxYear={(question.uiMeta as any)?.maxYear ?? null}
											introduceMonthIndia={(question.uiMeta as any)?.introduceMonthIndia ?? null}
											futureOnly={(question.uiMeta as any)?.futureOnly === true}
											onchange={(e) => {
												const val = typeof e === 'string' ? e : e?.detail;
												if (val !== undefined) {
													updateAnswer(question, val);
												}
											}}
										/>
									</div>
								{:else if question.type === 'currency'}
									<TextField
										loanName="Plot Loan"
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={(question.uiMeta as any)?.readonly === true &&
											(currentAnswers as any).ATSReady === ATS_READY_NO &&
											(currentAnswers as any).ATSvalue === ATS_MODE_SUGGESTION}
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
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={(question.uiMeta as any)?.readonly === true &&
											(currentAnswers as any).ATSReady === ATS_READY_NO &&
											(currentAnswers as any).ATSvalue === ATS_MODE_SUGGESTION}
										error={getServerError(question.id) || undefined}
										getLimitCheckerText={(question as any).limitCheckerText}
										getValue={(question as any).computedLimit != null
											? async () => (question as any).computedLimit
											: ''}
										onInput={(value: any) => {
											onTextFieldInput(value, question);

											if ((question.uiMeta as any)?.showAreaUnitDropdown) {
												const key = question.bindsTo || question.id;
												const unitKey = `${key}Unit`;

												if (!(currentAnswers as any)[unitKey]) {
													updateAnswerByKey(unitKey, 'Feet');
												}
											}
										}}
										modalWidth={(question.uiMeta as any)?.modalWidth}
										icon={(question.uiMeta as any)?.icon}
										placeholder={(question.uiMeta as any)?.placeholder || ''}
										showTitleDropdown={(question.uiMeta as any)?.showTitleDropdown ?? false}
										showAreaUnitDropdown={(question.uiMeta as any)?.showAreaUnitDropdown ?? false}
										areaUnit={currentAnswers[`${question.bindsTo || question.id}Unit`] || 'Feet'}
										onUnitChange={(unit: any) => {
											const key = question.bindsTo || question.id;
											updateAnswerByKey(`${key}Unit`, unit);
										}}
										title={(combinedAnswers as any)['title'] ?? ''}
										onTitleChange={(val: any) => updateTitle(question.id, val)}
										uiType={question.uiType ?? 'text'}
										enableNumberToWords={(question.uiMeta as any)?.showNumberInWords ?? false}
										fieldType={question.fieldType}
										maxLength={(question.uiMeta as any)?.maxLength}
									/>
									{#if question.id === 'q5_deposit' && downpaymentPercentage(currentAnswers as any)}
										<div class="mt-4 rounded bg-black p-4">
											<div class="grid grid-cols-2 gap-4">
												<div class="flex h-full flex-col justify-between">
													<h5 class="text-smallText mb-2 font-titleMedium text-white">
														Your deposit is:
													</h5>
													<div class="flex items-center gap-4">
														<span class="font-titleBold text-3xl text-white md:text-5xl">
															{downpaymentPercentage(currentAnswers as any)?.depositPercent}%
														</span>
														<p class="sm:text-smallText text-xs text-white italic">
															of the property value
														</p>
													</div>
												</div>
												<div class="flex h-full flex-col justify-between">
													<h5 class="text-smallText mb-2 font-titleMedium text-white">
														i.e. you're borrowing:
													</h5>
													<div class="flex items-center gap-4">
														<p class="text-start font-titleBold text-3xl text-white md:text-5xl">
															{downpaymentPercentage(currentAnswers as any)?.loanPercent}%
														</p>
														<p class="sm:text-smallText text-xs text-white italic">
															of the property value
														</p>
													</div>
												</div>
											</div>
											{#if (downpaymentPercentage(currentAnswers as any)?.depositPercent ?? 0) < 25}
												<div class="sm:text-smallText mt-4 text-xs text-white sm:mt-8">
													According to the loan-to-value (LTV) clause of the lenders, your down
													payment falls short of the required amount. You have the option to
													allocate some of your income towards <i
														class="text-primary underline underline-offset-4"
														>a Personal Loan to bridge this gap.</i
													>
													<br /><br />
													Our AI will recommend several lenders who can help you secure the property by
													offering favorable options, such as combining a Home Loan with a Personal Loan
													for the down payment.
												</div>
											{/if}
										</div>
									{/if}
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
										label={question.question}
										description={question.description ?? ''}
										selectClass={(question as any).selectClass}
										subLabel={(question as any).subLabel}
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
										label={question.question}
										description={question.description ?? ''}
										subLabel={(question as any).subLabel}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={(currentAnswers as any)[question.bindsTo] ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										required={question.required ?? false}
										icon={(question.uiMeta as any)?.icon}
										disabled={(question.id === 'q2_propertyCityName' &&
											!(currentAnswers as any)['propertyStateName']) ||
											(question.id === 'q5_residenceCityName' &&
												!(currentAnswers as any)['residenceStateName'])}
									/>
								{:else if question.type === 'multiple-select' || question.type === 'multiple-select-toggle'}
									<MultipleSelectField
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										descriptionHeader={(question as any).descriptionHeader ?? ''}
										multipleSelectClass={(question as any).multipleSelectClass}
										options={getFilteredOptions(question.options, combinedAnswers)}
										selectedValues={Array.isArray((currentAnswers as any)[question.bindsTo])
											? ((currentAnswers as any)[question.bindsTo] as (string | number)[])
											: []}
										error={getServerError(question.id) || undefined}
										onChange={(values: any) => updateAnswer(question, values)}
										required={question.required ?? false}
										disabled={(question.uiMeta as any)?.readonly ?? false}
										maxSelection={
											// Plot Loan scope values are only 'New Loan' / 'Balance Transfer Only'
											// (no 'Top-up Only' — that's a Home/LAP scope). This conditional
											// was copy-pasted from Home/LAP and never fires here.
											null
										}
									/>
								{/if}

								{#if question.whyAsked}
									<p class="mt-2 text-xs leading-relaxed text-[var(--form-text-muted)]">
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
		{@const onTellUs = currentPage?.id === 'tellUsApplyingPage'}
		{@const applicantStep = formState.applicantPageIndex}
		{@const atIncome = onTellUs && applicantStep >= 3}
		{@const atApplicantSteps = onTellUs && applicantStep < 3}
		<FormNavigationBar
			showPrevious={true}
			showNext={atApplicantSteps ? true : !isLastPage}
			showSubmit={atApplicantSteps ? false : isLastPage}
			nextDisabled={atIncome
				? !incomeValueCheck
				: onTellUs
					? !applicantNextEnabled
					: useValidateOnClick && !wasPageComplete && !hasInputErrors()
						? false
						: !isNextEnabled}
			disabledReason={onTellUs
				? ownershipDisabledReason || applicantDisabledReason
				: ''}
			submitDisabled={atIncome ? !incomeValueCheck : !isNextEnabled}
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
				if (onTellUs) {
					const handled = applicantFormRef?.navigatePrevious();
					if (!handled) goPrev();
				} else {
					goPrev();
				}
			}}
			onNext={async () => {
				// ── Not on applicant page → standard navigation ──
				if (!onTellUs) {
					// Flush any pending debounced evaluate so cross-field validation
					// rules see the very latest answers. See home-loan +page.svelte
					// for the canonical comment.
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
						scrollToFirstError();
					}
					return;
				}

				// ── On tellUs: income step (≥3) — same for single & multi ──
				if (applicantStep >= 3) {
					if (incomeValueCheck) {
						goNext();
					} else {
						scrollToFirstError();
					}
					return;
				}

				// ── On tellUs: pre-income steps (0–2) ──
				if (isSingleApplicant) {
					if (applicantStep === 0 || applicantStep === -1) {
						if (applicantFormRef?.validate()) {
							if (formState.applicants[0]?.applicantType === 'Company') {
								// Company applicant: stay inside tellUs for internal income flow (Step 3)
								applicantFormRef?.navigateNext();
							} else {
								const _ind = formState.applicants.filter((a) => a.applicantType === 'Individual');
								const _allNRI = _ind.length > 0 && _ind.every((a) => (a as any).isNRI === 'Yes');
								if (_allNRI) {
									applicantFormRef?.navigateNext();
								} else {
									goNext();
								}
							}
						}
					} else if (applicantStep === 1) {
						applicantFormRef?.navigateNext();
					} else if (applicantStep === 2) {
						goNext();
					}
				} else {
					// Multi-applicant: delegate to component for internal navigation
					applicantFormRef?.navigateNext();
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
		handleRestoreModalConfirm(match, applicantFormRef, (m) => {
			// Plot-loan uses 2-phase restore: prefill now, commit on banner confirm
			const result = prefillApplicantRestore(m);
			if (result) {
				pendingRestore = result.pending;
				return result.cardId;
			}
			return null;
		});
	}}
	onCancel={() => handleRestoreModalCancel()}
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
