import { describe, it, expect } from 'vitest';
import { generateReminders } from '$lib/server/reminderEngine';
import type { Reminder } from '$lib/server/reminderEngine';
import type { Case, CaseStage, LenderApplication, LenderAppStatus } from '$lib/types/case';

// ============================================================================
// TEST HELPERS
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Create a date N days ago from a reference date */
function daysAgo(days: number, from?: Date): Date {
	const ref = from ?? new Date('2026-02-10T12:00:00Z');
	return new Date(ref.getTime() - days * MS_PER_DAY);
}

/** Minimal case factory */
function makeCase(overrides: Partial<Case> = {}): Case {
	const now = new Date('2026-02-10T12:00:00Z');
	return {
		case_id: 'HL-2026-0001',
		dsa_id: 'test-dsa-id' as any,
		label: 'Test Case',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		stage: 'intake' as CaseStage,
		stage_history: [{ from: 'intake', to: 'intake', timestamp: now, notes: 'Case created' }],
		lender_applications: [],
		created_at: now,
		updated_at: now,
		is_archived: false,
		is_sample: false,
		...overrides
	} as Case;
}

/** Minimal lender application factory */
function makeLenderApp(overrides: Partial<LenderApplication> = {}): LenderApplication {
	const now = new Date('2026-02-10T12:00:00Z');
	return {
		lender_application_id: 'la-001',
		lender_id: 'hdfc',
		lender_name: 'HDFC Bank',
		status: 'selected' as LenderAppStatus,
		status_history: [{ from: 'selected', to: 'selected', timestamp: now }],
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: now,
		updated_at: now,
		...overrides
	} as LenderApplication;
}

const NOW = new Date('2026-02-10T12:00:00Z');

// ============================================================================
// STAGE-BASED REMINDERS
// ============================================================================

describe('generateReminders — stage-based reminders', () => {
	it('intake > 3 days triggers "Move to profiling" (medium)', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(5) }]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_intake_stale'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
		expect(match!.title).toContain('profiling');
	});

	it('intake at 2 days does NOT trigger reminder', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(2) }]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_intake'));
		expect(match).toBeUndefined();
	});

	it('profiling > 5 days triggers "Complete profiling" (medium)', () => {
		const c = makeCase({
			stage: 'profiling',
			stage_history: [
				{ from: 'intake', to: 'intake', timestamp: daysAgo(10) },
				{ from: 'intake', to: 'profiling', timestamp: daysAgo(6) }
			]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_profiling_stale'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
	});

	it('file_building > 7 days triggers "Complete documentation" (medium)', () => {
		const c = makeCase({
			stage: 'file_building',
			stage_history: [
				{ from: 'intake', to: 'intake', timestamp: daysAgo(20) },
				{ from: 'profiling', to: 'file_building', timestamp: daysAgo(10) }
			]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_file_building_stale'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
	});

	it('submitted > 14 days triggers "Follow up" (high)', () => {
		const c = makeCase({
			stage: 'submitted',
			stage_history: [{ from: 'file_building', to: 'submitted', timestamp: daysAgo(15) }]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_submitted_followup'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
	});

	it('processing > 21 days triggers "Check on review status" (high)', () => {
		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(25) }]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_processing_followup'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
	});

	it('sanctioned > 7 days triggers "Process disbursement" (medium)', () => {
		const c = makeCase({
			stage: 'sanctioned',
			stage_history: [{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(10) }]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('stage_sanctioned_disburse'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
	});

	it('recently updated case does not trigger false reminders', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(1) }]
		});

		const reminders = generateReminders(c, NOW);
		const stageReminders = reminders.filter((r) => r.reminder_id.includes('stage_'));
		expect(stageReminders).toHaveLength(0);
	});
});

// ============================================================================
// LENDER-BASED REMINDERS
// ============================================================================

