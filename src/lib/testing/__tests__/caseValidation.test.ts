import { describe, it, expect } from 'vitest';
import {
	caseSchema,
	caseCreateSchema,
	caseUpdateSchema,
	caseStageEnum,
	lenderAppStatusEnum,
	lenderQuerySchema,
	lenderApplicationSchema,
	stageTransitionSchema,
	statusTransitionSchema,
	queryCategoryEnum,
	queryStatusEnum,
	sourceTypeEnum,
	documentCategoryEnum,
	documentStatusEnum,
	trafficLightEnum
} from '$lib/schemas/case.schema.js';

// ═══════════════════════════════════════════════════════════════
// Helpers — reusable fixtures
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function minimalValidCase() {
	return {
		case_id: 'HL-2026-0001',
		dsa_id: 'dsa-001',
		label: 'Ramesh Home Loan',
		loan: { type: 'Home Loan' },
		stage: 'intake' as const,
		stage_history: [],
		lender_applications: [],
		created_at: NOW,
		updated_at: NOW,
		is_archived: false,
		is_sample: false
	};
}

// ═══════════════════════════════════════════════════════════════
// caseSchema — full case validation (complements case.schema.test.ts)
// ═══════════════════════════════════════════════════════════════

describe('caseSchema — full case document validation', () => {
	it('accepts a minimal valid full case', () => {
		const result = caseSchema.safeParse(minimalValidCase());
		expect(result.success).toBe(true);
	});

	it('accepts a case with all optional fields populated', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			_id: 'mongo-id-123',
			form_submission_id: 'sub-001',
			form_snapshot_version: 3,
			form_snapshot_hash: 'abc123def456',
			primary_lender_id: 'lender-hdfc',
			optional_contact: {
				full_name: 'Ramesh Kumar',
				mobile: '9876543210',
				email: 'ramesh@example.com'
			},
			source: {
				type: 'referral',
				label: 'Builder XYZ',
				source_contact_id: 'src-001'
			},
			notes: 'VIP client, handle with care'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing case_id', () => {
		const { case_id, ...noCaseId } = minimalValidCase();
		const result = caseSchema.safeParse(noCaseId);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('case_id');
		}
	});

	it('rejects empty case_id', () => {
		const result = caseSchema.safeParse({ ...minimalValidCase(), case_id: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing dsa_id', () => {
		const { dsa_id, ...noDsa } = minimalValidCase();
		const result = caseSchema.safeParse(noDsa);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('dsa_id');
		}
	});

	it('rejects missing is_archived', () => {
		const { is_archived, ...noArchived } = minimalValidCase();
		const result = caseSchema.safeParse(noArchived);
		expect(result.success).toBe(false);
	});

	it('rejects missing is_sample', () => {
		const { is_sample, ...noSample } = minimalValidCase();
		const result = caseSchema.safeParse(noSample);
		expect(result.success).toBe(false);
	});

	it('rejects missing created_at', () => {
		const { created_at, ...noCreated } = minimalValidCase();
		const result = caseSchema.safeParse(noCreated);
		expect(result.success).toBe(false);
	});

	it('rejects missing updated_at', () => {
		const { updated_at, ...noUpdated } = minimalValidCase();
		const result = caseSchema.safeParse(noUpdated);
		expect(result.success).toBe(false);
	});

	it('coerces string dates to Date objects', () => {
		const result = caseSchema.safeParse(minimalValidCase());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.created_at).toBeInstanceOf(Date);
			expect(result.data.updated_at).toBeInstanceOf(Date);
		}
	});

	it('rejects missing label in full case', () => {
		const { label, ...noLabel } = minimalValidCase();
		const result = caseSchema.safeParse(noLabel);
		expect(result.success).toBe(false);
	});

	it('rejects missing loan object in full case', () => {
		const { loan, ...noLoan } = minimalValidCase();
		const result = caseSchema.safeParse(noLoan);
		expect(result.success).toBe(false);
	});

	it('rejects missing loan.type in full case', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			loan: {}
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// caseStageEnum — all 11 stages (comprehensive enumeration)
// ═══════════════════════════════════════════════════════════════

describe('caseStageEnum — comprehensive stage validation', () => {
	const ALL_VALID_STAGES = [
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

	it.each(ALL_VALID_STAGES)('accepts valid stage: %s', (stage) => {
		const result = caseStageEnum.safeParse(stage);
		expect(result.success).toBe(true);
	});

	it.each([
		'approval',
		'pending',
		'active',
		'complete',
		'in_progress',
		'cancelled',
		'on_hold',
		'',
		'INTAKE',
		'Intake'
	])('rejects invalid stage: %s', (stage) => {
		const result = caseStageEnum.safeParse(stage);
		expect(result.success).toBe(false);
	});

	it('rejects null', () => {
		expect(caseStageEnum.safeParse(null).success).toBe(false);
	});

	it('rejects undefined', () => {
		expect(caseStageEnum.safeParse(undefined).success).toBe(false);
	});

	it('rejects numeric value', () => {
		expect(caseStageEnum.safeParse(1).success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// lenderAppStatusEnum — all 11 statuses
// ═══════════════════════════════════════════════════════════════

describe('lenderAppStatusEnum — comprehensive status validation', () => {
	const ALL_VALID_STATUSES = [
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
	];

	it('accepts exactly 11 valid statuses', () => {
		let passCount = 0;
		for (const status of ALL_VALID_STATUSES) {
			const result = lenderAppStatusEnum.safeParse(status);
			if (result.success) passCount++;
		}
		expect(passCount).toBe(11);
	});

	it.each(ALL_VALID_STATUSES)('accepts valid status: %s', (status) => {
		const result = lenderAppStatusEnum.safeParse(status);
		expect(result.success).toBe(true);
	});

	it.each(['pending', 'approved', 'cancelled', 'active', '', 'SELECTED', 'Selected'])(
		'rejects invalid status: %s',
		(status) => {
			const result = lenderAppStatusEnum.safeParse(status);
			expect(result.success).toBe(false);
		}
	);
});

// ═══════════════════════════════════════════════════════════════
// caseCreateSchema — loan amount and tenure edge cases
// ═══════════════════════════════════════════════════════════════

describe('caseCreateSchema — loan field edge cases', () => {
	it('accepts large loan amount', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Big Loan',
			loan: { type: 'Home Loan', amount_required: 500000000 }
		});
		expect(result.success).toBe(true);
	});

	it('accepts small positive loan amount', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Small Loan',
			loan: { type: 'Gold Loan', amount_required: 1 }
		});
		expect(result.success).toBe(true);
	});

	it('rejects string loan amount', () => {
		const result = caseCreateSchema.safeParse({
			label: 'String Amt',
			loan: { type: 'Home Loan', amount_required: '5000000' }
		});
		expect(result.success).toBe(false);
	});

	it('accepts positive integer tenure_years', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Tenure Test',
			loan: { type: 'Home Loan', tenure_years: 30 }
		});
		expect(result.success).toBe(true);
	});

	it('rejects zero tenure_years (must be positive)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Zero Tenure',
			loan: { type: 'Home Loan', tenure_years: 0 }
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative tenure_years', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Neg Tenure',
			loan: { type: 'Home Loan', tenure_years: -5 }
		});
		expect(result.success).toBe(false);
	});

	it('rejects fractional tenure_years (must be integer)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Frac Tenure',
			loan: { type: 'Home Loan', tenure_years: 2.5 }
		});
		expect(result.success).toBe(false);
	});

	it('accepts case with only label and loan.type (all other fields truly optional)', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Minimal Case',
			loan: { type: 'Personal Loan' }
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.optional_contact).toBeUndefined();
			expect(result.data.source).toBeUndefined();
			expect(result.data.notes).toBeUndefined();
			expect(result.data.loan.amount_required).toBeUndefined();
			expect(result.data.loan.tenure_years).toBeUndefined();
			expect(result.data.loan.purpose).toBeUndefined();
		}
	});

	it('accepts purpose as any string', () => {
		const result = caseCreateSchema.safeParse({
			label: 'Purpose Case',
			loan: { type: 'Personal Loan', purpose: 'Marriage expenses and renovation' }
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// stageTransitionSchema — transition record validation
// ═══════════════════════════════════════════════════════════════

describe('stageTransitionSchema — stage history entries', () => {
	it('accepts valid stage transition record', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'intake',
			to: 'profiling',
			timestamp: NOW
		});
		expect(result.success).toBe(true);
	});

	it('accepts transition with notes', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'processing',
			to: 'rejected',
			timestamp: NOW,
			notes: 'CIBIL score too low'
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid from stage', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'invalid_stage',
			to: 'profiling',
			timestamp: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid to stage', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'intake',
			to: 'invalid_stage',
			timestamp: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing timestamp', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'intake',
			to: 'profiling'
		});
		expect(result.success).toBe(false);
	});

	it('coerces string timestamp to Date', () => {
		const result = stageTransitionSchema.safeParse({
			from: 'intake',
			to: 'profiling',
			timestamp: '2026-01-15T10:30:00Z'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.timestamp).toBeInstanceOf(Date);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// statusTransitionSchema — lender status history entries
// ═══════════════════════════════════════════════════════════════

describe('statusTransitionSchema — lender status history entries', () => {
	it('accepts valid status transition record', () => {
		const result = statusTransitionSchema.safeParse({
			from: 'selected',
			to: 'file_building',
			timestamp: NOW
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid from status', () => {
		const result = statusTransitionSchema.safeParse({
			from: 'invalid',
			to: 'file_building',
			timestamp: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid to status', () => {
		const result = statusTransitionSchema.safeParse({
			from: 'selected',
			to: 'invalid',
			timestamp: NOW
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// caseSchema — stage_history array validation
// ═══════════════════════════════════════════════════════════════

describe('caseSchema — stage_history array in full case', () => {
	it('accepts case with populated stage_history', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			stage: 'profiling',
			stage_history: [
				{
					from: 'intake',
					to: 'profiling',
					timestamp: NOW,
					notes: 'Profiling started'
				}
			]
		});
		expect(result.success).toBe(true);
	});

	it('accepts case with multiple stage history entries', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			stage: 'submitted',
			stage_history: [
				{ from: 'intake', to: 'profiling', timestamp: '2026-01-01T10:00:00Z' },
				{ from: 'profiling', to: 'file_building', timestamp: '2026-01-05T10:00:00Z' },
				{ from: 'file_building', to: 'submitted', timestamp: '2026-01-10T10:00:00Z' }
			]
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid stage in stage_history entry', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			stage_history: [
				{
					from: 'intake',
					to: 'bad_stage',
					timestamp: NOW
				}
			]
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// caseSchema — form_snapshot_version validation
// ═══════════════════════════════════════════════════════════════

describe('caseSchema — form_snapshot_version field', () => {
	it('accepts positive integer form_snapshot_version', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			form_snapshot_version: 5
		});
		expect(result.success).toBe(true);
	});

	it('rejects zero form_snapshot_version', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			form_snapshot_version: 0
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative form_snapshot_version', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			form_snapshot_version: -1
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-integer form_snapshot_version', () => {
		const result = caseSchema.safeParse({
			...minimalValidCase(),
			form_snapshot_version: 2.5
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// caseUpdateSchema — additional edge cases
// ═══════════════════════════════════════════════════════════════

describe('caseUpdateSchema — additional edge cases', () => {
	it('accepts update with is_archived set to true', () => {
		const result = caseUpdateSchema.safeParse({ is_archived: true });
		expect(result.success).toBe(true);
	});

	it('accepts update with is_sample set to true', () => {
		const result = caseUpdateSchema.safeParse({ is_sample: true });
		expect(result.success).toBe(true);
	});

	it('accepts update with primary_lender_id', () => {
		const result = caseUpdateSchema.safeParse({ primary_lender_id: 'lender-001' });
		expect(result.success).toBe(true);
	});

	it('accepts combined update with multiple fields', () => {
		const result = caseUpdateSchema.safeParse({
			label: 'Updated Label',
			stage: 'profiling',
			notes: 'Reviewed and moving forward',
			loan: { amount_required: 8000000 }
		});
		expect(result.success).toBe(true);
	});

	it('rejects negative amount_required in update', () => {
		const result = caseUpdateSchema.safeParse({
			loan: { amount_required: -500 }
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid source.type in update', () => {
		const result = caseUpdateSchema.safeParse({
			source: { type: 'telemarketing' }
		});
		expect(result.success).toBe(false);
	});

	it('accepts all valid stage values in update', () => {
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
		for (const stage of validStages) {
			const result = caseUpdateSchema.safeParse({ stage });
			expect(result.success, `stage "${stage}" should be valid in update`).toBe(true);
		}
	});
});

// ═══════════════════════════════════════════════════════════════
// sourceTypeEnum — comprehensive validation
// ═══════════════════════════════════════════════════════════════

describe('sourceTypeEnum — all source types', () => {
	const ALL_VALID_SOURCE_TYPES = [
		'walk-in',
		'builder',
		'ca',
		'referral',
		'online',
		'broker',
		'self'
	];

	it.each(ALL_VALID_SOURCE_TYPES)('accepts valid source type: %s', (type) => {
		const result = sourceTypeEnum.safeParse(type);
		expect(result.success).toBe(true);
	});

	it.each(['direct', 'social_media', 'advertisement', '', 'WALK-IN', 'Walk-in'])(
		'rejects invalid source type: %s',
		(type) => {
			const result = sourceTypeEnum.safeParse(type);
			expect(result.success).toBe(false);
		}
	);
});

// ═══════════════════════════════════════════════════════════════
// trafficLightEnum — eligibility snapshot values
// ═══════════════════════════════════════════════════════════════

describe('trafficLightEnum — eligibility traffic light values', () => {
	it.each(['green', 'amber', 'red', 'grey'])('accepts valid traffic light: %s', (value) => {
		const result = trafficLightEnum.safeParse(value);
		expect(result.success).toBe(true);
	});

	it.each(['yellow', 'orange', 'blue', ''])('rejects invalid traffic light: %s', (value) => {
		const result = trafficLightEnum.safeParse(value);
		expect(result.success).toBe(false);
	});
});
