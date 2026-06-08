<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { assertLoanRoute } from '$lib/utils/loanRouteGuard.svelte';
	import { page } from '$app/stores';
	import { secureFetch } from '$lib/utils/csrf';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { fetchQuestionOptions } from '$lib/utils/formOptionFetcher';
	import { resolveSingleAuthorityForCity } from '$lib/utils/developmentAuthorityLookup';
	import { formState } from '$lib/state/form.svelte';
	import { ToWords } from 'to-words';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import { goto } from '$app/navigation';
	import { ROUTES } from '$lib/config/routes.js';
	import { LAP_ONLY_KEYS, PLOT_ONLY_KEYS } from '$lib/config/securedLoanKeys.js';
	import { bankData } from '$lib/config/bankSelection/bankName';
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
	import DescriptionCard from '$lib/components/DescriptionCard.svelte';
	import CheckboxField from '$lib/components/CheckboxField.svelte';
	import { roundNum } from '$lib/utils/roundNumber';
	import AddApplicant from '$lib/components/AddApplicant.svelte';
	import LocationGroup from '$lib/components/LocationGroup.svelte';
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
	import { homeLoanConfig } from '$lib/config/wizardConfigs/homeLoan';
	import {
		FormShell,
		FormStepContainer,
		FormNavigationBar,
		createWizardState
	} from '$lib/components/form-wizard';
	import SaveIndicator from '$lib/components/form-wizard/SaveIndicator.svelte';
	import { scrollToFirstError } from '$lib/utils/scrollToFirstError';
	import { createFormAutoScroll } from '$lib/utils/formAutoScroll';
	import {
		handleRestoreModalConfirm,
		handleRestoreModalCancel
	} from '$lib/utils/directorRestoreHandler';
	import { homeLoanSections } from '$lib/config/wizardSections/homeLoan';
	import ApplicantFormSecured from '$lib/components/ApplicantFormSecured.svelte';
	import ApplicantProfilePage from '$lib/components/ApplicantProfilePage.svelte';
	import IncomeProfileSelector from '$lib/components/IncomeProfileSelector.svelte';
	import IncomeSourceForm from '$lib/components/IncomeSourceForm.svelte';
	import IncomeSourceEntries from '$lib/components/IncomeSourceEntries.svelte';
	import CreditScoreSection from '$lib/components/CreditScoreSection.svelte';
	import ObligationCapture from '$lib/components/ObligationCapture.svelte';
	import { computeSectionCompletion } from '$lib/utils/incomeTabState';
	import { deriveLegacyEmploymentType, getDropdownLabel } from '$lib/config/incomeProfiles';
	import {
		CircleCheck,
		CircleAlert,
		FileText,
		AlertTriangle,
		Lightbulb
	} from '$lib/utils/iconRegistry';
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
		undoApplicantRestore,
		type PendingRestore,
		type UndoableRestore
	} from '$lib/utils/applicantRestoreHandler';
	import PendingRestoreBanner from '$lib/components/PendingRestoreBanner.svelte';
	import {
		clearAllRelationships,
		userRelationships
	} from '$lib/components/relationship-capture/relationshipStore';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import type { PageData } from './$types';
	import { getCleanPayload, getCasePayload } from '$lib/stores/cleanPayloadStore.svelte';
	import { confirmAndSubmit } from '$lib/utils/confirmAndSubmit';
	import { reconcileBeforeSubmit } from '$lib/utils/preSubmitReconciler';
	import { setupUnsavedGuard } from '$lib/utils/formUnsavedGuard';
	import { isReloadOfCurrentPath } from '$lib/utils/isReloadOfCurrentPath';
	import { computePageIndexOnRemount } from '$lib/utils/loanPageIndexRestore';
	import { clearFormAndGotoPicker } from '$lib/utils/clearFormAndGotoPicker';
	import { validateCompanyOwnershipTotals } from '$lib/utils/sameCompanySync';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { BehaviorTelemetry } from '$lib/utils/behaviorTelemetry';
	import HoneypotField from '$lib/components/form/HoneypotField.svelte';
	import { dev } from '$app/environment';
	import clientLogger from '$lib/utils/clientLogger';
	import { securedClone } from '$lib/utils/securedClone';
	import { buildCombinedAnswersSecured, stableReference } from '$lib/utils/combinedAnswersMemo';
	import { v4 as uuidv4 } from 'uuid';

	const telemetry = new BehaviorTelemetry();

	// Lazy-load Razorpay checkout.js on first click of "Buy Coins".
	// Why: loading it globally in +layout.svelte makes Razorpay's script
	// preload its internal chunks on every page mount, producing hundreds
	// of unused-preload warnings as the user navigates without ever opening
	// the checkout. Memoized so repeat clicks don't re-inject the tag.
	let razorpayCheckoutPromise: Promise<void> | null = null;
	const loadRazorpayCheckout = (): Promise<void> => {
		if (razorpayCheckoutPromise) return razorpayCheckoutPromise;
		razorpayCheckoutPromise = new Promise((resolve, reject) => {
			if (typeof window === 'undefined') {
				reject(new Error('Razorpay checkout requires a browser environment'));
				return;
			}
			// Already loaded by a prior call or a previous session restore.
			if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
				resolve();
				return;
			}
			const tag = document.createElement('script');
			tag.src = 'https://checkout.razorpay.com/v1/checkout.js';
			tag.async = true;
			tag.onload = () => resolve();
			tag.onerror = () => {
				razorpayCheckoutPromise = null; // allow retry on next click
				reject(new Error('Failed to load Razorpay checkout script'));
			};
			document.head.appendChild(tag);
		});
		return razorpayCheckoutPromise;
	};

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const toWords = new ToWords();
	let selectedLoan = $state<string>('');
	let currentPageIndex = $state<number>(0);
	let numberWordsMap = $state<Record<string, string>>({});
	let gstStateError = $state('');
	let isSubmitting = $state(false);
	let resultData = $state<unknown>(null);
	let showResumeModal = $state(false);
	let resumeIndexPending = $state<number | null>(null);
	let resumeHandled = $state(false);
	let direction = $state<1 | -1>(1);
	let formSessionId = $state<string | undefined>(undefined);
	let loadingEditSnapshot = $state(false);

	// ── City + Pincode loading messages ──
	const MIN_LOADING_MSG_MS = 2000;
	let loadingCities = $state(false);
	let lastCityLoadState = '';
	/** True ONLY when user explicitly picks a state — never on reload/resume/navigation */
	let showCityLoadingModal = $state(false);

	// ── Pincode typeahead ──
	/** All pincodes for the selected state, grouped by city */
	let loadingPincodes = $state(false);
	let loadingPincodesTimer: ReturnType<typeof setTimeout> | null = null;
	/** True ONLY when user explicitly picks a state — never on reload/resume/navigation */
	let showPincodeLoadingModal = $state(false);
	let pincodeStateMap = $state<Record<string, Array<{ pincode: string; area: string }>>>({});
	let pincodeQuery = $state('');
	let showPincodeSuggestions = $state(false);

	/** Filtered list: matches selected city + typed prefix */
	let filteredPincodes = $derived.by(() => {
		if (pincodeQuery.length < 3) return [];
		const city = (currentAnswers['propertyCityName'] as string) || '';
		const cityPincodes = pincodeStateMap[city] ?? [];
		if (cityPincodes.length === 0) return [];
		return cityPincodes.filter((p) => p.pincode.startsWith(pincodeQuery)).slice(0, 8);
	});

	/** Pincode mismatch error — checks typed pincode against state/city data */
	let pincodeValidationError = $derived.by(() => {
		if (pincodeQuery.length < 3 || Object.keys(pincodeStateMap).length === 0) return '';
		const city = (currentAnswers['propertyCityName'] as string) || '';
		const state = (currentAnswers['propertyStateName'] as string) || '';
		const cityPincodes = pincodeStateMap[city] ?? [];

		// No pincode data for this city at all
		if (cityPincodes.length === 0 && city) return '';

		const hasMatch = cityPincodes.some((p) => p.pincode.startsWith(pincodeQuery));
		if (!hasMatch) {
			if (pincodeQuery.length === 6) {
				return `Pincode ${pincodeQuery} does not belong to ${city}, ${state}`;
			}
			return `No pincodes starting with ${pincodeQuery} found in ${city}`;
		}
		return '';
	});

	async function loadPincodesForState(state: string) {
		if (!state) {
			pincodeStateMap = {};
			return;
		}
		if (loadingPincodesTimer) clearTimeout(loadingPincodesTimer);
		loadingPincodes = true;
		const start = Date.now();
		try {
			const res = await fetch(`/api/pincodes?state=${encodeURIComponent(state)}`);
			if (res.ok) {
				const data = await res.json();
				pincodeStateMap = data.data?.pincodes ?? {};
			}
		} catch {
			pincodeStateMap = {};
		} finally {
			const remaining = MIN_LOADING_MSG_MS - (Date.now() - start);
			if (remaining > 0) {
				loadingPincodesTimer = setTimeout(() => {
					loadingPincodes = false;
					showPincodeLoadingModal = false;
				}, remaining);
			} else {
				loadingPincodes = false;
				showPincodeLoadingModal = false;
			}
		}
	}

	// ── Auto-set zone classification when "already_residential" ──
	// Session 32: When user selects "Already in residential zone" for converted land,
	// auto-set zoneClassification to RESIDENTIAL (zone question is hidden via showWhen).
	$effect(() => {
		const compliance = currentAnswers['propertyComplianceStatus'];
		const areaType = currentAnswers['propertyAreaType'];
		if (areaType === 'CONVERTED_RESIDENTIAL' && compliance === 'already_residential') {
			if (currentAnswers['zoneClassification'] !== 'RESIDENTIAL') {
				currentAnswers['zoneClassification'] = 'RESIDENTIAL';
			}
		}
	});

	// ── NBFC Risk Type Handling ──
	// When a user selects a drop-level option (riskType on option), check NBFC capabilities DB.
	// If no NBFC known for this risk in the property city → block Next button.
	let checkingNbfc = $state(false);
	let nbfcCheckResults = $state<Record<string, { found: boolean; nbfcName?: string }>>({});
	let nbfcContributing = $state(false);
	let nbfcContributionName = $state('');
	let nbfcSelectMode = $state<'select' | 'other'>('select');
	const nbfcOptions = bankData
		.filter((b) => b.Classification === 'NBFC')
		.map((b) => ({ label: b.label, value: b.value }));
	let lastRiskCheckKey = '';

	// Capture the persisted page index at script init time, BEFORE any $effect
	// can overwrite homeLoanPageIndex to 0 (since currentPageIndex starts at 0).
	const initialSavedPageIndex = formState.currentPageIndex;
	/** false until resume decision is complete + correct page data loaded — prevents Case Intake flash */
	let formReady = $state(false);

	// Guards for preventing infinite loops in effects
	let lastPageIndex = -1;
	let lastBackHistoryState = '';
	let lastAnswersHash = '';
	let lastATSCalc = '';
	// Tracks the last seen `ourSuggestionOrBySelf` (Suggestion Required / By Myself).
	// Used by the ATS-suggestion $effect to detect when the user just toggled INTO
	// Suggestion Required mode, so it can recompute even when the input fields
	// (propCost / dealValue / requireDownPayment / purchaseType) haven't changed.
	let lastATSMode = '';

	// svelte-ignore state_referenced_locally — intentional: capture SSR initial page once, overwritten by evaluateOnServer
	let serverPage = $state<PageResponse | null>(data.formEngine?.initialPage ?? null);
	let evaluating = $state(false);
	let evaluateTimer: ReturnType<typeof setTimeout> | null = null;

	// Counter prevents flicker: loader stays on until ALL in-flight evaluations complete
	let evalInFlight = 0;
	const MIN_LOADER_MS = 2000;
	/** True only during page transitions (Next/Previous/resume) — controls logo spinner */
	let navigating = $state(false);

	async function evaluateOnServer(pageIndex: number, isNavigation = false) {
		// Cancel any pending debounced evaluation to prevent flicker
		if (evaluateTimer) {
			clearTimeout(evaluateTimer);
			evaluateTimer = null;
		}

		// Build evaluation answers using shared utility — includes applicant metadata,
		// income profiles, obligations, and home-specific extra fields (facilityType)
		const answers = buildEvaluationAnswers(selectedLoan, homeLoanConfig.extraPayloadFields);

		evalInFlight++;
		evaluating = true;
		if (isNavigation) navigating = true;
		const loaderStart = Date.now();
		try {
			const payload = {
				loanType: 'Home Loan',
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
					// On forward navigation (incl. resume), check if any PRIOR
					// schema page is incomplete. Redirect there instead of
					// landing on a page with unfilled prerequisites.
					if (isNavigation && direction === 1 && serverPage.visiblePageMap) {
						const lt = (answers['loanType'] as string) || '';
						const clientMap = serverPage.visiblePageMap.filter(
							(p) => !(lt === 'New Loan' && BT_ONLY_PAGE_IDS.has(p.id))
						);
						for (let i = 0; i < pageIndex && i < clientMap.length; i++) {
							const pg = clientMap[i];
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

					// Auto-apply suggestedValue for select questions (e.g., authority from city)
					for (const q of serverPage.questions) {
						const suggested = (q.uiMeta as any)?.suggestedValue;
						if (suggested && !currentAnswers[q.bindsTo]) {
							updateAnswer(q, suggested);
						}
					}
				}
			}
		} catch (err) {
			clientLogger.error({ err }, '[FormEngine] Client evaluate error');
			submitError = 'Unable to load form data. Please check your connection and try again.';
		} finally {
			evalInFlight--;
			if (evalInFlight <= 0) {
				if (isNavigation) {
					const elapsed = Date.now() - loaderStart;
					if (elapsed < MIN_LOADER_MS) {
						await new Promise((r) => setTimeout(r, MIN_LOADER_MS - elapsed));
					}
				}
				evalInFlight = 0;
				evaluating = false;
				navigating = false;
			}
		}
	}

	// 1500ms — long enough that normal typing (digits ~200-400ms apart) doesn't
	// trigger a server round-trip mid-input. The earlier 300ms window fired
	// mid-typing on number entry, causing the server response to clobber the
	// in-progress input. The Next-click handler still flushes via
	// `await evaluateOnServer + tick`, so cross-field validation still
	// surfaces before navigation (Pitfall #21 contract intact).
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

	/**
	 * Detect active risk types from selected drop-level options.
	 * Excludes AGREEMENT_POA when resolved by registration willingness or NBFC provision.
	 */
	let activeRiskTypes = $derived.by(() => {
		if (!serverPage?.questions) return [];
		const answers = currentAnswers;
		const risks: string[] = [];

		for (const q of serverPage.questions) {
			if (!q.options) continue;
			const val = answers[q.bindsTo];
			if (val == null || val === '') continue;
			const selectedOpt = q.options.find((o) => String(o.value) === String(val));
			if (selectedOpt?.riskType) {
				risks.push(selectedOpt.riskType);
			}
		}

		const unique = [...new Set(risks)];

		// AGREEMENT_POA is resolved if buyer/seller agree to register first,
		// or if DSA has already provided an NBFC name via the sub-question flow
		return unique.filter((risk) => {
			if (risk === 'AGREEMENT_POA') {
				if (answers.agreementPoaRegistryWilling === 'YES') return false;
				if (answers.agreementPoaNbfcKnown === 'Yes' && answers.agreementPoaNbfcName) return false;
			}
			return true;
		});
	});

	/** Risk types that are unresolved (no known NBFC in DB) */
	let riskBlocks = $derived.by(() => {
		return activeRiskTypes.filter((rt) => {
			const result = nbfcCheckResults[rt];
			return !result || !result.found;
		});
	});

	/** NBFC suggestions from DB for current risk types */
	let nbfcSuggestionList = $derived.by(() => {
		return activeRiskTypes
			.filter((rt) => nbfcCheckResults[rt]?.found)
			.map((rt) => ({ riskType: rt, nbfcName: nbfcCheckResults[rt].nbfcName ?? '' }));
	});

	// Check NBFC capabilities when risk types change
	$effect(() => {
		const risks = activeRiskTypes;
		const city = String(currentAnswers['propertyCityName'] ?? '');
		const key = `${risks.join(',')}|${city}`;
		if (key === lastRiskCheckKey || risks.length === 0 || !city) {
			if (risks.length === 0) nbfcCheckResults = {};
			return;
		}
		lastRiskCheckKey = key;
		checkNbfcCapabilities(risks, city);
	});

	async function checkNbfcCapabilities(riskTypes: string[], city: string) {
		checkingNbfc = true;
		const results: typeof nbfcCheckResults = {};
		try {
			for (const riskType of riskTypes) {
				try {
					const res = await secureFetch(
						`/api/nbfc-capabilities?city=${encodeURIComponent(city)}&riskType=${encodeURIComponent(riskType)}`
					);
					if (res.ok) {
						const json = await res.json();
						results[riskType] = json.data ?? { found: false };
					} else {
						results[riskType] = { found: false };
					}
				} catch {
					// Fail open — don't block on API errors
					results[riskType] = { found: false };
				}
			}
			nbfcCheckResults = results;
		} finally {
			checkingNbfc = false;
		}
	}

	async function contributeNbfc(riskType: string) {
		const city = String(currentAnswers['propertyCityName'] ?? '');
		if (!nbfcContributionName.trim() || !city) return;
		nbfcContributing = true;
		try {
			await secureFetch('/api/nbfc-capabilities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ city, riskType, nbfcName: nbfcContributionName.trim() })
			});
			nbfcCheckResults = {
				...nbfcCheckResults,
				[riskType]: { found: true, nbfcName: nbfcContributionName.trim() }
			};
			nbfcContributionName = '';
		} catch (e) {
			clientLogger.error({ err: e }, '[NBFC] Contribution failed');
		} finally {
			nbfcContributing = false;
		}
	}

	let errorSummary = $derived.by(() => {
		// Income details page: show missing profile names (home-loan-specific)
		if (
			currentPage?.id === 'incomeDetailsPage' &&
			isSingleApplicant &&
			missingProfiles.length > 0
		) {
			return missingProfiles.map((p) => getDropdownLabel(p)).slice(0, 3);
		}

		// Standard error summary — server validation errors then unanswered required questions
		return buildErrorSummary(serverPage, visibleQuestions, currentAnswers);
	});

	// Track city loading state — reset when state is cleared
	$effect(() => {
		const state = (currentAnswers['propertyStateName'] as string) || '';
		if (!state) {
			lastCityLoadState = '';
			loadingCities = false;
			showCityLoadingModal = false;
		} else if (state !== lastCityLoadState) {
			lastCityLoadState = state;
			loadingCities = true;
		}
	});

	// Pre-load all pincodes for state on session resume / initial load
	let lastPincodeState = '';
	$effect(() => {
		const state = (currentAnswers['propertyStateName'] as string) || '';
		if (state && state !== lastPincodeState) {
			lastPincodeState = state;
			loadPincodesForState(state);
		} else if (!state) {
			lastPincodeState = '';
			pincodeStateMap = {};
		}
	});

	$effect(() => {
		// Don't sync page index to the persisted store until the resume modal
		// has been handled. Otherwise, currentPageIndex (initially 0) overwrites
		// the persisted value before onMount can read it for the modal check.
		if (!resumeHandled) return;
		if (currentPageIndex !== lastPageIndex) {
			lastPageIndex = currentPageIndex;
			formState.setPageIndex(currentPageIndex);
		}
	});
	let submitError = $state<string | null>(null);
	let submitValidationErrors = $state<Array<{ label: string; pageIndex: number }>>([]);
	let requireDownPayment = $state<number>(0);
	let payloads = $state<Record<string, unknown[]>>({});
	// BT-only page IDs — these have server showWhen: loanType != "New Loan".
	// During SSR the server evaluates with empty answers (loanType unknown)
	// so they appear in visiblePageMap. Client-side guard removes them when
	// combinedAnswers already has the correct loanType value.
	const BT_ONLY_PAGE_IDS = new Set(['btExistingLoan_homeLoan', 'loanRequirements_homeLoan']);

	// Pages with custom completion logic — skip in first-incomplete-page gate
	// (these pages use applicant-level / income-level checks, not schema required fields)
	const CUSTOM_COMPLETION_PAGES = new Set([
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]);

	// visiblePages derived from server page map for wizard compatibility
	let visiblePages = $derived.by(() => {
		if (!serverPage?.visiblePageMap) return null;
		const lt = (currentAnswers as Record<string, unknown>).loanType as string | undefined;
		return serverPage.visiblePageMap
			.filter((p) => !(lt === 'New Loan' && BT_ONLY_PAGE_IDS.has(p.id)))
			.map((p) => ({
				id: p.id,
				title: p.title,
				questions: [] as ClientQuestion[], // Lightweight stubs for wizard
				complete: p.complete
			}));
	});

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

	// ── Force propertyIdentified='Yes' for BT/Top-up flows ──
	// BT, BT-with-Top-up, and Top-up-Only loans require an existing property by definition,
	// so propertyIdentified is conceptually always 'Yes' for them. q2_propertyIdentified
	// itself only renders for 'New Loan', but if the user pivots from New Loan (where they
	// answered 'No') to a BT/Top-up flow, the stale 'No' would persist in answers and break
	// downstream visibility (e.g. q_propertyLocation's question label would say
	// "Where is the customer searching?" instead of "Where is the property located?").
	// Setting it here at the source keeps every showWhen/label that depends on
	// propertyIdentified correct.
	$effect(() => {
		const loanType = (currentAnswers as Record<string, unknown>).loanType as string | undefined;
		if (!loanType || loanType === 'New Loan') return;
		if ((currentAnswers as Record<string, unknown>).propertyIdentified !== 'Yes') {
			updateAnswerByKey('propertyIdentified', 'Yes');
		}
	});

	// ── Custom pages for single-applicant flattened flow ──────────
	const CUSTOM_INCOME_PAGES = new Set([
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
		// on the current page's visible questions — e.g. cross-field checks like
		// "EMIs paid cannot exceed months since disbursement". Server only emits
		// errors for visible questions so this list is already filtered.
		if (enabled && (serverPage?.validationErrors?.length ?? 0) > 0) {
			enabled = false;
		}
		// Block when pincode validation fails (mismatch with selected city)
		if (enabled && pincodeValidationError) {
			enabled = false;
		}
		if (enabled && currentPage?.id === 'loanStructure_homeLoan') {
			enabled = isArrayFullyValid(formState.applicants);
		}
		// Block when there are unresolved risk types with no known NBFC
		if (enabled && riskBlocks.length > 0) {
			enabled = false;
		}
		// Warnings are informational — they display but NEVER block Next.
		// The DSA sees the warning and decides whether to proceed.
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
	// Reset when navigating to a different page
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

	let mobileNumber = $derived(data.user?.mobileNumber);
	const cost = 50;

	let coinsNeeded = $derived(cost > coinsState.available ? cost - coinsState.available : 0);

	const buyCoins = async () => {
		const amount = coinsNeeded;

		// Load Razorpay checkout.js on demand. Loading it globally caused
		// hundreds of `<link rel="preload">` warnings because the script
		// eagerly preloads its own chunks on every page mount.
		await loadRazorpayCheckout();

		const res = await secureFetch('/api/razorpay/order', {
			method: 'POST',
			body: JSON.stringify({ amount, mobileNumber })
		});

		const { orderId, key } = await res.json();

		const options = {
			key,
			amount: amount * 100,
			currency: 'INR',
			name: 'Digital DSA',
			description: `${amount} Coins Purchase`,
			order_id: orderId,
			handler: async (response: {
				razorpay_order_id: string;
				razorpay_payment_id: string;
				razorpay_signature: string;
			}) => {
				const verify = await secureFetch('/api/razorpay/verify', {
					method: 'POST',
					body: JSON.stringify({
						razorpay_order_id: response.razorpay_order_id,
						razorpay_payment_id: response.razorpay_payment_id,
						razorpay_signature: response.razorpay_signature,
						coins: amount,
						mobileNumber
					})
				});

				if (verify.ok) {
					coinsState.addAvailable(amount);
					alert(`✅ ${amount} Coins Added`);
				} else {
					alert('❌ Payment Failed');
				}
			}
		};

		new (
			window as unknown as {
				Razorpay: new (options: Record<string, unknown>) => { open: () => void };
			}
		).Razorpay(options).open();
	};

	onMount(() => {
		// Loan-route guard — exit early if formState.loanData.loanName doesn't
		// match this route's expected loan. Redirects to /form/how-can-we-help.
		if (!assertLoanRoute('Home Loan')) return;
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
			loadingEditSnapshot = true;
			(async () => {
				try {
					const res = await fetch(`/api/cases/${editCaseId}/snapshots?limit=1`);
					if (!res.ok) {
						goto(`/form/home-loan?error=edit_failed`);
						return;
					}
					const result = await res.json();
					if (result.success && result.data?.snapshots?.length > 0) {
						formState.fromJSON(securedClone(result.data.snapshots[0].payload));
						selectedLoan = 'Home Loan';
						return;
					}
				} catch (err) {
					// clientLogger.debug is dev-gated by design — replaces the prior `if (dev) console.error`.
					clientLogger.debug({ err }, 'Failed to load snapshot for edit');
				} finally {
					loadingEditSnapshot = false;
				}
				goto(`/dashboard/dsa/cases/${editCaseId}`);
			})();
			return () => {
				telemetry.destroy();
				unsavedGuard.destroy();
			};
		}

		// ── Normal mode ────────────────────────────────────────
		// Detect actual page reload on THIS path vs SvelteKit client navigation.
		// Pitfall #42: a naive `navEntries[0].type === 'reload'` is true for the
		// rest of the tab whenever the user F5'd ANY earlier page, which falsely
		// re-triggers the resume modal on every client-side mount.
		const isBrowserReload = isReloadOfCurrentPath();

		// On genuine browser reload, clear the how-can-we-help flag so resume modal can re-appear
		if (isBrowserReload) {
			sessionStorage.removeItem('__resumeHandledHere');
		}

		const alreadyHandled = sessionStorage.getItem('__resumeHandledHere');

		if (!alreadyHandled && isBrowserReload && initialSavedPageIndex > 0) {
			showResumeModal = true;
		} else {
			// Browser-back from results / evaluating re-mounts this page as a
			// client-side navigation (no reload, so no resume modal). Without
			// the next line, the sync $effect would write currentPageIndex (0)
			// back into formState.currentPageIndex, destroying the user's
			// place in the form. Rehydrating BEFORE flipping resumeHandled
			// makes the sync effect's first read a no-op.
			const restored = computePageIndexOnRemount(initialSavedPageIndex, showResumeModal);
			if (restored !== null) currentPageIndex = restored;
			resumeHandled = true;
			formReady = true;
		}

		if (!showResumeModal && !formState.loanData?.loanName) {
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
			return;
		}
		selectedLoan = 'Home Loan';
		formState.clearForLoanType('secured');
		formState.setApplicationField('loanCategory' as any, 'secured' as any);
		formState.clearApplicationFields([...LAP_ONLY_KEYS, ...PLOT_ONLY_KEYS]);

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
			// formReady stays false — set after evaluateOnServer completes in the resume $effect
		} else if (choice === 'restart') {
			// keep data, go back to the true starting page (loan selection)
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
				// Defensive helper: resets state, awaits goto, falls back to
				// a hard reload if the URL doesn't actually change (handles
				// the 2026-05-18 "page goes blank" report where goto was
				// silently canceled by a navigation guard).
				await clearFormAndGotoPicker();
			},
			{ confirmLabel: 'Clear form', cancelLabel: 'Cancel' }
		);
	}

	let currentAnswers = $derived(
		((formState.loanData as LoanDataStore)[selectedLoan] ?? {}) as Answers
	);

	// Memoized combinedAnswers (CP-5): returns the SAME object reference when
	// shallow values haven't changed. This prevents downstream $derived/$effect
	// chains (auto-clear, getFilteredOptions, getWarning, wizard state) from
	// re-running on every keystroke in text fields.
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

	// Cap-trim guard: when the user flips loanType to "Top-up Only" AFTER having
	// already picked multiple assessment lenders under a different loanType,
	// the MultipleSelect's maxSelection prop only blocks NEW picks — it does
	// nothing to a pre-existing overflowing array. Trim down to the first
	// selection so the Top-up Only "exactly 1 existing lender" rule is honored
	// regardless of the order the user filled the page.
	$effect(() => {
		const isTopupOnly = (combinedAnswers as any).loanType === 'Top-up Only';
		const existing = (currentAnswers as any).assessmentLenders;
		if (isTopupOnly && Array.isArray(existing) && existing.length > 1) {
			updateAnswerByKey('assessmentLenders', [existing[0]] as (string | number)[]);
		}
	});

	const wizard = createWizardState({
		sectionConfig: homeLoanSections,
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
			if (currentPage?.id === 'tellUs_homeLoan') {
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
			// Re-evaluate from server at the stored page
			evaluateOnServer(pageNum, true).finally(() => {
				formReady = true;
			});
			currentPageIndex = pageNum;
		} else if (resumeIndexPending !== null) {
			const targetIndex = resumeIndexPending;
			resumeIndexPending = null;
			evaluateOnServer(targetIndex, true).finally(() => {
				formReady = true;
			});
			currentPageIndex = targetIndex;
		}
	});

	// Re-evaluate server page whenever currentPageIndex changes
	// Start at 0 if SSR already provided page 0 data — avoids redundant re-fetch + spinner flash
	const hadServerPage = untrack(() => !!serverPage);
	let lastEvaluatedPageIndex = hadServerPage ? 0 : -1;
	$effect(() => {
		if (!resumeHandled) return;
		if (currentPageIndex !== lastEvaluatedPageIndex && selectedLoan) {
			lastEvaluatedPageIndex = currentPageIndex;
			// Only show loader on forward navigation (Next), not on Previous
			evaluateOnServer(currentPageIndex, direction === 1);
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

	function updateAnswerByKey<T extends string | number | boolean | (string | number)[] | null>(
		key: string,
		value: T
	): void {
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

		// ── Builder/Project/Lender + Authority dependent clearing ──
		// State/City → reset authority. If the new city has exactly one authority,
		//   auto-fill it (smart-form: don't ask when there's only one valid answer).
		//   Otherwise leave blank so the user picks from the refreshed dropdown.
		// City → clear builder→project→lender chain, fetch builders.
		// Builder → clear project + lenders, fetch projects.
		// Project → clear lenders.
		if (key === 'propertyStateName' || key === 'propertyCityName') {
			const d = formState.loanData as LoanDataStore;
			const ld = (d as any)[selectedLoan] ?? {};
			const cityChanged = key === 'propertyCityName';

			// Resolve the new authority answer for the new city
			const newCity = cityChanged ? String(value ?? '') : String(ld['propertyCityName'] ?? '');
			const autoAuthority = newCity ? resolveSingleAuthorityForCity(newCity) : null;
			const nextAuthority = autoAuthority ?? '';
			const authorityChanged = ld['authorityName'] !== nextAuthority;

			const needsClear =
				authorityChanged ||
				(cityChanged &&
					(ld['builderName'] ||
						ld['builderNameManual'] ||
						ld['projectNameSelected'] ||
						ld['projectNameManual'] ||
						ld['projectLenders']));
			if (needsClear) {
				formState.replaceLoanData({
					...d,
					[selectedLoan]: {
						...ld,
						[key]: value,
						authorityName: nextAuthority,
						...(cityChanged && {
							builderName: '',
							builderNameManual: '',
							projectNameSelected: '',
							projectNameManual: '',
							projectLenders: []
						})
					},
					loanName: selectedLoan
				});
			}
			// Fetch builder options for city (used on propertyCharacter page)
			if (cityChanged && value) fetchBuilderOptionsForCity(String(value));
		}

		// Per-keystroke server validation was removed (S104). Cross-field
		// rules (btEmisPaid > _maxPossibleEmis, principalOutstanding > sanctionAmount,
		// etc.) now surface only on Next-click via `await evaluateOnServer + tick`
		// in onNext — Pitfall #21's correctness contract still holds. The
		// per-keystroke wiring caused typing lag + mid-input value resets.
		// Within-page progressive disclosure (showWhen) is client-side via
		// `deriveVisibleQuestions` so it doesn't need the server call.
		// `debouncedEvaluate` is kept as a function for the Next-click flush path.
		//
		// Reactively clear stale cross-field validation errors so a corrected
		// field re-enables Next immediately (Pitfall #21). Skip while
		// evaluateOnServer is mid-flight so its freshly-loaded errors and
		// suggestedValue auto-fills don't wipe each other. Authoritative re-check
		// still runs on Next-click.
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

		// flagKey resolution: when a radio/select option has a flagKey object,
		// persist those derived values (e.g. isDifferATSAndPropertyValue, isATSReady)
		// so downstream showWhen conditions on this and other pages can see them.
		// IMPORTANT: Skip boolean flagKeys where the key matches the question's
		// own contextKey — those would overwrite the string answer ("Yes"/"No")
		// with true/false, breaking downstream showWhen comparisons.
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
			updateAnswerByKey('pincode', '');
			pincodeQuery = '';
			// User explicitly selected a state — show loading modals
			showCityLoadingModal = true;
			showPincodeLoadingModal = true;
			loadPincodesForState(String(value));
		} else if (key === 'propertyCityName') {
			updateAnswerByKey('pincode', '');
			pincodeQuery = '';
			// Builder/project/lender clearing + builder fetch handled by updateAnswerByKey
		} else if (key === 'builderName') {
			// Builder changed → clear project + lenders, fetch projects for this builder
			updateAnswerByKey('projectNameSelected', '');
			updateAnswerByKey('projectNameManual', '');
			updateAnswerByKey('projectLenders', [] as unknown as string);
			if (value && value !== '__other__') fetchProjectOptionsForBuilder(String(value));
		} else if (key === 'projectNameSelected') {
			// Project changed → clear lenders
			updateAnswerByKey('projectLenders', [] as unknown as string);
		} else if (key === 'residenceStateName') {
			updateAnswerByKey('residenceCityName', '');
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
				// Cannot set null with updateAnswerByKey - skip
			}
		}

		// Fetch dependent options when state changes (state→city resolution)
		if (key === 'propertyStateName' || key === 'residenceStateName') {
			fetchDependentCityOptions(key, value as string);
		}
	}

	// ── Targeted option fetch for state→city dependencies ──
	const cityQuestionMap = homeLoanConfig.cityQuestionMap;

	async function fetchDependentCityOptions(stateKey: string, _stateValue: string) {
		const cityQId = cityQuestionMap[stateKey];
		if (!cityQId || !selectedLoan) return;
		try {
			const result = await fetchQuestionOptions(selectedLoan, [cityQId], { ...currentAnswers });
			if (result && serverPage) {
				const q = serverPage.questions.find((q) => q.id === cityQId);
				if (q && result[cityQId]) {
					q.options = result[cityQId];
				}
			}
		} finally {
			// Dismiss loading modals after fetch completes
			showCityLoadingModal = false;
			loadingCities = false;
		}
	}

	// ── Builder & Project dependent option fetching ──
	// City → fetch builders (RERA data). Builder → fetch projects (derived).

	async function fetchBuilderOptionsForCity(city: string) {
		if (!city || !selectedLoan) return;
		try {
			const result = await fetchQuestionOptions(selectedLoan, ['q_builderName'], {
				...currentAnswers,
				propertyCityName: city
			});
			if (result && serverPage) {
				const q = serverPage.questions.find((q) => q.id === 'q_builderName');
				if (q && result['q_builderName']) {
					q.options = result['q_builderName'];
				}
			}
		} catch {
			// Silently fail — fallback text input will show if no options
		}
	}

	async function fetchProjectOptionsForBuilder(builder: string) {
		if (!builder || !selectedLoan) return;
		try {
			const result = await fetchQuestionOptions(selectedLoan, ['q_projectName'], {
				...currentAnswers,
				builderName: builder
			});
			if (result && serverPage) {
				const q = serverPage.questions.find((q) => q.id === 'q_projectName');
				if (q && result['q_projectName']) {
					q.options = result['q_projectName'];
				}
			}
		} catch {
			// Silently fail — fallback text input will show if no options
		}
	}

	// ID-based page order for BT/Top-up flows
	const BT_TOPUP_PAGE_ORDER: string[] = [
		'caseIntake_homeLoan',
		'propertyLocation_homeLoan',
		'propertyCharacter_homeLoan',
		'complianceLegal_homeLoan',
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage',
		'btExistingLoan_homeLoan',
		'loanRequirements_homeLoan'
	];

	function resolvePageSequence(pages: { id: string }[], pageOrder: string[]): number[] {
		return pageOrder.map((id) => pages.findIndex((p) => p.id === id)).filter((i) => i !== -1);
	}

	function payLoad(pageIndex: number) {
		collectPayload(payloads, pageIndex, visibleQuestions);
	}

	function goPrev(): void {
		direction = -1;
		navigating = true;
		submitError = null;
		submitValidationErrors = [];
		// Reset applicant sub-step ONLY when leaving the applicant page
		if (currentPage?.id === 'tellUs_homeLoan') {
			formState.setApplicantPageIndex(
				formState.applicationData?.tellUsWhoIsApplying == 'Individual'
					? 0
					: formState.applicantPageIndex
			);
		}
		const fromPageId = currentPage?.id;
		if ((currentAnswers as Record<string, unknown>).loanType != 'New Loan') {
			const btSequence = resolvePageSequence(visiblePages ?? [], BT_TOPUP_PAGE_ORDER);
			const pos = btSequence.indexOf(currentPageIndex);
			if (pos > 0) {
				currentPageIndex = btSequence[pos - 1];
				syncApplicantStepOnEntry(fromPageId, 'backward');
			} else {
				goto(ROUTES.FORM.HOW_CAN_WE_HELP);
			}

			return;
		}

		if (currentPageIndex > 0) {
			currentPageIndex -= 1;
			syncApplicantStepOnEntry(fromPageId, 'backward');
		} else {
			goto(ROUTES.FORM.HOW_CAN_WE_HELP);
		}
	}

	function goNext(): void {
		direction = 1;
		navigating = true;
		submitError = null;
		submitValidationErrors = [];

		const currentPid = visiblePages?.[currentPageIndex]?.id ?? '';

		if (
			currentPid !== 'basicInfo_homeLoan' &&
			currentPid !== 'loanStructure_homeLoan' &&
			currentPid !== 'tellUs_homeLoan' &&
			!CUSTOM_INCOME_PAGES.has(currentPid)
		) {
			payLoad(currentPageIndex);
		}

		const fromPageId = currentPage?.id;

		if (currentAnswers.loanType != 'New Loan') {
			const btSequence = resolvePageSequence(visiblePages ?? [], BT_TOPUP_PAGE_ORDER);
			const pos = btSequence.indexOf(currentPageIndex);

			if (pos !== -1 && pos < btSequence.length - 1) {
				currentPageIndex = btSequence[pos + 1];
			}
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
			return;
		} else {
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
			return;
		}
	}

	function syncApplicantStepOnEntry(fromPageId: string | undefined, dir: 'forward' | 'backward') {
		const step = wizard.resolveApplicantStepOnEntry(
			fromPageId,
			dir,
			visiblePages?.[currentPageIndex]?.id
		);
		if (step !== null) formState.setApplicantPageIndex(step);
	}

	/** Scoped to current page's visible questions only. */
	function hasInputErrors(): boolean {
		return hasInputErrorsShared(visibleQuestions, inputErrorsState);
	}

	let isLastPage = $derived(!evaluating && currentPageIndex === (visiblePages?.length ?? 1) - 1);

	function onTextFieldInput(val: string, question: ClientQuestion) {
		// Pincode typeahead tracking
		if (question.fieldType === 'pincode') {
			pincodeQuery = val;
			showPincodeSuggestions = val.length >= 3 && val.length < 6;
			updateAnswer(question, val);
			return;
		}
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

	function handleNumberInput(value: number | number[] | null, question: ClientQuestion) {
		// `null` here means the user cleared the field — pass it through so
		// updateAnswer wipes the stored answer. Skipping null left the old value
		// in currentAnswers and let it reappear on navigation back (Issue #1/#4).
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

	$effect(() => {
		const hash = JSON.stringify(currentAnswers);
		if (hash !== lastAnswersHash) {
			lastAnswersHash = hash;
			// Merge page answers into applicationData — preserve applicant-level keys
			// (applicationStructure, companiesFamilyOwned, numberOfCompanies, etc.)
			formState.replaceApplicationData({ ...formState.applicationData, ...currentAnswers } as any);
		}
	});

	$effect(() => {
		const cost = parseFloat(currentAnswers.propCost || 0);
		const deal = parseFloat(currentAnswers.dealValue || 0);
		if (currentAnswers.purchaseType == 'Direct Sale') {
			if (cost <= 3333333) {
				requireDownPayment = +Math.ceil(cost * 0.1).toFixed(0);
			} else if (cost <= 9375000) {
				requireDownPayment = +Math.ceil(cost * 0.2).toFixed(0);
			} else if (cost > 9375000) {
				requireDownPayment = +Math.ceil(cost * 0.25).toFixed(0);
			}
		}
		if (currentAnswers.purchaseType == 'Resale') {
			if (deal <= 3333333) {
				requireDownPayment = +Math.ceil(deal * 0.1).toFixed(0);
			} else if (deal <= 9375000) {
				// Audit BUG-G (2026-05-28): boundary was strict `<` here while the
				// non-Resale block above (line 1467) already used `<=`. At exactly
				// ₹93,75,000 the deal fell into the 25%-DP bucket instead of the
				// 20%-DP bucket, over-charging the borrower by ₹4,68,750.
				requireDownPayment = +Math.ceil(deal * 0.2).toFixed(0);
			} else if (deal > 9375000) {
				requireDownPayment = +Math.ceil(deal * 0.25).toFixed(0);
			}
		}
	});

	$effect(() => {
		const mode = (currentAnswers.ourSuggestionOrBySelf as string | undefined) ?? '';
		// See lastATSMode JSDoc above — detects fresh toggles into Suggestion
		// Required mode so the recompute fires even when inputs are unchanged.
		// Without this, toggling Suggestion Required → By Myself → cleared
		// fields → Suggestion Required would leave the ATS fields empty
		// because the calcKey guard would short-circuit the effect.
		const modeChanged = mode !== lastATSMode;
		lastATSMode = mode;

		if (currentAnswers.isATSReady == 'No' && mode === 'Suggestion Required') {
			const cost = parseFloat(currentAnswers.propCost || 0);
			const deal = parseFloat(currentAnswers.dealValue || 0);
			const calcKey = `${currentAnswers.purchaseType}-${cost}-${deal}-${requireDownPayment}`;
			if (calcKey === lastATSCalc && !modeChanged) return;
			lastATSCalc = calcKey;

			if (currentAnswers.purchaseType == 'Direct Sale') {
				const atsValue = roundNum((cost - requireDownPayment) / 1.5, 100);
				const downPayment = roundNum(atsValue * 0.1, 100);
				updateAnswerByKey('propertyValueAsPerATS', atsValue);
				updateAnswerByKey('downpaymentByOwn', downPayment);
			} else if (currentAnswers.purchaseType == 'Resale') {
				const atsValue = roundNum((deal - requireDownPayment) / 1.5, 100);
				const downPayment = roundNum(atsValue * 0.1, 100);
				updateAnswerByKey('propertyValueAsPerATS', atsValue);
				updateAnswerByKey('downpaymentByOwn', downPayment);
			}
		}
	});

	let loanTransaction = $state<Record<string, unknown>>({});

	async function handleSubmit() {
		// Refresh completion data from server before checking
		await evaluateOnServer(currentPageIndex, false);
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
			let current = coinsState.available;

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

			const finalApplicants = (formState.applicantsPayload as unknown[][]).map(
				(pages: unknown[], index: number) => {
					const store = formState.applicants[index] || ({} as Record<string, unknown>);
					let applicantData: Record<string, unknown> = {};

					pages.forEach((page: unknown) => {
						Object.values(page as Record<string, unknown>).forEach((questions: unknown) => {
							(questions as Array<Record<string, unknown>>).forEach(
								(q: Record<string, unknown>) => {
									const readKey =
										q.type === 'multiple-select'
											? `${q.key}Visible`
											: q.type === 'table'
												? `${q.key}Visible`
												: q.key;

									const value = store[readKey as string];

									if (value !== undefined && value !== null && value !== '') {
										applicantData[readKey as string] = value;
									}
								}
							);
						});
					});

					if (applicantData.financialsTableVisible) {
						const normalizedFinancials = Object.entries(
							applicantData.financialsTableVisible as Record<string, unknown>
						).reduce((acc: Record<string, unknown>, [key, arr]) => {
							// ✅ DO NOT TOUCH itrFiled
							if (key === 'itrFiled') {
								acc[key] = Array.isArray(arr) ? arr : [];
								return acc;
							}

							// 🔢 Convert all other arrays to numbers
							if (Array.isArray(arr)) {
								acc[key] = arr.map(toIndianNumber).filter((v) => v !== null);
							}

							return acc;
						}, {});

						applicantData = {
							...applicantData,
							...normalizedFinancials
						};

						delete applicantData.financialsTableVisible;
					}

					// 🔥 Force merge employmentType
					if (store.employmentType && store.applicantType === 'Individual') {
						applicantData.employmentType = store.employmentType;
					}
					// directors merge when company type is not equal to OPC
					if (
						store.applicantType === 'Company' &&
						store.companyType !== 'One Person Company (OPC)'
					) {
						applicantData.directors = store.directors;
					}

					// formState.applicants.map((item) => { item.applicantType === 'Individual'}.length>1
					if (
						formState.applicants.filter((item) => item.applicantType === 'Individual').length > 1
					) {
						if (store.applicantType === 'Individual') {
							applicantData.relationType = store.relationType;
							applicantData.relation = store.relation;
							applicantData.relatedApplicant = store.relatedApplicant;
						}
					}

					// Conditional obligations merge
					if (store.ObligationsRunning === 'Yes') {
						applicantData.obligations = store.obligations;
					}

					return applicantData;
				}
			);

			const formattedPayload: {
				loanTransaction: Record<string, unknown>;
				allApplicantDetails: Record<string, unknown>[];
			} = {
				loanTransaction: {
					LoanName: 'Home Loan',
					LoanType: (currentAnswers as Record<string, unknown>)?.loanType,
					propertyIdentified: 'Yes',
					numberOfDirectorOrApplicant:
						Number((currentAnswers as Record<string, unknown>)?.numberOfDirectorOrApplicant) || 1,
					approvedByAuthority: 'Yes',
					ContinuityProof: 'Yes',
					constructionType: 'House',
					ifPropertyRegistered: 'Yes',
					...loanTransaction
				},
				allApplicantDetails: finalApplicants
			};

			if (formattedPayload.loanTransaction?.mortgageYear) {
				formattedPayload.loanTransaction.mortgageYear = Number(
					formattedPayload.loanTransaction.mortgageYear
				);
			}
			if (formattedPayload.loanTransaction.topUpTenure) {
				formattedPayload.loanTransaction.topUpTenure = Number(
					formattedPayload.loanTransaction.topUpTenure
				);
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

			if (!formattedPayload.loanTransaction.LoanType)
				validationErrors.push('Loan Type is required — go to "Getting Started"');

			if (!formState.applicants || formState.applicants.length === 0) {
				validationErrors.push(
					'No applicant added — go to the "Applicants" section and add at least one applicant'
				);
				const applicantIdx = visiblePages?.findIndex((p) => p.id === 'tellUs_homeLoan') ?? -1;
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
					const applicantIdx = visiblePages?.findIndex((p) => p.id === 'tellUs_homeLoan') ?? -1;
					if (applicantIdx !== -1) currentPageIndex = applicantIdx;
				}
			}

			if (validationErrors.length > 0) {
				submitError = validationErrors.join(' | ');
				return;
			}

			// ── Reconcile applicantDataStore → formState before submission ──
			reconcileBeforeSubmit(formState, applicantDataStore as any);

			// ── Submit to server for evaluation + persistence ──
			const editCaseId = new URL(window.location.href).searchParams.get('edit');

			const result = await confirmAndSubmit(
				{
					loanType: 'Home Loan',
					loanDisplayName: 'Home Loan',
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

	let applicantFormRef: ApplicantFormSecured | null = $state(null);
	let applicantNextEnabled = $state(false);
	let applicantDisabledReason = $state('');

	// 2-phase restore state
	let pendingRestore: PendingRestore | null = $state(null);
	let undoableRestore: UndoableRestore | null = $state(null);
	let undoTimer: ReturnType<typeof setTimeout> | null = null;

	function confirmAndTrackUndo() {
		if (!pendingRestore) return;
		const pr = pendingRestore;
		commitApplicantRestore(pr);

		// Create undo state
		undoableRestore = {
			displayName: pr.displayName,
			cardId: pr.cardId,
			currentIndex: pr.currentIndex,
			previousSlot: pr.previousSlot,
			previousApplicantData: pr.previousApplicantData,
			matchUuid: pr.matchUuid,
			recoveryEntrySnapshot: {},
			timestamp: Date.now()
		};
		pendingRestore = null;

		// Auto-expire undo after 15 seconds
		if (undoTimer) clearTimeout(undoTimer);
		undoTimer = setTimeout(() => {
			undoableRestore = null;
		}, 15_000);
	}

	function handleUndo() {
		if (!undoableRestore) return;
		undoApplicantRestore(undoableRestore);
		undoableRestore = null;
		if (undoTimer) {
			clearTimeout(undoTimer);
			undoTimer = null;
		}
	}
	let singleApplicantProfileComplete = $state(false);

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
	// Profiles that still need at least one entry (for tracker UI)
	let missingProfiles = $derived.by(() => {
		const earning = selectedProfiles.filter((p) => p !== 'no_current_income');
		if (earning.length <= 1) return []; // Single profile — no tracker needed
		return earning.filter((p) => !incomeEntries.some((e) => e.profileType === p));
	});
	let answersContext = $derived({
		...(currentApplicantData ?? {}),
		...(formState.applicationData ?? {}),
		isNRI: currentApplicantData?.isNRI ?? 'No'
	});

	// ── Locked profiles for single-applicant secured loans ──────
	// Sole Proprietor → must have business_proprietorship
	let singleLockedProfiles = $derived.by((): IncomeProfileType[] => {
		if (!isSingleApplicant) return [];
		const mandatoryTypes: IncomeProfileType[] = [];
		if (currentApplicantData?.applicantSubType === 'sole_proprietor') {
			mandatoryTypes.push('business_proprietorship' as IncomeProfileType);
		}
		return mandatoryTypes;
	});

	// Auto-add locked profiles to applicant data
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
		// New graduated credit questions
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
	// When income pages are flattened (not using IncomePageNew), we still
	// need __completion to be set for the wizard completion map.
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

	// Aggregate per-Company ownership invariant — see plot-loan/+page.svelte
	// for the rationale. Helper short-circuits when no Company applicants
	// exist, so this is inert on individual-only flows.
	let companyOwnershipViolations = $derived(
		validateCompanyOwnershipTotals(formState.applicants as Array<Record<string, unknown>>)
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
				// Company applicants use companyCompletion (set by Company.svelte submitForm)
				// OR __completion (set by Company.svelte's $effect)
				return item?.companyCompletion === true || item?.__completion === true;
			}
			return item?.__completion === true;
		});

		if (checkEveryApplicantNRI) {
			check = check && formState.applicationData?.gpaValidate;
		}

		// Block Next when a Company's declared ownership across linked
		// Individuals exceeds 100%. Pitfall #26 — surface the reason.
		if (check && companyOwnershipViolations.length > 0) {
			check = false;
		}

		return check;
	});
</script>

<Seo
	title="Home Loan Application Form - DigitalDSA"
	description="Complete your Home Loan application form online with DigitalDSA. Fast, secure, and easy process tailored for you."
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
		<div class="warning-message w-full max-w-4xl">
			<CircleAlert class="h-5 w-5" />
			<p class="msg-banner-text">
				Editing case <span class="alertText">{editCaseId}</span> — changes will create a new version
			</p>
		</div>
	{/if}

	<div
		class="mx-auto flex w-full max-w-4xl touch-pan-y flex-col items-center justify-center overscroll-none"
	>
		<div class="flex w-full flex-col">
			<div class="inset-1 flex flex-col gap-4 px-2 py-4 md:p-6">
				<div class="mt-[1rem] flex items-start justify-between md:mt-0">
					<div class="flex flex-col">
						<h2 class="text-titleText">
							{serverPage?.pageTitle || 'Loan Application'}
						</h2>
						{#if serverPage?.pageDescription}
							<p class="alertText mt-1 text-[var(--form-text-label)]">
								{@html serverPage?.pageDescription || ''}
							</p>
						{/if}
					</div>

					{#if !deviceState.isMobile && !deviceState.isNative}
						<FormLogo />
					{/if}
				</div>

				<FormStepContainer pageId={currentPage?.id} {direction} evaluating={navigating}>
					{#if currentPage?.id === 'tellUs_homeLoan'}
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

						{#if undoableRestore}
							<div class="undo-toast alertText font-titleBold text-[var(--form-text-label)]">
								<span>Restored {undoableRestore.displayName}'s data.</span>
								<button type="button" class="undo-btn tinyText" onclick={handleUndo}>Undo</button>
							</div>
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
							loanName="Home Loan"
							lockedProfiles={singleLockedProfiles}
						/>
					{:else if currentPage?.id === 'incomeDetailsPage' && isSingleApplicant}
						<div class="flex flex-col gap-6">
							<!-- Profile Completion Tracker (only when 2+ earning profiles) -->
							{#if selectedProfiles.filter((p) => p !== 'no_current_income').length > 1}
								<div
									id="income-profile-tracker"
									class="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-alt)] bg-[var(--form-bg-card)] p-3 transition-all duration-300"
								>
									<span class="font-titleBold alertText mr-1 text-[var(--form-text-label)]">
										Entries needed:
									</span>
									{#each selectedProfiles.filter((p) => p !== 'no_current_income') as profile (profile)}
										{@const hasEntry = incomeEntries.some((e) => e.profileType === profile)}
										<span
											class="tinyText font-titleMedium inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors
												{hasEntry
												? 'border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-100)] text-[var(--ddsa-primary-700)]'
												: 'border border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400'}"
										>
											{#if hasEntry}
												<CircleCheck class="h-3 w-3" />
											{:else}
												<CircleAlert class="h-3 w-3" />
											{/if}
											{getDropdownLabel(profile)}
										</span>
									{/each}
								</div>
							{/if}

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
							loanProduct="Home Loan"
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
								{#if question.type === 'radio'}
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
									{#if question.id === 'q_isPossessionOfferedByAuthority' && currentAnswers[question.bindsTo] === 'Yes'}
										<div class="msg-card msg-card-notice mt-4">
											<FileText class="h-5 w-5" />
											<div class="msg-card-body">
												<h3 class="alertText font-titleMedium underline underline-offset-4">
													Please Note
												</h3>
												<p class="alertText">
													In cases where construction is completed but registry is pending, lenders
													typically require an <strong>"Occupancy Certificate"</strong> for approving
													Balance Transfer application.
												</p>
												<p class="alertText">
													It's important to note that since your property isn't registered yet,
													there will be <strong>variations in legal requirements</strong> and
													<strong>disbursement procedures</strong> compared to registered property cases.
												</p>
											</div>
										</div>
									{/if}
								{:else if question.type === 'text' && question.uiType === 'monthYear'}
									<!-- MonthYearModal-backed date picker -->
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
										{#if question.description}
											<DescriptionCard>
												<div class="smallText text-[var(--form-text-secondary)]">
													{@html sanitizeHtml(question.description)}
												</div>
											</DescriptionCard>
										{/if}
									</div>
								{:else if question.type === 'currency'}
									<TextField
										id={question.id}
										label={question.question}
										description={question.description ?? ''}
										textFieldClass={(question as any).textFieldClass}
										value={currentAnswers[question.bindsTo]?.toString() || ''}
										readonly={(question.uiMeta as any)?.readonly === true &&
											currentAnswers.isATSReady === 'No' &&
											currentAnswers.ourSuggestionOrBySelf === 'Suggestion Required'}
										error={getServerError(question.id) || undefined}
										getLimitCheckerText={(question as any).limitCheckerText}
										getValue={(question as any).computedLimit != null
											? async () => (question as any).computedLimit
											: ''}
										onInput={(value: any) => onTextFieldInput(value, question)}
										modalWidth={(question.uiMeta as any)?.modalWidth}
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
											currentAnswers.isATSReady === 'No' &&
											currentAnswers.ourSuggestionOrBySelf === 'Suggestion Required'}
										error={(question.fieldType === 'pincode' ? pincodeValidationError : '') ||
											getServerError(question.id) ||
											undefined}
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
										areaUnit={(currentAnswers as any)[`${question.bindsTo || question.id}Unit`] ||
											'Feet'}
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
										minLength={(question.uiMeta as any)?.minLength}
									/>

									<!-- Pincode typeahead suggestions -->
									{#if question.fieldType === 'pincode' && showPincodeSuggestions && filteredPincodes.length > 0}
										<div
											class="absolute z-100 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-[var(--form-border)] bg-white shadow-lg"
										>
											{#each filteredPincodes as entry (entry.pincode + entry.area)}
												<button
													type="button"
													class="alertText w-full border-b border-[var(--form-border)] px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
													onclick={() => {
														updateAnswerByKey('pincode', entry.pincode);
														pincodeQuery = entry.pincode;
														showPincodeSuggestions = false;
													}}
												>
													<span class="font-titleMedium text-[var(--ddsa-primary-500)]"
														>{entry.pincode}</span
													>
													<span class="ml-2 text-[var(--ddsa-primary-500)]">— {entry.area}</span>
												</button>
											{/each}
										</div>
									{/if}

									{#if (question.id === 'q_downPayment' || question.id === 'q6_deposit') && downpaymentPercentage(currentAnswers as any)}
										<div
											class="ddsa-gradient mt-4 rounded-[0.75rem] border border-[var(--form-border)] p-[1.25rem]"
										>
											<div class="grid grid-cols-2 gap-4">
												<div class="flex h-full flex-col justify-between">
													<h5 class="buttonText text-[var(--form-text-label)] text-white">
														Your deposit is:
													</h5>
													<div class="flex items-center gap-4">
														<span class="msg-analysis-value">
															{downpaymentPercentage(currentAnswers as any)?.depositPercent}%
														</span>
														<p class="smallText text-[var(--form-text-secondary)]">
															of the property value
														</p>
													</div>
												</div>
												<div class="flex h-full flex-col justify-between">
													<h5 class="buttonText text-[var(--form-text-label)] text-white">
														i.e. you're borrowing:
													</h5>
													<div class="flex items-center gap-4">
														<p class="msg-analysis-value text-start">
															{downpaymentPercentage(currentAnswers as any)?.loanPercent}%
														</p>
														<p class="smallText text-[var(--form-text-secondary)]">
															of the property value
														</p>
													</div>
												</div>
											</div>
											{#if (downpaymentPercentage(currentAnswers as any)?.depositPercent ?? 0) < 25}
												<div class="warning-message">
													<AlertTriangle class="text-currentColor h-8 w-8" />
													<div class="alertText text-currentColor">
														According to the loan-to-value (LTV) clause of the lenders, your down
														payment falls short of the required amount. You have the option to
														allocate some of your income towards <em class="msg-analysis-highlight"
															>a Personal Loan to bridge this gap.</em
														>
														<br /><br />
														Our AI will recommend several lenders who can help you secure the property
														by offering favorable options, such as combining a Home Loan with a Personal
														Loan for the down payment.
													</div>
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
									{@const filteredOpts = getFilteredOptions(question.options, combinedAnswers)}
									{#if question.uiMeta?.fallbackToText && (!filteredOpts || filteredOpts.length === 0)}
										<!-- Fallback: no dropdown data available → show text input for manual entry -->
										<TextField
											id={question.id}
											label={(question.uiMeta?.fallbackLabel as string) ?? question.question}
											description={question.description ?? ''}
											textFieldClass={(question as any).selectClass ?? ''}
											value={(currentAnswers as any)[question.bindsTo] ?? ''}
											error={getServerError(question.id) || undefined}
											onInput={(val: string) => updateAnswer(question, val)}
											required={question.required ?? false}
											icon={question.uiMeta?.icon as string}
											placeholder={(question.uiMeta?.fallbackPlaceholder as string) ??
												(question.uiMeta?.placeholder as string) ??
												''}
										/>
									{:else}
										<SelectField
											id={question.id}
											label={question.question}
											description={question.description ?? ''}
											selectClass={(question as any).selectClass}
											subLabel={(question as any).subLabel}
											options={filteredOpts}
											value={(currentAnswers as any)[question.bindsTo] ?? ''}
											error={getServerError(question.id) || undefined}
											onChange={(value: any) => updateAnswer(question, value)}
											required={question.required ?? false}
											disabled={(question.uiMeta as any)?.readonly ?? false}
											icon={(question.uiMeta as any)?.icon}
											warning={getWarning(question)}
										/>
									{/if}
									{#if question.id === 'q_sanctionTenure' && currentAnswers?.propertyIdentified == 'No'}
										<DescriptionCard>
											<div class="alertText flex flex-col gap-4">
												<p>
													Lenders issue sanction letters based solely on <span
														class="underline underline-offset-4">Eligibility</span
													> which is determined by the monthly income and already running EMIs of the
													applicant(s).
												</p>
												<div class="flex flex-col gap-2">
													<p class="font-titleMedium">
														Here it is noteworthy that the disbursement amount will depends on the
														factors such as :-
													</p>
													<ul class="list-inside list-disc">
														<li class="alertText">
															The <span class="italic">LTV (Loan-to-Value)</span> ratio of the property's
															value,(property which you will select later).
														</li>
														<li class="alertText">
															The <span class="italic">ATS (Agreement to Sell) </span> document of the
															property if you purchase the property in resale.
														</li>
														<li class="alertText">
															The Downpayment, (it is the maximum amount you can arrange through
															personal funds, such as savings or assistance from immediate family
															members).
														</li>
													</ul>
												</div>
											</div>
										</DescriptionCard>
									{/if}
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
										disabled={((question.id === 'q3_propertyCityName' ||
											question.id === 'q5_propertyCityName') &&
											!(currentAnswers as any)['propertyStateName']) ||
											(question.id === 'q6_residenceCityName' &&
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
										maxSelection={question.id === 'q2_assessmentLenders' &&
										(combinedAnswers as any).loanType === 'Top-up Only'
											? 1
											: null}
									/>
								{:else if question.type === 'checkbox'}
									{#if question.id === 'q_registryNotDoneAck'}
										<div class="msg-card msg-card-warning mt-4">
											<AlertTriangle class="text-currentColor" />
											<div class="msg-card-body">
												<h3 class="msg-card-title">Important Notice</h3>
												<p class="msg-card-text">
													Without property registration, a <strong>Top-up</strong> is generally not
													feasible. Most lenders require the property to be
													<strong>registered in the owner's name</strong>
													with at least <strong>6 months elapsed</strong> since the registry date.
												</p>
												<p class="msg-card-text">
													However, in certain cases — especially where <em
														>property values have appreciated significantly</em
													> — some lenders may still consider it.
												</p>
												<p class="msg-card-text">
													Alternatively, consider going for <strong>Balance Transfer Only</strong> for
													now and apply for a Top-up once the registry is complete.
												</p>
												<div class="mt-2 flex justify-end">
													<label for="q_registryNotDoneAck" class="msg-card-checkbox-label">
														<input
															id="q_registryNotDoneAck"
															type="checkbox"
															checked={!!(currentAnswers as any)[question.bindsTo]}
															onchange={(e) =>
																updateAnswer(question, (e.target as HTMLInputElement).checked)}
															class="msg-card-checkbox"
														/>
														<span class="font-titleMedium smallText"
															>I understand, please proceed.</span
														>
													</label>
												</div>
											</div>
										</div>
									{:else}
										<CheckboxField
											id={question.id}
											label={question.question}
											checked={!!(currentAnswers as any)[question.bindsTo]}
											error={getServerError(question.id) || undefined}
											onChange={(checked) => updateAnswer(question, checked)}
											required={question.required ?? false}
										/>
									{/if}
								{:else if question.type === 'location'}
									<LocationGroup
										{question}
										currentAnswers={currentAnswers as Record<string, unknown>}
										onUpdate={(key, value) => updateAnswerByKey(key, value)}
									/>
								{:else if question.type === 'addApplicant'}
									<AddApplicant label={question.question} title="Add Applicant" />
								{/if}

								{#if question.whyAsked}
									<p class="smallText mt-2 text-[var(--form-text-muted)]">
										{question.whyAsked}
									</p>
								{/if}
							</div>
						{/snippet}

						<div class="mb-12 flex flex-col gap-20">
							{#each questionGroups as group (group.groupId ?? group.questions[0]?.id ?? '')}
								{#if group.groupId}
									<div
										class="border-[var(--form-border)] pt-2 sm:rounded-xl sm:border sm:bg-[var(--form-bg-card)] sm:p-4 sm:shadow-sm"
									>
										{#if group.groupTitle}
											<h3
												class="text-labelText font-titleMedium border-b border-[var(--form-border)] pb-2 text-[var(--form-text-secondary)]"
											>
												{group.groupTitle}
											</h3>
										{/if}
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

				{#if nbfcSuggestionList.length > 0}
					<div class="warning-message">
						<Lightbulb class="h-5 w-5 shrink-0" />
						<div class="msg-card-body">
							{#each nbfcSuggestionList as suggestion}
								<p class="msg-card-text">
									<span class="font-titleMedium smallText">{suggestion.nbfcName}</span> has been reported
									to handle this deal type in your area.
								</p>
							{/each}
						</div>
					</div>
				{/if}

				{#if riskBlocks.length > 0}
					<div class="warning-message flex w-full flex-col gap-2">
						<div class="flex items-center gap-2">
							<AlertTriangle class="h-5 w-5 shrink-0" />
							<p class="text-labelQuestion !m-0">
								No lender handles this case type in {currentAnswers['propertyCityName'] ||
									'this area'}.
							</p>
						</div>
						<div class="w-full">
							<p class="alertText mb-3">
								Do you know which NBFC finances this deal type here? If yes, share the name to help
								other DSAs too.
							</p>
							{#if nbfcSelectMode === 'select'}
								<div class="flex flex-col gap-2">
									<select
										class="msg-risk-input"
										bind:value={nbfcContributionName}
										onchange={(e) => {
											const val = (e.target as HTMLSelectElement).value;
											if (val === '__OTHER__') {
												nbfcSelectMode = 'other';
												nbfcContributionName = '';
											}
										}}
									>
										<option value="" disabled selected>Select NBFC</option>
										{#each nbfcOptions as opt}
											<option value={opt.value}>{opt.label}</option>
										{/each}
										<option value="__OTHER__">Other (not in list)</option>
									</select>
									<button
										type="button"
										onclick={() => contributeNbfc(riskBlocks[0])}
										disabled={nbfcContributing ||
											!nbfcContributionName.trim() ||
											nbfcContributionName === '__OTHER__'}
										class="msg-risk-btn w-full"
									>
										{nbfcContributing ? 'Saving...' : 'Submit'}
									</button>
								</div>
							{:else}
								<div class="flex flex-col gap-2">
									<div class="flex gap-2">
										<input
											type="text"
											bind:value={nbfcContributionName}
											placeholder="Enter NBFC name"
											class="msg-risk-input"
										/>
										<button
											type="button"
											onclick={() => contributeNbfc(riskBlocks[0])}
											disabled={nbfcContributing || !nbfcContributionName.trim()}
											class="msg-risk-btn"
										>
											{nbfcContributing ? 'Saving...' : 'Submit'}
										</button>
									</div>
									<button
										type="button"
										class="buttonText text-left text-gray-500 underline"
										onclick={() => {
											nbfcSelectMode = 'select';
											nbfcContributionName = '';
										}}
									>
										Back to list
									</button>
								</div>
							{/if}
							<p class="tinyText mt-1 text-[var(--form-text-muted)]">
								If you don't know any NBFC, this case cannot proceed. You will not see any results.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#snippet navigation()}
		{@const onTellUs = currentPage?.id === 'tellUs_homeLoan'}
		{@const applicantStep = formState.applicantPageIndex}
		{@const isIndividual = formState.applicationData?.tellUsWhoIsApplying == 'Individual'}
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
			disabledReason={onTellUs ? ownershipDisabledReason || applicantDisabledReason : ''}
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
					// rules see the very latest answers — closes the race where a fast
					// Next click within 300ms of typing skipped validation.condition
					// checks (e.g. principalOutstanding > sanctionAmount, btEmisPaid >
					// _maxPossibleEmis). Costs ~100-300ms of latency, gates a real bug.
					await evaluateOnServer(currentPageIndex, false);
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
						// Income details: scroll to profile tracker if profiles are missing
						if (currentPage?.id === 'incomeDetailsPage' && isSingleApplicant) {
							const tracker = document.getElementById('income-profile-tracker');
							if (tracker) {
								tracker.scrollIntoView({ behavior: 'smooth', block: 'center' });
								tracker.classList.add('ring-2', 'ring-amber-400/60');
								setTimeout(() => tracker.classList.remove('ring-2', 'ring-amber-400/60'), 2000);
								return;
							}
						}
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
			// Home-loan uses 2-phase restore: prefill now, commit on banner confirm
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

<!-- City loading modal — ONLY when user explicitly selects a state -->
{#if showCityLoadingModal}
	<div class="data-loading-overlay">
		<div class="data-loading-card">
			<svg
				class="data-loading-spinner"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path
					d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
				/>
			</svg>
			<p class="alertText font-titleMedium">Loading cities</p>
		</div>
	</div>
{/if}

<!-- Pincode / area loading modal — ONLY when user explicitly selects a state -->
{#if showPincodeLoadingModal}
	<div class="data-loading-overlay">
		<div class="data-loading-card">
			<svg
				class="data-loading-spinner"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path
					d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
				/>
			</svg>
			<p class="alertText font-titleMedium">Loading city areas</p>
		</div>
	</div>
{/if}

<style>
	.form-container {
		touch-action: pan-y;
		overscroll-behavior: none;
	}

	/* ── Message Banner (top-level inline banners) ── */
	.msg-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-family: var(--font-paragraph);
	}

	.msg-banner-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.msg-banner-text {
		font-size: 0.75rem;
		font-weight: 500;
	}

	.msg-banner-info {
		background: color-mix(in srgb, var(--ddsa-info, #7a9ab8) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--ddsa-info, #7a9ab8) 20%, transparent);
		color: var(--ddsa-info, #7a9ab8);
	}

	/* ── Message Cards (info, warning, notice panels) ── */
	.msg-card {
		display: flex;
		gap: 0.875rem;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		animation: fadeSlideIn 0.3s ease-out forwards;
	}

	.msg-card-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.msg-card-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.msg-card-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: var(--font-size-sm);
		color: var(--form-text, #0f172a);
	}

	.msg-card-text {
		font-family: var(--font-paragraph);
		font-size: var(--font-size-xs);
		line-height: 1.7;
		color: var(--form-text-secondary, #4b5563);
	}

	.msg-card-text strong {
		color: var(--form-text, #0f172a);
		font-family: var(--font-title);
		font-weight: 600;
	}

	.msg-card-text em {
		font-style: italic;
		color: var(--form-text, #0f172a);
	}

	.msg-card-footnote {
		font-family: var(--font-paragraph);
		font-size: 0.6875rem;
		color: var(--form-text-muted, #9ca3af);
		margin-top: 0.5rem;
	}

	/* Info variant (NBFC suggestions, tips) — steel blue accent */
	.msg-card-info {
		background: color-mix(in srgb, var(--ddsa-info, #7a9ab8) 8%, var(--form-bg-card, #fff));
		border: 1px solid color-mix(in srgb, var(--ddsa-info, #7a9ab8) 18%, transparent);
		border-left: 3px solid var(--ddsa-info, #7a9ab8);
	}

	.msg-card-info .msg-card-icon {
		color: var(--ddsa-info, #7a9ab8);
	}

	.msg-card-info .msg-card-text {
		color: var(--form-text-secondary, #4b5563);
	}

	/* Warning variant (risk blocks, important notices) — amber accent */
	.msg-card-warning {
		background: color-mix(in srgb, var(--ddsa-warning, #d4a84e) 8%, var(--form-bg-card, #fff));
		border: 1px solid color-mix(in srgb, var(--ddsa-warning, #d4a84e) 18%, transparent);
		border-left: 3px solid var(--ddsa-warning, #d4a84e);
	}

	.msg-card-warning .msg-card-icon {
		color: var(--ddsa-warning, #d4a84e);
	}

	.msg-card-warning .msg-card-title {
		color: var(--ddsa-warning-dark, #b08a3a);
	}

	:global(.dark) .msg-card-warning .msg-card-title {
		color: var(--ddsa-warning, #d4a84e);
	}

	/* Notice variant (neutral informational — possession, registry) — bronze accent */
	.msg-card-notice {
		background: color-mix(in srgb, var(--ddsa-primary, #cb997e) 6%, var(--form-bg-card, #fff));
		border: 1px solid color-mix(in srgb, var(--ddsa-primary, #cb997e) 14%, transparent);
		border-left: 3px solid var(--ddsa-primary, #cb997e);
	}

	.msg-card-notice .msg-card-icon {
		color: var(--ddsa-primary, #cb997e);
	}

	/* Checkbox inside message cards */
	.msg-card-checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
		color: var(--form-text, #0f172a);
	}

	.msg-card-checkbox {
		width: 1.25rem;
		height: 1.25rem;
		cursor: pointer;
		border-radius: 0.25rem;
		border: 2px solid var(--form-border-hover, #d1d5db);
		background: var(--form-bg-input, rgba(249, 250, 251, 0.5));
		accent-color: var(--ddsa-primary, #cb997e);
	}

	/* Risk block input + button */
	.msg-risk-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		border-radius: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--ddsa-warning, #d4a84e) 30%, transparent);
		background: var(--form-bg-input, rgba(249, 250, 251, 0.5));
		color: var(--form-text, #0f172a);
		outline: none;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.msg-risk-input:focus {
		border-color: var(--ddsa-warning, #d4a84e);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ddsa-warning, #d4a84e) 12%, transparent);
	}

	.msg-risk-input::placeholder {
		color: var(--form-text-muted, #9ca3af);
	}

	.msg-risk-btn {
		padding: 0.5rem 1.125rem;
		font-size: 0.8125rem;
		font-weight: 500;
		font-family: var(--font-title);
		border-radius: 0.5rem;
		border: none;
		background: var(--ddsa-warning, #d4a84e);
		color: white;
		cursor: pointer;
		transition:
			opacity 0.2s,
			transform 0.15s;
	}

	.msg-risk-btn:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.msg-risk-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	/* ── Down Payment Analysis Card ── */
	.msg-analysis {
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: color-mix(
			in srgb,
			var(--ddsa-secondary-800, #2b2d25) 92%,
			var(--ddsa-primary, #cb997e)
		);
		border: 1px solid color-mix(in srgb, var(--ddsa-primary, #cb997e) 12%, transparent);
	}

	.msg-analysis-label {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.75rem;
		color: var(--ddsa-accent-300, #e3cab9);
		margin-bottom: 0.5rem;
		letter-spacing: 0.02em;
	}

	.msg-analysis-value {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 1.875rem;
		color: white;
	}

	@media (min-width: 768px) {
		.msg-analysis-value {
			font-size: 3rem;
		}
	}

	.msg-analysis-sub {
		font-size: 0.6875rem;
		color: var(--ddsa-accent-200, #ead7ca);
		font-style: italic;
	}

	.msg-analysis-warning {
		display: flex;
		gap: 0.625rem;
		margin-top: 1rem;
		padding: 0.875rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--ddsa-warning, #d4a84e) 8%, transparent);
		border-left: 3px solid var(--ddsa-warning, #d4a84e);
		font-size: 0.75rem;
		line-height: 1.7;
		color: var(--ddsa-accent-200, #ead7ca);
	}

	.msg-analysis-warning .msg-card-icon {
		color: var(--ddsa-warning, #d4a84e);
	}

	.msg-analysis-highlight {
		color: var(--ddsa-primary, #cb997e);
		text-decoration: underline;
		text-underline-offset: 4px;
		text-decoration-color: color-mix(in srgb, var(--ddsa-primary, #cb997e) 40%, transparent);
	}

	/* ── Loading Overlay (city/area modals) ── */
	.data-loading-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		z-index: 9999;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.data-loading-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		background: var(--form-bg-card, #fff);
		border-radius: 1rem;
		padding: 2rem 2.5rem;
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.14),
			0 0 0 1px color-mix(in srgb, var(--ddsa-primary, #cb997e) 15%, transparent);
	}

	.data-loading-spinner {
		width: 28px;
		height: 28px;
		color: var(--ddsa-primary, #cb997e);
		animation: spinLoader 1.2s linear infinite;
	}

	.data-loading-text {
		font-family: var(--font-title);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--form-text-secondary, #4b5563);
	}

	@keyframes spinLoader {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Undo toast */
	.undo-toast {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-bg-alt, #f3f4f6);
		border: 1px solid var(--form-border);
		/* font-family: var(--font-paragraph);
		font-size: var(--font-size-sm);
		color: var(--color-text-main);
		margin-bottom: 0.5rem; */
		animation: fadeIn 0.2s ease-out;
	}
	.undo-btn {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid var(--form-border);
		background: var(--color-bg-main);
		color: var(--color-text-light);
		cursor: pointer;
		transition: all 0.4s ease;
	}
	.undo-btn:hover {
		background: var(--color-bg-alt);
	}

	/* ── Grouped question cards ── */
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