describe('generateReminders — lender-based reminders', () => {
	it('open query > 3 days triggers "Respond to lender query" (high)', () => {
		const la = makeLenderApp({
			status: 'query',
			status_history: [{ from: 'processing', to: 'query', timestamp: daysAgo(5) }],
			queries: [
				{
					query_id: 'q-001',
					query_text: 'Please provide latest salary slip',
					category: 'document',
					raised_at: daysAgo(5),
					status: 'open',
					days_open: 5
				}
			]
		});

		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(10) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('query_la-001_q-001'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
		expect(match!.title).toContain('Respond to lender query');
	});

	it('open query at 2 days does NOT trigger', () => {
		const la = makeLenderApp({
			status: 'query',
			status_history: [{ from: 'processing', to: 'query', timestamp: daysAgo(2) }],
			queries: [
				{
					query_id: 'q-001',
					query_text: 'Please provide latest salary slip',
					category: 'document',
					raised_at: daysAgo(2),
					status: 'open',
					days_open: 2
				}
			]
		});

		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(5) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('query_'));
		expect(match).toBeUndefined();
	});

	it('submitted lender app > 10 days without login number triggers tracking reminder', () => {
		const la = makeLenderApp({
			status: 'submitted',
			status_history: [{ from: 'ready', to: 'submitted', timestamp: daysAgo(12) }]
		});

		const c = makeCase({
			stage: 'submitted',
			stage_history: [{ from: 'file_building', to: 'submitted', timestamp: daysAgo(12) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('tracking_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
		expect(match!.title).toContain('login number');
	});

	it('submitted lender app with login number does NOT trigger tracking reminder', () => {
		const la = makeLenderApp({
			status: 'submitted',
			status_history: [{ from: 'ready', to: 'submitted', timestamp: daysAgo(12) }],
			lender_tracking: {
				login_number: 'LN-12345',
				login_date: daysAgo(11)
			}
		});

		const c = makeCase({
			stage: 'submitted',
			stage_history: [{ from: 'file_building', to: 'submitted', timestamp: daysAgo(12) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('tracking_'));
		expect(match).toBeUndefined();
	});

	it('processing with technical_status=negative triggers "Address technical issues" (high)', () => {
		const la = makeLenderApp({
			status: 'processing',
			status_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(5) }],
			lender_tracking: {
				technical_status: 'negative'
			}
		});

		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(5) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('tech_negative_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
	});

	it('processing with legal_status=not_clear triggers "Address legal issues" (high)', () => {
		const la = makeLenderApp({
			status: 'processing',
			status_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(5) }],
			lender_tracking: {
				legal_status: 'not_clear'
			}
		});

		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(5) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('legal_unclear_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
	});
});

// ============================================================================
// DOCUMENT-BASED REMINDERS
// ============================================================================

describe('generateReminders — document-based reminders', () => {
	it('mandatory doc not_started in file_building stage triggers high priority', () => {
		const la = makeLenderApp({
			status: 'file_building',
			status_history: [{ from: 'selected', to: 'file_building', timestamp: daysAgo(3) }],
			document_checklist: [
				{
					doc_id: 'doc-001',
					doc_name: 'PAN Card',
					category: 'identity',
					is_mandatory: true,
					status: 'not_started'
				}
			]
		});

		const c = makeCase({
			stage: 'file_building',
			stage_history: [{ from: 'profiling', to: 'file_building', timestamp: daysAgo(3) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('doc_missing_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
		expect(match!.title).toContain('PAN Card');
	});

	it('mandatory doc not_started in intake stage triggers medium priority', () => {
		const la = makeLenderApp({
			status: 'selected',
			status_history: [{ from: 'selected', to: 'selected', timestamp: daysAgo(1) }],
			document_checklist: [
				{
					doc_id: 'doc-001',
					doc_name: 'PAN Card',
					category: 'identity',
					is_mandatory: true,
					status: 'not_started'
				}
			]
		});

		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(1) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('doc_missing_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
	});

	it('document expiring within 15 days triggers medium priority', () => {
		const expiryDate = new Date(NOW.getTime() + 10 * MS_PER_DAY); // 10 days from now

		const la = makeLenderApp({
			status: 'submitted',
			status_history: [{ from: 'ready', to: 'submitted', timestamp: daysAgo(5) }],
			document_checklist: [
				{
					doc_id: 'doc-002',
					doc_name: 'Bank Statement',
					category: 'income',
					is_mandatory: true,
					status: 'uploaded',
					validity: {
						valid_from: daysAgo(20),
						valid_until: expiryDate,
						is_fresh: true,
						freshness_rule_days: 30
					}
				}
			]
		});

		const c = makeCase({
			stage: 'submitted',
			stage_history: [{ from: 'file_building', to: 'submitted', timestamp: daysAgo(5) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('doc_expiring_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('medium');
		expect(match!.title).toContain('Bank Statement');
	});

	it('expired document triggers high priority', () => {
		const expiryDate = daysAgo(5); // expired 5 days ago

		const la = makeLenderApp({
			status: 'submitted',
			status_history: [{ from: 'ready', to: 'submitted', timestamp: daysAgo(10) }],
			document_checklist: [
				{
					doc_id: 'doc-003',
					doc_name: 'Salary Slip',
					category: 'income',
					is_mandatory: true,
					status: 'uploaded',
					validity: {
						valid_from: daysAgo(35),
						valid_until: expiryDate,
						is_fresh: false,
						freshness_rule_days: 30
					}
				}
			]
		});

		const c = makeCase({
			stage: 'submitted',
			stage_history: [{ from: 'file_building', to: 'submitted', timestamp: daysAgo(10) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('doc_expired_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('high');
		expect(match!.title).toContain('Salary Slip');
		expect(match!.description).toContain('expired');
	});
});

// ============================================================================
// MILESTONE REMINDERS
// ============================================================================

describe('generateReminders — milestone celebrations', () => {
	it('all mandatory docs uploaded triggers "All documents ready" (low)', () => {
		const la = makeLenderApp({
			status: 'file_building',
			status_history: [{ from: 'selected', to: 'file_building', timestamp: daysAgo(3) }],
			document_checklist: [
				{
					doc_id: 'doc-001',
					doc_name: 'PAN Card',
					category: 'identity',
					is_mandatory: true,
					status: 'uploaded'
				},
				{
					doc_id: 'doc-002',
					doc_name: 'Aadhaar Card',
					category: 'identity',
					is_mandatory: true,
					status: 'received'
				},
				{
					doc_id: 'doc-003',
					doc_name: 'Optional Doc',
					category: 'other',
					is_mandatory: false,
					status: 'not_started'
				}
			]
		});

		const c = makeCase({
			stage: 'file_building',
			stage_history: [{ from: 'profiling', to: 'file_building', timestamp: daysAgo(3) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('milestone_docs_ready_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('low');
		expect(match!.type).toBe('milestone');
	});

	it('sanction received triggers congratulations milestone (low)', () => {
		const la = makeLenderApp({
			status: 'sanctioned',
			status_history: [{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(2) }],
			sanction: {
				amount: 5000000,
				roi: 8.5,
				tenure_months: 240,
				sanction_date: daysAgo(2)
			}
		});

		const c = makeCase({
			stage: 'sanctioned',
			stage_history: [{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(2) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		const match = reminders.find((r) => r.reminder_id.includes('milestone_sanctioned_'));
		expect(match).toBeDefined();
		expect(match!.priority).toBe('low');
		expect(match!.type).toBe('milestone');
		expect(match!.title).toContain('Congratulations');
	});
});

// ============================================================================
// PRIORITY ORDERING
// ============================================================================

describe('generateReminders — priority ordering', () => {
	it('high priority reminders come before medium and low', () => {
		// Build a case that triggers high, medium, and low reminders
		const la = makeLenderApp({
			lender_application_id: 'la-sort',
			status: 'sanctioned',
			status_history: [{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(2) }],
			sanction: {
				amount: 5000000,
				sanction_date: daysAgo(2)
			},
			document_checklist: [
				{
					doc_id: 'doc-expired',
					doc_name: 'Expired Doc',
					category: 'income',
					is_mandatory: true,
					status: 'uploaded',
					validity: {
						valid_from: daysAgo(60),
						valid_until: daysAgo(5),
						is_fresh: false,
						freshness_rule_days: 30
					}
				}
			]
		});

		const c = makeCase({
			stage: 'sanctioned',
			stage_history: [{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(10) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		expect(reminders.length).toBeGreaterThan(1);

		// Verify ordering: all high before medium, all medium before low
		let lastPriority = 'high';
		for (const r of reminders) {
			if (lastPriority === 'high' && r.priority !== 'high') {
				lastPriority = r.priority;
			}
			if (lastPriority === 'medium' && r.priority !== 'medium') {
				lastPriority = r.priority;
			}
			if (lastPriority === 'low') {
				expect(r.priority).toBe('low');
			}
		}

		// Ensure we have different priorities
		const priorities = new Set(reminders.map((r) => r.priority));
		expect(priorities.size).toBeGreaterThan(1);
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('generateReminders — edge cases', () => {
	it('empty case (no lender apps) does not crash', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(1) }],
			lender_applications: []
		});

		const reminders = generateReminders(c, NOW);
		expect(Array.isArray(reminders)).toBe(true);
	});

	it('archived case returns no reminders', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(30) }],
			is_archived: true
		});

		const reminders = generateReminders(c, NOW);
		expect(reminders).toHaveLength(0);
	});

	it('closed case returns no reminders', () => {
		const c = makeCase({
			stage: 'closed',
			stage_history: [{ from: 'disbursed', to: 'closed', timestamp: daysAgo(1) }]
		});

		const reminders = generateReminders(c, NOW);
		expect(reminders).toHaveLength(0);
	});

	it('case with undefined lender_applications does not crash', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: daysAgo(1) }]
		});
		// Force undefined
		(c as any).lender_applications = undefined;

		const reminders = generateReminders(c, NOW);
		expect(Array.isArray(reminders)).toBe(true);
	});

	it('case with empty stage_history does not crash', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: []
		});

		const reminders = generateReminders(c, NOW);
		expect(Array.isArray(reminders)).toBe(true);
	});

	it('all reminders have required fields', () => {
		const la = makeLenderApp({
			status: 'query',
			status_history: [{ from: 'processing', to: 'query', timestamp: daysAgo(5) }],
			queries: [
				{
					query_id: 'q-001',
					query_text: 'Provide docs',
					category: 'document',
					raised_at: daysAgo(5),
					status: 'open',
					days_open: 5
				}
			]
		});

		const c = makeCase({
			stage: 'processing',
			stage_history: [{ from: 'submitted', to: 'processing', timestamp: daysAgo(25) }],
			lender_applications: [la]
		});

		const reminders = generateReminders(c, NOW);
		for (const r of reminders) {
			expect(r.reminder_id).toBeTruthy();
			expect(r.type).toBeTruthy();
			expect(r.priority).toMatch(/^(high|medium|low)$/);
			expect(r.title).toBeTruthy();
			expect(r.description).toBeTruthy();
			expect(r.case_id).toBe('HL-2026-0001');
			expect(r.created_at).toBeInstanceOf(Date);
		}
	});

	it('now parameter is used for time calculations', () => {
		const c = makeCase({
			stage: 'intake',
			stage_history: [{ from: 'intake', to: 'intake', timestamp: new Date('2026-01-01T00:00:00Z') }]
		});

		// With now = Jan 3 (2 days later) → no reminder
		const remindersEarly = generateReminders(c, new Date('2026-01-03T00:00:00Z'));
		const earlyMatch = remindersEarly.find((r) => r.reminder_id.includes('stage_intake'));
		expect(earlyMatch).toBeUndefined();

		// With now = Jan 5 (4 days later) → reminder triggers
		const remindersLate = generateReminders(c, new Date('2026-01-05T00:00:00Z'));
		const lateMatch = remindersLate.find((r) => r.reminder_id.includes('stage_intake'));
		expect(lateMatch).toBeDefined();
	});
});
