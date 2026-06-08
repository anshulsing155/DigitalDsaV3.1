import { z } from 'zod';
import { PAIN_POINTS_OPTIONS } from '$lib/data/painPoints';
import { AVAILABLE_MODULES, VALID_MODULE_IDS } from '$lib/data/modules';

// ── Helpers ─────────────────────────────────────────────────────

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const painPointValues = PAIN_POINTS_OPTIONS as unknown as readonly [string, ...string[]];
const moduleIdValues = VALID_MODULE_IDS;

// ── Section A: Empanelled Lender ────────────────────────────────

/**
 * Validates a single empanelled lender entry.
 * When has_direct_code is true, dsa_code becomes required.
 * RM details (rm_phone, rm_email) are validated only when provided.
 */
export const empanelledLenderSchema = z
	.object({
		lender_name: z.string().min(1, 'Select a lender / bank'),
		dsa_code: z.string().optional(),
		has_direct_code: z.boolean({ message: 'Please select an option' }),
		rm_name: z.string().optional(),
		rm_phone: z
			.string()
			.optional()
			.refine((val) => !val || PHONE_REGEX.test(val), 'Enter a valid 10-digit mobile number'),
		rm_email: z
			.string()
			.optional()
			.refine(
				(val) => !val || z.string().email().safeParse(val).success,
				'Enter a valid email address'
			),
		relationship_since: z.coerce.date().optional()
	})
	.superRefine((data, ctx) => {
		if (data.has_direct_code && (!data.dsa_code || data.dsa_code.trim().length === 0)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Enter your DSA code for this lender',
				path: ['dsa_code']
			});
		}
	});

// ── Section A: Business Profile ─────────────────────────────────

/**
 * DSA Onboarding v2 — Section A: Business Profile.
 * Captures firm details, loan focus, lender relationships, and geography.
 */
export const dsaBusinessProfileSchema = z.object({
	firm_name: z.string().optional(),
	gstin: z
		.string()
		.optional()
		.refine((val) => !val || GST_REGEX.test(val), 'Enter valid GST number (e.g. 22ABCDE1234F1Z5)'),
	years_in_business: z.number().min(0, 'Years in business cannot be negative').optional(),
	team_size: z.enum(['solo', '2-5', '6-15', '15+'], {
		message: 'Select your team size'
	}),
	monthly_file_volume: z.enum(['0-5', '5-15', '15-30', '30+'], {
		message: 'Select your monthly file volume'
	}),
	primary_loan_types: z.array(z.string().min(1)).min(1, 'Select at least one loan type'),
	empanelled_lenders: z.array(empanelledLenderSchema).min(1, 'Add at least one lender'),
	geography: z.object({
		city: z.string().min(1, 'Select your city'),
		areas_of_operation: z.array(z.string()).optional()
	}),
	current_tools: z
		.array(z.enum(['excel', 'paper', 'whatsapp', 'other_software', 'none']))
		.min(1, 'Select at least one option'),
	has_website: z.boolean({ message: 'Please select an option' }),
	lead_sources: z
		.array(z.enum(['self', 'broker', 'builder', 'ca', 'digital', 'walk_in', 'referral']))
		.min(1, 'Select at least one lead source')
});

// ── Section B: Pain Points ──────────────────────────────────────

/**
 * DSA Onboarding v2 — Section B: Pain Points (forced ranking).
 * Must pick exactly 5 items from the master list, ordered by priority.
 */
export const dsaPainPointsSchema = z.object({
	ranked_items: z
		.array(z.enum(painPointValues))
		.length(5, 'Select exactly 5 pain points')
		.refine(
			(items) => new Set(items).size === items.length,
			'Each pain point must be unique — no duplicates'
		),
	ranked_at: z.coerce.date()
});

// ── Section C: 6-Month Goals ────────────────────────────────────

/**
 * Reusable current/target pair.
 * Both values must be >= 0.
 */
const currentTargetPairSchema = z.object({
	current: z.number().min(0, 'Value must be 0 or greater'),
	target: z.number().min(0, 'Value must be 0 or greater')
});

