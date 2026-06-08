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
	import {
		clearAllRelationships,
		userRelationships
	} from '$lib/components/relationship-capture/relationshipStore';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { clearFormAndGotoPicker } from '$lib/utils/clearFormAndGotoPicker';
	import { ToWords } from 'to-words';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { HOME_ONLY_KEYS, PLOT_ONLY_KEYS } from '$lib/config/securedLoanKeys.js';
	import TextField from '$lib/components/TextField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import MultipleSelectField from '$lib/components/MultipleSelectField.svelte';
	import DatePickerYearAndMonth from '$lib/components/DatePickerYearAndMonth.svelte';

	import { deviceState } from '$lib/stores/device.svelte';
	import FormLogo from '$lib/components/FormLogo.svelte';
	import type { Answers, LoanDataStore } from '$lib/types/formTypes';
	import type { PageResponse, ClientQuestion } from '$lib/types/formEngine';
	import Seo from '$lib/components/Seo.svelte';
	import ApplicantFormSecured from '$lib/components/ApplicantFormSecured.svelte';
	import ApplicantProfilePage from '$lib/components/ApplicantProfilePage.svelte';
	import RestoreApplicantModal from '$lib/components/RestoreApplicantModal.svelte';
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
	import { getCleanPayload, getCasePayload } from '$lib/stores/cleanPayloadStore.svelte';
	import { confirmAndSubmit } from '$lib/utils/confirmAndSubmit';
	import { reconcileBeforeSubmit } from '$lib/utils/preSubmitReconciler';
	import { setupUnsavedGuard } from '$lib/utils/formUnsavedGuard';
	import { dialogState } from '$lib/state/dialog.svelte';
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
		isFieldAnswered,
		isQuestionAnswered
	} from '$lib/utils/formWizardEngine';
	import { lapLoanConfig } from '$lib/config/wizardConfigs/lapLoan';
	import {
		FormShell,
		FormStepContainer,
		FormNavigationBar,
		createWizardState,
		CityLoadingOverlay
	} from '$lib/components/form-wizard';
	import SaveIndicator from '$lib/components/form-wizard/SaveIndicator.svelte';
	import { lapLoanSections } from '$lib/config/wizardSections/lapLoan';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import {
		handleRestoreModalConfirm,
		handleRestoreModalCancel
	} from '$lib/utils/directorRestoreHandler';
	import { createFormAutoScroll } from '$lib/utils/formAutoScroll';
	import IncomeProfileSelector from '$lib/components/IncomeProfileSelector.svelte';
	import IncomeSourceForm from '$lib/components/IncomeSourceForm.svelte';
	import IncomeSourceEntries from '$lib/components/IncomeSourceEntries.svelte';
	import CreditScoreSection from '$lib/components/CreditScoreSection.svelte';
	import ObligationCapture from '$lib/components/ObligationCapture.svelte';
	import { computeSectionCompletion } from '$lib/utils/incomeTabState';
	import { deriveLegacyEmploymentType } from '$lib/config/incomeProfiles';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
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

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const telemetry = new BehaviorTelemetry();

	// svelte-ignore state_referenced_locally — intentional: capture SSR initial page once, overwritten by evaluateOnServer
	let serverPage = $state<PageResponse | null>(data.formEngine?.initialPage ?? null);
	let evaluating = $state(false);
	let showCityLoadingModal = $state(false);
	let evaluateTimer: ReturnType<typeof setTimeout> | null = null;

	let gstStateError = $state('');
	let formSessionId = $state<string | undefined>(undefined);

	// Component state
	const toWords = new ToWords();
	let selectedLoan = $state<string>('');
	let currentPageIndex = $state<number>(0);
	let numberWordsMap = $state<Record<string, string>>({});
	let resultData = $state<unknown>(null);
	let isSubmitting = $state(false);
	let applicantFormRef: ApplicantFormSecured | null = $state(null);
	let applicantNextEnabled = $state(false);
	let applicantDisabledReason = $state('');

	// 2-phase restore state
	let pendingRestore: PendingRestore | null = $state(null);

	function confirmAndTrackUndo() {
		if (!pendingRestore) return;
		commitApplicantRestore(pendingRestore);
		pendingRestore = null;
	}
	let singleApplicantProfileComplete = $state(false);
	let submitError = $state<string | null>(null);
	let submitValidationErrors = $state<Array<{ label: string; pageIndex: number }>>([]);
	let payloads = $state<Record<string, unknown[]>>({});
	let direction = $state<1 | -1>(1);

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

	// Session resume state
	let showResumeModal = $state(false);
	let resumeIndexPending = $state<number | null>(null);
	let resumeHandled = $state(false);
	const initialSavedPageIndex = formState.lapPageIndex;
	let formReady = $state(false);

	// Guards for preventing infinite loops in effects
	let lastAnswersHash = '';
	let lastBackHistoryState = '';
	let lastPageIndex = -1;

	// ── Server evaluation functions ──────────────────────────────
	async function evaluateOnServer(pageIndex: number) {
		// Build evaluation answers using shared utility — includes applicant metadata,
		// income profiles, obligations, and LAP-specific extra fields (LAPType)
		const answers = buildEvaluationAnswers(selectedLoan, lapLoanConfig.extraPayloadFields);

		try {
			evaluating = true;
			const payload = {
				loanType: 'Loan Against Property',
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

	// See home-loan +page.svelte for the rationale on the 1500ms window —
	// short enough that errors appear on a real pause, long enough that
	// typing digits with normal cadence doesn't trigger mid-input server
	// responses.
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

	let pincodeErrors = $state<Record<string, string>>({});

	/** Scoped to current page's visible questions only. */
	function hasInputErrors(): boolean {
		return hasInputErrorsShared(visibleQuestions, inputErrorsState);
	}

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

	let isLastPage = $derived(!evaluating && currentPageIndex === (visiblePages?.length ?? 1) - 1);

	// ── Page index persistence ───────────────────────────────────
	$effect(() => {
		if (!resumeHandled) return;
		if (currentPageIndex !== lastPageIndex) {
			lastPageIndex = currentPageIndex;
			formState.lapPageIndex = currentPageIndex;
		}
	});

	onMount(() => {
		if (!assertLoanRoute('Loan Against Property')) return;
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
						goto(`/form/lap?error=edit_failed`);
						return;
					}
					const result = await res.json();
					if (result.success && result.data?.snapshots?.length > 0) {
						formState.fromJSON(securedClone(result.data.snapshots[0].payload));
						selectedLoan = 'Loan Against Property'; // LAP-specific
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
			// back into formState.lapPageIndex, destroying the user's place
			// in the form. Rehydrating BEFORE flipping resumeHandled makes
			// the sync effect's first read a no-op.
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
		selectedLoan = 'Loan Against Property';
		formState.clearForLoanType('secured');
		formState.setApplicationField('loanCategory' as any, 'secured' as any);
		formState.clearApplicationFields([...HOME_ONLY_KEYS, ...PLOT_ONLY_KEYS]);

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
		sectionConfig: lapLoanSections,
		getVisiblePages: () => visiblePages,
		getAnswers: () => currentAnswers,
		getCombinedAnswers: () => combinedAnswers,
		isQuestionVisible: () => true, // Server already filtered visible questions
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

	// ── Back history and resume effects ──────────────────────────
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

	// ── Answer management ────────────────────────────────────────
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
		// Always write — `null` here means the user cleared the field, and
		// dropping the write left the old value lingering in currentAnswers
		// (Issue #1/#4: cleared digit reappeared on navigation back).
		updateAnswerByKey(key, value);

		if (key === 'propertyStateName') {
			updateAnswerByKey('propertyCityName', '');
			updateAnswerByKey('propertyPincode', '');
		} else if (key === 'applicantResidingInProperty') {
			if (value === 'Yes') {
				// Clear occupancy status — not needed when applicants live there
				updateAnswerByKey('propertyOccupancyStatus', '');
			}
		}

		if (value == 'Individual / Sole-Proprietor') {
			updateAnswerByKey('numberOfDirectorOrApplicant', 1);
		} else if (value == 'Couple') {
			updateAnswerByKey('numberOfDirectorOrApplicant', 2);
		} else if (value === 'Family') {
			const numApplicants = (currentAnswers as Record<string, unknown>)
				?.numberOfDirectorOrApplicant;
			if (numApplicants === 1) {
				// Do nothing - can't set null with updateAnswerByKey
			}
		}

		// Fetch dependent options when state changes (state→city resolution)
		if (key === 'propertyStateName' || key === 'residenceStateName') {
			showCityLoadingModal = true;
			fetchDependentCityOptions(key, value as string);
		}
	}

	// ── Targeted option fetch for state→city dependencies ──
	const cityQuestionMap = lapLoanConfig.cityQuestionMap;

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

	// ── Payload and navigation ───────────────────────────────────
	function payLoad(pageIndex: number) {
		collectPayload(payloads, pageIndex, visibleQuestions);
	}

	function goNext(): void {
		direction = 1;
		evaluating = true;
		submitError = null;
		submitValidationErrors = [];
		const currentPid = visiblePages?.[currentPageIndex]?.id ?? '';
		if (currentPid !== 'tellUsApplyingPage' && !CUSTOM_INCOME_PAGES.has(currentPid)) {
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

	// ── Text input and number handling ────────────────────────────
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
				// Digits only
				if (/^\d*$/.test(val) || val === '') {
					const numVal = val === '' ? null : Number(val);
					handleNumberInput(numVal, question);
				}
			}
		} else {
			updateAnswer(question, val);
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

	// ── Sync applicants data to the main form store ──────────────
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

	$effect(() => {
		const hash = JSON.stringify(currentAnswers);
		if (hash !== lastAnswersHash) {
			lastAnswersHash = hash;
			formState.replaceApplicationData({ ...formState.applicationData, ...currentAnswers } as any);
		}
	});

	// ── Submission ───────────────────────────────────────────────
	// (S214, TECH-DEBT-CLEANUP D7) The `loanTransaction = $state(...)` declaration
	// that used to live here was scaffolding for the now-removed `formattedPayload`
	// shaped for the archived `bank-loan-management` API. Live submission uses
	// `confirmAndSubmit({ formStateJson: formState.toJSON(), ... })` directly.
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
			const validationErrors: string[] = [];

			// (S214, TECH-DEBT-CLEANUP D7) The block from here through line ~995 used
			// to build a `loanTransaction` state + `finalApplicants` array +
			// `formattedPayload` object with PascalCase fields (LoanName, LoanType,
			// LAPType) shaped for the now-archived `bank-loan-management` external
			// API in src/lib/services/_archive/homeLoanApi-S214.ts. Nothing in the
			// live tree sent that payload anywhere — actual submission uses
			// `confirmAndSubmit({ formStateJson: formState.toJSON(), ... })` (live
			// flow per docs/OFFERS-ARCHITECTURE.md). The only consumer of
			// `formattedPayload` was the existence-check validation block below,
			// which now reads directly from `combinedAnswers`. The construction
			// chain was removed as part of D7 archival; see ADR-0020 + ADR-0024.

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

			// Existence-check validation — was previously read from the now-removed
			// `formattedPayload.loanTransaction.LoanName / .LoanType`. Reads from the
			// canonical `combinedAnswers` directly post-S214 D7.
			if (!combinedAnswers.loanName)
				validationErrors.push('Loan Name is required — go to "How Can We Help?"');
			if (!combinedAnswers.loanType)
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

			const result = await confirmAndSubmit(
				{
					loanType: 'Loan Against Property',
					loanDisplayName: 'Loan Against Property',
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
			submitError =
				error instanceof Error ? error.message : 'Failed to submit application. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	// ── Derived NRI and income completion checks ─────────────────
	let checkEveryApplicantNRI = $derived(
		formState.applicants?.length > 0
			? formState.applicants.every((item: any) => item?.isNRI === 'Yes')
			: false
	);

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

		let check = formState.applicants.every((item: any) => {
			if (item?.applicantType === 'Company') {
				return item?.companyCompletion === true || item?.__completion === true;
			}
			return item?.__completion === true;
		});

		if (checkEveryApplicantNRI) {
			check = check && formState.applicationData?.gpaValidate;
		}

		if (check && companyOwnershipViolations.length > 0) {
			check = false;
		}

		return check;
	});

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
	let stashedEntries = $state<Record<string, IncomeSourceEntry[]>>({});

	function handleProfileSelectionChange(profiles: IncomeProfileType[]) {
		const list = formState.applicants;
		const newList = [...list];
		const current = newList[0];
		const prevProfiles = (current.selectedIncomeProfiles ?? []) as IncomeProfileType[];
		const currentEntries = (current.incomeEntries ?? []) as IncomeSourceEntry[];

		const removedProfiles = prevProfiles.filter((p: IncomeProfileType) => !profiles.includes(p));
		const addedProfiles = profiles.filter((p: IncomeProfileType) => !prevProfiles.includes(p));

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

		let updatedEntries = currentEntries.filter(
			(e: IncomeSourceEntry) => !removedProfiles.includes(e.profileType)
		);

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
</script>

<Seo
	title="Loan Against Property Application Form - DigitalDSA"
	description="Complete your Loan Against Property application form online with DigitalDSA. Fast, secure, and easy process tailored for you."
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
							loanName="Loan Against Property"
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
						<ObligationCapture
							loanProduct="Loan Against Property"
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
										radioClass={(question as any).radioClass}
										labelClass={(question as any).labelClass}
										optionContainerClass={(question as any).optionContainerClass}
										description={question.description ?? ''}
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
										loanName="LAP"
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
										id={question.id}
										label={question.question}
										textFieldClass={(question as any).textFieldClass}
										description={question.description ?? ''}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={(question.uiMeta as any)?.readonly ?? false}
										error={getServerError(question.id) || undefined}
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
										icon={(question.uiMeta as any)?.icon}
										placeholder={(question.uiMeta as any)?.placeholder || ''}
										showTitleDropdown={(question.uiMeta as any)?.showTitleDropdown ?? false}
										showAreaUnitDropdown={(question.uiMeta as any)?.showAreaUnitDropdown ?? false}
										areaUnit={(currentAnswers as any)[`${question.bindsTo || question.id}Unit`] ||
											'Feet'}
										onUnitChange={(unit: any) => {
											const key = question.bindsTo || question.id;
											updateAnswerByKey(`${key}Unit`, unit);
										}}
										title={(combinedAnswers as any)[question.id + '_title'] ?? ''}
										onTitleChange={(val: any) => updateTitle(question.id, val)}
										uiType={question.uiType ?? 'text'}
										fieldType={question.fieldType}
										enableNumberToWords={(question.uiMeta as any)?.showNumberInWords ?? false}
										maxLength={(question.uiMeta as any)?.maxLength}
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
										label={question.question}
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
										label={question.question}
										subLabel={(question as any).subLabel}
										description={question.description ?? ''}
										options={getFilteredOptions(question.options, combinedAnswers)}
										value={(currentAnswers as any)[question.bindsTo] ?? ''}
										error={getServerError(question.id) || undefined}
										onChange={(value: any) => updateAnswer(question, value)}
										required={question.required ?? false}
										icon={(question.uiMeta as any)?.icon}
										disabled={(question.id === 'q3_propertyCityName' &&
											!(currentAnswers as any)['propertyStateName']) ||
											(question.id === 'q6_residenceCityName' &&
												!(currentAnswers as any)['residenceStateName'])}
									/>
								{:else if question.type === 'multiple-select'}
									<MultipleSelectField
										id={question.id}
										label={question.question}
										multipleSelectClass={(question as any).multipleSelectClass}
										description={question.description ?? ''}
										options={getFilteredOptions(question.options, combinedAnswers)}
										selectedValues={Array.isArray((currentAnswers as any)[question.bindsTo])
											? ((currentAnswers as any)[question.bindsTo] as (string | number)[])
											: []}
										error={getServerError(question.id) || undefined}
										onChange={(values: any) => updateAnswer(question, values)}
										required={question.required ?? false}
										maxSelection={question.id === 'q2_assessmentLenders' &&
										(combinedAnswers as any).loanType === 'Top-up Only'
											? 1
											: null}
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
		{@const onTellUs = currentPage?.id === 'tellUsApplyingPage'}
		{@const applicantStep = formState.applicantPageIndex}
		{@const isIndividual = combinedAnswers?.tellUsApplying !== 'Company (Non-individual entity)'}
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
		/* user-select: none; */
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
