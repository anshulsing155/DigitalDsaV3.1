/**
 * Applicant Form Manager — Composable for AddApplicant.svelte
 *
 * Encapsulates all local state, derived values, effects, and handlers
 * for the applicant add/edit form and summary table.
 * Follows the createWizardState() factory pattern.
 *
 * Created: Session 36 (Phase 2B extraction from AddApplicant.svelte)
 */

import { formState } from '$lib/state/form.svelte';
import type { LegacyApplicant } from '$lib/stores/loanData';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'svelte/store';
import { shouldShow } from '$lib/config/showWhenEngine';
import { applicantRecoveryStore, type RecoverableApplicant } from '$lib/stores/applicantRecovery';
import {
	buildDetectionKey,
	buildMatchSignature,
	type RecoveryScope
} from '$lib/state/applicant.svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import {
	userRelationships,
	removeRelationshipsBatch,
	getRelationshipsForApplicant
} from '$lib/components/relationship-capture/relationshipStore';
import {
	findInvalidRelationshipIds,
	findInvalidRelationships
} from '$lib/components/relationship-capture/relationshipValidator';
import { openConfirmModal, closeConfirmModal } from '$lib/stores/confirmModal';
import { dialogState } from '$lib/state/dialog.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { captureRelationshipsForRecovery } from '$lib/utils/restoreRelationships';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';

// Extracted utility imports
import {
	getApplicantErrors as _getApplicantErrors,
	validateApplicantFieldJSON as _validateApplicantFieldJSON,
	checkApplicantComplete as _checkApplicantComplete,
	getVisibleQuestions as _getVisibleQuestions,
	getRelevantFields as _getRelevantFields,
	validateFormLevelField as _validateFormLevelField
} from '$lib/utils/applicantValidation';
import {
	findDuplicateApplicants,
	getDuplicateErrorMessage
} from '$lib/utils/applicantDuplicateDetector';
import {
	isGuarantorApplicant as _isGuarantorApplicant,
	computeBtRoleMismatchWarning,
	shouldClearGlobalRoleError as _shouldClearGlobalRoleError,
	isCardReadyForRoleValidation,
	getApplicantStatus as _getApplicantStatus,
	getRoleValidationError
} from '$lib/utils/applicantRoleValidation';
import { detectCachedForForm, detectCachedForIndex } from '$lib/utils/applicantRecoveryDetector';

import { untrack } from 'svelte';
import {
	type DirectorForm,
	initDirectorForms,
	isCardComplete,
	resizeDirectorForms,
	createEmptyDirectorForm,
	validateAllDirectors,
	commitDirectorsToApplicants,
	normalizeName,
	MEMBER_LABEL_MAP,
	ROLE_MAP,
	getMinDirectors,
	checkOpcDuplicate
} from '$lib/utils/directorFormUtils';
import type { DirectorDisplayRow } from '$lib/components/ApplicantSummaryTable.svelte';
import {
	getProfileForCompanyType,
	orphanIncomeForCompany,
	syncAutoIncomeEntries,
	AUTO_DERIVED_INFRA_KEYS
} from '$lib/utils/directorAutoIncome';
import type { IncomeSourceEntry, IncomeProfileType } from '$lib/types/incomeProfile';
import {
	runCrossFieldValidation,
	filterContradictionsForPage,
	type Contradiction
} from '$lib/utils/crossStepValidator';
import {
	deriveApplicantClassification,
	isFamilyRelationship,
	pickMostDemandingClassification,
	type ApplicantClassification
} from '$lib/utils/applicantRoleUtils';
import { isNonFamily } from '$lib/components/relationship-capture/categoryClassifier';
import { applicantDataStore } from '$lib/stores/applicantDataStore.svelte';
import {
	NRI_INCOMPATIBLE_BUSINESS_PROFILES,
	isNriIncompatibleBusinessProfile
} from '$lib/utils/applicantVisibility';
import { INCOME_PROFILE_CARDS } from '$lib/config/incomeProfiles/profileCards';
import {
	type PendingRestore,
	prefillApplicantRestore,
	commitApplicantRestore,
	cancelApplicantRestore,
	rebuildSelectedIncomeProfiles
} from '$lib/utils/applicantRestoreHandler';

// ── Constants ──────────────────────────────────────────────────────

/** Company types where all directors get full financial profiling */
export const FULL_PROFILE_COMPANY_TYPES = ['Partnership Firm', 'LLP', 'One Person Company (OPC)'];

/** Backward-compat map: old btExistingStructure strings → { co, guar } */
const BT_STRUCTURE_COMPAT: Record<string, { co: number; guar: number }> = {
	single_borrower: { co: 0, guar: 0 },
	borrower_1co: { co: 1, guar: 0 },
	borrower_2co: { co: 2, guar: 0 },
	borrower_co_guarantor: { co: 1, guar: 1 },
	borrower_2co_guarantor: { co: 2, guar: 1 }
};

export const MAX_APPLICANTS = 8;

const RESTORE_IGNORE_KEYS = new Set([
	'id',
	'touchedFields',
	'shake',
	'hasError',
	'__completion',
	'__restoredFrom',
	'companyCompletion',
	// Name changes alone don't trigger the prompt
	'fullName',
	'companyName',
	// Directors are managed via directorFormsMap, not direct editing
	'directors',
	'hasRelatedDirectors',
	// Company linkage is managed programmatically (auto-set when directors are linked to companies),
	// not user-edited — restoring a previously-linked director should not show "fields changed".
	'linkedCompanyId',
	'linkedCompanyIds',
	// Income/credit tab state — managed separately in applicantDataStore, not flat applicant fields.
	// These get added to formApplicant during income tab operations but are undefined on saved
	// applicants, causing false "fields changed" detection ([] !== undefined).
	'selectedIncomeProfiles',
	'incomeEntries',
	'obligations',
	'creditFactorAnswers',
	'creditFactorReasons',
	'whyPrimaryLowCredit',
	'noIncomeReason',
	'employmentType'
]);

// ── Types ──────────────────────────────────────────────────────────

interface ApplicantFormManagerOptions {
	configJson: { formLevelQuestions?: any[]; questions: any[] };
	setIsNextEnabled: (v: boolean) => void;
	setDisabledReason?: (v: string) => void;
}

// ── Factory ────────────────────────────────────────────────────────

