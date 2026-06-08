// Case Management Zod Schemas
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const caseStageEnum = z.enum([
	'intake',
	'profiling',
	'file_building',
	'submitted',
	'processing',
	'query',
	'sanctioned',
	'disbursed',
	'rejected',
	'dropped',
	'closed'
]);

export const lenderAppStatusEnum = z.enum([
	'selected',
	'file_building',
	'ready',
	'submitted',
	'processing',
	'query',
	'query_responded',
	'sanctioned',
	'disbursed',
	'rejected',
	'withdrawn'
]);

export const documentCategoryEnum = z.enum([
	'identity',
	'income',
	'property',
	'lender_specific',
	'other'
]);

export const documentStatusEnum = z.enum([
	'not_started',
	'requested',
	'received',
	'uploaded',
	'not_applicable'
]);

export const queryCategoryEnum = z.enum([
	'document',
	'clarification',
	'additional_info',
	'technical',
	'legal',
	'other'
]);

export const queryStatusEnum = z.enum(['open', 'responded', 'resolved']);

export const sourceTypeEnum = z.enum([
	'walk-in',
	'builder',
	'ca',
	'referral',
	'online',
	'broker',
	'self'
]);

export const trafficLightEnum = z.enum(['green', 'amber', 'red', 'grey']);

export const technicalStatusEnum = z.enum([
	'pending',
	'ordered',
	'received',
	'positive',
	'negative'
]);

export const legalStatusEnum = z.enum(['pending', 'ordered', 'received', 'clear', 'not_clear']);

export const creditApprovalEnum = z.enum(['pending', 'approved', 'rejected', 'conditional']);

export const snapshotTypeEnum = z.enum(['review', 'submission']);

export const piiModeEnum = z.enum(['stripped', 'included']);

export const incomeModeEnum = z.enum(['consolidated', 'detailed']);

export const obligationsModeEnum = z.enum(['consolidated', 'detailed']);

export const applicantsModeEnum = z.enum(['consolidated', 'individual']);

// ============================================================================
// TRANSITION SCHEMAS
// ============================================================================

export const stageTransitionSchema = z.object({
	from: caseStageEnum,
	to: caseStageEnum,
	timestamp: z.coerce.date(),
	notes: z.string().optional()
});

export const statusTransitionSchema = z.object({
	from: lenderAppStatusEnum,
	to: lenderAppStatusEnum,
	timestamp: z.coerce.date(),
	notes: z.string().optional()
});

// ============================================================================
// DOCUMENT CHECKLIST SCHEMA
// ============================================================================

export const documentChecklistItemSchema = z.object({
	doc_id: z.string().min(1),
	doc_name: z.string().min(1),
	category: documentCategoryEnum,
	is_mandatory: z.boolean(),
	description: z.string().optional(),
	status: documentStatusEnum,
	status_updated_at: z.coerce.date().optional(),
	upload: z
		.object({
			file_url: z.string().min(1),
			file_id: z.string().min(1),
			file_type: z.string().min(1),
			file_size: z.number().positive(),
			uploaded_at: z.coerce.date()
		})
		.optional(),
	validity: z
		.object({
			valid_from: z.coerce.date().optional(),
			valid_until: z.coerce.date().optional(),
			is_fresh: z.boolean(),
			freshness_rule_days: z.number().int().positive()
		})
		.optional(),
	dsa_notes: z.string().optional()
});

// ============================================================================
// LENDER QUERY SCHEMA
// ============================================================================

export const lenderQuerySchema = z.object({
	query_id: z.string().min(1),
	query_text: z.string().min(1),
	category: queryCategoryEnum,
	raised_at: z.coerce.date(),
	deadline: z.coerce.date().optional(),
	response: z
		.object({
			text: z.string().min(1),
			attachments: z.array(z.string()).optional(),
			responded_at: z.coerce.date()
		})
		.optional(),
	status: queryStatusEnum,
	days_open: z.number().int().min(0)
});

// ============================================================================
// FILE CONFIG & SNAPSHOT SCHEMAS
// ============================================================================

export const fileConfigSchema = z.object({
	source_payload_hash: z.string().min(1),
	source_snapshot_version: z.number().int().positive(),
	sections_visibility: z.record(z.string(), z.boolean()),
	display_mode: z.object({
		income: incomeModeEnum,
		obligations: obligationsModeEnum,
		applicants: applicantsModeEnum
	}),
	dsa_notes: z.record(z.string(), z.string()),
	section_order: z.array(z.string()),
	pii_mode: piiModeEnum,
	updated_at: z.coerce.date()
});

export const fileSnapshotSchema = z.object({
	snapshot_id: z.string().min(1),
	type: snapshotTypeEnum,
	file_url: z.string().optional(),
	generated_at: z.coerce.date(),
	config_used: fileConfigSchema
});

// ============================================================================
// LENDER APPLICATION SCHEMA
// ============================================================================

