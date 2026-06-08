/**
 * AddApplicantBusiness — Removed code from sole prop refactor (2026-03-18)
 * ═══════════════════════════════════════════════════════════════════
 * These functions, derived values, and imports were part of the multi-applicant
 * "Add + Table" flow that was replaced by a single inline form for sole prop.
 * Archived in case they're needed for future multi-applicant flows.
 *
 * Removed imports:
 *   - CirclePlus, Trash2, Pencil from '$lib/utils/iconRegistry'
 *   - scrollToFirstError from '$lib/utils/scrollToFirstError'
 *   - get from 'svelte/store'
 *   - matchesByName from '$lib/state/applicant.svelte'
 *   - userRelationships, removeRelationshipsBatch from relationship-capture/relationshipStore
 *   - captureRelationshipsForRecovery from '$lib/utils/restoreRelationships'
 *   - applicantDataStore from '$lib/stores/applicantDataStore.svelte'
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Removed constant ──
// const MAX_APPLICANTS = 8;

// ── Removed derived values ──

/*
const individualApplicants = $derived(
	formState.applicants.filter((a) => a.applicantType === 'Individual')
);

const companyApplicant = $derived(
	formState.applicants.find((a) => a.applicantType === 'Company')
);

const totalApplicantCount = $derived(formState.applicants.filter((a) => a.applicantType).length);

// Completion status per applicant
const applicantCompletionStatus = $derived.by(() => {
	return formState.applicants.map((applicant) => {
		if (!applicant.applicantType) return false;
		if (applicant.applicantType === 'Company') {
			return Object.keys(getCompanyErrors(applicant as LegacyApplicant)).length === 0;
		}
		return Object.keys(getIndividualErrors(applicant as LegacyApplicant)).length === 0;
	});
});

// Duplicate detection (individuals only)
const duplicateIndexes = $derived.by(() => {
	const dup = new Set<number>();
	const applicants = formState.applicants as LegacyApplicant[];
	for (let i = 0; i < applicants.length; i++) {
		if (applicants[i]?.applicantType !== 'Individual') continue;
		for (let j = i + 1; j < applicants.length; j++) {
			if (applicants[j]?.applicantType !== 'Individual') continue;
			const a = applicants[i],
				b = applicants[j];
			const norm = (v: unknown) => (v ?? '').toString().trim().toLowerCase();
			if (
				norm(a.fullNameOfApplicant) === norm(b.fullNameOfApplicant) &&
				norm(a.age) === norm(b.age) &&
				norm(a.gender) === norm(b.gender)
			) {
				dup.add(i);
				dup.add(j);
			}
		}
	}
	return dup;
});
*/

// ── Removed functions ──

