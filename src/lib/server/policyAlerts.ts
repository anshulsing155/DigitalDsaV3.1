/**
 * Lender Policy Alerts — Phase 4.9
 * ══════════════════════════════════════════════════════════════════
 * Pure-function module: generates policy alerts and matches them
 * to affected cases based on lender names.
 * No database calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Case } from '$lib/types/case.js';

// ============================================================================
// TYPES
// ============================================================================

export type AlertType =
	| 'rate_change'
	| 'criteria_change'
	| 'new_product'
	| 'policy_update'
	| 'deadline';
export type AlertSeverity = 'info' | 'warning' | 'action_required';

export interface PolicyAlert {
	alert_id: string;
	lender_name: string;
	alert_type: AlertType;
	severity: AlertSeverity;
	title: string;
	description: string;
	affected_cases: string[]; // case_ids
	action_label?: string;
	created_at: Date;
	expires_at?: Date;
}

export interface PolicyAlertConfig {
	alert_id: string;
	lender_name: string;
	alert_type: AlertType;
	severity: AlertSeverity;
	title: string;
	description: string;
	action_label?: string;
	created_at: Date;
	expires_at?: Date;
}

// ============================================================================
// SEVERITY ORDERING
// ============================================================================

const SEVERITY_WEIGHT: Record<AlertSeverity, number> = {
	action_required: 0,
	warning: 1,
	info: 2
};

// ============================================================================
// SAMPLE POLICY ALERTS
// ============================================================================

/**
 * Sample policy alert configurations representing the kinds of lender
 * policy changes DSAs commonly need to know about.
 */
