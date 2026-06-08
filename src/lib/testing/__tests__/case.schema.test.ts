import { describe, it, expect } from 'vitest';
import {
	caseCreateSchema,
	caseSchema,
	caseUpdateSchema,
	lenderApplicationSchema,
	documentChecklistItemSchema,
	lenderQuerySchema,
	fileConfigSchema,
	caseStageEnum,
	lenderAppStatusEnum,
	documentStatusEnum,
	sourceTypeEnum,
	piiModeEnum
} from '$lib/schemas/case.schema';

// ═══════════════════════════════════════════════════════════════
// Helpers — reusable fixtures
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function minimalLenderApplication() {
	return {
		lender_application_id: 'la-001',
		lender_id: 'lender-001',
		lender_name: 'HDFC Bank',
		status: 'selected',
		status_history: [],
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: NOW,
		updated_at: NOW
	};
}

function minimalCase() {
	return {
		case_id: 'case-001',
		dsa_id: 'dsa-001',
		label: 'Ramesh Home Loan',
		loan: { type: 'Home Loan' },
		stage: 'intake',
		stage_history: [],
		lender_applications: [],
		created_at: NOW,
		updated_at: NOW,
		is_archived: false,
		is_sample: false
	};
}

// ═══════════════════════════════════════════════════════════════
// caseCreateSchema
// ═══════════════════════════════════════════════════════════════

