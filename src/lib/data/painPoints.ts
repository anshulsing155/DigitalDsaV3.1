/**
 * Pain points master list for DSA Onboarding v2 — Section B.
 * Used by both the Zod schema (validation) and the UI (rendering).
 * Order matters: this is the canonical display order.
 */
export const PAIN_POINTS_OPTIONS = [
	'Tracking file status across multiple lenders',
	'Document collection from customers is chaotic',
	"Don't know which lender suits which customer profile",
	"Can't calculate eligibility accurately before submitting",
	"RM doesn't respond or delays processing",
	'Commission tracking is manual and unreliable',
	'No system to follow up with old/rejected leads',
	"Don't know balance transfer opportunities",
	"Can't generate professional proposals for customers",
	'Spending too much time on WhatsApp coordination'
] as const;

export type PainPointOption = (typeof PAIN_POINTS_OPTIONS)[number];