/*
function saveIndividual() {
	formState.applicantStepTouched = true;
	hasTriedToAdd = true;
	const questions = isSoleProp ? PROP_QUESTIONS : INDIVIDUAL_QUESTIONS;
	const errors: Record<string, string> = {};
	for (const q of questions) {
		const error = validateIndividualField(q.key, formApplicant[q.key]);
		if (error) errors[q.key] = error;
	}
	if (Object.keys(errors).length > 0) {
		formErrors = errors;
		const touched: Record<string, boolean> = {
			...((formApplicant.touchedFields as Record<string, boolean>) ?? {})
		};
		for (const key of Object.keys(errors)) touched[key] = true;
		formApplicant = { ...formApplicant, touchedFields: touched };
		return;
	}
	// Validate existing table rows
	for (let i = 0; i < formState.applicants.length; i++) {
		if (i === editingIndex) continue;
		const ap = formState.applicants[i] as LegacyApplicant;
		if (ap.applicantType !== 'Individual') continue;
		if (Object.keys(getIndividualErrors(ap)).length > 0) {
			globalError = 'Please fix errors in existing applicants before adding a new one.';
			return;
		}
	}
	// Income auto-select
	const autoProfiles = getAutoSelectedProfiles({
		loanCategory: 'business',
		applicantType: 'Individual',
		businessEntityType: entityType
	});
	const snapshot = $state.snapshot(formApplicant) as Record<string, unknown>;
	snapshot.selectedIncomeProfiles = autoProfiles;
	if (editingIndex !== null) {
		const updated = [...formState.applicants];
		updated[editingIndex] = snapshot;
		formState.replaceApplicants(updated);
		cancelEdit();
	} else {
		if (totalApplicantCount < MAX_APPLICANTS) {
			formState.replaceApplicants([...formState.applicants, snapshot]);
			resetIndividualForm();
		}
	}
	globalError = '';
}

function startEdit(index: number) {
	editingIndex = index;
	formApplicant = { ...formState.applicants[index] };
	formErrors = {};
	hasTriedToAdd = false;
}

function cancelEdit() {
	editingIndex = null;
	resetIndividualForm();
}

function deleteApplicant(index: number) {
	const applicant = formState.applicants[index];
	if (!applicant) return;
	globalError = '';
	if (editingIndex === index) {
		cancelEdit();
	} else if (editingIndex !== null && editingIndex > index) {
		editingIndex = editingIndex - 1;
	}
	// Recovery: save to recovery bin for both Individual and Company
	const hasName =
		applicant.applicantType === 'Company'
			? Boolean(applicant.companyName)
			: Boolean(applicant.fullNameOfApplicant);
	if (applicant.applicantType && hasName) {
		const matchSignature = buildMatchSignature(applicant);
		if (matchSignature && applicant.id) {
			const displayName =
				applicant.applicantType === 'Company'
					? (applicant.companyName as string) || 'Unnamed Company'
					: (applicant.fullNameOfApplicant as string) || 'Unnamed';
			const savedRelationships = captureRelationshipsForRecovery(
				applicant.id,
				formState.applicants as any[]
			);
			cleanupRelationshipsForApplicant(applicant.id);
			const recoveryData = $state.snapshot(applicant) as Record<string, unknown>;
			if (savedRelationships.length > 0) recoveryData._savedRelationships = savedRelationships;
			// Embed structured income data for restoration
			const structuredData = applicantDataStore.get(applicant.id);
			if (structuredData) {
				recoveryData._structured = $state.snapshot(structuredData) as unknown;
			}
			const scope = applicant.applicantType === 'Company' ? COMPANY_SCOPE : individualScope;
			applicantState.removeToRecovery(
				applicant.id,
				recoveryData,
				displayName,
				matchSignature,
				scope
			);
		} else {
			cleanupRelationshipsForApplicant(applicant.id);
		}
	} else {
		cleanupRelationshipsForApplicant(applicant.id);
	}
	// Clean income profile store
	incomeProfileStore.clearApplicantProfiles(index);
	for (let i = index + 1; i < formState.applicants.length; i++) {
		const profilesAtI = incomeProfileStore.getApplicantProfiles(i);
		if (Object.keys(profilesAtI).length > 0) {
			incomeProfileStore.clearApplicantProfiles(i);
			for (const [empType, profile] of Object.entries(profilesAtI)) {
				incomeProfileStore.saveProfile(i - 1, empType, profile.data);
			}
		}
	}
	formState.replaceApplicants(formState.applicants.filter((_, i) => i !== index));
	const deletedKey = buildDetectionKey(applicant);
	const deletedScope = applicant.applicantType === 'Company' ? COMPANY_SCOPE : individualScope;
	if (deletedKey) applicantState.clearDeniedPrefix(deletedKey, deletedScope);
	restoreAskedForKey = null;
}

function cleanupRelationshipsForApplicant(applicantId: string | undefined) {
	if (!applicantId) return;
	const rels = get(userRelationships);
	const orphanedIds = new Set(
		rels.filter((r) => r.fromId === applicantId || r.toId === applicantId).map((r) => r.id)
	);
	if (orphanedIds.size > 0) removeRelationshipsBatch(orphanedIds);
}
*/

// ── Removed display helpers ──

/*
function getDisplayName(applicant: LegacyApplicant, index: number): string {
	if (applicant.applicantType === 'Company') {
		return (applicant.companyName as string) || 'Company';
	}
	return (applicant.fullNameOfApplicant as string) || `Applicant ${index + 1}`;
}

function getSubDetails(applicant: LegacyApplicant): string {
	if (applicant.applicantType === 'Company') {
		return [applicant.companyType || '', applicant.registrationCountry || '']
			.filter(Boolean)
			.join(' · ');
	}
	const roleStr = applicant.role
		? `(${String(applicant.role).charAt(0).toUpperCase() + String(applicant.role).slice(1)})`
		: '';
	return [
		applicant.age ? `Age ${applicant.age}` : '',
		applicant.gender || '',
		applicant.maritalStatus || '',
		applicant.isApplicantNRI === 'Yes' ? 'NRI' : '',
		roleStr
	]
		.filter(Boolean)
		.join(' · ');
}

// Number label for individual rows in company table (skipping the company row)
function getIndividualNumber(index: number): number {
	return (
		formState.applicants.slice(0, index).filter((a) => a.applicantType === 'Individual').length +
		1
	);
}
*/
