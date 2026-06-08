/**
 * Shared utility for director restore payloads and RestoreApplicantModal handlers.
 *
 * Contains two concerns:
 * 1. Building director restore payloads (personal data fields, locked fields, ownership)
 * 2. Shared onConfirm/onCancel handlers for RestoreApplicantModal — avoids ~35 lines
 *    of duplication across the 3 secured form pages (home-loan, lap, plot-loan).
 *
 * The onConfirm handler routes to either:
 *   - Director restore: applies recovered personal data to a director form slot
 *   - Applicant restore: delegates to a page-specific callback (since home-loan uses
 *     2-phase restore while LAP/plot-loan use single-phase)
 */

import { tick } from 'svelte';
import { restoreIntentState } from '$lib/stores/restoreApplicantIntent.svelte';
import { applicantState } from '$lib/state/applicant.svelte';
import { formState } from '$lib/state/form.svelte';
import clientLogger from '$lib/utils/clientLogger';

export interface DirectorRestorePayload {
	data: Record<string, string>;
	lockedFields: string[];
	matchedId: string;
	source: string;
	structured?: Record<string, unknown>;
	profileFields?: Record<string, unknown>;
}

// Company type → expected role mapping
const COMPANY_ROLE_MAP: Record<string, string> = {
	'Private Limited': 'director',
	'One Person Company (OPC)': 'director',
	'Public Limited': 'director',
	'Section 8': 'director',
	'Partnership Firm': 'partner',
	LLP: 'partner'
};

// Profile fields that exist on Individual applicants, NOT on DirectorForm.
// These bypass the director form and merge directly onto the Individual
// so the Profile tab starts complete, unblocking Income/Credit/Obligations tabs.
const PROFILE_RESTORE_FIELDS = [
	'education',
	'religion',
	'casteCategory',
	'ownedResidentialProperties',
	'hasDisability',
	'applicantResidencePattern',
	'applicantResidenceState',
	'applicantResidenceCity',
	'applicantResidencePincode',
	'nriCountry',
	'employmentType',
	'applicantSubType'
] as const;

export interface RestoreCompatibility {
	compatible: boolean;
	warning?: string;
}

/**
 * Validate whether a recovery entry is compatible with the target company context.
 * Returns warnings (never blocks) to help DSA make informed decisions.
 */
export function validateDirectorRestoreCompatibility(
	recovery: {
		directorRole?: string;
		loanProduct?: string;
		linkedCompanyName?: string;
		data?: Record<string, unknown>;
	},
	targetCompanyType: string,
	targetRole: string
): RestoreCompatibility {
	const warnings: string[] = [];

	// Check role mismatch (director vs partner)
	const prevRole = recovery.directorRole;
	const expectedRole = COMPANY_ROLE_MAP[targetCompanyType] || targetRole;
	if (prevRole && prevRole !== expectedRole) {
		const prevLabel = prevRole === 'partner' ? 'Partner' : 'Director';
		const targetLabel = expectedRole === 'partner' ? 'Partner' : 'Director';
		const companyName = recovery.linkedCompanyName || 'another entity';
		warnings.push(
			`This person was a ${prevLabel} in ${companyName}. Adding as ${targetLabel} in a ${targetCompanyType}.`
		);
	}

	// Check loan product mismatch
	const prevLoan = recovery.loanProduct;
	if (prevLoan) {
		// If restoring from a different loan product category, note it
		const isSecuredTarget = [
			'Private Limited',
			'One Person Company (OPC)',
			'Public Limited',
			'Section 8',
			'Partnership Firm',
			'LLP'
		].includes(targetCompanyType);
		if (prevLoan === 'Professional Loan' && isSecuredTarget) {
			warnings.push(`This person was in a Professional Loan. Income profile type may differ.`);
		} else if (prevLoan === 'Business Loan' && isSecuredTarget) {
			warnings.push(`This person was in a Business Loan. Verify income profile compatibility.`);
		}
	}

	return {
		compatible: warnings.length === 0,
		warning: warnings.length > 0 ? warnings.join(' ') : undefined
	};
}

