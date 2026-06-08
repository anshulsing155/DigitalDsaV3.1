/**
 * Pure helpers for the RM Policy Library page (C.2).
 *
 * Extracted so the filter + sort logic can be unit-tested without mounting
 * the Svelte component. The page passes its `data.assignments` array through
 * `filterAssignments` then `sortAssignments`, both kept side-effect-free.
 */

export type SortMode = 'recent' | 'due_soonest' | 'az';

/** Minimal shape needed for filter + sort. Matches the projection in
 *  /dashboard/rm/policies/+page.server.ts. */
export interface PolicyLibraryAssignment {
	lenderName: string;
	lenderClassification: string | null;
	lastVerifiedAt: string | null;
	daysUntilRenewal: number;
	renewalOverdue: boolean;
	renewalDueSoon: boolean;
	[k: string]: unknown;
}

export interface FilterOptions {
	/** Free-text query — case-insensitive substring match against lenderName. */
	query: string;
	/** Lender classification ('' = all). */
	type: string;
}

export function filterAssignments<T extends PolicyLibraryAssignment>(
	assignments: T[],
	{ query, type }: FilterOptions
): T[] {
	const q = query.trim().toLowerCase();
	const t = type.trim();
	if (!q && !t) return assignments;

	return assignments.filter((a) => {
		if (q && !a.lenderName.toLowerCase().includes(q)) return false;
		if (t && a.lenderClassification !== t) return false;
		return true;
	});
}

export function sortAssignments<T extends PolicyLibraryAssignment>(
	assignments: T[],
	mode: SortMode
): T[] {
	// Overdue records always float to the top, regardless of mode. Surfacing
	// the actionable bucket first is the whole point of C.2 ("recently
	// verified" sort with overdue at the top per spec line 773).
	const overdue: T[] = [];
	const normal: T[] = [];
	for (const a of assignments) {
		if (a.renewalOverdue) overdue.push(a);
		else normal.push(a);
	}

	// Within each bucket, apply the chosen mode.
	const orderInner = (arr: T[]): T[] => {
		const copy = arr.slice();
		if (mode === 'az') {
			copy.sort((a, b) => a.lenderName.localeCompare(b.lenderName));
		} else if (mode === 'due_soonest') {
			copy.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
		} else {
			// 'recent' — most-recently-verified first. Nulls (never verified)
			// fall to the bottom so they're noticeable but don't dominate.
			copy.sort((a, b) => {
				const at = a.lastVerifiedAt ? Date.parse(a.lastVerifiedAt) : -Infinity;
				const bt = b.lastVerifiedAt ? Date.parse(b.lastVerifiedAt) : -Infinity;
				return bt - at;
			});
		}
		return copy;
	};

	return [...orderInner(overdue), ...orderInner(normal)];
}
