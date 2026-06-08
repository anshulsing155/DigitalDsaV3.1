/**
 * Clean Payload Store — Svelte 5 Runes Implementation
 * ═══════════════════════════════════════════════════════════════════
 * Source of truth for derived loan payloads. Automatically builds clean,
 * well-structured payloads from the canonical form state and relationships.
 *
 * Consumers can import from either:
 *   - '$lib/stores/cleanPayloadStore.svelte' (runes — new code)
 *   - '$lib/stores/cleanPayloadStore'        (bridge — legacy $store syntax)
 *
 * @see cleanPayloadStore.ts for the backward-compatible bridge
 */

import { formState } from '$lib/state/form.svelte';
import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';
import {
	buildLoanPayload,
	type LoanApplicationPayload,
	type ApplicantPayload,
	type LoanTransactionPayload
} from '$lib/utils/payloadBuilder';
import { buildCasePayload } from '$lib/utils/casePayloadBuilder';
import { buildFilteredAnswers, type FilteredView } from '$lib/utils/payloadFilter';
import type { Schema } from '$lib/types/formTypes';
import type { CasePayload } from '$lib/types/casePayload';

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONSHIP BRIDGE (mirror writable store → $state for $derived tracking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirror of the userRelationships Svelte 4 store into $state so that
 * $derived computations can track it reactively.
 *
 * The subscription is set up once via $effect.root() — the unsubscribe
 * is returned but never called (singleton lifetime, same as the store).
 */
let _relationships = $state<
	Array<{ fromId: string; toId: string; relationType: string; category: string }>
>([]);

const _cleanupRelationships = $effect.root(() => {
	// Subscribe to the sessionPersisted writable store
	const unsub = userRelationships.subscribe((rels) => {
		_relationships = rels.map((r) => ({
			fromId: r.fromId,
			toId: r.toId,
			relationType: r.relationType,
			category: r.category ?? ''
		}));
	});

	return () => unsub();
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build relationships array from current state
// ─────────────────────────────────────────────────────────────────────────────

function currentRelationships() {
	return _relationships;
}

/**
 * Raw, unfiltered answers for the active loan. This is what the form
 * bindings read from — keeps the user's full answer history across
 * branch-switches for back-navigation UX.
 *
 * DO NOT feed this directly into the submission builders: use
 * `currentFilteredView()` below, which applies Layer A + Layer B.
 */
function currentLoanAnswers() {
	const loanName = formState.applicationData?.loanName ?? '';
	return (loanName ? formState.loanData?.[loanName] : formState.loanData) ?? {};
}

/**
 * Schema for the active loan, or `null` if unavailable on the client.
 *
 * Today the schema loader (`$lib/server/formEngine/schemaLoader.ts`) is
 * server-only — the client cannot import it without crossing the
 * server-only directive. Until Phase 1.6 plumbs a client-side schema
 * accessor (recommended: server endpoint that returns `buildFilteredAnswers`'s
 * output), this returns `null` and Layer A is a passthrough. Layer B
 * (applicant gates) still runs and provides the correctness floor today.
 *
 * See docs/SESSION-HANDOFF.md §S77c Phase 1.6 for the planned fix.
 */
function currentSchema(): Schema | null {
	return null;
}

/**
 * The single place `cleanPayload`/`casePayload` read from. Produces the
 * filtered view via Layer A (schema-driven) + Layer B (gate-driven).
 *
 * Raw memory is never mutated — the returned view is a fresh projection.
 */
function currentFilteredView(): FilteredView {
	return buildFilteredAnswers(
		currentSchema(),
		currentLoanAnswers() as Record<string, unknown>,
		formState.applicants as Record<string, unknown>[]
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEAN PAYLOAD STATE (Svelte 5 runes)
// ─────────────────────────────────────────────────────────────────────────────

class CleanPayloadState {
	/**
	 * Derived clean payload — automatically rebuilds whenever form state
	 * or relationships change.
	 *
	 * CONSUMES THE FILTERED VIEW (not raw memory): Layer A drops keys for
	 * invisible questions/pages, Layer B strips stale per-applicant data
	 * (non-guarantor obligations in guarantor-only mode, deselected income
	 * profiles). Raw memory is untouched — only form bindings see it.
	 */
	readonly cleanPayload: LoanApplicationPayload = $derived.by(() => {
		const view = currentFilteredView();
		const rels = currentRelationships();

		return buildLoanPayload(
			view.loanAnswers,
			view.applicants,
			formState.applicationData as Record<string, unknown>,
			rels
		);
	});

	/**
	 * Derived case payload — automatically rebuilds whenever form state
	 * or relationships change.
	 *
	 * Same filtered-view contract as `cleanPayload` above. The case payload
	 * is what gets persisted as an immutable snapshot, so it MUST see the
	 * filtered view — stale keys here would lock bad data into the audit
	 * trail forever.
	 */
	readonly casePayload: CasePayload = $derived.by(() => {
		const view = currentFilteredView();
		const rels = currentRelationships();

		return buildCasePayload(
			view.loanAnswers,
			view.applicants,
			formState.applicationData as Record<string, unknown>,
			rels
		);
	});

	// ── Imperative Getters ──────────────────────────────────────────────

	/** Get current clean payload snapshot (non-reactive, for use in functions) */
	getCleanPayload(): LoanApplicationPayload {
		return this.cleanPayload;
	}

	/** Get current case payload snapshot (non-reactive, for use in functions) */
	getCasePayload(): CasePayload {
		return this.casePayload;
	}

	/** Get clean payload for a specific applicant by index */
	getApplicantPayload(index: number): ApplicantPayload | null {
		return this.cleanPayload.allApplicantDetails[index] ?? null;
	}

	/** Get only the loan transaction portion */
	getLoanTransactionPayload(): LoanTransactionPayload {
		return this.cleanPayload.loanTransaction;
	}

	// ── Debug Helpers ───────────────────────────────────────────────────

	/** Log the current clean payload to console (for debugging) */
	logCleanPayload(): void {
		const payload = this.cleanPayload;
		// eslint-disable-next-line no-console
		console.group('🧹 Clean Payload');
		// eslint-disable-next-line no-console
		console.log('Loan Transaction:', payload.loanTransaction);
		// eslint-disable-next-line no-console
		console.log('Applicants:', payload.allApplicantDetails);
		// eslint-disable-next-line no-console
		console.groupEnd();
	}

	/** Get payload as formatted JSON string (for display/copy) */
	getPayloadAsJSON(pretty: boolean = true): string {
		const payload = this.cleanPayload;
		return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
	}

	/** Compare clean payload with existing payload format */
	compareWithExisting(existingPayload: Record<string, unknown>): {
		added: string[];
		removed: string[];
		changed: string[];
		cleanPayload: LoanApplicationPayload;
		existingPayload: Record<string, unknown>;
	} {
		const clean = this.cleanPayload;

		const added: string[] = [];
		const removed: string[] = [];
		const changed: string[] = [];

		function compare(
			oldObj: Record<string, unknown>,
			newObj: Record<string, unknown>,
			path: string = ''
		) {
			const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

			for (const key of allKeys) {
				const fullPath = path ? `${path}.${key}` : key;
				const oldVal = oldObj[key];
				const newVal = newObj[key];

				if (!(key in oldObj)) {
					added.push(fullPath);
				} else if (!(key in newObj)) {
					removed.push(fullPath);
				} else if (
					typeof oldVal === 'object' &&
					typeof newVal === 'object' &&
					oldVal !== null &&
					newVal !== null &&
					!Array.isArray(oldVal) &&
					!Array.isArray(newVal)
				) {
					compare(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, fullPath);
				} else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
					changed.push(fullPath);
				}
			}
		}

		compare(existingPayload, clean as unknown as Record<string, unknown>);

		return { added, removed, changed, cleanPayload: clean, existingPayload };
	}

	// ── Submission Helper ───────────────────────────────────────────────

	/**
	 * Submit the clean payload to an external API.
	 * @param apiUrl - The API endpoint URL
	 * @param options - Additional fetch options
	 */
	async submitCleanPayload(
		apiUrl: string = 'https://ai-based-bank-management.vercel.app/api/loanCalculations',
		options: RequestInit = {}
	): Promise<Response> {
		const payload = this.cleanPayload;

		return fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...((options.headers as Record<string, string>) ?? {})
			},
			body: JSON.stringify(payload),
			...options
		});
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

export const cleanPayloadState = new CleanPayloadState();

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE FUNCTIONS (module-level, for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

export function getCleanPayload(): LoanApplicationPayload {
	return cleanPayloadState.getCleanPayload();
}

export function getCasePayload(): CasePayload {
	return cleanPayloadState.getCasePayload();
}

export function getApplicantPayload(index: number): ApplicantPayload | null {
	return cleanPayloadState.getApplicantPayload(index);
}

export function getLoanTransactionPayload(): LoanTransactionPayload {
	return cleanPayloadState.getLoanTransactionPayload();
}

export function logCleanPayload(): void {
	cleanPayloadState.logCleanPayload();
}

export function getPayloadAsJSON(pretty: boolean = true): string {
	return cleanPayloadState.getPayloadAsJSON(pretty);
}

export function compareWithExisting(existingPayload: Record<string, unknown>) {
	return cleanPayloadState.compareWithExisting(existingPayload);
}

export async function submitCleanPayload(
	apiUrl?: string,
	options?: RequestInit
): Promise<Response> {
	return cleanPayloadState.submitCleanPayload(apiUrl, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTED TYPES (pass-through, same as old file)
// ─────────────────────────────────────────────────────────────────────────────

export type {
	LoanApplicationPayload,
	ApplicantPayload,
	LoanTransactionPayload,
	ObligationEntry,
	FinancialsData,
	DirectorInfo,
	GPADetails,
	CleanIncomeEntry,
	RelationshipEntry,
	StructuredPayload
} from '$lib/utils/payloadBuilder';

export { buildStructuredPayload } from '$lib/utils/payloadBuilder';
export { buildCleanAnswers, groupAnswersBySchema } from '$lib/utils/payloadGrouping';
export { buildCasePayload } from '$lib/utils/casePayloadBuilder';
export type {
	CasePayload,
	CaseScreening,
	CasePropertyLocation,
	CasePropertyTechnical,
	CasePropertyLegal,
	CasePropertyFinancial,
	CaseSeller,
	CaseLoanDetails,
	CaseBalanceTransfer,
	CaseTopUp,
	CaseApplicant,
	CaseApplicantPersonal,
	CaseApplicantIncome,
	CaseApplicantObligations,
	CaseApplicantCibil,
	CaseDerivedInsights,
	CaseDerivedApplicant
} from '$lib/types/casePayload';
