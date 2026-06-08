/**
 * Detach an orphan director from their (deleted) company.
 * Shared handler used by Company.svelte and IncomePageNew.svelte
 * whenever CrossFieldWarningBanner fires a fixAction === 'detach'.
 *
 * Steps:
 * 1. Show confirmation dialog (director becomes standalone co-applicant)
 * 2. Remove company link fields
 * 3. Orphan auto-created income entries (make editable by DSA)
 * 4. Update formState.applicants
 */

import { formState } from '$lib/state/form.svelte';
import { openConfirmModal } from '$lib/stores/confirmModal';
import { syncAutoIncomeEntries } from '$lib/utils/directorAutoIncome';
import type { Contradiction } from '$lib/utils/crossStepValidator';
import type { IncomeSourceEntry } from '$lib/types/incomeProfile';

/**
 * Handle a "detach" fix action from CrossFieldWarningBanner.
 * Shows a confirmation dialog, then detaches the orphan director
 * from their deleted company and orphans auto-income entries.
 */
export function detachOrphanDirector(contradiction: Contradiction): void {
	if (contradiction.fixAction !== 'detach' || !contradiction.applicantId) return;

	const applicantId = contradiction.applicantId;
	const applicantName = contradiction.applicantName || 'This director';

	openConfirmModal(
		'Detach from Company',
		`Remove "${applicantName}" from their linked company? They will become a standalone co-applicant. Any auto-generated income entries will become fully editable.`,
		() => {
			// 1. Remove company link fields
			const updatedApplicants = formState.applicants.map((a: any) => {
				if (a.id !== applicantId) return a;

				const detached = { ...a };
				const previousCompanyIds = (detached.linkedCompanyIds as string[] | undefined) ?? [];
				delete detached.linkedCompanyId;
				delete detached.linkedCompanyIds;
				delete detached.directorRole;
				delete detached.ownershipPercent;

				// 2. Orphan auto-income entries — pass empty linkedCompanyIds
				// so syncAutoIncomeEntries marks all auto-created entries as orphaned
				if (previousCompanyIds.length > 0) {
					const existingEntries = (detached.incomeEntries as IncomeSourceEntry[] | undefined) ?? [];
					const name = (detached.fullName as string) || '';
					detached.incomeEntries = syncAutoIncomeEntries(
						[], // no linked companies anymore
						formState.applicants as Array<Record<string, unknown>>,
						existingEntries,
						name
					);
				}

				return detached;
			});

			formState.replaceApplicants(updatedApplicants);
		}
	);
}