/**
 * DSA Onboarding v2 — Section C: 6-Month Goals.
 * Each metric has a current baseline and a 6-month target.
 */
export const dsaGoalsSchema = z.object({
	files_per_month: currentTargetPairSchema,
	disbursement_volume: currentTargetPairSchema,
	active_lender_count: currentTargetPairSchema,
	repeat_referral_rate: currentTargetPairSchema,
	avg_processing_days: currentTargetPairSchema,
	set_at: z.coerce.date()
});

// ── Section D: Workflow Preferences ─────────────────────────────

/**
 * DSA Onboarding v2 — Section D: Workflow Preferences.
 * Captures how the DSA works day-to-day.
 */
export const dsaWorkflowSchema = z.object({
	customer_interaction: z.enum(['in_person', 'remote', 'both'], {
		message: 'Select how you interact with customers'
	}),
	document_collection: z.enum(['physical', 'digital', 'both'], {
		message: 'Select how you collect documents'
	}),
	file_preparation: z.enum(['self', 'back_office', 'both'], {
		message: 'Select who prepares files'
	}),
	lender_submission: z.enum(['email', 'physical', 'portal', 'mixed'], {
		message: 'Select how you submit to lenders'
	}),
	training_preference: z.enum(['video', 'live', 'self_serve', 'none'], {
		message: 'Select your training preference'
	})
});

// ── Section E: Module Selection ─────────────────────────────────

/**
 * DSA Onboarding v2 — Section E: Module Selection.
 * Array of valid module IDs that the DSA wants activated.
 */
export const dsaModuleSelectionSchema = z.object({
	active_modules: z.array(z.enum(moduleIdValues)).min(1, 'Select at least one module')
});

// ── Subscription ────────────────────────────────────────────────

const dsaSubscriptionSchema = z.object({
	tier: z.enum(['free', 'pro', 'enterprise'], {
		message: 'Select a subscription tier'
	}),
	started_at: z.coerce.date().optional(),
	expires_at: z.coerce.date().optional()
});

// ── Combined v2 Schema ──────────────────────────────────────────

/**
 * Full DSA Onboarding v2 data schema.
 * All sections are optional at the top level so we can save partial progress.
 */
export const dsaOnboardingV2Schema = z.object({
	business_profile: dsaBusinessProfileSchema.optional(),
	pain_points_ranking: dsaPainPointsSchema.optional(),
	goals: dsaGoalsSchema.optional(),
	workflow: dsaWorkflowSchema.optional(),
	active_modules: z.array(z.enum(moduleIdValues)).optional(),
	onboarding_v2_completed: z.boolean().optional(),
	subscription: dsaSubscriptionSchema.optional(),
	feature_flags: z.record(z.string(), z.boolean()).optional()
});

// ── Per-step schemas (progressive onboarding) ───────────────────

/**
 * Step-level schemas so each section can be validated independently
 * during progressive onboarding (one section per page).
 */
export const dsaOnboardingV2StepSchema = {
	business_profile: dsaBusinessProfileSchema,
	pain_points: dsaPainPointsSchema,
	goals: dsaGoalsSchema,
	workflow: dsaWorkflowSchema,
	module_selection: dsaModuleSelectionSchema
} as const;

// ── Inferred types ──────────────────────────────────────────────

export type EmpanelledLenderInput = z.infer<typeof empanelledLenderSchema>;
export type DsaBusinessProfileInput = z.infer<typeof dsaBusinessProfileSchema>;
export type DsaPainPointsInput = z.infer<typeof dsaPainPointsSchema>;
export type DsaGoalsInput = z.infer<typeof dsaGoalsSchema>;
export type DsaWorkflowInput = z.infer<typeof dsaWorkflowSchema>;
export type DsaModuleSelectionInput = z.infer<typeof dsaModuleSelectionSchema>;
export type DsaOnboardingV2Input = z.infer<typeof dsaOnboardingV2Schema>;