export function buildDirectorRestorePayload(
	matchData: Record<string, unknown>,
	displayName: string,
	matchUuid: string,
	targetCompany: {
		id: string;
		name?: string;
		entityType?: string;
	},
	recoveredCompany?: {
		name?: string;
		entityType?: string;
	}
): DirectorRestorePayload {
	const structured = matchData._structured as Record<string, unknown> | undefined;

	// Build director form restore data — includes fullName so restoration fills the name field
	const restoredName = (matchData.fullName as string) || '';
	const restoreData: Record<string, string> = {
		...(restoredName ? { fullName: restoredName } : {}),
		gender: (matchData.gender as string) || '',
		age: String(matchData.age ?? ''),
		maritalStatus: (matchData.maritalStatus as string) || '',
		isNRI: (matchData.isNRI as string) || '',
		location: (matchData.location as string) || ''
	};
	const locked = ['gender', 'age', 'maritalStatus', 'isNRI'];

	// Ownership is company-specific. We treat the recovered and target companies
	// as "the same" when EITHER:
	//   (a) UUIDs match — the canonical case, or
	//   (b) name + entity type match — handles cross-session restores where the
	//       company UUID was regenerated but the company itself is unchanged
	//       (Issue #2 / Option B).
	const recoveredLinkedIds = (matchData.linkedCompanyIds as string[] | undefined) ?? [];
	const recoveredLinkedId = (matchData.linkedCompanyId as string) || '';
	const sameByUuid =
		recoveredLinkedId === targetCompany.id || recoveredLinkedIds.includes(targetCompany.id);
	const normalize = (s?: string) => (s ?? '').trim().toLowerCase();
	const sameByContent =
		!!recoveredCompany &&
		!!targetCompany.name &&
		!!targetCompany.entityType &&
		normalize(recoveredCompany.name) === normalize(targetCompany.name) &&
		normalize(recoveredCompany.entityType) === normalize(targetCompany.entityType);
	const wasSameCompany = sameByUuid || sameByContent;
	if (wasSameCompany) {
		const ownership = String(matchData.ownershipPercent ?? '');
		if (ownership) {
			restoreData.ownershipPercent = ownership;
			locked.push('ownershipPercent');
		}
	}

	// onProperty/onEMI carry over regardless of company — person's loan role should be preserved
	// as a starting point the DSA can edit (prevents silent misclassification when left empty)
	const onProp = String(matchData.onProperty ?? '');
	if (onProp) restoreData.onProperty = onProp;
	const onEmi = String(matchData.onEMI ?? '');
	if (onEmi) restoreData.onEMI = onEmi;

	// Profile fields bypass DirectorForm — merged onto Individual by applyDirectorRestore()
	const profileFields: Record<string, unknown> = {};
	for (const field of PROFILE_RESTORE_FIELDS) {
		const value = matchData[field];
		if (value !== undefined && value !== null && value !== '') {
			profileFields[field] = value;
		}
	}

	return {
		data: restoreData,
		lockedFields: locked,
		matchedId: matchUuid,
		source: `Restored: ${displayName}`,
		structured,
		...(Object.keys(profileFields).length > 0 ? { profileFields } : {})
	};
}

// ── Shared RestoreApplicantModal handlers ───────────────────────────────────
// Eliminates ~35 lines of duplication across home-loan, lap, and plot-loan pages.

/**
 * Interface for the applicant form ref — only the method we need for director restore.
 * Avoids importing the full ApplicantFormSecured type.
 */
interface DirectorRestoreTarget {
	applyDirectorRestore: (
		companyId: string,
		directorIdx: number,
		payload: DirectorRestorePayload
	) => void;
}

/**
 * Scroll smoothly to the restored applicant's card row.
 * Waits for Svelte DOM update (tick) + one animation frame so the row exists.
 */
