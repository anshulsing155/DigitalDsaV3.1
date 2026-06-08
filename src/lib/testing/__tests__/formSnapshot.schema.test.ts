import { describe, it, expect } from 'vitest';
import { formSnapshotSchema, formSnapshotCreateSchema } from '$lib/schemas/formSnapshot.schema';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function fullSnapshot() {
	return {
		case_id: 'case-001',
		version: 1,
		payload: {
			applicant_name: 'Ramesh Kumar',
			loan_amount: 5000000,
			employment_type: 'salaried'
		},
		payload_hash: 'sha256:abc123def456',
		created_by: 'dsa-001',
		created_at: NOW,
		change_summary: 'Initial submission with all applicant details'
	};
}

// ═══════════════════════════════════════════════════════════════
// formSnapshotSchema
// ═══════════════════════════════════════════════════════════════

describe('formSnapshotSchema', () => {
	it('accepts valid snapshot with payload and hash', () => {
		const result = formSnapshotSchema.safeParse(fullSnapshot());
		expect(result.success).toBe(true);
	});

	it('accepts snapshot without optional fields (_id, change_summary)', () => {
		const { change_summary, ...noSummary } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noSummary);
		expect(result.success).toBe(true);
	});

	it('accepts snapshot with _id', () => {
		const result = formSnapshotSchema.safeParse({
			...fullSnapshot(),
			_id: 'snapshot-001'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing payload_hash', () => {
		const { payload_hash, ...noHash } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noHash);
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('payload_hash');
		}
	});

	it('rejects empty payload_hash', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), payload_hash: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing case_id', () => {
		const { case_id, ...noCaseId } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noCaseId);
		expect(result.success).toBe(false);
	});

	it('rejects empty case_id', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), case_id: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing version', () => {
		const { version, ...noVersion } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noVersion);
		expect(result.success).toBe(false);
	});

	it('rejects zero version (must be positive)', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), version: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects negative version', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), version: -1 });
		expect(result.success).toBe(false);
	});

	it('rejects non-integer version', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), version: 1.5 });
		expect(result.success).toBe(false);
	});

	it('rejects missing payload', () => {
		const { payload, ...noPayload } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noPayload);
		expect(result.success).toBe(false);
	});

	it('rejects missing created_by', () => {
		const { created_by, ...noCreatedBy } = fullSnapshot();
		const result = formSnapshotSchema.safeParse(noCreatedBy);
		expect(result.success).toBe(false);
	});

	it('rejects empty created_by', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), created_by: '' });
		expect(result.success).toBe(false);
	});

	it('accepts with change_summary', () => {
		const result = formSnapshotSchema.safeParse({
			...fullSnapshot(),
			change_summary: 'Updated income details and added co-applicant'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.change_summary).toBe('Updated income details and added co-applicant');
		}
	});

	it('coerces string date to Date in created_at', () => {
		const result = formSnapshotSchema.safeParse(fullSnapshot());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.created_at).toBeInstanceOf(Date);
		}
	});

	it('accepts empty payload object', () => {
		const result = formSnapshotSchema.safeParse({ ...fullSnapshot(), payload: {} });
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// formSnapshotCreateSchema
// ═══════════════════════════════════════════════════════════════

describe('formSnapshotCreateSchema', () => {
	it('accepts valid creation payload', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001',
			payload: { applicant_name: 'Ramesh', loan_type: 'Home Loan' }
		});
		expect(result.success).toBe(true);
	});

	it('accepts creation payload with change_summary', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001',
			payload: { applicant_name: 'Ramesh' },
			change_summary: 'Initial form fill'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing case_id in creation', () => {
		const result = formSnapshotCreateSchema.safeParse({
			payload: { applicant_name: 'Ramesh' }
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path.join('.'));
			expect(paths).toContain('case_id');
		}
	});

	it('rejects missing payload in creation', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001'
		});
		expect(result.success).toBe(false);
	});

	it('does not require version (server-generated)', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001',
			payload: {}
		});
		expect(result.success).toBe(true);
	});

	it('does not require payload_hash (server-generated)', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001',
			payload: { some: 'data' }
		});
		expect(result.success).toBe(true);
	});

	it('does not require created_by (server-generated)', () => {
		const result = formSnapshotCreateSchema.safeParse({
			case_id: 'case-001',
			payload: { some: 'data' }
		});
		expect(result.success).toBe(true);
	});
});
