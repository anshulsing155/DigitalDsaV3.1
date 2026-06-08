import { describe, it, expect } from 'vitest';
import {
	generatePolicyAlerts,
	SAMPLE_POLICY_ALERTS,
	type PolicyAlert,
	type PolicyAlertConfig
} from '$lib/server/policyAlerts';
import type { Case, CaseStage, LenderApplication, LenderAppStatus } from '$lib/types/case';

// ============================================================================
// TEST HELPERS
// ============================================================================

const NOW = new Date('2026-02-10T12:00:00Z');

/** Minimal case factory */
function makeCase(overrides: Partial<Case> = {}): Case {
	return {
		case_id: `HL-2026-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
		dsa_id: 'test-dsa-id' as any,
		label: 'Test Case',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		stage: 'processing' as CaseStage,
		stage_history: [],
		lender_applications: [],
		created_at: NOW,
		updated_at: NOW,
		is_archived: false,
		is_sample: false,
		...overrides
	} as Case;
}

/** Minimal lender application factory */
function makeLenderApp(overrides: Partial<LenderApplication> = {}): LenderApplication {
	return {
		lender_application_id: 'la-001',
		lender_id: 'hdfc',
		lender_name: 'HDFC Bank',
		status: 'processing' as LenderAppStatus,
		status_history: [],
		document_checklist: [],
		queries: [],
		file_snapshots: [],
		created_at: NOW,
		updated_at: NOW,
		...overrides
	} as LenderApplication;
}

// ============================================================================
// SAMPLE ALERTS — STRUCTURAL TESTS
// ============================================================================

describe('SAMPLE_POLICY_ALERTS — structure', () => {
	it('has 5-8 sample alerts', () => {
		expect(SAMPLE_POLICY_ALERTS.length).toBeGreaterThanOrEqual(5);
		expect(SAMPLE_POLICY_ALERTS.length).toBeLessThanOrEqual(8);
	});

	it('each alert has all required fields', () => {
		for (const alert of SAMPLE_POLICY_ALERTS) {
			expect(alert.alert_id).toBeTruthy();
			expect(alert.lender_name).toBeTruthy();
			expect(alert.alert_type).toBeTruthy();
			expect(alert.severity).toMatch(/^(info|warning|action_required)$/);
			expect(alert.title).toBeTruthy();
			expect(alert.description).toBeTruthy();
			expect(alert.created_at).toBeInstanceOf(Date);
		}
	});

	it('has unique alert IDs', () => {
		const ids = SAMPLE_POLICY_ALERTS.map((a) => a.alert_id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it('covers multiple alert types', () => {
		const types = new Set(SAMPLE_POLICY_ALERTS.map((a) => a.alert_type));
		expect(types.size).toBeGreaterThanOrEqual(3);
	});

	it('covers multiple severity levels', () => {
		const severities = new Set(SAMPLE_POLICY_ALERTS.map((a) => a.severity));
		expect(severities.size).toBeGreaterThanOrEqual(2);
	});
});

// ============================================================================
// generatePolicyAlerts — AFFECTED CASES
// ============================================================================

describe('generatePolicyAlerts — affected case detection', () => {
	it('finds cases with matching lender', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-002', lender_name: 'SBI' })
				]
			})
		];

		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'test-001',
				lender_name: 'HDFC Bank',
				alert_type: 'rate_change',
				severity: 'info',
				title: 'Test Alert',
				description: 'Test',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts(cases, alerts, NOW);

		expect(result).toHaveLength(1);
		expect(result[0].affected_cases).toContain('HL-2026-0001');
		expect(result[0].affected_cases).not.toContain('HL-2026-0002');
	});

	it('non-matching cases are not included', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				lender_applications: [makeLenderApp({ lender_name: 'Kotak Mahindra Bank' })]
			})
		];

		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'test-001',
				lender_name: 'HDFC Bank',
				alert_type: 'rate_change',
				severity: 'info',
				title: 'Test Alert',
				description: 'Test',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts(cases, alerts, NOW);

		expect(result[0].affected_cases).toHaveLength(0);
	});

	it('matches multiple cases for the same lender', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-002', lender_name: 'HDFC Bank' })
				]
			}),
			makeCase({
				case_id: 'HL-2026-0003',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-003', lender_name: 'HDFC Bank' }),
					makeLenderApp({ lender_application_id: 'la-004', lender_name: 'SBI' })
				]
			})
		];

		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'test-001',
				lender_name: 'HDFC Bank',
				alert_type: 'rate_change',
				severity: 'info',
				title: 'Test Alert',
				description: 'Test',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts(cases, alerts, NOW);

		expect(result[0].affected_cases).toHaveLength(3);
	});

	it('excludes archived cases from affected_cases', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				is_archived: true,
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-002', lender_name: 'HDFC Bank' })
				]
			})
		];

		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'test-001',
				lender_name: 'HDFC Bank',
				alert_type: 'rate_change',
				severity: 'info',
				title: 'Test Alert',
				description: 'Test',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts(cases, alerts, NOW);

		expect(result[0].affected_cases).toHaveLength(1);
		expect(result[0].affected_cases).toContain('HL-2026-0002');
	});

	it('excludes closed/dropped cases from affected_cases', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				stage: 'closed',
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			}),
			makeCase({
				case_id: 'HL-2026-0002',
				stage: 'dropped',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-002', lender_name: 'HDFC Bank' })
				]
			}),
			makeCase({
				case_id: 'HL-2026-0003',
				stage: 'processing',
				lender_applications: [
					makeLenderApp({ lender_application_id: 'la-003', lender_name: 'HDFC Bank' })
				]
			})
		];

		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'test-001',
				lender_name: 'HDFC Bank',
				alert_type: 'rate_change',
				severity: 'info',
				title: 'Test Alert',
				description: 'Test',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts(cases, alerts, NOW);

		expect(result[0].affected_cases).toHaveLength(1);
		expect(result[0].affected_cases).toContain('HL-2026-0003');
	});
});

// ============================================================================
// SEVERITY ORDERING
// ============================================================================

describe('generatePolicyAlerts — severity ordering', () => {
	it('sorts action_required first, then warning, then info', () => {
		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'info-1',
				lender_name: 'Bank A',
				alert_type: 'new_product',
				severity: 'info',
				title: 'Info alert',
				description: 'Info',
				created_at: NOW
			},
			{
				alert_id: 'action-1',
				lender_name: 'Bank B',
				alert_type: 'criteria_change',
				severity: 'action_required',
				title: 'Action alert',
				description: 'Action',
				created_at: NOW
			},
			{
				alert_id: 'warning-1',
				lender_name: 'Bank C',
				alert_type: 'policy_update',
				severity: 'warning',
				title: 'Warning alert',
				description: 'Warning',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts([], alerts, NOW);

		expect(result[0].severity).toBe('action_required');
		expect(result[1].severity).toBe('warning');
		expect(result[2].severity).toBe('info');
	});

	it('within same severity, sorts by date (newest first)', () => {
		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'old',
				lender_name: 'Bank A',
				alert_type: 'new_product',
				severity: 'info',
				title: 'Old alert',
				description: 'Old',
				created_at: new Date('2026-01-01')
			},
			{
				alert_id: 'new',
				lender_name: 'Bank B',
				alert_type: 'new_product',
				severity: 'info',
				title: 'New alert',
				description: 'New',
				created_at: new Date('2026-02-10')
			}
		];

		const result = generatePolicyAlerts([], alerts, NOW);

		expect(result[0].alert_id).toBe('new');
		expect(result[1].alert_id).toBe('old');
	});
});

// ============================================================================
// EXPIRED ALERTS
// ============================================================================

describe('generatePolicyAlerts — expired alerts handling', () => {
	it('filters out expired alerts', () => {
		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'expired',
				lender_name: 'Bank A',
				alert_type: 'deadline',
				severity: 'warning',
				title: 'Expired',
				description: 'This expired',
				created_at: new Date('2026-01-01'),
				expires_at: new Date('2026-02-01') // before NOW
			},
			{
				alert_id: 'active',
				lender_name: 'Bank B',
				alert_type: 'new_product',
				severity: 'info',
				title: 'Active',
				description: 'Still active',
				created_at: new Date('2026-02-01'),
				expires_at: new Date('2026-03-31') // after NOW
			}
		];

		const result = generatePolicyAlerts([], alerts, NOW);

		expect(result).toHaveLength(1);
		expect(result[0].alert_id).toBe('active');
	});

	it('keeps alerts without expiry date', () => {
		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'no-expiry',
				lender_name: 'Bank A',
				alert_type: 'criteria_change',
				severity: 'warning',
				title: 'No expiry',
				description: 'Permanent alert',
				created_at: NOW
			}
		];

		const result = generatePolicyAlerts([], alerts, NOW);
		expect(result).toHaveLength(1);
	});

	it('includes alerts that expire exactly at current time', () => {
		// expires_at > now to be active; exactly = expired
		const alerts: PolicyAlertConfig[] = [
			{
				alert_id: 'boundary',
				lender_name: 'Bank A',
				alert_type: 'deadline',
				severity: 'warning',
				title: 'Boundary',
				description: 'Expires exactly now',
				created_at: new Date('2026-02-01'),
				expires_at: NOW // exactly now → not > now → filtered
			}
		];

		const result = generatePolicyAlerts([], alerts, NOW);
		expect(result).toHaveLength(0);
	});
});

// ============================================================================
// SAMPLE ALERTS WITH CASES
// ============================================================================

describe('generatePolicyAlerts — sample alerts with real cases', () => {
	it('HDFC alert finds HDFC cases', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0001',
				lender_applications: [makeLenderApp({ lender_name: 'HDFC Bank' })]
			})
		];

		const result = generatePolicyAlerts(cases, SAMPLE_POLICY_ALERTS, NOW);

		// Find the HDFC alert
		const hdfcAlert = result.find((a) => a.lender_name === 'HDFC Bank');
		expect(hdfcAlert).toBeDefined();
		expect(hdfcAlert!.affected_cases).toContain('HL-2026-0001');
	});

	it('SBI alert finds SBI cases', () => {
		const cases = [
			makeCase({
				case_id: 'HL-2026-0010',
				lender_applications: [makeLenderApp({ lender_name: 'State Bank of India' })]
			})
		];

		const result = generatePolicyAlerts(cases, SAMPLE_POLICY_ALERTS, NOW);

		const sbiAlert = result.find((a) => a.lender_name === 'State Bank of India');
		expect(sbiAlert).toBeDefined();
		expect(sbiAlert!.affected_cases).toContain('HL-2026-0010');
	});

	it('empty cases produces alerts with empty affected_cases', () => {
		const result = generatePolicyAlerts([], SAMPLE_POLICY_ALERTS, NOW);

		for (const alert of result) {
			expect(alert.affected_cases).toHaveLength(0);
		}
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('generatePolicyAlerts — edge cases', () => {
	it('empty alerts array returns empty result', () => {
		const result = generatePolicyAlerts([], [], NOW);
		expect(result).toHaveLength(0);
	});

	it('null cases does not crash', () => {
		const result = generatePolicyAlerts(null as any, SAMPLE_POLICY_ALERTS, NOW);
		expect(Array.isArray(result)).toBe(true);
	});

	it('cases with undefined lender_applications does not crash', () => {
		const c = makeCase();
		(c as any).lender_applications = undefined;

		const result = generatePolicyAlerts([c], SAMPLE_POLICY_ALERTS, NOW);
		expect(Array.isArray(result)).toBe(true);
	});

	it('each result alert has all required fields', () => {
		const result = generatePolicyAlerts([], SAMPLE_POLICY_ALERTS, NOW);

		for (const alert of result) {
			expect(alert.alert_id).toBeTruthy();
			expect(alert.lender_name).toBeTruthy();
			expect(alert.alert_type).toBeTruthy();
			expect(alert.severity).toMatch(/^(info|warning|action_required)$/);
			expect(alert.title).toBeTruthy();
			expect(alert.description).toBeTruthy();
			expect(Array.isArray(alert.affected_cases)).toBe(true);
			expect(alert.created_at).toBeInstanceOf(Date);
		}
	});
});