describe('caseCreateSchema', () => {
	it('accepts minimal case (label + loan.type only)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Test Case',
			loan: { type: 'Home Loan' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts full case with all optional fields', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Full Case',
			loan: {
				type: 'Home Loan',
				amount_required: 5000000,
				tenure_years: 20,
				purpose: 'Purchase of flat'
			},
			optional_contact: {
				full_name: 'Ramesh Kumar',
				mobile: '9876543210',
				email: 'ramesh@example.com'
			},
			source: {
				type: 'referral',
				label: 'Builder ABC',
				source_contact_id: 'src-001'
			},
			notes: 'High priority client'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing label', () => {
		const result = caseCreateSchema.safeParse({
			loan: { type: 'Home Loan' }
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('label');
		}
	});

	it('rejects missing loan.type', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Test Case',
			loan: {}
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths.some((p) => p.startsWith('loan'))).toBe(true);
		}
	});

	it('rejects empty label (min 1 char)', () => {
		const result = caseCreateSchema.safeParse({
			label: '',
			loan: { type: 'Home Loan' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty loan.type (min 1 char)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Test',
			loan: { type: '' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid stage value in full caseSchema', () => {
		const result = caseSchema.safeParse({
			...minimalCase(),
			stage: 'invalid_stage'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('stage');
		}
	});

	it('accepts optional_contact with all fields', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Contact Case',
			loan: { type: 'LAP' },
			optional_contact: {
				full_name: 'Suresh',
				mobile: '9988776655',
				email: 'suresh@example.com'
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts optional_contact with partial fields', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Partial Contact',
			loan: { type: 'LAP' },
			optional_contact: {
				full_name: 'Suresh'
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts source with type and label', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Source Case',
			loan: { type: 'Home Loan' },
			source: {
				type: 'builder',
				label: 'DLF Ltd'
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects negative loan.amount_required', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Negative Amt',
			loan: { type: 'Home Loan', amount_required: -100000 }
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths.some((p) => p.includes('amount_required'))).toBe(true);
		}
	});

	it('rejects zero loan.amount_required (must be positive)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Zero Amt',
			loan: { type: 'Home Loan', amount_required: 0 }
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid email in optional_contact', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Bad Email',
			loan: { type: 'Home Loan' },
			optional_contact: { email: 'not-an-email' }
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid source.type enum value', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Bad Source',
			loan: { type: 'Home Loan' },
			source: { type: 'invalid_source' }
		});
		expect(result.success).toBe(false);
	});

	it('accepts all valid source type values', () => {
		const validTypes = ['walk-in', 'builder', 'ca', 'referral', 'online', 'broker', 'self'];
		for (const type of validTypes) {
			const result = caseCreateSchema.safeParse({
				label: 'Source Test',
				loan: { type: 'Home Loan' },
				source: { type }
			});
			expect(result.success, `source.type "${type}" should be valid`).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// caseStageEnum
// ═══════════════════════════════════════════════════════════════

describe('caseStageEnum', () => {
	const validStages = [
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
	];

	it('accepts all valid stage values', () => {
		for (const stage of validStages) {
			const result = caseStageEnum.safeParse(stage);
			expect(result.success, `stage "${stage}" should be valid`).toBe(true);
		}
	});

	it('rejects invalid stage value', () => {
		const result = caseStageEnum.safeParse('approval');
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderApplicationSchema
// ═══════════════════════════════════════════════════════════════

describe('lenderApplicationSchema', () => {
	it('accepts minimal lender application', () => {
		const result = lenderApplicationSchema.safeParse(minimalLenderApplication());
		expect(result.success).toBe(true);
	});

	it('accepts full lender application with tracking, sanction, disbursement', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			status: 'disbursed',
			lender_tracking: {
				login_number: 'LOG-12345',
				login_date: NOW,
				technical_status: 'positive',
				legal_status: 'clear',
				credit_approval: 'approved',
				conditions: ['Insurance required']
			},
			sanction: {
				amount: 5000000,
				roi: 8.5,
				tenure_months: 240,
				sanction_date: NOW,
				sanction_letter_ref: 'SL-2024-001',
				conditions: ['Property insurance']
			},
			disbursement: {
				total_amount: 5000000,
				tranches: [
					{ tranche_number: 1, amount: 3000000, date: NOW, reference: 'TR-001' },
					{ tranche_number: 2, amount: 2000000, date: NOW }
				]
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing lender_name', () => {
		const { lender_name, ...noName } = minimalLenderApplication();
		const result = lenderApplicationSchema.safeParse(noName);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('lender_name');
		}
	});

	it('rejects missing lender_application_id', () => {
		const { lender_application_id, ...noId } = minimalLenderApplication();
		const result = lenderApplicationSchema.safeParse(noId);
		expect(result.success).toBe(false);
	});

	it('accepts with queries array', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			queries: [
				{
					query_id: 'q-001',
					query_text: 'Please provide latest ITR',
					category: 'document',
					raised_at: NOW,
					status: 'open',
					days_open: 3
				}
			]
		});
		expect(result.success).toBe(true);
	});

	it('accepts with document_checklist', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			document_checklist: [
				{
					doc_id: 'doc-001',
					doc_name: 'PAN Card',
					category: 'identity',
					is_mandatory: true,
					status: 'received'
				}
			]
		});
		expect(result.success).toBe(true);
	});

	it('accepts with eligibility_snapshot', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			eligibility_snapshot: {
				traffic_light: 'green',
				message: 'Highly eligible',
				computed_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts with rejection details', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			status: 'rejected',
			rejection: {
				reason_category: 'credit_score',
				reason_detail: 'CIBIL below threshold',
				rejection_date: NOW,
				reroute_suggestions: ['Try ICICI', 'Try Axis Bank']
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid lender_app status', () => {
		const result = lenderApplicationSchema.safeParse({
			...minimalLenderApplication(),
			status: 'invalid_status'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// documentChecklistItemSchema
// ═══════════════════════════════════════════════════════════════

describe('documentChecklistItemSchema', () => {
	const baseDoc = {
		doc_id: 'doc-001',
		doc_name: 'PAN Card',
		category: 'identity',
		is_mandatory: true
	};

	it('accepts all valid statuses', () => {
		const statuses = ['not_started', 'requested', 'received', 'uploaded', 'not_applicable'];
		for (const status of statuses) {
			const result = documentChecklistItemSchema.safeParse({ ...baseDoc, status });
			expect(result.success, `status "${status}" should be valid`).toBe(true);
		}
	});

	it('accepts with upload details', () => {
		const result = documentChecklistItemSchema.safeParse({
			...baseDoc,
			status: 'uploaded',
			upload: {
				file_url: 'https://storage.example.com/pan.pdf',
				file_id: 'file-001',
				file_type: 'application/pdf',
				file_size: 102400,
				uploaded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts with validity tracking', () => {
		const result = documentChecklistItemSchema.safeParse({
			...baseDoc,
			status: 'received',
			validity: {
				valid_from: '2024-01-01',
				valid_until: '2025-01-01',
				is_fresh: true,
				freshness_rule_days: 90
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects unknown status', () => {
		const result = documentChecklistItemSchema.safeParse({
			...baseDoc,
			status: 'verified'
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing doc_id', () => {
		const { doc_id, ...noId } = baseDoc;
		const result = documentChecklistItemSchema.safeParse({ ...noId, status: 'not_started' });
		expect(result.success).toBe(false);
	});

	it('rejects missing doc_name', () => {
		const { doc_name, ...noName } = baseDoc;
		const result = documentChecklistItemSchema.safeParse({ ...noName, status: 'not_started' });
		expect(result.success).toBe(false);
	});

	it('rejects upload with zero file_size (must be positive)', () => {
		const result = documentChecklistItemSchema.safeParse({
			...baseDoc,
			status: 'uploaded',
			upload: {
				file_url: 'https://storage.example.com/pan.pdf',
				file_id: 'file-001',
				file_type: 'application/pdf',
				file_size: 0,
				uploaded_at: NOW
			}
		});
		expect(result.success).toBe(false);
	});

	it('accepts all document categories', () => {
		const categories = ['identity', 'income', 'property', 'lender_specific', 'other'];
		for (const category of categories) {
			const result = documentChecklistItemSchema.safeParse({
				...baseDoc,
				category,
				status: 'not_started'
			});
			expect(result.success, `category "${category}" should be valid`).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderQuerySchema
// ═══════════════════════════════════════════════════════════════

describe('lenderQuerySchema', () => {
	const baseQuery = {
		query_id: 'q-001',
		query_text: 'Please provide latest ITR',
		category: 'document',
		raised_at: NOW,
		status: 'open',
		days_open: 3
	};

	it('accepts valid open query', () => {
		const result = lenderQuerySchema.safeParse(baseQuery);
		expect(result.success).toBe(true);
	});

	it('accepts query with response', () => {
		const result = lenderQuerySchema.safeParse({
			...baseQuery,
			status: 'responded',
			response: {
				text: 'ITR uploaded for AY 2023-24',
				attachments: ['https://storage.example.com/itr.pdf'],
				responded_at: NOW
			}
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing query_text', () => {
		const { query_text, ...noText } = baseQuery;
		const result = lenderQuerySchema.safeParse(noText);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('query_text');
		}
	});

	it('rejects empty query_text', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery, query_text: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing query_id', () => {
		const { query_id, ...noId } = baseQuery;
		const result = lenderQuerySchema.safeParse(noId);
		expect(result.success).toBe(false);
	});

	it('rejects negative days_open', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery, days_open: -1 });
		expect(result.success).toBe(false);
	});

	it('accepts all valid query categories', () => {
		const categories = [
			'document',
			'clarification',
			'additional_info',
			'technical',
			'legal',
			'other'
		];
		for (const category of categories) {
			const result = lenderQuerySchema.safeParse({ ...baseQuery, category });
			expect(result.success, `category "${category}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid query statuses', () => {
		const statuses = ['open', 'responded', 'resolved'];
		for (const status of statuses) {
			const result = lenderQuerySchema.safeParse({ ...baseQuery, status });
			expect(result.success, `status "${status}" should be valid`).toBe(true);
		}
	});

	it('rejects invalid query category', () => {
		const result = lenderQuerySchema.safeParse({ ...baseQuery, category: 'unknown' });
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// fileConfigSchema
// ═══════════════════════════════════════════════════════════════

describe('fileConfigSchema', () => {
	function validFileConfig() {
		return {
			source_payload_hash: 'abc123hash',
			source_snapshot_version: 1,
			sections_visibility: { income: true, obligations: false },
			display_mode: {
				income: 'consolidated',
				obligations: 'detailed',
				applicants: 'individual'
			},
			dsa_notes: { income: 'Verified with employer' },
			section_order: ['income', 'obligations', 'property'],
			pii_mode: 'stripped',
			updated_at: NOW
		};
	}

	it('accepts valid full config with all display modes', () => {
		const result = fileConfigSchema.safeParse(validFileConfig());
		expect(result.success).toBe(true);
	});

	it('accepts pii_mode "included"', () => {
		const result = fileConfigSchema.safeParse({
			...validFileConfig(),
			pii_mode: 'included'
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid pii_mode', () => {
		const result = fileConfigSchema.safeParse({
			...validFileConfig(),
			pii_mode: 'masked'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('pii_mode');
		}
	});

	it('accepts with custom section order', () => {
		const result = fileConfigSchema.safeParse({
			...validFileConfig(),
			section_order: ['property', 'income', 'obligations', 'identity', 'lender_specific']
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing source_payload_hash', () => {
		const { source_payload_hash, ...noHash } = validFileConfig();
		const result = fileConfigSchema.safeParse(noHash);
		expect(result.success).toBe(false);
	});

	it('rejects invalid display_mode.income', () => {
		const cfg = validFileConfig();
		cfg.display_mode.income = 'summary' as any;
		const result = fileConfigSchema.safeParse(cfg);
		expect(result.success).toBe(false);
	});

	it('rejects invalid display_mode.applicants', () => {
		const cfg = validFileConfig();
		cfg.display_mode.applicants = 'grouped' as any;
		const result = fileConfigSchema.safeParse(cfg);
		expect(result.success).toBe(false);
	});

	it('rejects zero source_snapshot_version (must be positive)', () => {
		const result = fileConfigSchema.safeParse({
			...validFileConfig(),
			source_snapshot_version: 0
		});
		expect(result.success).toBe(false);
	});

	it('accepts all valid income modes', () => {
		for (const mode of ['consolidated', 'detailed']) {
			const cfg = validFileConfig();
			cfg.display_mode.income = mode as any;
			const result = fileConfigSchema.safeParse(cfg);
			expect(result.success, `income mode "${mode}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid obligations modes', () => {
		for (const mode of ['consolidated', 'detailed']) {
			const cfg = validFileConfig();
			cfg.display_mode.obligations = mode as any;
			const result = fileConfigSchema.safeParse(cfg);
			expect(result.success, `obligations mode "${mode}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid applicants modes', () => {
		for (const mode of ['consolidated', 'individual']) {
			const cfg = validFileConfig();
			cfg.display_mode.applicants = mode as any;
			const result = fileConfigSchema.safeParse(cfg);
			expect(result.success, `applicants mode "${mode}" should be valid`).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// caseUpdateSchema
// ═══════════════════════════════════════════════════════════════

describe('caseUpdateSchema', () => {
	it('accepts empty object (all fields optional)', () => {
		const result = caseUpdateSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts partial update with just label', () => {
		const result = caseUpdateSchema.safeParse({ label: 'Updated Label' });
		expect(result.success).toBe(true);
	});

	it('accepts partial update with stage', () => {
		const result = caseUpdateSchema.safeParse({ stage: 'profiling' });
		expect(result.success).toBe(true);
	});

	it('rejects empty label (min 1 char)', () => {
		const result = caseUpdateSchema.safeParse({ label: '' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid stage in update', () => {
		const result = caseUpdateSchema.safeParse({ stage: 'invalid_stage' });
		expect(result.success).toBe(false);
	});
});