export const SAMPLE_POLICY_ALERTS: PolicyAlertConfig[] = [
	{
		alert_id: 'pa-001',
		lender_name: 'HDFC Bank',
		alert_type: 'rate_change',
		severity: 'action_required',
		title: 'HDFC Bank: ROI reduced to 8.5% for salaried',
		description:
			'HDFC Bank has reduced home loan interest rate to 8.5% p.a. for salaried applicants with CIBIL 750+. This is a limited-period offer. Re-evaluate pending cases for better rates.',
		action_label: 'Review Pending Cases',
		created_at: new Date('2026-02-01T10:00:00Z'),
		expires_at: new Date('2026-03-31T23:59:59Z')
	},
	{
		alert_id: 'pa-002',
		lender_name: 'State Bank of India',
		alert_type: 'deadline',
		severity: 'action_required',
		title: 'SBI: Processing fee waiver until March 31',
		description:
			'SBI is waiving processing fees on all home loans until March 31, 2026. Submit pending files quickly to take advantage of this offer — potential savings of Rs 10,000-30,000 per case.',
		action_label: 'Submit Pending Files',
		created_at: new Date('2026-02-05T09:00:00Z'),
		expires_at: new Date('2026-03-31T23:59:59Z')
	},
	{
		alert_id: 'pa-003',
		lender_name: 'Axis Bank',
		alert_type: 'criteria_change',
		severity: 'warning',
		title: 'Axis Bank: CIBIL requirement increased to 700',
		description:
			'Axis Bank has increased the minimum CIBIL score requirement from 650 to 700 for home loans effective immediately. Check if any of your pending cases fall below the new threshold.',
		action_label: 'Check Affected Cases',
		created_at: new Date('2026-02-08T14:00:00Z')
	},
	{
		alert_id: 'pa-004',
		lender_name: 'Bajaj Finserv',
		alert_type: 'new_product',
		severity: 'info',
		title: 'Bajaj Finance: New top-up loan for existing customers',
		description:
			'Bajaj Finance has launched a top-up home loan product for existing customers at competitive rates (starting 9.0% p.a.). Existing borrowers with 12+ months of repayment history are eligible.',
		action_label: 'View Details',
		created_at: new Date('2026-02-03T11:30:00Z')
	},
	{
		alert_id: 'pa-005',
		lender_name: 'ICICI Bank',
		alert_type: 'policy_update',
		severity: 'action_required',
		title: 'ICICI Bank: Mandatory e-KYC from Feb 15',
		description:
			'ICICI Bank is making Aadhaar-based e-KYC mandatory for all new loan applications starting February 15. Ensure all applicants have their Aadhaar linked to their mobile number before submission.',
		action_label: 'Verify Aadhaar Linking',
		created_at: new Date('2026-02-07T16:00:00Z'),
		expires_at: new Date('2026-02-28T23:59:59Z')
	},
	{
		alert_id: 'pa-006',
		lender_name: 'PNB Housing Finance',
		alert_type: 'rate_change',
		severity: 'info',
		title: 'PNB Housing: Special rate for affordable housing',
		description:
			'PNB Housing Finance is offering a special rate of 8.25% p.a. for loans under Rs 35 lakh under the affordable housing segment. Valid for properties in Tier 2 and Tier 3 cities.',
		created_at: new Date('2026-02-06T10:00:00Z'),
		expires_at: new Date('2026-04-30T23:59:59Z')
	},
	{
		alert_id: 'pa-007',
		lender_name: 'Kotak Mahindra Bank',
		alert_type: 'criteria_change',
		severity: 'warning',
		title: 'Kotak: Updated income multiplier for self-employed',
		description:
			'Kotak Mahindra Bank has revised the income multiplier for self-employed borrowers from 5x to 4x net profit. This may reduce the maximum eligible loan amount for self-employed applicants.',
		action_label: 'Recalculate Eligibility',
		created_at: new Date('2026-02-09T12:00:00Z')
	},
	{
		alert_id: 'pa-008',
		lender_name: 'LIC Housing Finance',
		alert_type: 'deadline',
		severity: 'warning',
		title: 'LIC HFL: Last date for FY26 disbursements — March 20',
		description:
			'LIC Housing Finance has set March 20 as the last date for FY26 disbursements. All sanctioned cases must complete disbursement formalities before this date to avoid re-processing.',
		action_label: 'Prioritise Disbursements',
		created_at: new Date('2026-02-10T09:00:00Z'),
		expires_at: new Date('2026-03-20T23:59:59Z')
	}
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate policy alerts by matching alert configurations against
 * the DSA's active cases to find affected ones.
 *
 * @param cases - Array of case documents
 * @param alerts - Policy alert configurations (use SAMPLE_POLICY_ALERTS or admin-configured)
 * @param now - Current time (for expiry filtering), defaults to new Date()
 */
export function generatePolicyAlerts(
	cases: any[],
	alerts: PolicyAlertConfig[],
	now?: Date
): PolicyAlert[] {
	const currentTime = now ?? new Date();
	const typedCases = (cases || []) as Case[];

	// Filter out expired alerts
	const activeAlerts = alerts.filter((a) => {
		if (!a.expires_at) return true;
		return new Date(a.expires_at) > currentTime;
	});

	// Build a map: lender_name (lowercase) → case_ids with that lender
	const lenderCaseMap = new Map<string, Set<string>>();
	for (const c of typedCases) {
		// Skip archived/terminal cases
		if (c.is_archived || ['closed', 'dropped'].includes(c.stage)) continue;

		for (const la of c.lender_applications || []) {
			const key = la.lender_name.toLowerCase();
			if (!lenderCaseMap.has(key)) {
				lenderCaseMap.set(key, new Set());
			}
			lenderCaseMap.get(key)!.add(c.case_id);
		}
	}

	// Generate PolicyAlert objects with affected_cases populated
	const result: PolicyAlert[] = activeAlerts.map((config) => {
		const lenderKey = config.lender_name.toLowerCase();
		const affectedSet = lenderCaseMap.get(lenderKey) || new Set<string>();

		// Also check for partial matches (e.g., "Bajaj Finserv" matching "Bajaj Finance")
		for (const [key, caseIds] of lenderCaseMap) {
			if (key !== lenderKey) {
				// Check if either contains the other's first word
				const configFirstWord = lenderKey.split(' ')[0];
				const mapFirstWord = key.split(' ')[0];
				if (
					configFirstWord.length >= 3 &&
					(key.includes(configFirstWord) || lenderKey.includes(mapFirstWord))
				) {
					for (const caseId of caseIds) {
						affectedSet.add(caseId);
					}
				}
			}
		}

		return {
			alert_id: config.alert_id,
			lender_name: config.lender_name,
			alert_type: config.alert_type,
			severity: config.severity,
			title: config.title,
			description: config.description,
			affected_cases: Array.from(affectedSet),
			action_label: config.action_label,
			created_at: new Date(config.created_at),
			expires_at: config.expires_at ? new Date(config.expires_at) : undefined
		};
	});

	// Sort by severity (action_required first), then by created_at (newest first)
	result.sort((a, b) => {
		const sevDiff = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
		if (sevDiff !== 0) return sevDiff;
		return b.created_at.getTime() - a.created_at.getTime();
	});

	return result;
}