export function createApplicantFormManager(options: ApplicantFormManagerOptions) {
	const { configJson, setIsNextEnabled, setDisabledReason } = options;

	// ── Timeout tracking ───────────────────────────────────────────

	let activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
	let detectionDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function trackTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
		const timeoutId = setTimeout(() => {
			activeTimeouts.delete(timeoutId);
			callback();
		}, delay);
		activeTimeouts.add(timeoutId);
		return timeoutId;
	}

	// Cleanup effect for tracked timeouts
	$effect(() => {
		return () => {
			activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
			activeTimeouts.clear();
			if (detectionDebounceTimer) {
				clearTimeout(detectionDebounceTimer);
			}
		};
	});

	// ── Thin wrappers closing over configJson + shouldShow ─────────

	const hasRoleQuestions = $derived(configJson.questions.some((q: any) => q.key === 'onProperty'));

	function getVisibleQuestions(
		applicant: LegacyApplicant,
		applicationData: Record<string, unknown>
	) {
		return _getVisibleQuestions(applicant, applicationData, configJson.questions, shouldShow);
	}

	function getVisibleFormLevelQuestions(applicationData: Record<string, unknown>) {
		return (configJson.formLevelQuestions ?? []).filter((q: any) =>
			shouldShow(q.showWhen as any, applicationData)
		);
	}

	function getApplicantErrors(
		applicant: LegacyApplicant,
		index: number,
		appData: Record<string, unknown>
	): Record<string, string> {
		return _getApplicantErrors(applicant, index, appData, configJson.questions, shouldShow);
	}

	function validateApplicantFieldJSON(
		applicant: LegacyApplicant,
		index: number,
		fieldKey: string
	): string | null {
		return _validateApplicantFieldJSON(
			applicant,
			index,
			fieldKey,
			configJson.questions,
			formState.applicationData,
			shouldShow
		);
	}

	function checkApplicantComplete(
		applicant: LegacyApplicant,
		index: number,
		appData: Record<string, unknown>
	): boolean {
		return _checkApplicantComplete(applicant, index, appData, configJson.questions, shouldShow);
	}

	function getRelevantFields(applicant: LegacyApplicant): LegacyApplicant {
		return _getRelevantFields(applicant, hasRoleQuestions);
	}

	function validateFormLevelField(fieldKey: string): string | null {
		return _validateFormLevelField(
			fieldKey,
			configJson.formLevelQuestions ?? [],
			formState.applicationData,
			shouldShow
		);
	}

	function isGuarantorApplicant(a: LegacyApplicant): boolean {
		return _isGuarantorApplicant(a, hasRoleQuestions);
	}

	function shouldClearGlobalRoleErrorFn(): boolean {
		return _shouldClearGlobalRoleError(formState.applicants as LegacyApplicant[], hasRoleQuestions);
	}

	function getApplicantStatus(applicant: LegacyApplicant, index: number): 'complete' | 'pending' {
		return _getApplicantStatus(
			applicant,
			index,
			formState.applicationData,
			configJson.questions,
			shouldShow
		);
	}

	// ── BT State ───────────────────────────────────────────────────

	const currentLoanName = $derived(
		((formState.loanData as Record<string, unknown>).loanName as string) ?? ''
	);
	const currentLoanAnswers = $derived(
		((formState.loanData as Record<string, unknown>)[currentLoanName] ?? {}) as Record<
			string,
			unknown
		>
	);
	const currentLoanType = $derived((currentLoanAnswers.loanType as string) ?? '');
	const isBTCase = $derived(
		['Balance Transfer Only', 'Balance Transfer With Top-up', 'Top-up Only'].includes(
			currentLoanType
		)
	);

	let btCoApplicantCount = $state(0);
	let btGuarantorCount = $state(0);

	// Sync from persisted loanData on mount (with backward compat for old btExistingStructure)
	$effect(() => {
		const storedCo = currentLoanAnswers.btCoApplicantCount;
		const storedGuar = currentLoanAnswers.btGuarantorCount;
		if (typeof storedCo === 'number' && btCoApplicantCount === 0 && btGuarantorCount === 0) {
			btCoApplicantCount = storedCo;
			btGuarantorCount = typeof storedGuar === 'number' ? storedGuar : 0;
		} else if (btCoApplicantCount === 0 && btGuarantorCount === 0) {
			// Backward compat: convert old btExistingStructure string
			const oldStructure = (currentLoanAnswers.btExistingStructure as string) ?? '';
			if (oldStructure && BT_STRUCTURE_COMPAT[oldStructure]) {
				const { co, guar } = BT_STRUCTURE_COMPAT[oldStructure];
				btCoApplicantCount = co;
				btGuarantorCount = guar;
			}
		}
	});

	const btExpectedCount = $derived(
		btCoApplicantCount > 0 || btGuarantorCount > 0 ? 1 + btCoApplicantCount + btGuarantorCount : 0
	);

	function setBtCoApplicantCount(count: number) {
		btCoApplicantCount = count;
		persistBtCounts(count, btGuarantorCount);
	}

	function setBtGuarantorCount(count: number) {
		btGuarantorCount = count;
		persistBtCounts(btCoApplicantCount, count);
	}

	function persistBtCounts(co: number, guar: number) {
		const data = formState.loanData as Record<string, unknown>;
		const loanAnswers = (data[currentLoanName] ?? {}) as Record<string, unknown>;
		formState.replaceLoanData({
			...data,
			[currentLoanName]: {
				...loanAnswers,
				btCoApplicantCount: co,
				btGuarantorCount: guar,
				btExpectedApplicantCount: 1 + co + guar
			}
		});
	}

	const btMismatchWarning = $derived.by(() => {
		if (!isBTCase || !btExpectedCount) return '';
		const typed = formState.applicants.filter((a) => a.applicantType) as LegacyApplicant[];
		const actualCount = typed.length;

		// Layer 1 — total count mismatch (existing check).
		if (actualCount > 0 && actualCount !== btExpectedCount) {
			return `Expected ${btExpectedCount} applicant(s) based on existing loan, but ${actualCount} added. Lenders require matching structure for balance transfer.`;
		}

		// Layer 2 — role distribution mismatch (CLAUDE.md Pitfall #34).
		// Burned us 2026-05-15: user declared 1 borrower + 0 co-app + 1 guarantor
		// on an LAP-BT, then added 2 applicants both as Co-Applicant Financial.
		// Total count matched, role distribution didn't. Delegated to the pure
		// helper in applicantRoleValidation.ts so it's unit-testable.
		if (actualCount === btExpectedCount) {
			const roleWarning = computeBtRoleMismatchWarning(
				typed,
				btCoApplicantCount,
				btGuarantorCount,
				isGuarantorApplicant
			);
			if (roleWarning) return roleWarning;
		}

		return '';
	});

	// ── Director State (secured loans — inline management) ────────────

	const DIRECTOR_FORMS_STORAGE_KEY = 'director-forms-map';

	/** Persist directorFormsMap to sessionStorage for crash recovery */
	function persistDirectorForms(map: Map<string, DirectorForm[]>) {
		try {
			const serialized = JSON.stringify(Array.from(map.entries()));
			sessionStorage.setItem(DIRECTOR_FORMS_STORAGE_KEY, serialized);
		} catch {
			/* ignore serialization errors */
		}
	}

	/** Restore directorFormsMap from sessionStorage */
	function restoreDirectorForms(): Map<string, DirectorForm[]> {
		try {
			const saved = sessionStorage.getItem(DIRECTOR_FORMS_STORAGE_KEY);
			if (saved) {
				const entries: [string, DirectorForm[]][] = JSON.parse(saved);
				return new Map(entries);
			}
		} catch {
			/* ignore parse errors */
		}
		return new Map();
	}

	let directorFormsMap: Map<string, DirectorForm[]> = $state(restoreDirectorForms());
	let editingDirectorCompanyId: string | null = $state(null);
	let editingDirectorIdx: number | null = $state(null);
	let directorModalOpen = $state(false);
	let directorError = $state('');
	let showDirectorRemovePicker = $state(false);
	let removePickerFilled: DirectorForm[] = $state([]);
	let removePickerTargetCount = $state(0);
	let removePickerCompanyId: string = $state('');
	/** Previous company type before the resize — reverted on cancel */
	let removePickerPreviousCompanyType: string = $state('');
	// Marker flag — set during the second pass after the DSA confirms a
	// companyType change in the cross-profile guard modal. Lets the change
	// proceed without re-prompting. Plain `let` (not $state) — purely a
	// local re-entrancy signal, not part of the reactive UI.
	let _companyTypeChangeConfirmed = false;
	// Same pattern for isNRI = No → Yes when the applicant has business
	// income or directorship that must be deleted with confirmation.
	let _nriChangeConfirmed = false;

	// ── Company Delete Dialog state ─────────────────────────────────
	let companyDeleteDialog = $state<{
		show: boolean;
		companyName: string;
		companyId: string;
		companyIndex: number;
		directors: Array<{
			name: string;
			directorId: string;
			isMultiLinked: boolean;
			otherCompanies: string[];
		}>;
	}>({ show: false, companyName: '', companyId: '', companyIndex: -1, directors: [] });

	// ── Director fingerprint for reactive init ──────────────────────
	const companyDirectorFingerprint = $derived(
		formState.applicants
			.filter((a) => a.applicantType === 'Company')
			.map((a) => `${a.id}|${a.numberOfDirectorsOrPartners}|${a.companyType}`)
			.join(';;')
	);

	// ── Director init/resize effect ─────────────────────────────────
	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		companyDirectorFingerprint; // subscribe to fingerprint changes only

		if (!hasRoleQuestions) return; // Unsecured loans handle directors differently

		const companies = untrack(() =>
			formState.applicants.filter((a) => a.applicantType === 'Company')
		);

		let nextMap = new Map(directorFormsMap);
		let changed = false;

		for (const company of companies) {
			const companyId = company.id as string;
			if (!companyId) continue;
			const expectedCount =
				Number(company.numberOfDirectorsOrPartners) ||
				getMinDirectors((company.companyType as string) ?? '');
			const companyType = (company.companyType as string) ?? '';
			const isOPC = companyType === 'One Person Company (OPC)';
			const isFullProfile = FULL_PROFILE_COMPANY_TYPES.includes(companyType);
			const existing = nextMap.get(companyId);

			if (!existing) {
				let forms = initDirectorForms(company as Record<string, unknown>, false);
				// Pass companyType so createEmptyDirectorForm can set the right default
				// designation per entity type (OPC → MD, Partnership → Partner, LLP →
				// Designated Partner, Pvt Ltd → Director). This keeps the table OK/Pending
				// status accurate from the moment forms are created — no need to open the
				// modal first to trigger the modal's auto-default $effect.
				const createOpts = { isOPC, companyType };
				while (forms.length < expectedCount) {
					forms = [...forms, createEmptyDirectorForm(false, createOpts)];
				}
				nextMap.set(companyId, forms);
				changed = true;

				// If restored company has filled director forms, commit them as
				// linked Individual applicants (they were separate entries before deletion).
				// Synchronous inside untrack — safe because adding Individuals doesn't
				// change companyDirectorFingerprint (only Company id/count/type matter).
				// Previously used queueMicrotask, which caused a race: stale forms
				// captured in the closure could have outdated director IDs if a
				// cross-company match changed the ID before the microtask executed.
				const filledForms = forms.filter((f) => f.fullName?.trim());
				if (filledForms.length > 0) {
					const role = ROLE_MAP[companyType] ?? 'director';
					untrack(() => {
						let latest = [...formState.applicants] as Array<Record<string, unknown>>;
						latest = commitDirectorsToApplicants(companyId, forms, latest, role);
						// Sync auto-income entries for linked Individuals
						latest = latest.map((a) => {
							const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
							if (a.applicantType !== 'Individual' || ids.length === 0) return a;
							const existing = (a.incomeEntries as any[] | undefined) ?? [];
							const name = (a.fullName as string) || '';
							return { ...a, incomeEntries: syncAutoIncomeEntries(ids, latest, existing, name) };
						});
						formState.replaceApplicants(latest);
					});
				}
			} else if (
				isOPC &&
				existing.some(
					(f) => f.ownershipPercent !== '100' || !f.lockedFields.includes('ownershipPercent')
				)
			) {
				// OPC: force ownership to 100% and lock it on existing forms
				const updated = existing.map((f) => ({
					...f,
					ownershipPercent: '100',
					lockedFields: f.lockedFields.includes('ownershipPercent')
						? f.lockedFields
						: [...f.lockedFields, 'ownershipPercent']
				}));
				nextMap.set(companyId, updated);
				changed = true;
			} else if (existing.length !== expectedCount) {
				const { forms, needsUserChoice } = resizeDirectorForms(existing, expectedCount, false);
				if (needsUserChoice.length > 0) {
					removePickerFilled = needsUserChoice;
					removePickerTargetCount = expectedCount;
					removePickerCompanyId = companyId;
					// Keep the previous type already captured in updateApplicantField
					// (set before the value change). Only set here as fallback.
					if (!removePickerPreviousCompanyType) {
						removePickerPreviousCompanyType = companyType;
					}
					showDirectorRemovePicker = true;
				} else {
					nextMap.set(companyId, forms);
					changed = true;
				}
			}
		}

		const companyIds = new Set(companies.map((cc) => cc.id as string).filter(Boolean));
		for (const id of nextMap.keys()) {
			if (!companyIds.has(id)) {
				nextMap.delete(id);
				changed = true;
			}
		}

		if (changed) {
			directorFormsMap = nextMap;
			persistDirectorForms(nextMap);
		}
	});

	// ── R4: Dynamic company↔director auto-linking ─────────────────
	// Watches for company additions and auto-links individuals whose
	// income entries reference the same company (by name match).
	// Also clears __pendingCompanyLink when a matching company appears.
	// Company REMOVAL is handled by deleteApplicant() — not duplicated here.
	let previousCompanyFingerprint = '';

	$effect(() => {
		// Build a fingerprint of all Company applicants (id + normalized name)
		const companies = formState.applicants
			.filter((a) => a.applicantType === 'Company')
			.map((a) => ({
				id: a.id as string,
				name: ((a.companyName as string) || '').trim().toLowerCase().replace(/\s+/g, ' ')
			}))
			.filter((c) => c.id && c.name);

		const fingerprint = companies.map((c) => `${c.id}|${c.name}`).join(';;');

		// Only run when companies actually change (not on every applicant mutation)
		if (fingerprint === previousCompanyFingerprint) return;

		const prevIds = new Set(
			previousCompanyFingerprint
				.split(';;')
				.filter(Boolean)
				.map((s) => s.split('|')[0])
		);

		const newCompanies = companies.filter((c) => !prevIds.has(c.id));
		previousCompanyFingerprint = fingerprint;

		if (newCompanies.length === 0) return;

		// Link individuals whose income entries or __pendingCompanyLink match the new company
		untrack(() => {
			const updated = [...formState.applicants] as Array<Record<string, unknown>>;
			let changed = false;

			for (const company of newCompanies) {
				for (let i = 0; i < updated.length; i++) {
					const applicant = updated[i];
					if (applicant.applicantType !== 'Individual') continue;

					// Already linked to this company? Skip.
					const existingIds = (applicant.linkedCompanyIds as string[] | undefined) ?? [];
					if (applicant.linkedCompanyId === company.id || existingIds.includes(company.id)) {
						continue;
					}

					// User explicitly declared this Individual independent of any same-named
					// record via RestoreApplicantModal — skip name/income-entity auto-link.
					// The structural `linkedCompanyId` is what makes the Who's Applying table
					// hide the row as a director sub-row; suppressing it keeps the Individual
					// visible while still allowing them to list director income manually.
					if (applicant.__independentOfSameName) continue;

					// Check 1: __pendingCompanyLink matches (set during applicant restoration)
					const pendingName = ((applicant.__pendingCompanyLink as string) || '')
						.trim()
						.toLowerCase()
						.replace(/\s+/g, ' ');

					if (pendingName && pendingName === company.name) {
						updated[i] = {
							...applicant,
							linkedCompanyId: applicant.linkedCompanyId || company.id,
							linkedCompanyIds: [...existingIds, company.id],
							__pendingCompanyLink: undefined
						};
						changed = true;
						continue;
					}

					// Check 2: Income entries with matching entityName (director/partner profiles)
					const incomeEntries =
						(applicant.incomeEntries as Array<Record<string, unknown>> | undefined) ?? [];
					const hasMatchingIncome = incomeEntries.some((entry) => {
						const entityName = ((entry.entityName as string) || '')
							.trim()
							.toLowerCase()
							.replace(/\s+/g, ' ');
						const profileType = entry.profileType as string;
						return (
							entityName === company.name &&
							['director_company', 'business_partnership'].includes(profileType)
						);
					});

					if (hasMatchingIncome) {
						updated[i] = {
							...applicant,
							linkedCompanyId: applicant.linkedCompanyId || company.id,
							linkedCompanyIds: [...existingIds, company.id]
						};
						changed = true;
					}
				}
			}

			if (changed) {
				// Sync auto-income entries for newly linked individuals
				const synced = updated.map((a) => {
					const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
					if (a.applicantType !== 'Individual' || ids.length === 0) return a;
					const existing = (a.incomeEntries as Array<Record<string, unknown>> | undefined) ?? [];
					const name = (a.fullName as string) || '';
					return {
						...a,
						incomeEntries: syncAutoIncomeEntries(ids, updated, existing as any[], name)
					};
				});
				formState.replaceApplicants(synced);
			}
		});
	});

	// ── Director row map for summary table ───────────────────────────
	const directorRowsMap = $derived.by(() => {
		const map = new Map<string, DirectorDisplayRow[]>();
		for (const [companyId, forms] of directorFormsMap) {
			const company = formState.applicants.find((a) => a.id === companyId);
			if (!company) continue;
			const companyType = (company.companyType as string) ?? '';
			const memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Director';
			const isFullProfile = FULL_PROFILE_COMPANY_TYPES.includes(companyType);
			const rows: DirectorDisplayRow[] = forms.map((d, i) => {
				// Find linked Individual by name — check ALL companies, not just this one.
				// nidhi may be linked to ddsa but also appears as director in e yantrik.
				const normalizedName = d.fullName?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
				const linkedIdx = normalizedName
					? formState.applicants.findIndex((a) => {
							const linked = a as Record<string, unknown>;
							return (
								linked.applicantType === 'Individual' &&
								((linked.fullName as string) ?? '').trim().toLowerCase().replace(/\s+/g, ' ') ===
									normalizedName
							);
						})
					: -1;

				// Source of truth for flags: Individual applicant (if exists), else director form
				const linkedApplicant = linkedIdx >= 0 ? formState.applicants[linkedIdx] : null;
				const effectiveOnProperty = linkedApplicant
					? String(linkedApplicant.onProperty ?? d.onProperty ?? '')
					: d.onProperty;
				const effectiveOnEMI = linkedApplicant
					? String(linkedApplicant.onEMI ?? d.onEMI ?? '')
					: d.onEMI;

				// Classification from linked Individual, or compute inline
				let dirClassification: string | undefined;
				if (linkedApplicant) {
					dirClassification = linkedApplicant.applicantClassification as string | undefined;
				}
				if (!dirClassification) {
					const onEMI =
						effectiveOnEMI === 'true' ? true : effectiveOnEMI === 'false' ? false : undefined;
					const onProperty =
						effectiveOnProperty === 'true'
							? true
							: effectiveOnProperty === 'false'
								? false
								: undefined;
					dirClassification = deriveApplicantClassification({
						isSecuredLoan: hasRoleQuestions,
						onEMI,
						onProperty,
						companyType,
						ownershipPercent: Number(d.ownershipPercent) || 0,
						loanCategory: currentLoanName,
						loanRole: d.loanRole as string | undefined
					});
				}
				return {
					id: d.id,
					directorIndex: i,
					name: d.fullName?.trim() || `${memberLabel} ${i + 1}`,
					role: memberLabel,
					isComplete: isCardComplete(d, false, companyType),
					ownershipPercent: d.ownershipPercent || undefined,
					onProperty: effectiveOnProperty,
					onEMI: effectiveOnEMI,
					fullProfile: isFullProfile,
					hasLinkedApplicant: linkedIdx >= 0,
					linkedApplicantIndex: linkedIdx >= 0 ? linkedIdx : undefined,
					applicantClassification: dirClassification
				};
			});
			map.set(companyId, rows);
		}
		return map;
	});

	// ── All directors complete (for isNextEnabled) ───────────────────
	const allDirectorsComplete = $derived.by(() => {
		for (const [companyId, forms] of directorFormsMap) {
			const company = formState.applicants.find((a) => a.id === companyId);
			if (!company) continue;
			const companyType = (company.companyType as string) ?? '';
			// Check minimum director count
			const minCount = getMinDirectors(companyType);
			if (forms.length < minCount) return false;
			for (const d of forms) {
				if (!isCardComplete(d, false, companyType)) return false;
			}
		}
		return true;
	});

	// ── Director handlers ────────────────────────────────────────────
	function handleEditDirector(companyId: string, directorIndex: number) {
		editingDirectorCompanyId = companyId;
		editingDirectorIdx = directorIndex;
		directorModalOpen = true;
	}

	function handleDirectorSave(data: DirectorForm) {
		if (editingDirectorCompanyId === null || editingDirectorIdx === null) return;
		const forms = directorFormsMap.get(editingDirectorCompanyId);
		if (!forms) return;
		const updated = forms.map((d, i) => (i === editingDirectorIdx ? data : d));
		const newMap = new Map(directorFormsMap).set(editingDirectorCompanyId, updated);

		// Cross-company field sync: sync shared identity fields to matching directors in other companies
		const savedName = normalizeName(data.fullName);
		if (savedName) {
			for (const [otherId, otherForms] of newMap) {
				if (otherId === editingDirectorCompanyId) continue;
				let changed = false;
				const synced = otherForms.map((d) => {
					if (normalizeName(d.fullName) === savedName) {
						changed = true;
						return {
							...d,
							gender: data.gender,
							age: data.age,
							maritalStatus: data.maritalStatus,
							isNRI: data.isNRI,
							location: data.location
						};
					}
					return d;
				});
				if (changed) newMap.set(otherId, synced);
			}
		}

		directorFormsMap = newMap;
		persistDirectorForms(newMap); // Persist director edits immediately

		// Capture before nulling for immediate commit
		const savedCompanyId = editingDirectorCompanyId;

		editingDirectorIdx = null;
		editingDirectorCompanyId = null;
		directorModalOpen = false;
		directorError = '';
		globalRoleError = '';

		// Immediate commit: directors ARE full applicants from the moment they're saved
		if (savedCompanyId) {
			const company = (formState.applicants as any[]).find(
				(a: any) => a.id === savedCompanyId && a.applicantType === 'Company'
			);
			if (company) {
				const companyType = (company.companyType as string) ?? '';
				const role = ROLE_MAP[companyType] ?? 'director';
				const allForms = $state.snapshot(newMap.get(savedCompanyId) ?? []) as DirectorForm[];
				let latestApplicants = [...formState.applicants] as Array<Record<string, unknown>>;
				latestApplicants = commitDirectorsToApplicants(
					savedCompanyId,
					allForms,
					latestApplicants,
					role
				);
				// Sync income entries for linked Individuals
				latestApplicants = latestApplicants.map((a) => {
					const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
					if (a.applicantType !== 'Individual' || ids.length === 0) return a;
					const existing = (a.incomeEntries as any[] | undefined) ?? [];
					const name = (a.fullName as string) || '';
					return {
						...a,
						incomeEntries: syncAutoIncomeEntries(ids, latestApplicants, existing, name)
					};
				});
				formState.replaceApplicants(latestApplicants);
			}
		}
	}

	/** Apply restored data from RestoreApplicantModal to a director form.
	 *  Called from the page-level confirm handler when directorRestore context is set. */
	function applyDirectorRestore(
		companyId: string,
		dirIdx: number,
		restore: {
			data: Record<string, string>;
			lockedFields: string[];
			matchedId: string;
			source: string;
			structured?: Record<string, unknown>;
			profileFields?: Record<string, unknown>;
		}
	) {
		const forms = directorFormsMap.get(companyId);
		if (!forms || !forms[dirIdx]) return;
		const updated = [...forms];

		// Prevent duplicate IDs: if another director in this company already has the
		// recovery UUID, generate a fresh one. Two directors restored from the same
		// person would otherwise share an ID → each_key_duplicate crash in sub-rows.
		let effectiveId = restore.matchedId;
		const idAlreadyUsed = updated.some((f, i) => i !== dirIdx && f.id === restore.matchedId);
		if (idAlreadyUsed) {
			effectiveId = uuidv4();
		}

		updated[dirIdx] = {
			...updated[dirIdx],
			...restore.data,
			id: effectiveId,
			restoredFrom: restore.source,
			// Recovery restores: pre-fill but fully editable (no locked fields)
			lockedFields: updated[dirIdx].lockedFields.filter((f) => f === 'ownershipPercent'),
			pendingMatch: null
		};
		const newMap = new Map(directorFormsMap).set(companyId, updated);
		directorFormsMap = newMap;
		persistDirectorForms(newMap);

		// Restore structured income/obligation/CIBIL data for the linked Individual
		// Use effectiveId so the data is keyed to the actual director ID (may differ
		// from matchedId if a fresh UUID was generated to avoid collision)
		if (restore.structured && effectiveId) {
			applicantDataStore.fromJSON({
				...applicantDataStore.toJSON(),
				[effectiveId]: restore.structured as any
			});
		}

		// Re-commit the director as an Individual so the restored financial data
		// is immediately accessible (the Individual may have been deleted).
		// Without this, the data sits in applicantDataStore with no linked entry.
		const company = (formState.applicants as any[]).find(
			(a: any) => a.id === companyId && a.applicantType === 'Company'
		);
		if (company) {
			const companyType = (company.companyType as string) ?? '';
			const role = ROLE_MAP[companyType] ?? 'director';
			const allForms = $state.snapshot(newMap.get(companyId) ?? []) as DirectorForm[];
			let latestApplicants = [...formState.applicants] as Array<Record<string, unknown>>;
			latestApplicants = commitDirectorsToApplicants(companyId, allForms, latestApplicants, role);
			// Sync auto-income entries for linked Individuals
			latestApplicants = latestApplicants.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existing = (a.incomeEntries as any[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				return {
					...a,
					incomeEntries: syncAutoIncomeEntries(ids, latestApplicants, existing, name)
				};
			});

			// Merge recovered income entry data into auto-created entries.
			// Only restore USER-ENTERED specifics — leave auto-derived infrastructure
			// keys (companyType, registeredInIndia, shareholding, etc.) at their
			// current values so stale recovery data doesn't overwrite live company state.
			if (restore.structured && effectiveId) {
				const recoveredIncome = (restore.structured as Record<string, unknown>).incomeEntries as
					| { active?: Record<string, Array<Record<string, unknown>>> }
					| undefined;
				if (recoveredIncome?.active) {
					const recoveredFlat = Object.values(recoveredIncome.active).flat();
					if (recoveredFlat.length > 0) {
						// Keys always derived from current company data — never restore from recovery.
						// Canonical inventory + parity test live in directorAutoIncome.ts.
						const AUTO_DERIVED_INFRA = AUTO_DERIVED_INFRA_KEYS;
						const targetIdx = latestApplicants.findIndex((a) => a.id === effectiveId);
						if (targetIdx >= 0) {
							const matched = new Set<number>();
							const entries = (
								(latestApplicants[targetIdx].incomeEntries as any[]) ?? []
							).map((entry: any) => {
								if (!entry.autoCreated || !entry.sourceCompanyId) return entry;
								let matchIdx = recoveredFlat.findIndex(
									(re, i) => !matched.has(i) && re.sourceCompanyId === entry.sourceCompanyId
								);
								if (matchIdx < 0) {
									matchIdx = recoveredFlat.findIndex(
										(re, i) =>
											!matched.has(i) &&
											re.profileType === entry.profileType &&
											re.entityName === entry.entityName
									);
								}
								if (matchIdx < 0) return entry;
								matched.add(matchIdx);
								const recovered = recoveredFlat[matchIdx];
								const recoveredSpecifics = recovered.specifics as Record<string, unknown> | undefined;
								const recoveredIncomeData = recovered.income as Record<string, unknown> | undefined;
								const recoveredEvidence = recovered.evidence as Record<string, unknown> | undefined;
								// Filter out auto-derived infra keys — keep only user-entered answers
								const userEnteredSpecifics: Record<string, unknown> = {};
								if (recoveredSpecifics) {
									for (const [k, v] of Object.entries(recoveredSpecifics)) {
										if (!AUTO_DERIVED_INFRA.has(k) && v !== undefined && v !== '') {
											userEnteredSpecifics[k] = v;
										}
									}
								}
								return {
									...entry,
									specifics:
										Object.keys(userEnteredSpecifics).length > 0
											? { ...entry.specifics, ...userEnteredSpecifics }
											: entry.specifics,
									income:
										recoveredIncomeData && Object.keys(recoveredIncomeData).length > 0
											? recoveredIncomeData
											: entry.income,
									evidence:
										recoveredEvidence && Object.keys(recoveredEvidence).length > 0
											? recoveredEvidence
											: entry.evidence
								};
							});
							latestApplicants[targetIdx] = {
								...latestApplicants[targetIdx],
								incomeEntries: entries
							};
						}
					}
				}
			}

			// Side-channel: merge profile fields from recovery onto the Individual
			// so Profile tab starts complete, unblocking Income/Credit/Obligations tabs
			if (restore.profileFields && Object.keys(restore.profileFields).length > 0) {
				const targetIdx = latestApplicants.findIndex((a) => a.id === effectiveId);
				if (targetIdx >= 0) {
					latestApplicants[targetIdx] = {
						...latestApplicants[targetIdx],
						...restore.profileFields
					};
				}
			}

			// Rebuild selectedIncomeProfiles from structured income data
			// so Income Profiles tab shows the correct selections
			if (restore.structured && effectiveId) {
				const rebuiltProfiles = rebuildSelectedIncomeProfiles(
					restore.structured as Record<string, unknown>
				);
				if (rebuiltProfiles.length > 0) {
					const targetIdx = latestApplicants.findIndex((a) => a.id === effectiveId);
					if (targetIdx >= 0) {
						latestApplicants[targetIdx] = {
							...latestApplicants[targetIdx],
							selectedIncomeProfiles: rebuiltProfiles
						};
					}
				}
			}

			formState.replaceApplicants(latestApplicants);
		}
	}

	function handleDirectorModalClose() {
		editingDirectorIdx = null;
		editingDirectorCompanyId = null;
		directorModalOpen = false;
	}

	function handleRemovePickerConfirm(keepIndexes: number[]) {
		const kept = keepIndexes.map((i) => removePickerFilled[i]);
		// Resolve companyType up-front so any newly-created empty forms get the
		// correct designation default (matches createOpts pattern at line ~424).
		const companyForOpts = (formState.applicants as any[]).find(
			(a: any) => a.id === removePickerCompanyId && a.applicantType === 'Company'
		);
		const ct = (companyForOpts?.companyType as string) ?? '';
		const isOpcCt = ct === 'One Person Company (OPC)';
		const refillOpts = { isOPC: isOpcCt, companyType: ct };
		while (kept.length < removePickerTargetCount) {
			kept.push(createEmptyDirectorForm(false, refillOpts));
		}
		const companyId = removePickerCompanyId;
		const newMap = new Map(directorFormsMap).set(companyId, kept);
		directorFormsMap = newMap;
		persistDirectorForms(newMap);
		showDirectorRemovePicker = false;
		removePickerFilled = [];
		removePickerPreviousCompanyType = '';

		// Re-commit to remove the deleted director's Individual from applicants
		const company = (formState.applicants as any[]).find(
			(a: any) => a.id === companyId && a.applicantType === 'Company'
		);
		if (company) {
			const companyType = (company.companyType as string) ?? '';
			const role = ROLE_MAP[companyType] ?? 'director';
			const forms = $state.snapshot(newMap.get(companyId) ?? []) as DirectorForm[];
			let updated = [...formState.applicants] as Array<Record<string, unknown>>;
			updated = commitDirectorsToApplicants(companyId, forms, updated, role);
			// Sync auto-income: orphan entries for removed directors, add for remaining
			updated = updated.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existing = (a.incomeEntries as any[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				return { ...a, incomeEntries: syncAutoIncomeEntries(ids, updated, existing, name) };
			});
			formState.replaceApplicants(updated);
		}
	}

	function handleRemovePickerCancel() {
		const forms = directorFormsMap.get(removePickerCompanyId);
		if (forms) {
			const list = [...formState.applicants];
			const idx = list.findIndex((a) => a.id === removePickerCompanyId);
			if (idx >= 0) {
				const revert: Record<string, unknown> = {
					...list[idx],
					numberOfDirectorsOrPartners: String(forms.length)
				};
				// Revert companyType if resize was triggered by a type change (e.g., Pvt Ltd→OPC)
				if (removePickerPreviousCompanyType) {
					revert.companyType = removePickerPreviousCompanyType;
					// Also update formApplicant so the editing form stays in sync
					formApplicant = {
						...formApplicant,
						companyType: removePickerPreviousCompanyType,
						numberOfDirectorsOrPartners: String(forms.length)
					};
				}
				list[idx] = revert;
				formState.replaceApplicants(list);
			}
		}
		showDirectorRemovePicker = false;
		removePickerFilled = [];
		removePickerPreviousCompanyType = '';
	}

	function getDirectorModalData() {
		if (editingDirectorCompanyId === null || editingDirectorIdx === null) return null;
		const forms = directorFormsMap.get(editingDirectorCompanyId);
		if (!forms || !forms[editingDirectorIdx]) return null;
		const company = formState.applicants.find((a) => a.id === editingDirectorCompanyId);
		const companyType = (company?.companyType as string) ?? '';
		return {
			form: forms[editingDirectorIdx],
			allForms: forms,
			companyType,
			memberLabel: MEMBER_LABEL_MAP[companyType] ?? 'Director',
			allCompanyDirectorForms: directorFormsMap,
			currentCompanyId: editingDirectorCompanyId,
			companyApplicants: formState.applicants
				.filter((a) => a.applicantType === 'Company')
				.map((a) => ({ id: a.id as string, companyName: (a.companyName as string) ?? '' }))
		};
	}

	// ── Form + Table state ─────────────────────────────────────────

	let hasTriedToAddApplicant: boolean = $state(false);
	let formLevelErrors: Record<string, string> = $state({});
	let crossFieldWarnings: Contradiction[] = $state([]);
	let editingIndex: number | null = $state(null);
	let formApplicant: Record<string, unknown> = $state({
		id: uuidv4(),
		applicantType: '',
		touchedFields: {}
	});
	let formErrors: Record<string, string> = $state({});

	const visibleFormQuestions = $derived(
		formApplicant.applicantType
			? getVisibleQuestions(formApplicant as LegacyApplicant, formState.applicationData)
			: []
	);

	const applicantCompletionStatus = $derived.by(() => {
		const appData = formState.applicationData;
		return formState.applicants.map((applicant, index) =>
			checkApplicantComplete(applicant as LegacyApplicant, index, appData)
		);
	});

	// ── Female property warning (advisory, non-blocking) ────────────

	const femalePropertyWarning = $derived.by(() => {
		if (!hasRoleQuestions) return '';
		const individuals = (formState.applicants as LegacyApplicant[]).filter(
			(a) => a.applicantType === 'Individual' && a.gender
		);
		if (individuals.length < 2) return '';
		const hasFemale = individuals.some((a) => a.gender === 'Female');
		if (!hasFemale) return '';
		const femaleOnProperty = individuals.some(
			(a) => a.gender === 'Female' && a.onProperty === true
		);
		if (femaleOnProperty) return '';
		return "No female applicant is on the property deed. Some lenders require a female co-applicant's name on the property for stamp duty benefits or policy compliance.";
	});

	// ── OPC duplicate warning (advisory, non-blocking) ──────────────

	const opcDuplicateWarning = $derived.by(() => {
		// Check each OPC company to see if another OPC has the same name
		const opcCompanies = (formState.applicants as LegacyApplicant[]).filter(
			(a) => a.applicantType === 'Company' && a.companyType === 'One Person Company (OPC)'
		);
		if (opcCompanies.length < 2) return '';

		// Check for name duplicates among OPCs
		const seen = new Map<string, string>(); // normalized name → company id
		for (const opc of opcCompanies) {
			const name = ((opc.companyName as string) ?? '').trim().toLowerCase();
			if (!name || name.length < 2) continue;
			if (seen.has(name)) {
				return 'Multiple OPCs with the same name found. An OPC can only have one director — these may need to be separate companies.';
			}
			seen.set(name, (opc.id as string) ?? '');
		}
		return '';
	});

	let errorApplicant: Record<string, string>[] = $state([]);
	let globalRoleError: string = $state('');
	let activeApplicantIndex: number | null = $state(null);
	// restoreAskedForKey now lives in applicantState.restoreAskedKeys (CLAUDE.md Pitfall #30)
	let previousNames: Map<string, string> = new Map();

	// ── 2-Phase Restore State ──────────────────────────────────────────
	let pendingRestore: PendingRestore | null = $state(null);

	function setPendingRestore(pr: PendingRestore | null) {
		pendingRestore = pr;
	}

	function confirmPendingRestore() {
		if (!pendingRestore) return;
		commitApplicantRestore(pendingRestore);
		pendingRestore = null;
	}

	function cancelPendingRestore() {
		if (!pendingRestore) return;
		cancelApplicantRestore(pendingRestore);
		pendingRestore = null;
	}

	/** Auto-expire pending restore on navigation or other applicant changes */
	function autoResolvePendingRestore() {
		if (!pendingRestore) return;
		// If the applicant at the pending index still has the same ID, auto-commit
		const currentApp = formState.applicants[pendingRestore.currentIndex];
		if (currentApp && currentApp.id === pendingRestore.cardId) {
			commitApplicantRestore(pendingRestore);
		}
		pendingRestore = null;
	}

	// ── Live name match detection (checks against existing applicants + director-linked) ──
	// TODO: Extend RestoreApplicantModal to show live applicant matches alongside recovery bin matches.
	// The RestoreApplicantModal already handles the UX properly (radio selection, restore/dismiss,
	// re-trigger link). For now, the post-hoc duplicate detector (applicantDuplicateDetector)
	// highlights duplicates in the table after saving.

	// Detection state for cached applicants (no debounce — triggers immediately at 2+ chars)
	// detectionDebounceTimer declared above with timeout tracking (kept for cleanup only)

	// ── Auto-derive applicationStructure from actual applicants ──────

	$effect(() => {
		const typed = formState.applicants.filter((a) => a.applicantType);
		if (typed.length === 0) return;

		const hasIndividuals = typed.some((a) => a.applicantType === 'Individual');
		const hasCompanies = typed.some((a) => a.applicantType === 'Company');

		let derived: string;
		if (hasIndividuals && hasCompanies) {
			derived = 'mix';
		} else if (hasCompanies) {
			derived = 'company';
		} else if (typed.length === 1) {
			derived = 'individual';
		} else {
			derived = 'group_individuals';
		}

		const current = formState.applicationData.applicationStructure as string | undefined;
		if (current !== derived) {
			formState.setApplicationField('applicationStructure' as any, derived as any);
		}
	});

	// ── Restored-and-modified detection ──────────────────────────────

	let restoredFromData: Record<string, unknown> | null = $state(null);

	/** Set of keys that differ between current form and restored snapshot */
	const restoredChangedKeys = $derived.by(() => {
		if (!restoredFromData) return new Set<string>();
		const changed = new Set<string>();
		const allKeys = new Set([...Object.keys(formApplicant), ...Object.keys(restoredFromData)]);
		for (const key of allKeys) {
			if (RESTORE_IGNORE_KEYS.has(key)) continue;
			const current = (formApplicant as any)[key];
			const original = (restoredFromData as any)[key];
			const norm = (v: unknown) => (v === undefined || v === null || v === '' ? '' : v);
			if (norm(current) !== norm(original)) changed.add(key);
		}
		return changed;
	});

	/** Only show "Add as New" when identity-level fields changed, not just role assignments */
	const ROLE_ONLY_KEYS = new Set(['onProperty', 'onEMI', 'isGuarantor', 'applicantClassification']);
	const isRestoredAndModified = $derived(
		restoredChangedKeys.size > 0 && [...restoredChangedKeys].some((key) => !ROLE_ONLY_KEYS.has(key))
	);

	// ── Sync formApplicant after restore (ONLY on confirm, not cancel) ──

	let wasRestoreOpen = $state(false);

	$effect(() => {
		const isOpen = restoreIntentState.open;
		if (wasRestoreOpen && !isOpen) {
			if (restoreIntentState.wasConfirmed) {
				// Live edit path — open existing applicant for editing
				const liveIdx = restoreIntentState.liveEditIndex;
				if (liveIdx !== undefined) {
					restoreIntentState.clearConfirmed();
					startEdit(liveIdx);
					wasRestoreOpen = false;
					return;
				}

				// Confirm path — sync form with restored applicant data
				const restoredIndex = restoreIntentState.confirmedIndex;
				restoreIntentState.clearConfirmed();
				const targetIndex = restoredIndex ?? editingIndex ?? formState.applicants.length - 1;
				const restored = formState.applicants[targetIndex];
				if (restored?.applicantType) {
					const restoredAsLegacy = restored as LegacyApplicant;
					const gaps = getApplicantErrors(restoredAsLegacy, targetIndex, formState.applicationData);
					delete gaps.applicantType;

					if (Object.keys(gaps).length === 0) {
						editingIndex = null;
						formApplicant = { id: uuidv4(), applicantType: '', touchedFields: {} };
						formErrors = {};
						hasTriedToAddApplicant = false;
						restoredFromData = null;
					} else {
						editingIndex = targetIndex;
						formApplicant = { ...restored };
						restoredFromData = $state.snapshot(formApplicant) as Record<string, unknown>;
						formErrors = {};
						hasTriedToAddApplicant = false;
					}
				} else {
					// Restored applicant not found at index — reset form to clean state
					editingIndex = null;
					formApplicant = { id: uuidv4(), applicantType: '', touchedFields: {} };
					formErrors = {};
					hasTriedToAddApplicant = false;
					restoredFromData = null;
				}
			} else {
				// Cancel path — clear any stale validation errors so form is clean
				formErrors = {};
				hasTriedToAddApplicant = false;
			}
		}
		wasRestoreOpen = isOpen;
	});

	// ── Error array sync ────────────────────────────────────────────

	$effect(() => {
		const storeLen = formState.applicants.length;
		if (errorApplicant.length !== storeLen) {
			errorApplicant = formState.applicants.map((_, i) => errorApplicant[i] ?? {});
		}
	});

	// ── Recovery scope helper ───────────────────────────────────────

	function getRecoveryScope(applicantType: string | undefined): RecoveryScope {
		return applicantType === 'Company' ? 'secured::company' : 'secured::individual';
	}

	// ── Form handlers ───────────────────────────────────────────────

	function startEdit(index: number) {
		editingIndex = index;
		formApplicant = { ...formState.applicants[index] };
		if (formApplicant.__restoredFrom) {
			restoredFromData = formApplicant.__restoredFrom as Record<string, unknown>;
		} else {
			// Snapshot the current state so we can detect changes during editing
			// and offer "Update" vs "Add as New" for any edited applicant
			restoredFromData = $state.snapshot(formState.applicants[index]) as Record<string, unknown>;
		}
		formErrors = {};
		hasTriedToAddApplicant = false;
		pendingHighlightIndexes = new Set();
	}

	/**
	 * Cleanup performed when the DSA confirms an isNRI No → Yes flip on an
	 * Individual applicant that holds business income or director linkage.
	 * Removes the business profiles (entries soft-delete via the existing
	 * applicantDataStore path), clears director linkage fields on the
	 * applicant, and unlinks the applicant from any parent Company's
	 * directors[] array (and directorFormsMap) so the company side stays
	 * consistent. Does NOT auto-restore on a later isNRI Yes → No flip —
	 * the DSA confirmed the deletion.
	 */
	function applyNriCleanup(
		applicantId: string | undefined,
		selectedProfiles: IncomeProfileType[],
		businessProfiles: IncomeProfileType[],
		linkedCompanyIds: Set<string>
	) {
		// 1. Remove business profiles from the applicant data store. The
		// existing updateSelectedProfiles path soft-deletes the matching
		// income entries (moves them to the deleted bucket), keeping the
		// data flow consistent with how profile deselection already works.
		if (applicantId && businessProfiles.length > 0) {
			const newProfiles = selectedProfiles.filter((p) => !businessProfiles.includes(p));
			applicantDataStore.updateSelectedProfiles(applicantId, newProfiles);
		}

		// 2. Clear director-linkage fields on the applicant entry, plus
		// unlink them from each parent Company's directors[] and the local
		// directorFormsMap. Director.id matches the linked Individual.id
		// after commitDirectorsToApplicants (see directorFormUtils.ts).
		const idx = editingIndex;
		if (idx === null) return;
		const updatedApplicants = [...formState.applicants];
		const ap = { ...updatedApplicants[idx] } as Record<string, unknown>;
		const removedAppId = ap.id as string | undefined;

		delete ap.linkedCompanyId;
		ap.linkedCompanyIds = [];
		delete ap.ownershipPercent;
		delete ap.directorRole;
		delete ap.designation;
		// Mirror the data-store change onto the applicant entry's snapshot.
		ap.selectedIncomeProfiles = (ap.selectedIncomeProfiles as IncomeProfileType[] | undefined)?.filter(
			(p) => !businessProfiles.includes(p)
		);
		updatedApplicants[idx] = ap;

		if (removedAppId && linkedCompanyIds.size > 0) {
			for (let i = 0; i < updatedApplicants.length; i++) {
				const a = updatedApplicants[i] as Record<string, unknown>;
				if (a.applicantType !== 'Company') continue;
				if (!linkedCompanyIds.has(a.id as string)) continue;
				const directors = (a.directors as Array<Record<string, unknown>> | undefined) ?? [];
				const filtered = directors.filter((d) => d.id !== removedAppId);
				if (filtered.length !== directors.length) {
					(updatedApplicants[i] as Record<string, unknown>) = { ...a, directors: filtered };
				}
			}
		}

		formState.replaceApplicants(updatedApplicants);

		// Sync directorFormsMap (local Map) so the same person doesn't
		// re-appear next time the company's director list is rendered.
		if (removedAppId && linkedCompanyIds.size > 0) {
			const nextMap = new Map(directorFormsMap);
			let mapChanged = false;
			for (const companyId of linkedCompanyIds) {
				const forms = nextMap.get(companyId);
				if (!forms) continue;
				const filtered = forms.filter((f) => f.id !== removedAppId);
				if (filtered.length !== forms.length) {
					nextMap.set(companyId, filtered);
					mapChanged = true;
				}
			}
			if (mapChanged) directorFormsMap = nextMap;
		}
	}

	function updateFormField(index: number, key: string, value: unknown) {
		// Prevent applicant type change during edit
		if (key === 'applicantType' && editingIndex !== null) {
			const originalType = formState.applicants[editingIndex]?.applicantType;
			if (originalType && value !== originalType) {
				openConfirmModal(
					'Cannot change applicant type',
					`You cannot change from ${originalType} to ${value} while editing. Please add a new applicant with the correct type instead.`,
					() => closeConfirmModal(),
					{ confirmLabel: 'OK' }
				);
				return;
			}
		}

		// Confirmation modal when companyType change crosses an income-profile
		// boundary on a saved Company applicant that already has director-linked
		// Individuals attached. Without this prompt, the change silently orphans
		// the existing director income entries (per the data-layer cascade in
		// syncAutoIncomeEntries) — DSA might not realize until they hit the
		// income page. Per user direction (2026-05-04): "only lock what the
		// latest selected and free the previous one ... you can flag to keep it
		// or not from user."
		if (
			key === 'companyType' &&
			!_companyTypeChangeConfirmed &&
			editingIndex !== null &&
			formApplicant.applicantType === 'Company' &&
			typeof value === 'string' &&
			typeof formApplicant.companyType === 'string' &&
			value !== formApplicant.companyType
		) {
			const oldProfile = getProfileForCompanyType(formApplicant.companyType);
			const newProfile = getProfileForCompanyType(value);
			const profileChanged = !!oldProfile && !!newProfile && oldProfile !== newProfile;
			if (profileChanged) {
				const companyId = formApplicant.id as string;
				const linkedIndividuals = formState.applicants.filter(
					(a: any) =>
						a.applicantType === 'Individual' &&
						(a.linkedCompanyId === companyId ||
							(Array.isArray(a.linkedCompanyIds) && a.linkedCompanyIds.includes(companyId)))
				);
				if (linkedIndividuals.length > 0) {
					const namesList = linkedIndividuals
						.map((a: any) => a.fullName as string)
						.filter(Boolean)
						.join(', ');
					const oldLabel = oldProfile === 'director_company' ? 'Director (Company)' : 'Partner (Firm)';
					const newLabel = newProfile === 'director_company' ? 'Director (Company)' : 'Partner (Firm)';
					openConfirmModal(
						`Change company type from ${formApplicant.companyType} to ${value}?`,
						`This will change the income profile for ${linkedIndividuals.length} linked applicant(s)${namesList ? ` — ${namesList}` : ''}.\n\n` +
							`• A new "${newLabel}" income profile will be auto-locked with the company name and stake.\n` +
							`• The previous "${oldLabel}" entries will be unlocked but kept — you can edit or delete them from the income page.`,
						() => {
							closeConfirmModal();
							// Re-call updateFormField with a marker so this branch is bypassed on the second pass.
							// try/finally guarantees the flag is cleared even if updateFormField throws —
							// otherwise a stale `true` would silently bypass this guard for every subsequent
							// company-type change in the session.
							try {
								_companyTypeChangeConfirmed = true;
								updateFormField(index, key, value);
							} finally {
								_companyTypeChangeConfirmed = false;
							}
						},
						{ confirmLabel: 'Continue', cancelLabel: 'Cancel' }
					);
					if (!_companyTypeChangeConfirmed) return;
				}
			}
		}

		// Confirmation modal when an Individual applicant is flipped to NRI=Yes
		// while holding business income (proprietorship/partnership/director/
		// professional) or director linkage to a Company applicant. NRIs are
		// only supported as salaried per the product rule (lenders cannot
		// verify NRI business income), so this data must be deleted — but
		// silently nuking on toggle has burned us before. Detected 2026-05-04.
		if (
			key === 'isNRI' &&
			value === 'Yes' &&
			!_nriChangeConfirmed &&
			editingIndex !== null &&
			formApplicant.applicantType === 'Individual' &&
			formApplicant.isNRI !== 'Yes'
		) {
			const applicantId = formApplicant.id as string | undefined;
			const data = applicantId ? applicantDataStore.get(applicantId) : undefined;
			const selectedProfiles = (data?.incomeProfiles?.selectedProfiles ?? []) as IncomeProfileType[];
			const businessProfiles = selectedProfiles.filter(isNriIncompatibleBusinessProfile);

			const linkedIds = new Set<string>();
			const primaryLink = formApplicant.linkedCompanyId as string | undefined;
			if (primaryLink) linkedIds.add(primaryLink);
			for (const id of (formApplicant.linkedCompanyIds as string[] | undefined) ?? []) {
				if (id) linkedIds.add(id);
			}
			const linkedCompanyNames = formState.applicants
				.filter((a: any) => a.applicantType === 'Company' && linkedIds.has(a.id as string))
				.map((a: any) => (a.companyName as string) || (a.fullName as string) || 'Company')
				.filter(Boolean);

			const hasBusinessData = businessProfiles.length > 0 || linkedIds.size > 0;
			if (hasBusinessData) {
				const profileLabels = businessProfiles.map((p) => {
					const card = INCOME_PROFILE_CARDS.find((c) => c.type === p);
					return card?.label ?? p;
				});

				const lines: string[] = [];
				if (linkedCompanyNames.length > 0) {
					lines.push(`• Director linkage to ${linkedCompanyNames.join(', ')}`);
					lines.push('• Ownership %, board role, designation');
				}
				if (profileLabels.length > 0) {
					lines.push(
						`• ${profileLabels.length} business income ${
							profileLabels.length > 1 ? 'entries' : 'entry'
						} (${profileLabels.join(', ')})`
					);
				}

				const displayName = (formApplicant.fullName as string) || 'this applicant';
				openConfirmModal(
					'Mark this applicant as NRI?',
					`NRIs are only supported as salaried applicants — lenders cannot verify business or directorship income for NRI applicants.\n\n` +
						`The following will be removed for ${displayName}:\n${lines.join('\n')}\n\n` +
						`This cannot be undone. Continue?`,
					() => {
						closeConfirmModal();
						applyNriCleanup(applicantId, selectedProfiles, businessProfiles, linkedIds);
						// try/finally guarantees the re-entrancy flag is cleared even if
						// updateFormField throws — see _companyTypeChangeConfirmed above for rationale.
						try {
							_nriChangeConfirmed = true;
							updateFormField(index, key, value);
						} finally {
							_nriChangeConfirmed = false;
						}
					},
					{ confirmLabel: 'Continue', cancelLabel: 'Cancel' }
				);
				return;
			}
		}

		activeApplicantIndex = editingIndex ?? formState.applicants.length;
		formState.applicantStepTouched = true;

		let updated: any = { ...formApplicant };

		if (key === 'applicantType' && value !== updated.applicantType) {
			updated = getRelevantFields({ ...updated, applicantType: value as string });
		}

		// Store previous companyType for revert on director resize cancel
		if (key === 'companyType' && updated.companyType && value !== updated.companyType) {
			removePickerPreviousCompanyType = updated.companyType as string;
		}

		// When companyType is OPC, auto-set numberOfDirectorsOrPartners to '1' and clear error
		if (key === 'companyType' && value === 'One Person Company (OPC)') {
			updated.numberOfDirectorsOrPartners = '1';
			const { numberOfDirectorsOrPartners: _, ...restErrors } = formErrors;
			formErrors = restErrors;
		}
		// When companyType changes away from OPC, always reset director count so user must re-select
		if (
			key === 'companyType' &&
			value !== 'One Person Company (OPC)' &&
			updated.companyType === 'One Person Company (OPC)'
		) {
			updated.numberOfDirectorsOrPartners = '';
			const dirError = validateApplicantFieldJSON(
				{ ...updated, companyType: value } as LegacyApplicant,
				editingIndex ?? formState.applicants.length,
				'numberOfDirectorsOrPartners'
			);
			if (dirError) {
				formErrors = { ...formErrors, numberOfDirectorsOrPartners: dirError };
			} else {
				const { numberOfDirectorsOrPartners: _, ...restErrors } = formErrors;
				formErrors = restErrors;
			}
		}
		// Sole proprietor = domestic entity by definition — fix isNRI to "No"
		if (key === 'applicantSubType' && value === 'sole_proprietor') {
			updated.isNRI = 'No';
		}

		// When onEMI changes to true, clear invalid employment types
		if (key === 'onEMI' && value === true) {
			const invalidEmploymentTypesForOnEMI = ['Homemaker', 'Others'];
			if (invalidEmploymentTypesForOnEMI.includes(updated.employmentType ?? '')) {
				updated.employmentType = '';
			}
		}

		formApplicant = {
			...formApplicant,
			...updated,
			[key]: value,
			touchedFields: {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
				// NOTE: touchedFields[key] is set on BLUR only (handleFormFieldBlur),
				// not on input — prevents premature validation display while typing.
			}
		};

		// Run validation on the field
		const error = validateApplicantFieldJSON(
			formApplicant as LegacyApplicant,
			editingIndex ?? formState.applicants.length,
			key
		);
		if (error) {
			formErrors = { ...formErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = formErrors;
			formErrors = rest;
		}

		// Name-change detection for recovery
		if (key === 'fullName' || key === 'companyName') {
			const nameValue = String(value || '').trim();
			if (nameValue.length >= 2) {
				detectCachedApplicantForForm();
			}
		}
	}

	function handleFormFieldBlur(index: number, key: string, value: unknown) {
		formApplicant = {
			...formApplicant,
			touchedFields: {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {}),
				[key]: true
			}
		};
	}

	// ── Detection handlers ──────────────────────────────────────────

	function detectCachedApplicantForForm() {
		const result = detectCachedForForm({
			formApplicant,
			editingIndex,
			applicants: formState.applicants as Record<string, unknown>[],
			getRecoveryScope
		});
		if (!result) return;

		applicantState.markRestoreAsked(result.detectionKey);
		restoreIntentState.set({
			open: true,
			currentIndex: result.targetIndex,
			matches: result.sortedMatches,
			detectionKey: result.detectionKey,
			recoveryScope: result.recoveryScope
		});
	}

	function detectCachedApplicantForIndex(index: number) {
		const result = detectCachedForIndex({
			index,
			applicants: formState.applicants as Record<string, unknown>[],
			getRecoveryScope
		});
		if (!result) return;

		applicantState.markRestoreAsked(result.detectionKey);
		restoreIntentState.set({
			open: true,
			currentIndex: result.targetIndex,
			matches: result.sortedMatches,
			detectionKey: result.detectionKey,
			recoveryScope: result.recoveryScope
		});
	}

	/**
	 * Re-trigger recovery detection after user accidentally dismissed the modal.
	 * Clears all denied UUIDs and re-runs form detection.
	 */
	function retriggerRecoveryDetection() {
		applicantState.clearAllDeniedUUIDs();
		applicantState.clearAllRestoreAsked(); // Reset so detection can fire again
		detectCachedApplicantForForm();
	}

	/** Whether there are denied recovery matches — shows "Check previous records" link */
	const hasDeniedRecoveryMatches = $derived(applicantState.hasDeniedUUIDs());

	// ── Display helpers ─────────────────────────────────────────────

	function getApplicantDisplayName(applicant: LegacyApplicant, index: number): string {
		if (applicant.fullName) {
			return applicant.fullName as string;
		}
		if (applicant.companyName) {
			return applicant.companyName as string;
		}
		return `Applicant ${index + 1}`;
	}

	// ── Validation handlers ─────────────────────────────────────────

	function validateOnNext(): boolean {
		const formLevelValid = validateFormLevelQuestions();
		if (!formLevelValid) {
			globalRoleError = 'Please answer all application structure questions above.';
			return false;
		}

		const isValid = shouldClearGlobalRoleErrorFn();

		if (!isValid) {
			globalRoleError =
				'Each applicant must be marked Yes for at least one of: On Property or On EMI.';
		} else {
			globalRoleError = '';
		}

		return isValid;
	}

	/**
	 * State-mutating validation - ONLY call from event handlers, never from templates.
	 */
	function validateApplicantJSON(
		applicant: LegacyApplicant,
		index: number
	): Record<string, string> {
		const errors = getApplicantErrors(applicant, index, formState.applicationData);
		formState.applicantErrors[index] = errors;
		return errors;
	}

	function validateAllApplicants(): boolean {
		let hasErrors = false;
		const updatedApplicants = [...formState.applicants];
		const updatedErrors = { ...formState.applicantErrors };

		formState.applicants.forEach((applicant: any, index: number) => {
			const typeError = validateApplicantFieldJSON(applicant, index, 'applicantType');

			if (typeError) {
				hasErrors = true;
				updatedErrors[index] = {
					...updatedErrors[index],
					applicantType: typeError
				};

				updatedApplicants[index] = { ...updatedApplicants[index], shake: true };
				trackTimeout(() => {
					const list = [...formState.applicants];
					list[index] = { ...list[index], shake: false };
					formState.replaceApplicants(list);
				}, 400);
			}

			if (!applicant.applicantType) return;

			const errors = validateApplicantJSON(applicant, index);
			if (Object.keys(errors).length > 0) {
				hasErrors = true;
			}
		});

		formState.replaceApplicants(updatedApplicants);
		formState.replaceApplicantErrors(updatedErrors);

		return !hasErrors;
	}

	/**
	 * @deprecated Use checkApplicantComplete for template checks.
	 * This version mutates state - only use in event handlers.
	 */
	function isApplicantComplete(applicant: LegacyApplicant, index: number): boolean {
		if (!applicant.applicantType) return false;
		const errors = getApplicantErrors(applicant, index, formState.applicationData);
		return Object.keys(errors).length === 0;
	}

	// ── Form-level field handlers ───────────────────────────────────

	function updateFormLevelField(_index: number, key: string, value: unknown) {
		formState.applicantStepTouched = true;
		formState.setApplicationField(key as any, value as any);

		if (globalRoleError) {
			globalRoleError = '';
		}

		const error = validateFormLevelField(key);
		if (error) {
			formLevelErrors = { ...formLevelErrors, [key]: error };
		} else {
			const { [key]: _, ...rest } = formLevelErrors;
			formLevelErrors = rest;
		}

		// When businessEntityType changes (Business Loan), auto-derive applicationStructure
		if (key === 'businessEntityType') {
			const SINGLE_ENTITIES = ['Sole Proprietorship', 'One Person Company (OPC)'];
			const derivedStructure = SINGLE_ENTITIES.includes(value as string) ? 'individual' : 'company';
			formState.setApplicationField('applicationStructure' as any, derivedStructure as any);
		}
	}

	function validateFormLevelQuestions(): boolean {
		const visibleQs = getVisibleFormLevelQuestions(formState.applicationData);
		let hasErrors = false;
		const errors: Record<string, string> = {};

		for (const q of visibleQs as any[]) {
			const error = validateFormLevelField(q.key);
			if (error) {
				errors[q.key] = error;
				hasErrors = true;
			}
		}

		formLevelErrors = errors;
		return !hasErrors;
	}

	// ── 4-Way Classification Auto-Derivation ──────────────────────

	/**
	 * Recompute applicantClassification for the applicant at the given index.
	 * Called when onEMI, onProperty, isGuarantor, or applicantType changes.
	 * Uses relationship data to determine family status.
	 */
	/**
	 * Compute classification for a single company membership.
	 * Returns the classification based on the company's type, the director's stake,
	 * family relationships with other directors, and onEMI/onProperty flags.
	 */
	function classifyForCompany(
		applicantId: string,
		applicant: Record<string, unknown>,
		company: Record<string, unknown>,
		rels: Array<Record<string, unknown>>
	): ApplicantClassification {
		const companyType = company.companyType as string;
		const directors = (company.directors ?? []) as Array<Record<string, unknown>>;

		// Find this person's director entry in the company to get stake + flags
		const applicantName = ((applicant.fullName as string) || '').toLowerCase().trim();
		const dirEntry = directors.find((d) => {
			const dirName = ((d.fullName as string) || '').toLowerCase().trim();
			return dirName === applicantName && applicantName.length > 0;
		});
		const ownershipPercent = Number(dirEntry?.ownershipPercent ?? applicant.ownershipPercent) || 0;
		const onEMI =
			dirEntry?.onEMI === 'true' || dirEntry?.onEMI === true
				? true
				: dirEntry?.onEMI === 'false' || dirEntry?.onEMI === false
					? false
					: undefined;
		const onProperty =
			dirEntry?.onProperty === 'true' || dirEntry?.onProperty === true
				? true
				: dirEntry?.onProperty === 'false' || dirEntry?.onProperty === false
					? false
					: undefined;

		// Check family with other directors in this company
		let isFamilyMember: boolean | undefined;
		let combinedFamilyStake = ownershipPercent;
		const siblingDirectors = formState.applicants.filter(
			(a) =>
				a.applicantType === 'Individual' && a.linkedCompanyId === company.id && a.id !== applicantId
		);
		for (const sibling of siblingDirectors) {
			const sibId = (sibling.id as string) ?? '';
			const rel = rels.find(
				(r) =>
					(r.fromId === applicantId && r.toId === sibId) ||
					(r.fromId === sibId && r.toId === applicantId)
			);
			if (rel && isFamilyRelationship(rel.category as any)) {
				isFamilyMember = true;
				combinedFamilyStake += Number(sibling.ownershipPercent) || 0;
			}
		}

		return deriveApplicantClassification({
			isSecuredLoan: hasRoleQuestions,
			onEMI: onEMI ?? (applicant.onEMI as boolean | undefined),
			onProperty: onProperty ?? (applicant.onProperty as boolean | undefined),
			isFamilyMember,
			companyType,
			ownershipPercent,
			combinedFamilyStake: isFamilyMember ? combinedFamilyStake : undefined,
			loanCategory: currentLoanName,
			loanRole: applicant.loanRole as string | undefined
		});
	}

	function recomputeClassification(index: number) {
		const applicant = formState.applicants[index];
		if (!applicant) return;

		// Business-runner co-applicant (P12): a female sole-proprietor's husband/
		// father/son who runs the business. Their full financials are captured for
		// VERIFICATION only and must NEVER pool into eligibility, so their
		// classification is fixed at non_applicant_full_financial — do not let the
		// standalone-Individual path below reclassify them to co_applicant_financial.
		if (applicant.businessRunnerFor) {
			if (applicant.applicantClassification !== 'non_applicant_full_financial') {
				const updatedList = [...formState.applicants];
				updatedList[index] = {
					...updatedList[index],
					applicantClassification: 'non_applicant_full_financial'
				};
				formState.replaceApplicants(updatedList);
			}
			return;
		}

		const applicantId = (applicant.id as string) ?? '';
		const applicantName = ((applicant.fullName as string) || '').toLowerCase().trim();
		const rels = get(userRelationships) as unknown as Array<Record<string, unknown>>;
		const linkedCompanyId = applicant.linkedCompanyId as string | undefined;

		if (linkedCompanyId || applicantName) {
			// Director or person who appears in company director lists.
			// Compute classification for EACH company they appear in,
			// then pick the most demanding (union of requirements).
			const allCompanies = formState.applicants.filter((a) => a.applicantType === 'Company');

			const classifications: ApplicantClassification[] = [];

			for (const company of allCompanies) {
				// Check if this person is a director in this company
				const directors = (company.directors ?? []) as unknown as Array<Record<string, unknown>>;
				const isDirectorHere = directors.some((d) => {
					const dirName = ((d.fullName as string) || '').toLowerCase().trim();
					return dirName === applicantName && applicantName.length > 0;
				});

				if (isDirectorHere || company.id === linkedCompanyId) {
					classifications.push(classifyForCompany(applicantId, applicant, company, rels));
				}
			}

			if (classifications.length > 0) {
				const classification = pickMostDemandingClassification(classifications);

				if (applicant.applicantClassification !== classification) {
					const updatedList = [...formState.applicants];
					updatedList[index] = { ...updatedList[index], applicantClassification: classification };
					formState.replaceApplicants(updatedList);
				}
				return;
			}
		}

		// Standalone Individual (not in any company): classify by own flags
		let isFamilyMember: boolean | undefined;
		if (applicant.applicantType === 'Individual') {
			const otherApplicants = formState.applicants.filter(
				(a) => a.applicantType === 'Individual' && a.id !== applicantId
			);
			for (const other of otherApplicants) {
				const otherId = (other.id as string) ?? '';
				const rel = rels.find(
					(r) =>
						(r.fromId === applicantId && r.toId === otherId) ||
						(r.fromId === otherId && r.toId === applicantId)
				);
				if (rel && isFamilyRelationship(rel.category as any)) {
					isFamilyMember = true;
					break;
				}
			}
		}

		const classification = deriveApplicantClassification({
			isSecuredLoan: hasRoleQuestions,
			onEMI: applicant.onEMI as boolean | undefined,
			onProperty: applicant.onProperty as boolean | undefined,
			isFamilyMember,
			loanCategory: currentLoanName,
			loanRole: applicant.loanRole as string | undefined
		});

		// Only update if changed (avoid infinite reactivity loops)
		if (applicant.applicantClassification !== classification) {
			const updatedList = [...formState.applicants];
			updatedList[index] = { ...updatedList[index], applicantClassification: classification };
			formState.replaceApplicants(updatedList);
		}
	}

	// ── Reactive classification: ensure ALL applicants have classification set ──
	// Recompute classification when applicants change or step transitions occur.
	$effect(() => {
		const applicants = formState.applicants;
		// Track step transitions — when DSA finishes relationships (step 1) and enters
		// financials (step 2/3), recompute with fresh family data from relationship store.
		const _step = formState.applicantPageIndex;
		for (let i = 0; i < applicants.length; i++) {
			const a = applicants[i];

			// Company is always co_applicant_financial — must be on Property or EMI
			// (validation enforces this). Full financials always required.
			if (a.applicantType === 'Company') {
				if (a.applicantClassification !== 'co_applicant_financial') {
					untrack(() => {
						const updatedList = [...formState.applicants];
						updatedList[i] = {
							...updatedList[i],
							applicantClassification: 'co_applicant_financial'
						};
						formState.replaceApplicants(updatedList);
					});
				}
				continue;
			}

			// Only classify Individual applicants
			if (a.applicantType !== 'Individual') continue;
			// Always recompute — onEMI/onProperty may have changed since last classification.
			// recomputeClassification() only writes if the result differs, so no infinite loop.
			untrack(() => recomputeClassification(i));
		}
	});

	// ── Table field handlers ────────────────────────────────────────

	function updateApplicantField(index: number, key: string, value: unknown) {
		activeApplicantIndex = index;
		formState.applicantStepTouched = true;

		let updatedApplicant: any = { ...formState.applicants[index] };

		if (key === 'applicantType' && value !== updatedApplicant.applicantType) {
			updatedApplicant = getRelevantFields({ ...updatedApplicant, applicantType: value as string });
		}

		// When onEMI changes to true, clear employment types that are only valid when onEMI is false
		if (key === 'onEMI' && value === true) {
			const invalidEmploymentTypesForOnEMI = ['Homemaker', 'Others'];
			if (invalidEmploymentTypesForOnEMI.includes(updatedApplicant.employmentType ?? '')) {
				updatedApplicant.employmentType = '';
				updatedApplicant.__completion = false;
			}
		}

		updatedApplicant = {
			...formState.applicants[index],
			...updatedApplicant,
			[key]: value,
			touchedFields: {
				...(formState.applicants[index].touchedFields ?? {})
				// NOTE: touchedFields[key] is set on BLUR only (handleFieldBlur),
				// not on input — prevents premature validation display while typing.
			}
		};

		// Only update the changed applicant
		const updatedList = [...formState.applicants];
		updatedList[index] = updatedApplicant;
		formState.replaceApplicants(updatedList);

		// Recompute 6-way classification when role-relevant fields change
		if (['onEMI', 'onProperty', 'isGuarantor', 'applicantType', 'loanRole'].includes(key)) {
			recomputeClassification(index);
		}

		// Sync onEMI/onProperty across ALL companies for the same person.
		// One person on one loan = one set of flags, regardless of how many companies
		// they're a director in. When DSA changes flags for nidhi in company A,
		// nidhi's director entry in company B should match.
		if (
			(key === 'onEMI' || key === 'onProperty') &&
			updatedApplicant.applicantType === 'Individual'
		) {
			const personName = ((updatedApplicant.fullName as string) || '').trim().toLowerCase();
			if (personName) {
				const syncedList = [...formState.applicants];
				let anythingChanged = false;
				for (let ci = 0; ci < syncedList.length; ci++) {
					const comp = syncedList[ci];
					if (comp.applicantType !== 'Company') continue;
					let companyChanged = false;
					const dirs = (comp.directors ?? []) as unknown as Array<Record<string, unknown>>;
					const updatedDirs = dirs.map((d) => {
						const dirName = ((d.fullName as string) || '').trim().toLowerCase();
						if (dirName === personName) {
							const newVal = String(value ?? '');
							if (d[key] !== newVal) {
								companyChanged = true;
								return { ...d, [key]: newVal };
							}
						}
						return d;
					});
					if (companyChanged) {
						syncedList[ci] = { ...comp, directors: updatedDirs as any };
						anythingChanged = true;
					}
				}
				if (anythingChanged) {
					formState.replaceApplicants(syncedList);
				}

				// Also sync to directorFormsMap — the table reads from this, not formState.applicants
				const newFormsMap = new Map(directorFormsMap);
				let anyFormsChanged = false;
				for (const [companyId, forms] of newFormsMap) {
					let companyFormsChanged = false;
					const updatedForms = forms.map((f) => {
						const formName = (f.fullName || '').trim().toLowerCase();
						if (formName === personName) {
							const newVal = String(value ?? '');
							const currentVal = key === 'onEMI' ? f.onEMI : f.onProperty;
							if (currentVal !== newVal) {
								companyFormsChanged = true;
								return { ...f, [key]: newVal };
							}
						}
						return f;
					});
					if (companyFormsChanged) {
						newFormsMap.set(companyId, updatedForms);
						anyFormsChanged = true;
					}
				}
				if (anyFormsChanged) {
					directorFormsMap = newFormsMap;
				}
			}
		}

		// Propagate Company-name renames to dependent director auto-income entries.
		// The director income table renders entry.entityName, but that field is locked
		// on auto entries (IncomeSourceForm.svelte:1005 — disabled={isAutoEntry}). So
		// without an explicit trigger here, renaming the Company leaves every dependent
		// director entry showing the old name with no manual fix path. The actual rewrite
		// happens inside syncAutoIncomeEntries Step 1a-name; this block just makes sure
		// the sync fires on a pure name edit (existing sync call sites only fire on
		// director-commit paths, never on a stand-alone company-name change).
		if (
			(key === 'companyName' || key === 'fullName') &&
			updatedApplicant.applicantType === 'Company' &&
			updatedApplicant.id
		) {
			const companyId = updatedApplicant.id as string;
			const refreshedList = [...formState.applicants];
			let anyChanged = false;
			for (let i = 0; i < refreshedList.length; i++) {
				const a = refreshedList[i];
				if (a.applicantType !== 'Individual') continue;
				const linkedIds = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (!linkedIds.includes(companyId)) continue;
				const existing = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
				const name = (a.fullName as string) || '';
				const synced = syncAutoIncomeEntries(linkedIds, refreshedList, existing, name);
				if (synced !== existing) {
					refreshedList[i] = { ...a, incomeEntries: synced };
					anyChanged = true;
				}
			}
			if (anyChanged) {
				formState.replaceApplicants(refreshedList);
			}
		}

		// Re-validate only the updated applicant
		validateApplicantJSON(formState.applicants[index] as LegacyApplicant, index);

		if (globalRoleError && shouldClearGlobalRoleErrorFn()) {
			globalRoleError = '';
		}

		// Force reactivity for applicantErrors
		formState.replaceApplicantErrors({ ...formState.applicantErrors });

		// Immediate relationship cleanup when relationship-relevant fields change.
		//
		// Behavior:
		//   • HARD invalid (gender flip, age direction reversed, parent/spouse/
		//     in-law marital mismatch) → silently removed. The relationship is
		//     now logically impossible, so leaving it would be worse than
		//     surprising the user with a quiet cleanup.
		//   • SOFT invalid (e.g. age slightly out of typical range) → kept for
		//     now and reported via the cross-step contradiction banner so the
		//     user can review. We don't auto-delete soft cases here because
		//     the user might be in the middle of correcting another field.
		if (['gender', 'age', 'maritalStatus', 'applicantType'].includes(key)) {
			const rels = get(userRelationships);
			if (rels.length > 0) {
				const currentApplicants = formState.applicants ?? [];
				const invalidMap = findInvalidRelationships(
					currentApplicants as any,
					rels
				);
				if (invalidMap.size > 0) {
					const hardIds = new Set<string>();
					for (const [relId, reason] of invalidMap) {
						if (!reason.keepable) hardIds.add(relId);
					}
					if (hardIds.size > 0) {
						queueMicrotask(() => removeRelationshipsBatch(hardIds));
					}
				}
			}
		}

		// Name-change relationship prompt
		if (key === 'fullName' || key === 'companyName') {
			const applicantId = updatedApplicant.id;
			if (applicantId) {
				const newName = String(value || '').trim();
				const trackingKey = `${applicantId}-${key}`;
				const prevName = previousNames.get(trackingKey) || '';

				// Only prompt on correction: non-empty → different non-empty
				if (prevName.length >= 3 && newName.length >= 3 && prevName !== newName) {
					const applicantRels = getRelationshipsForApplicant(applicantId);
					if (applicantRels.length > 0) {
						const promptKey = `prompted-${applicantId}-${newName}`;
						if (!previousNames.has(promptKey)) {
							previousNames.set(promptKey, 'true');
							queueMicrotask(() => {
								openConfirmModal(
									'Name Changed',
									`Name changed from "${prevName}" to "${newName}". This applicant has ${applicantRels.length} relationship(s). Clear them?`,
									() => {
										const idsToRemove = new Set(applicantRels.map((r) => r.id));
										removeRelationshipsBatch(idsToRemove);
									},
									{ confirmLabel: 'Yes, Clear', cancelLabel: 'No, Keep' }
								);
							});
						}
					}
				}

				// Track for future changes
				if (newName.length >= 3) {
					previousNames.set(trackingKey, newName);
				}
			}

			// Detection for name/company fields
			const nameValue = String(value || '').trim();

			if (nameValue.length < 2) {
				applicantState.clearAllRestoreAsked();
			} else {
				detectCachedApplicantForIndex(index);
			}
		}
	}

	function handleFieldBlur(index: number, key: string, value: unknown) {
		const list = [...formState.applicants];
		if (!list[index]) return;
		list[index] = {
			...list[index],
			touchedFields: {
				...(list[index].touchedFields ?? {}),
				[key]: true
			}
		};
		formState.replaceApplicants(list);
	}

	function markAllInvalidFieldsTouched(applicant: LegacyApplicant, index: number) {
		const visibleQs = getVisibleQuestions(applicant, formState.applicationData);

		const touched = {
			...(applicant.touchedFields ?? {})
		};

		for (const q of visibleQs) {
			if (formState.applicantErrors[index]?.[q.key]) {
				touched[q.key] = true;
			}
		}

		const list = [...formState.applicants];
		list[index] = {
			...list[index],
			touchedFields: touched
		};
		formState.replaceApplicants(list);
	}

	// ── Add/Save handlers ───────────────────────────────────────────

	function addApplicantHandler() {
		globalRoleError = '';
		formState.applicantStepTouched = true;
		hasTriedToAddApplicant = true;

		// ── Step 1: Validate the LOCAL form (formApplicant) first ──────
		const formApplicantAsLegacy = formApplicant as LegacyApplicant;
		const formIndex = editingIndex ?? formState.applicants.length;
		const formFieldErrors = getApplicantErrors(
			formApplicantAsLegacy,
			formIndex,
			formState.applicationData
		);

		if (Object.keys(formFieldErrors).length > 0) {
			const touched: Record<string, boolean> = {
				...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
			};
			const visibleQs = getVisibleQuestions(formApplicantAsLegacy, formState.applicationData);
			for (const q of visibleQs) {
				if (formFieldErrors[q.key]) {
					touched[q.key] = true;
				}
			}
			formApplicant = { ...formApplicant, touchedFields: touched };

			formErrors = { ...formFieldErrors };
			formState.applicantErrors[formIndex] = formFieldErrors;

			return;
		}

		// ── Step 2: Validate existing table rows ──────────────────────
		const allTableValid = validateAllApplicants();

		if (!allTableValid || globalRoleError) {
			const shakeList = [...formState.applicants];
			(formState.applicants as LegacyApplicant[]).forEach((applicant, index) => {
				const errors = formState.applicantErrors[index];

				if (errors && Object.keys(errors).length > 0) {
					markAllInvalidFieldsTouched(applicant, index);
					shakeList[index] = {
						...shakeList[index],
						shake: true
					};

					trackTimeout(() => {
						const list = [...formState.applicants];
						list[index] = { ...list[index], shake: false };
						formState.replaceApplicants(list);
					}, 400);
				}
			});
			formState.replaceApplicants(shakeList);

			return;
		}

		// ── Step 3: Save formApplicant data into the applicants list ──
		if (formState.applicants.length < MAX_APPLICANTS) {
			const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
			formState.replaceApplicants([...formState.applicants, snapshot]);

			formApplicant = {
				id: uuidv4(),
				applicantType: '',
				touchedFields: {}
			};
			formErrors = {};
			hasTriedToAddApplicant = false;
			restoredFromData = null;
		}
	}

	function saveApplicant() {
		if (editingIndex !== null) {
			globalRoleError = '';
			formState.applicantStepTouched = true;
			hasTriedToAddApplicant = true;

			const editErrors = getApplicantErrors(
				formApplicant as LegacyApplicant,
				editingIndex,
				formState.applicationData
			);

			if (Object.keys(editErrors).length > 0 || globalRoleError) {
				formErrors = editErrors;
				formState.applicantErrors[editingIndex] = editErrors;
				markAllInvalidFieldsTouched(formApplicant as LegacyApplicant, editingIndex);
				return;
			}

			const updatedList = [...formState.applicants];
			const saved = $state.snapshot(formApplicant) as Record<string, unknown>;
			// User confirmed the update — clear the restore snapshot so
			// editing again won't re-show the "fields changed" banner
			delete saved.__restoredFrom;
			updatedList[editingIndex] = saved;
			formState.replaceApplicants(updatedList);
			cancelEdit();
		} else {
			addApplicantHandler();
		}
	}

	function saveApplicantAsNew() {
		if (editingIndex !== null) {
			const splicedIndex = editingIndex;
			const oldApplicant = formState.applicants[splicedIndex];

			// Clean up relationships for the removed applicant
			if (oldApplicant?.id) {
				cleanupRelationshipsForApplicant(oldApplicant.id);
			}

			const updatedList = [...formState.applicants];
			// Capture original length before splice so re-indexing uses the correct upper bound
			const originalLength = updatedList.length;
			updatedList.splice(splicedIndex, 1);
			formState.replaceApplicants(updatedList);

			// Re-index applicant errors after splice
			const reindexed: Record<number, Record<string, string>> = {};
			for (const [key, val] of Object.entries(formState.applicantErrors)) {
				const k = Number(key);
				if (k < splicedIndex) reindexed[k] = val;
				else if (k > splicedIndex) reindexed[k - 1] = val;
			}
			formState.replaceApplicantErrors(reindexed);

			// Re-index income profiles after splice (use originalLength, not reactive state)
			incomeProfileStore.clearApplicantProfiles(splicedIndex);
			for (let i = splicedIndex + 1; i < originalLength; i++) {
				const profilesAtI = incomeProfileStore.getApplicantProfiles(i);
				if (Object.keys(profilesAtI).length > 0) {
					incomeProfileStore.clearApplicantProfiles(i);
					for (const [empType, profile] of Object.entries(profilesAtI)) {
						incomeProfileStore.saveProfile(i - 1, empType, profile.data);
					}
				}
			}

			editingIndex = null;
		}
		formApplicant.id = uuidv4();
		// "Add as New" means the user accepted changes — strip the restore
		// snapshot so the new applicant won't show a "fields changed" banner
		// when edited later.
		delete (formApplicant as any).__restoredFrom;
		addApplicantHandler();
	}

	function cancelEdit() {
		editingIndex = null;
		formApplicant = {
			id: uuidv4(),
			applicantType: '',
			touchedFields: {}
		};
		formErrors = {};
		globalRoleError = '';
		hasTriedToAddApplicant = false;
		applicantState.clearAllRestoreAsked();
		restoredFromData = null;
	}

	function cancelNewApplicant() {
		formApplicant = {
			id: uuidv4(),
			applicantType: '',
			touchedFields: {}
		};
		formErrors = {};
		globalRoleError = '';
		hasTriedToAddApplicant = false;
		restoredFromData = null;
	}

	// ── Step validation ─────────────────────────────────────────────

	function validateStep(): boolean {
		const applicants = formState.applicants;

		const hasAnyApplicant = applicants.some((a) => a.applicantType);
		if (applicants.length === 0 || !hasAnyApplicant) {
			globalRoleError = 'Please add at least one applicant before proceeding.';
			return false;
		}

		duplicateApplicantIndexes = findDuplicateApplicants(applicants as LegacyApplicant[]);

		if (duplicateApplicantIndexes.size > 0) {
			globalRoleError = getDuplicateErrorMessage(
				duplicateApplicantIndexes,
				applicants as LegacyApplicant[]
			);
			return false;
		}

		formState.applicantStepTouched = true;

		const allValid = validateAllApplicants();

		if (!allValid) {
			const shakeList = [...formState.applicants];
			const pending = new Set<number>();
			(formState.applicants as LegacyApplicant[]).forEach((applicant, index) => {
				const errors = formState.applicantErrors[index];

				if (errors && Object.keys(errors).length > 0) {
					markAllInvalidFieldsTouched(applicant, index);
					pending.add(index);

					shakeList[index] = {
						...shakeList[index],
						shake: true
					};

					trackTimeout(() => {
						const list = [...formState.applicants];
						list[index] = { ...list[index], shake: false };
						formState.replaceApplicants(list);
					}, 400);
				}
			});
			pendingHighlightIndexes = pending;
			formState.replaceApplicants(shakeList);

			return false;
		}

		// Validate and commit directors for all Company applicants
		if (hasRoleQuestions) {
			let latestApplicants = formState.applicants as Array<Record<string, unknown>>;

			// Ensure directorFormsMap is initialized for restored companies
			// (the reactive $effect may not have fired yet after restore)
			for (const company of latestApplicants.filter((a) => a.applicantType === 'Company')) {
				const companyId = company.id as string;
				if (!companyId) continue;
				if (!directorFormsMap.has(companyId) || directorFormsMap.get(companyId)?.length === 0) {
					const forms = initDirectorForms(company as Record<string, unknown>, false);
					directorFormsMap = new Map(directorFormsMap).set(companyId, forms);
					persistDirectorForms(directorFormsMap);
				}
			}

			for (const company of [...latestApplicants].filter((a) => a.applicantType === 'Company')) {
				const companyId = company.id as string;
				const forms = directorFormsMap.get(companyId);
				if (!forms || forms.length === 0) continue;

				const companyType = (company.companyType as string) ?? '';
				const memberLabel = MEMBER_LABEL_MAP[companyType] ?? 'Director';
				const role = ROLE_MAP[companyType] ?? 'director';
				const dirErrors = validateAllDirectors(forms, false, memberLabel, companyType);

				if (dirErrors.length > 0) {
					directorError = dirErrors[0];
					globalRoleError = dirErrors[0];
					return false;
				}

				// Directors are now committed immediately on save (handleDirectorSave),
				// so we skip the deferred commit here. Validation above is still needed.
			}

			// Auto-create/sync income entries for linked Individuals
			latestApplicants = latestApplicants.map((a) => {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				if (a.applicantType !== 'Individual' || ids.length === 0) return a;
				const existingEntries = (a.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
				const individualName = (a.fullName as string) || '';
				const synced = syncAutoIncomeEntries(
					ids,
					latestApplicants,
					existingEntries,
					individualName
				);
				if (synced === existingEntries) return a;
				return { ...a, incomeEntries: synced };
			});

			formState.replaceApplicants(latestApplicants);
			directorError = '';
		}

		const roleError = getRoleValidationError(applicants as LegacyApplicant[], hasRoleQuestions);
		if (roleError) {
			globalRoleError = roleError;
			return false;
		}

		// ── Cross-field validation (advisory warnings) ──
		const cfResult = runCrossFieldValidation(
			formState.applicants as Record<string, any>[],
			formState.applicationData as Record<string, any>,
			get(userRelationships)
		);
		crossFieldWarnings = cfResult.warnings;
		// Only block Next on errors that belong to THIS page (applicantPage).
		// Errors owned by later pages (obligations, income, credit) flow through
		// to those pages — blocking here creates catch-22s (e.g. user can't
		// reach Obligations to add a Guarantor entry the validator demands).
		// See CONTRADICTION_PAGE_OWNERSHIP in crossStepValidator.ts.
		const applicantPageErrors = filterContradictionsForPage(cfResult.errors, 'applicantPage');
		if (applicantPageErrors.length > 0) {
			globalRoleError = applicantPageErrors[0].message;
			return false;
		}

		// ── Reverse sync: relationships → hasRelatedDirectors ──
		// Auto-derive hasRelatedDirectors from captured relationships.
		// The question is no longer asked directly — relationship page is source of truth.
		const rels = get(userRelationships);
		const hasFamilyRel = rels.some((r) => !isNonFamily(r.relationType as any));
		{
			let updated = false;
			const targetValue = hasFamilyRel ? 'yes' : 'no';
			const newList = formState.applicants.map((a) => {
				if (a.applicantType === 'Company' && a.hasRelatedDirectors !== targetValue) {
					updated = true;
					return { ...a, hasRelatedDirectors: targetValue };
				}
				return a;
			});
			if (updated) {
				formState.replaceApplicants(newList as any[]);
			}
		}

		return true;
	}

	// ── Delete handler ──────────────────────────────────────────────

	function cleanupRelationshipsForApplicant(applicantId: string | undefined) {
		if (!applicantId) return;
		const rels = get(userRelationships);
		const orphanedIds = new Set(
			rels.filter((r) => r.fromId === applicantId || r.toId === applicantId).map((r) => r.id)
		);
		if (orphanedIds.size > 0) {
			removeRelationshipsBatch(orphanedIds);
		}
	}

	function deleteApplicant(index: number, _forceSkipDialog = false) {
		const applicants = formState.applicants;
		const applicant = applicants[index];
		if (!applicant) return;

		// ── Intercept Company deletion: show dialog if has directors ──
		if (
			!_forceSkipDialog &&
			applicant.applicantType === 'Company' &&
			applicant.id &&
			directorFormsMap.has(applicant.id as string)
		) {
			const companyId = applicant.id as string;
			const forms = directorFormsMap.get(companyId) ?? [];
			const filledDirectors = forms.filter((d) => d.fullName?.trim());
			if (filledDirectors.length > 0) {
				// Build director impact info
				const directorImpacts = filledDirectors.map((d) => {
					const normalizedName = d.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
					// Find linked Individual to check multi-company status
					const linked = applicants.find(
						(a) =>
							a.applicantType === 'Individual' &&
							a.linkedCompanyId === companyId &&
							((a.fullName as string) ?? '').trim().toLowerCase().replace(/\s+/g, ' ') ===
								normalizedName
					);
					const allIds = (linked?.linkedCompanyIds as string[] | undefined) ?? [];
					const otherIds = allIds.filter((id) => id !== companyId);
					const otherNames = otherIds
						.map((id) => {
							const c = applicants.find((a) => a.id === id);
							return (c?.companyName as string) || (c?.fullName as string) || '';
						})
						.filter(Boolean);
					return {
						name: d.fullName.trim(),
						directorId: d.id,
						isMultiLinked: otherIds.length > 0,
						otherCompanies: otherNames
					};
				});

				companyDeleteDialog = {
					show: true,
					companyName: (applicant.companyName as string) || 'Unnamed Company',
					companyId,
					companyIndex: index,
					directors: directorImpacts
				};
				return; // Wait for dialog confirmation
			}
		}

		if (globalRoleError) {
			globalRoleError = '';
		}

		// Always clear form validation state on any delete — prevents stale
		// errors from leaking into the current (or next) form view
		formErrors = {};
		hasTriedToAddApplicant = false;

		if (editingIndex === index) {
			cancelEdit();
		} else if (editingIndex !== null && editingIndex > index) {
			editingIndex = editingIndex - 1;
		}

		// ── Recovery eligibility checks (skip recovery save if insufficient data,
		// but ALWAYS proceed to full cleanup including linked director removal) ──
		const hasType = !!applicant.applicantType;
		const hasName =
			(applicant.applicantType === 'Individual' && !!applicant.fullName) ||
			(applicant.applicantType === 'Company' && !!applicant.companyName);
		const matchSignature = hasType && hasName ? buildMatchSignature(applicant) : null;
		const canRecover = hasType && hasName && !!matchSignature;

		// If !canRecover, recovery bin save is silently skipped — expected for
		// incomplete applicants (e.g. just created, no name yet). Cleanup still runs.

		// Determine display name
		let displayName = 'Unknown';
		if (applicant.applicantType === 'Individual') {
			displayName = applicant.fullName || 'Unnamed Individual';
		} else if (applicant.applicantType === 'Company') {
			displayName = applicant.companyName || 'Unnamed Company';
		}

		// Capture relationships BEFORE cleanup (for restoration later)
		const savedRelationships = applicant.id
			? captureRelationshipsForRecovery(applicant.id, formState.applicants as any[])
			: [];

		// Clean up any relationships involving this applicant
		cleanupRelationshipsForApplicant(applicant.id);

		// Save to recovery bin (only if eligible — needs type, name, signature)
		if (canRecover && applicant.id) {
			const recoveryData = $state.snapshot(applicant) as Record<string, unknown>;
			if (savedRelationships.length > 0) {
				recoveryData._savedRelationships = savedRelationships;
			}
			const scope = getRecoveryScope(applicant.applicantType as string);
			// Capture financial data (income/obligations/credit) for full restoration
			const financialSnapshot = applicant.id ? applicantDataStore.get(applicant.id) : undefined;
			const financialData = financialSnapshot
				? ($state.snapshot(financialSnapshot) as Record<string, unknown>)
				: undefined;
			// Build display context for disambiguation in restore modal.
			// linkedCompanyEntityType is captured so cross-session ownership restore
			// can match by name+entity when company UUIDs differ (Issue #2).
			let displayContext:
				| {
						linkedCompanyName?: string;
						linkedCompanyEntityType?: string;
						directorRole?: string;
				  }
				| undefined;
			if (applicant.linkedCompanyId) {
				const linkedCompany = formState.applicants.find(
					(a: any) => a.id === applicant.linkedCompanyId && a.applicantType === 'Company'
				) as Record<string, unknown> | undefined;
				if (linkedCompany) {
					displayContext = {
						linkedCompanyName: linkedCompany.companyName as string,
						linkedCompanyEntityType:
							(linkedCompany.companyType as string) ||
							(linkedCompany.businessEntityType as string) ||
							undefined,
						directorRole: (applicant.directorRole as string) || 'director'
					};
				}
			}
			applicantState.removeToRecovery(
				applicant.id,
				recoveryData,
				displayName,
				matchSignature!,
				scope,
				financialData,
				displayContext
			);
		}
		// Always remove from active applicantDataStore (income/credit/obligations)
		if (applicant.id) {
			applicantDataStore.remove(applicant.id as string);
		}

		// Clean up incomeProfileStore for this index and re-index remaining
		incomeProfileStore.clearApplicantProfiles(index);
		const currentApplicants = formState.applicants;
		for (let i = index + 1; i < currentApplicants.length; i++) {
			const profilesAtI = incomeProfileStore.getApplicantProfiles(i);
			if (Object.keys(profilesAtI).length > 0) {
				incomeProfileStore.clearApplicantProfiles(i);
				for (const [empType, profile] of Object.entries(profilesAtI)) {
					incomeProfileStore.saveProfile(i - 1, empType, profile.data);
				}
			}
		}

		// Legacy recovery store (only if eligible for recovery)
		if (canRecover && matchSignature) {
			applicantRecoveryStore.update((cache) => {
				const existingIdx = cache.findIndex((entry) => entry.matchSignature === matchSignature);

				const plainApplicant = $state.snapshot(applicant) as LegacyApplicant;

				const resolvedName = (plainApplicant.fullName || undefined) as string | undefined;

				if (existingIdx !== -1) {
					cache[existingIdx] = {
						...cache[existingIdx],
						data: plainApplicant,
						deletedAt: Date.now(),
						displayName,
						fullName: resolvedName,
						gender: applicant.gender || undefined,
						maritalStatus: applicant.maritalStatus || undefined,
						age: applicant.age?.toString() || undefined,
						employmentType: applicant.employmentType || undefined,
						companyName: applicant.companyName || undefined,
						companyType: applicant.companyType || undefined,
						businessType: applicant.businessType || undefined
					};
				} else {
					const newEntry: RecoverableApplicant = {
						uuid: applicant.id || uuidv4(),
						applicantType: (applicant.applicantType || 'Individual') as 'Individual' | 'Company',
						data: plainApplicant,
						deletedAt: Date.now(),
						displayName,
						matchSignature,
						fullName: resolvedName,
						gender: applicant.gender || undefined,
						maritalStatus: applicant.maritalStatus || undefined,
						age: applicant.age?.toString() || undefined,
						employmentType: applicant.employmentType || undefined,
						companyName: applicant.companyName || undefined,
						companyType: applicant.companyType || undefined,
						businessType: applicant.businessType || undefined
					};

					cache.push(newEntry);
				}

				return cache;
			});
		}

		// Remove from active list + sync applicantsPayload
		{
			const payload = Array.isArray(formState.applicantsPayload)
				? [...formState.applicantsPayload]
				: [];
			if (index < payload.length) {
				payload.splice(index, 1);
				formState.replaceApplicantsPayload(payload);
			}
		}
		formState.replaceApplicants(formState.applicants.filter((_, i) => i !== index));

		// Clean up linked Individual entries if Company was deleted
		if (applicant.applicantType === 'Company' && applicant.id) {
			const deletedCompanyId = applicant.id as string;
			const deletedCompanyName = (applicant.companyName as string) || '';
			const deletedCompanyEntityType =
				((applicant as Record<string, unknown>).companyType as string) ||
				((applicant as Record<string, unknown>).businessEntityType as string) ||
				'';
			// Get keep decisions from dialog (if dialog was used)
			const keepDecisions = _companyDeleteKeepDecisions;
			const cleaned: typeof formState.applicants = [];
			for (const a of formState.applicants) {
				const ids = (a.linkedCompanyIds as string[] | undefined) ?? [];
				const isSingularLinked = a.linkedCompanyId === deletedCompanyId;
				const isPluralLinked = ids.includes(deletedCompanyId);

				if (!isSingularLinked && !isPluralLinked) {
					// Not linked to deleted company — keep as-is
					cleaned.push(a);
				} else if (ids.length > 1) {
					// Linked to multiple companies — remove only this company's link, orphan income
					const remaining = ids.filter((id) => id !== deletedCompanyId);
					const newPrimary = remaining[0] ?? '';
					const entries =
						((a as Record<string, unknown>).incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
					const orphaned = orphanIncomeForCompany(entries, deletedCompanyId, deletedCompanyName);
					cleaned.push({
						...a,
						linkedCompanyId: newPrimary,
						linkedCompanyIds: remaining,
						incomeEntries: orphaned
					});
				} else {
					// Single-linked director — determine fate
					const directorId = _findDirectorIdForApplicant(a, deletedCompanyId);

					// Check if this person also exists as director in another company (by name)
					const directorName = ((a.fullName as string) ?? '')
						.trim()
						.toLowerCase()
						.replace(/\s+/g, ' ');
					let otherCompanyId: string | null = null;
					if (directorName) {
						for (const [cid, forms] of directorFormsMap) {
							if (cid === deletedCompanyId) continue;
							const match = forms.find(
								(d) => d.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === directorName
							);
							if (match) {
								otherCompanyId = cid;
								break;
							}
						}
					}

					if (otherCompanyId) {
						// Person exists in another company — re-link to that company, orphan deleted company's income
						const entries =
							((a as Record<string, unknown>).incomeEntries as IncomeSourceEntry[] | undefined) ??
							[];
						const orphaned = orphanIncomeForCompany(entries, deletedCompanyId, deletedCompanyName);
						cleaned.push({
							...a,
							linkedCompanyId: otherCompanyId,
							linkedCompanyIds: [otherCompanyId],
							incomeEntries: orphaned
						});
					} else {
						const shouldKeep = directorId ? (keepDecisions.get(directorId) ?? false) : false;
						if (shouldKeep) {
							// DSA chose to keep — preserve as co-applicant with dormant company link.
							// linkedCompanyId is intentionally kept so the director auto-reconnects
							// if the company is restored or re-added later. The link is "dormant" —
							// all consumers already handle the case where the company doesn't exist.
							const entries =
								((a as Record<string, unknown>).incomeEntries as IncomeSourceEntry[] | undefined) ??
								[];
							const orphaned = orphanIncomeForCompany(
								entries,
								deletedCompanyId,
								deletedCompanyName
							);
							cleaned.push({
								...a,
								incomeEntries: orphaned
							});
						} else {
							// Delete entirely — save to recovery bin + clean up ALL related state
							cleanupRelationshipsForApplicant(a.id as string | undefined);
							if (a.id) {
								const dirName = (a.fullName as string) || 'Unnamed Director';
								const sig = buildMatchSignature(a as any);
								if (sig) {
									const recoveryData = $state.snapshot(a) as Record<string, unknown>;
									const scope = getRecoveryScope('Individual');
									// Capture financial data for full restoration
									const dirFinancial = applicantDataStore.get(a.id as string);
									const dirFinancialData = dirFinancial
										? ($state.snapshot(dirFinancial) as Record<string, unknown>)
										: undefined;
									applicantState.removeToRecovery(
										a.id as string,
										recoveryData,
										dirName,
										sig,
										scope,
										dirFinancialData,
										{
											linkedCompanyName: deletedCompanyName,
											linkedCompanyEntityType: deletedCompanyEntityType || undefined,
											directorRole: (a.directorRole as string) || 'director'
										}
									);
								}
								applicantDataStore.remove(a.id as string);
							}
							const dirIdx = formState.applicants.indexOf(a);
							if (dirIdx >= 0) {
								incomeProfileStore.clearApplicantProfiles(dirIdx);
							}
						}
					}
				}
			}
			formState.replaceApplicants(cleaned);
			// Sync applicantsPayload — rebuild to match cleaned applicants by ID
			const cleanedIds = new Set(cleaned.map((a) => a.id));
			const currentPayload = Array.isArray(formState.applicantsPayload)
				? [...formState.applicantsPayload]
				: [];
			// Keep only payload entries whose applicant still exists (by index alignment)
			// Since applicants were reordered by cleaned, truncate payload to match length
			formState.replaceApplicantsPayload(currentPayload.slice(0, cleaned.length));

			// Clean up director forms AFTER the keep/delete decisions are processed
			// (previously this ran before, causing _findDirectorIdForApplicant to fail)
			if (applicant.id) {
				const nextMap = new Map(directorFormsMap);
				nextMap.delete(applicant.id as string);
				directorFormsMap = nextMap;
			}
		}

		// After company deletion + director cleanup, indices may have shifted by more
		// than 1 (multiple directors removed). Clear all errors and let next
		// validateStep() rebuild them fresh from the current applicants array.
		if (applicant.applicantType === 'Company') {
			formState.replaceApplicantErrors({});
		} else {
			const reindexed: Record<number, Record<string, string>> = {};
			for (const [key, val] of Object.entries(formState.applicantErrors)) {
				const k = Number(key);
				if (k < index) reindexed[k] = val;
				else if (k > index) reindexed[k - 1] = val;
			}
			formState.replaceApplicantErrors(reindexed);
		}

		// Reset applicant page index if it now points beyond the array
		if (formState.applicantPageIndex >= formState.applicants.length) {
			formState.setApplicantPageIndex(Math.max(0, formState.applicants.length - 1));
		}

		// Clear denied prefixes for this applicant's name so restore can fire again
		const deletedDetectionKey = buildDetectionKey(applicant);
		if (deletedDetectionKey) {
			const deletedScope = getRecoveryScope(applicant.applicantType as string);
			applicantState.clearDeniedPrefix(deletedDetectionKey, deletedScope);
		}

		// Re-run cross-field validation to clear stale warnings (e.g. orphan director)
		const cfPostDelete = runCrossFieldValidation(
			formState.applicants as Record<string, any>[],
			formState.applicationData as Record<string, any>,
			get(userRelationships)
		);
		crossFieldWarnings = cfPostDelete.warnings;

		applicantState.clearAllRestoreAsked();
	}

	// Private state for passing keep decisions into deleteApplicant
	let _companyDeleteKeepDecisions = new Map<string, boolean>();

	/** Find the director form ID that corresponds to a linked Individual applicant */
	function _findDirectorIdForApplicant(
		applicant: Record<string, unknown>,
		companyId: string
	): string | null {
		const forms = directorFormsMap.get(companyId);
		if (!forms) return null;
		const name = ((applicant.fullName as string) ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
		if (!name) return null;
		const match = forms.find((d) => d.fullName.trim().toLowerCase().replace(/\s+/g, ' ') === name);
		return match?.id ?? null;
	}

	/** Called by CompanyDeleteDialog on confirm */
	function handleCompanyDeleteConfirm(keepDecisions: Map<string, boolean>) {
		const { companyIndex } = companyDeleteDialog;
		_companyDeleteKeepDecisions = keepDecisions;
		// Re-run deleteApplicant BEFORE closing dialog — the cleanup block
		// reads companyDeleteDialog.show to decide whether to use keepDecisions
		deleteApplicant(companyIndex, true);
		// Now safe to close dialog and clear decisions
		companyDeleteDialog = {
			show: false,
			companyName: '',
			companyId: '',
			companyIndex: -1,
			directors: []
		};
		_companyDeleteKeepDecisions = new Map();
	}

	/** Called by CompanyDeleteDialog on cancel */
	function handleCompanyDeleteCancel() {
		companyDeleteDialog = {
			show: false,
			companyName: '',
			companyId: '',
			companyIndex: -1,
			directors: []
		};
	}

	// ── Duplicate + sorted state ────────────────────────────────────

	let duplicateApplicantIndexes: Set<number> = $state(new Set());
	let pendingHighlightIndexes: Set<number> = $state(new Set());

	const computedDuplicateIndexes = $derived.by(() => {
		return findDuplicateApplicants(formState.applicants as LegacyApplicant[]);
	});

	const sortedApplicantEntries = $derived.by(() => {
		const entries = (formState.applicants as LegacyApplicant[]).map((applicant, index) => ({
			applicant,
			originalIndex: index
		}));
		// Hide director-linked Individuals — shown as sub-rows under their Company.
		// BUT show them if their linked company no longer exists (deleted/stale link)
		// so they remain visible as standalone co-applicants.
		const allApplicants = formState.applicants as LegacyApplicant[];
		const filtered = entries
			.filter(({ applicant }) => {
				const linkedId = applicant.linkedCompanyId as string | undefined;
				if (!linkedId) return true; // no link — always show
				// Show if linked company doesn't exist anymore (stale/dormant link)
				const companyExists = allApplicants.some(
					(a) => a.id === linkedId && a.applicantType === 'Company'
				);
				return !companyExists;
			})
			.sort((a, b) => {
				const aIsCompany = a.applicant.applicantType === 'Company' ? 0 : 1;
				const bIsCompany = b.applicant.applicantType === 'Company' ? 0 : 1;
				if (aIsCompany !== bIsCompany) return aIsCompany - bIsCompany;
				return a.originalIndex - b.originalIndex;
			});
		// Dedup by applicant.id to prevent Svelte each_key_duplicate crash
		const seen = new Set<string>();
		return filtered.filter(({ applicant }) => {
			const id = applicant.id as string;
			if (!id || seen.has(id)) return false;
			seen.add(id);
			return true;
		});
	});

	// ── Role errors (reactive) ──────────────────────────────────────

	const applicantRoleErrors = $derived.by(() => {
		if (!hasRoleQuestions) return (formState.applicants as LegacyApplicant[]).map(() => null);

		const applicants = formState.applicants as LegacyApplicant[];
		return applicants.map((applicant: any, index: number) => {
			if (!applicant.applicantType) return null;
			if (!isCardReadyForRoleValidation(applicant)) return null;

			if (applicant.isNRI === 'Yes' && applicant.employmentType === 'Pensioner') {
				return 'NRI Pensioner applicants are not eligible.';
			}

			// Company must be on Property or EMI. If neither, add people as Individuals.
			if (
				applicant.applicantType === 'Company' &&
				applicant.onProperty === false &&
				applicant.onEMI === false
			) {
				return 'Company must be on Property or EMI. Add directors as Individual co-applicants if the company is not on the loan.';
			}

			if (isGuarantorApplicant(applicant)) {
				return null;
			}

			if (applicants.length === 1) {
				if (applicant.onProperty === false && applicant.onEMI === false) {
					return 'For a single applicant, both On Property and On EMI must be marked Yes.';
				}
				return null;
			} else {
				if (applicant.onProperty !== true && applicant.onEMI !== true) {
					const structure = formState.applicationData.applicationStructure as string | undefined;
					if (
						applicant.applicantType === 'Individual' &&
						(structure === 'company' || structure === 'mix') &&
						applicant.isGuarantor === undefined
					) {
						return null;
					}
					return 'Must be marked Yes for at least one of: On Property or On EMI.';
				}
			}

			return null;
		});
	});

	const globalRoleDistributionError = $derived.by(() => {
		if (!hasRoleQuestions) return null;

		const applicants = formState.applicants as LegacyApplicant[];
		if (applicants.length <= 1) return null;

		const nonGuarantors = applicants.filter((a) => !isGuarantorApplicant(a));
		if (nonGuarantors.length === 0) return null;

		const allCardsReady = nonGuarantors.every((a) => isCardReadyForRoleValidation(a));
		if (!allCardsReady) return null;

		const allHaveRoles = nonGuarantors.every((a) => a.onProperty === true || a.onEMI === true);
		if (!allHaveRoles) return null;

		const hasOnProperty = nonGuarantors.some((a) => a.onProperty === true);
		const hasOnEMI = nonGuarantors.some((a) => a.onEMI === true);

		if (!hasOnProperty) {
			return 'At least one applicant must be marked Yes for On Property.';
		}
		if (!hasOnEMI) {
			return 'At least one applicant must be marked Yes for On EMI.';
		}

		return null;
	});

	// ── Duplicate sync effect ───────────────────────────────────────

	$effect(() => {
		const newDuplicates = computedDuplicateIndexes;
		if (
			newDuplicates.size !== duplicateApplicantIndexes.size ||
			![...newDuplicates].every((idx) => duplicateApplicantIndexes.has(idx))
		) {
			duplicateApplicantIndexes = newDuplicates;
			if (newDuplicates.size === 0 && globalRoleError.includes('identical details')) {
				globalRoleError = '';
			}
		}
	});

	// ── isNextEnabled sync effect ───────────────────────────────────

	$effect(() => {
		const hasApplicants =
			formState.applicants.length > 0 && formState.applicants.some((a) => a.applicantType);
		const allComplete =
			applicantCompletionStatus.length > 0 && applicantCompletionStatus.every(Boolean);
		const noDuplicates = computedDuplicateIndexes.size === 0;

		const visibleFormQs = getVisibleFormLevelQuestions(formState.applicationData);
		const formLevelComplete = visibleFormQs.every((q: any) => {
			const val = formState.applicationData[q.key as keyof typeof formState.applicationData];
			return val !== undefined && val !== null && val !== '';
		});

		const enabled =
			formLevelComplete &&
			hasApplicants &&
			allComplete &&
			allDirectorsComplete &&
			noDuplicates &&
			!globalRoleError;
		setIsNextEnabled(enabled);

		if (setDisabledReason) {
			if (!formLevelComplete) {
				setDisabledReason('Complete all application-level fields');
			} else if (!hasApplicants) {
				setDisabledReason('Add at least one applicant to continue');
			} else if (!allComplete) {
				setDisabledReason('Complete all required fields for every applicant');
			} else if (!allDirectorsComplete) {
				setDisabledReason('Complete all director/partner details');
			} else if (!noDuplicates) {
				setDisabledReason('Remove duplicate applicants');
			} else if (globalRoleError) {
				setDisabledReason(globalRoleError);
			} else {
				setDisabledReason('');
			}
		}
	});

	// ── Init (called from onMount in component) ─────────────────────

	function initOnMount() {
		// Close any stale confirm modal on mount (e.g., form reload)
		closeConfirmModal();

		const applicants = formState.applicants;
		const errors = applicants.map((applicant, index) => {
			const err = validateApplicantJSON(applicant as LegacyApplicant, index);
			return Object.keys(err || {}).length ? err : {};
		});

		formState.replaceApplicantErrors(errors as any);

		// Initialize name tracking for relationship change prompts
		applicants.forEach((a) => {
			if (a.id && a.fullName && String(a.fullName).trim().length >= 3) {
				previousNames.set(`${a.id}-fullName`, String(a.fullName).trim());
			}
			if (a.id && a.companyName && String(a.companyName).trim().length >= 3) {
				previousNames.set(`${a.id}-companyName`, String(a.companyName).trim());
			}
		});

		// Duplicate check
		duplicateApplicantIndexes = findDuplicateApplicants(applicants as LegacyApplicant[]);

		if (duplicateApplicantIndexes.size > 0) {
			globalRoleError = getDuplicateErrorMessage(
				duplicateApplicantIndexes,
				applicants as LegacyApplicant[]
			);
		} else {
			globalRoleError = '';
		}

		// Sync hasRelatedDirectors from existing relationships on page load
		const rels = get(userRelationships);
		if (rels.length > 0) {
			const hasFamilyRel = rels.some((r) => !isNonFamily(r.relationType as any));
			if (hasFamilyRel) {
				let updated = false;
				const newList = applicants.map((a) => {
					if (a.applicantType === 'Company' && a.hasRelatedDirectors !== 'yes') {
						updated = true;
						return { ...a, hasRelatedDirectors: 'yes' };
					}
					return a;
				});
				if (updated) {
					formState.replaceApplicants(newList as any[]);
				}
			}
		}
	}

	// ── Return interface ────────────────────────────────────────────

	return {
		// Constants
		FULL_PROFILE_COMPANY_TYPES,
		MAX_APPLICANTS,

		// Reactive state (getters)
		get formApplicant() {
			return formApplicant;
		},
		get formErrors() {
			return formErrors;
		},
		get editingIndex() {
			return editingIndex;
		},
		get hasTriedToAddApplicant() {
			return hasTriedToAddApplicant;
		},
		get globalRoleError() {
			return globalRoleError;
		},
		get formLevelErrors() {
			return formLevelErrors;
		},
		get crossFieldWarnings() {
			return crossFieldWarnings;
		},
		get btCoApplicantCount() {
			return btCoApplicantCount;
		},
		get btGuarantorCount() {
			return btGuarantorCount;
		},
		get duplicateApplicantIndexes() {
			return duplicateApplicantIndexes;
		},
		get pendingHighlightIndexes() {
			return pendingHighlightIndexes;
		},

		// Derived (getters)
		get hasRoleQuestions() {
			return hasRoleQuestions;
		},
		get isBTCase() {
			return isBTCase;
		},
		get btExpectedCount() {
			return btExpectedCount;
		},
		get btMismatchWarning() {
			return btMismatchWarning;
		},
		get visibleFormQuestions() {
			return visibleFormQuestions;
		},
		get isRestoredAndModified() {
			return isRestoredAndModified;
		},
		get restoredChangedKeys() {
			return restoredChangedKeys;
		},
		get femalePropertyWarning() {
			return femalePropertyWarning;
		},
		get opcDuplicateWarning() {
			return opcDuplicateWarning;
		},
		get applicantCompletionStatus() {
			return applicantCompletionStatus;
		},
		get sortedApplicantEntries() {
			return sortedApplicantEntries;
		},
		get applicantRoleErrors() {
			return applicantRoleErrors;
		},
		get globalRoleDistributionError() {
			return globalRoleDistributionError;
		},
		get hasDeniedRecoveryMatches() {
			return hasDeniedRecoveryMatches;
		},
		get pendingRestore() {
			return pendingRestore;
		},

		// Director state
		get directorFormsMap() {
			return directorFormsMap;
		},
		get directorModalOpen() {
			return directorModalOpen;
		},
		get editingDirectorIdx() {
			return editingDirectorIdx;
		},
		get editingDirectorCompanyId() {
			return editingDirectorCompanyId;
		},
		get directorError() {
			return directorError;
		},
		get showDirectorRemovePicker() {
			return showDirectorRemovePicker;
		},
		get removePickerFilled() {
			return removePickerFilled;
		},
		get removePickerTargetCount() {
			return removePickerTargetCount;
		},
		get removePickerCompanyId() {
			return removePickerCompanyId;
		},
		get removePickerMemberLabel() {
			const company = formState.applicants.find((a) => a.id === removePickerCompanyId);
			const ct = (company?.companyType as string) ?? '';
			return MEMBER_LABEL_MAP[ct] ?? 'Director';
		},
		get directorRowsMap() {
			return directorRowsMap;
		},
		get allDirectorsComplete() {
			return allDirectorsComplete;
		},

		// Company delete dialog
		get companyDeleteDialog() {
			return companyDeleteDialog;
		},

		// Handlers
		retriggerRecoveryDetection,
		setPendingRestore,
		confirmPendingRestore,
		cancelPendingRestore,
		autoResolvePendingRestore,
		handleEditDirector,
		handleDirectorSave,
		applyDirectorRestore,
		handleDirectorModalClose,
		handleRemovePickerConfirm,
		handleRemovePickerCancel,
		getDirectorModalData,
		setBtCoApplicantCount,
		setBtGuarantorCount,
		updateFormField,
		handleFormFieldBlur,
		saveApplicant,
		saveApplicantAsNew,
		cancelEdit,
		cancelNewApplicant,
		updateFormLevelField,
		validateFormLevelField,
		updateApplicantField,
		handleFieldBlur,
		startEdit,
		deleteApplicant,
		handleCompanyDeleteConfirm,
		handleCompanyDeleteCancel,
		validateStep,
		validateOnNext,
		validateApplicantFieldJSON,
		getApplicantDisplayName,
		getApplicantStatus,
		getVisibleFormLevelQuestions,

		// Init
		initOnMount
	};
}