export const lenderApplicationSchema = z.object({
	lender_application_id: z.string().min(1),
	lender_id: z.string().min(1),
	lender_name: z.string().min(1),
	status: lenderAppStatusEnum,
	status_history: z.array(statusTransitionSchema),
	lender_tracking: z
		.object({
			login_number: z.string().optional(),
			login_date: z.coerce.date().optional(),
			technical_status: technicalStatusEnum.optional(),
			legal_status: legalStatusEnum.optional(),
			credit_approval: creditApprovalEnum.optional(),
			conditions: z.array(z.string()).optional()
		})
		.optional(),
	sanction: z
		.object({
			amount: z.number().positive().optional(),
			roi: z.number().min(0).optional(),
			tenure_months: z.number().int().positive().optional(),
			sanction_date: z.coerce.date().optional(),
			sanction_letter_ref: z.string().optional(),
			conditions: z.array(z.string()).optional()
		})
		.optional(),
	disbursement: z
		.object({
			total_amount: z.number().positive().optional(),
			tranches: z
				.array(
					z.object({
						tranche_number: z.number().int().positive(),
						amount: z.number().positive(),
						date: z.coerce.date(),
						reference: z.string().optional()
					})
				)
				.optional()
		})
		.optional(),
	rejection: z
		.object({
			reason_category: z.string().optional(),
			reason_detail: z.string().optional(),
			rejection_date: z.coerce.date().optional(),
			reroute_suggestions: z.array(z.string()).optional()
		})
		.optional(),
	eligibility_snapshot: z
		.object({
			traffic_light: trafficLightEnum,
			message: z.string().min(1),
			computed_at: z.coerce.date()
		})
		.optional(),
	document_checklist: z.array(documentChecklistItemSchema),
	queries: z.array(lenderQuerySchema),
	rm_contact_id: z.string().optional(),
	file_config: fileConfigSchema.optional(),
	file_snapshots: z.array(fileSnapshotSchema),
	offer_details: z.record(z.string(), z.any()).optional(),
	payout_info: z.record(z.string(), z.any()).optional(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date()
});

// ============================================================================
// MAIN CASE SCHEMA
// ============================================================================

export const caseSchema = z.object({
	_id: z.string().optional(),
	case_id: z.string().min(1),
	dsa_id: z.string().min(1),
	label: z.string().min(1),
	loan: z.object({
		type: z.string().min(1),
		amount_required: z.number().positive().optional(),
		tenure_years: z.number().int().positive().optional(),
		purpose: z.string().optional()
	}),
	stage: caseStageEnum,
	stage_history: z.array(stageTransitionSchema),
	form_submission_id: z.string().optional(),
	form_snapshot_version: z.number().int().positive().optional(),
	form_snapshot_hash: z.string().optional(),
	results_snapshot_version: z.number().int().positive().optional(),
	results_snapshot_hash: z.string().optional(),
	lender_selections: z
		.array(
			z.object({
				lender_application_id: z.string().min(1),
				state: z.enum(['neutral', 'shortlisted', 'selected']),
				updated_at: z.coerce.date()
			})
		)
		.optional(),
	lender_applications: z.array(lenderApplicationSchema),
	primary_lender_id: z.string().optional(),
	optional_contact: z
		.object({
			full_name: z.string().optional(),
			mobile: z.string().optional(),
			email: z.string().email().optional()
		})
		.optional(),
	source: z
		.object({
			type: sourceTypeEnum.optional(),
			label: z.string().optional(),
			source_contact_id: z.string().optional()
		})
		.optional(),
	notes: z.string().optional(),
	created_at: z.coerce.date(),
	updated_at: z.coerce.date(),
	is_archived: z.boolean(),
	is_sample: z.boolean()
});

// ============================================================================
// CREATE & UPDATE SCHEMAS
// ============================================================================

/** Schema for creating a new case — only required fields */
export const caseCreateSchema = z.object({
	label: z.string().min(1, 'Case label is required'),
	loan: z.object({
		type: z.string().min(1, 'Loan type is required'),
		amount_required: z.number().positive().optional(),
		tenure_years: z.number().int().positive().optional(),
		purpose: z.string().optional()
	}),
	optional_contact: z
		.object({
			full_name: z.string().optional(),
			mobile: z.string().optional(),
			email: z.string().email().optional()
		})
		.optional(),
	source: z
		.object({
			type: sourceTypeEnum.optional(),
			label: z.string().optional(),
			source_contact_id: z.string().optional()
		})
		.optional(),
	notes: z.string().optional()
});

/** Schema for partial updates to an existing case */
export const caseUpdateSchema = z.object({
	label: z.string().min(1).optional(),
	loan: z
		.object({
			type: z.string().min(1).optional(),
			amount_required: z.number().positive().optional(),
			tenure_years: z.number().int().positive().optional(),
			purpose: z.string().optional()
		})
		.optional(),
	stage: caseStageEnum.optional(),
	primary_lender_id: z.string().optional(),
	optional_contact: z
		.object({
			full_name: z.string().optional(),
			mobile: z.string().optional(),
			email: z.string().email().optional()
		})
		.optional(),
	source: z
		.object({
			type: sourceTypeEnum.optional(),
			label: z.string().optional(),
			source_contact_id: z.string().optional()
		})
		.optional(),
	notes: z.string().optional(),
	results_snapshot_version: z.number().int().positive().optional(),
	results_snapshot_hash: z.string().optional(),
	lender_selections: z
		.array(
			z.object({
				lender_application_id: z.string().min(1),
				state: z.enum(['neutral', 'shortlisted', 'selected']),
				updated_at: z.coerce.date()
			})
		)
		.optional(),
	is_archived: z.boolean().optional(),
	is_sample: z.boolean().optional()
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type CaseStageEnum = z.infer<typeof caseStageEnum>;
export type LenderAppStatusEnum = z.infer<typeof lenderAppStatusEnum>;
export type StageTransitionData = z.infer<typeof stageTransitionSchema>;
export type StatusTransitionData = z.infer<typeof statusTransitionSchema>;
export type DocumentChecklistItemData = z.infer<typeof documentChecklistItemSchema>;
export type LenderQueryData = z.infer<typeof lenderQuerySchema>;
export type FileConfigData = z.infer<typeof fileConfigSchema>;
export type FileSnapshotData = z.infer<typeof fileSnapshotSchema>;
export type LenderApplicationData = z.infer<typeof lenderApplicationSchema>;
export type CaseData = z.infer<typeof caseSchema>;
export type CaseCreateData = z.infer<typeof caseCreateSchema>;
export type CaseUpdateData = z.infer<typeof caseUpdateSchema>;
