/**
 * Centralized registry of ALL storage keys used across the app.
 * This prevents the sessionStorage/localStorage mismatch from recurring.
 *
 * Rule: form draft data -> sessionStorage (clears on tab close)
 *       UI preferences  -> localStorage (persists across sessions)
 *       offer results   -> localStorage (survives navigation between form and offers)
 *       migration flags -> localStorage (one-time, permanent)
 *
 * Updated: Phase 1b (store-redesign) — aligned form.svelte.ts to sessionStorage.
 */

export const STORAGE_REGISTRY = {
	// =========================================================================
	// FORM DRAFT DATA (sessionStorage) — clears when tab/window closes
	// =========================================================================

	// Core form stores (used by both loanData.ts persisted stores AND form.svelte.ts)
	'home-loan-data': { storage: 'session' as const, domain: 'form' },
	'home-application-data': { storage: 'session' as const, domain: 'form' },
	'home-back-history': { storage: 'session' as const, domain: 'form' },
	'home-applicant-step-touched': { storage: 'session' as const, domain: 'form' },
	'home-page-index-object': { storage: 'session' as const, domain: 'form' },
	'home-loan-page-index': { storage: 'session' as const, domain: 'form' },
	'home-applicant-index-number': { storage: 'session' as const, domain: 'form' },
	'home-applicants-store': { storage: 'session' as const, domain: 'form' },
	'home-applicants-store-payload': { storage: 'session' as const, domain: 'form' },

	// Per-loan-type page indices (loanData.ts persisted stores)
	'lap-page-index': { storage: 'session' as const, domain: 'form' },
	'plot-loan-page-index': { storage: 'session' as const, domain: 'form' },
	'business-loan-page-index': { storage: 'session' as const, domain: 'form' },
	'personal-loan-page-index': { storage: 'session' as const, domain: 'form' },
	'professional-loan-page-index': { storage: 'session' as const, domain: 'form' },

	// Income profile store (incomeProfileStore.ts)
	'income-profiles': { storage: 'session' as const, domain: 'form' },

	// Applicant data store (applicantDataStore.svelte.ts)
	'applicant-data-store': { storage: 'session' as const, domain: 'form' },

	// Applicant recovery (applicantRecovery.ts)
	'applicant-recovery': { storage: 'session' as const, domain: 'form' },
	'denied-applicant-recovery-prefixes': { storage: 'session' as const, domain: 'form' },

	// Relationship stores (relationshipStore.ts)
	'home-user-relationships': { storage: 'session' as const, domain: 'form' },
	'home-user-reciprocal-relationships': { storage: 'session' as const, domain: 'form' },

	// Clean payloads (written by form page submit handlers)
	homeLoanCleanPayload: { storage: 'session' as const, domain: 'form-payload' },
	homeLoanPayload: { storage: 'session' as const, domain: 'form-payload' },
	lapCleanPayload: { storage: 'session' as const, domain: 'form-payload' },
	plotLoanCleanPayload: { storage: 'session' as const, domain: 'form-payload' },
	businessLoanCleanPayload: { storage: 'session' as const, domain: 'form-payload' },
	personalLoanCleanPayload: { storage: 'session' as const, domain: 'form-payload' },
	professionalLoanCleanPayload: { storage: 'session' as const, domain: 'form-payload' },

	// Security monitor (securityMonitor.ts)
	security_monitor_data: { storage: 'session' as const, domain: 'security' },

	// Form-submit handoff to /evaluating (formSubmitHandler.ts + /evaluating/+page.svelte)
	// — QBC UX inversion 2026-05-30. submitFormForEvaluation stashes the
	// SubmitOptions here + navigates; /evaluating reads + clears it on mount.
	// Transient: lifetime is the one nav from form → /evaluating.
	'qbc.pendingSubmission': { storage: 'session' as const, domain: 'form-submit' },

	// Legacy /evaluating handoff (pre-QBC inversion). Set after a successful
	// evaluate-and-persist call, carries caseId + offerCount + display
	// metadata for the animation header. The post-inversion path goes
	// through qbc.pendingSubmission, but this key is preserved for back-
	// compat with any code that stashes it directly.
	evaluationPayload: { storage: 'session' as const, domain: 'form-submit' },

	// =========================================================================
	// OFFER RESULTS (localStorage) — survives navigation between form and offers
	// =========================================================================

	homeLoanOffer: { storage: 'local' as const, domain: 'offers' },
	homeLoanOffers: { storage: 'local' as const, domain: 'offers' },
	balanceTransferOffers: { storage: 'local' as const, domain: 'offers' },
	topupLoanOffers: { storage: 'local' as const, domain: 'offers' },
	LapOffers: { storage: 'local' as const, domain: 'offers' },
	plotLoanOffers: { storage: 'local' as const, domain: 'offers' },
	businessLoanOffer: { storage: 'local' as const, domain: 'offers' },
	personalLoanOffers: { storage: 'local' as const, domain: 'offers' },
	professionalOffers: { storage: 'local' as const, domain: 'offers' },
	loanOffers: { storage: 'local' as const, domain: 'offers' },
	selectedLoanOffer: { storage: 'local' as const, domain: 'offers' },
	selectedHomeLoanOffer: { storage: 'local' as const, domain: 'offers' },
	selectedLAPOffer: { storage: 'local' as const, domain: 'offers' },
	selectedPersonalLoanOffer: { storage: 'local' as const, domain: 'offers' },
	selectedBusinessLoanOffer: { storage: 'local' as const, domain: 'offers' },
	selectedProfessionalLoanOffer: { storage: 'local' as const, domain: 'offers' },

	// =========================================================================
	// UI PREFERENCES (localStorage) — persists across sessions
	// =========================================================================

	'ddsa-theme': { storage: 'local' as const, domain: 'ui' },
	'dashboard-sample-visible': { storage: 'local' as const, domain: 'ui' },

	// =========================================================================
	// MIGRATION FLAGS (localStorage) — one-time, permanent
	// =========================================================================

	'ddsa-storage-migrated-v1': { storage: 'local' as const, domain: 'migration' }
} as const satisfies Record<string, { storage: 'session' | 'local'; domain: string }>;

export type StorageKey = keyof typeof STORAGE_REGISTRY;