export function scrollToApplicantRow(cardId: string): void {
	tick().then(() => {
		requestAnimationFrame(() => {
			const row = document.getElementById(`applicant-row-${cardId}`);
			if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	});
}

/**
 * Shared onConfirm handler for RestoreApplicantModal across all 3 secured form pages.
 *
 * Routes to either:
 * - Director restore: builds payload and applies it via applicantFormRef
 * - Applicant restore: delegates to the page-specific callback (because home-loan
 *   uses 2-phase prefill while LAP/plot-loan use single-phase commit)
 *
 * @param match - The recovery match selected by the user
 * @param applicantFormRef - Reference to ApplicantFormSecured (for director restore)
 * @param onApplicantRestore - Page-specific callback for applicant restore.
 *   Receives the match and should return a cardId (for scroll) or null.
 */
export function handleRestoreModalConfirm(
	match: {
		data: Record<string, unknown>;
		displayName: string;
		uuid: string;
		linkedCompanyName?: string;
		linkedCompanyEntityType?: string;
	},
	applicantFormRef: DirectorRestoreTarget | null,
	onApplicantRestore: (match: any) => string | null
): void {
	// Director restore — apply recovered personal data to director form
	const directorContext = restoreIntentState.directorRestore;
	if (directorContext) {
		const payload = buildDirectorRestorePayload(
			match.data as Record<string, unknown>,
			match.displayName,
			match.uuid,
			{
				id: directorContext.companyId,
				name: directorContext.companyName,
				entityType: directorContext.companyEntityType
			},
			{
				name: match.linkedCompanyName,
				entityType: match.linkedCompanyEntityType
			}
		);
		// Diagnostic — Pitfall #56's fix correctly closes the modal even when
		// the ref chain breaks, but the user perceives "Restore button doesn't
		// work" because no data was restored. Logging the broken-chain case
		// lets the next teammate repro pinpoint which link was null (the page-
		// level applicantFormRef, the AddApplicantBusiness step0Ref, or the
		// company lookup inside applyDirectorRestore) without needing a
		// debugger attached. Optional-chain still short-circuits safely.
		if (!applicantFormRef) {
			clientLogger.warn('directorRestore: applicantFormRef is null at click time', {
				companyId: directorContext.companyId,
				directorIdx: directorContext.directorIdx,
				companyName: directorContext.companyName,
				companyEntityType: directorContext.companyEntityType
			});
		}
		applicantFormRef?.applyDirectorRestore(
			directorContext.companyId,
			directorContext.directorIdx,
			payload
		);
		restoreIntentState.reset();
		return;
	}

	// Applicant restore — delegate to page-specific handler
	const cardId = onApplicantRestore(match);
	if (cardId) {
		scrollToApplicantRow(cardId);
	}
}

/**
 * Shared onCancel handler for RestoreApplicantModal across all 3 secured form pages.
 *
 * Three things happen here:
 *   1. Recovery is denied for all UUIDs that were offered in the modal so they
 *      don't keep reopening it on every keystroke.
 *   2. The in-flight applicant at `currentIndex` is stamped with
 *      `__independentOfSameName: true`. This is the user explicitly declaring
 *      "this person is NOT the same as anyone else in the case with this name."
 *      Downstream auto-link paths consult this flag and skip the applicant —
 *      otherwise a same-named Individual gets silently merged into a
 *      Company-director sub-row and disappears from the visible Who's Applying
 *      table (visible count drifts below applicants.length).
 *   3. Modal state resets.
 *
 * The flag is only stamped on Individuals — Company applicants don't get
 * name-merged into director sub-rows so the flag would be a no-op there.
 *
 * Edge case (push-new): if currentIndex points past the array, the in-flight
 * applicant hasn't been pushed yet — skip the stamp. Real flows that triggered
 * the underlying bug always pre-push, so this branch is a safety net.
 */
export function handleRestoreModalCancel(): void {
	const matchUUIDs = restoreIntentState.matches?.map((m) => m.uuid) ?? [];
	if (matchUUIDs.length > 0) {
		applicantState.denyRecoveryByUUIDs(matchUUIDs);
	}

	// Stamp the in-flight applicant so downstream auto-link paths skip it.
	// Only meaningful for Individuals (Companies aren't subject to director-merge).
	const idx = restoreIntentState.currentIndex;
	if (typeof idx === 'number' && idx >= 0 && idx < formState.applicants.length) {
		const target = formState.applicants[idx];
		if (target && target.applicantType === 'Individual' && !target.__independentOfSameName) {
			const updated = [...formState.applicants];
			updated[idx] = { ...target, __independentOfSameName: true };
			formState.replaceApplicants(updated);
		}
	}

	restoreIntentState.reset();
}
