/**
 * Demo Data — In-Memory Dataset
 * ====================================================================
 * Generates the same 4 sample cases, timeline events, and RM contacts
 * as sampleDataSeeder.ts, but returns them as plain objects without
 * any MongoDB writes. Used by the guest demo system.
 *
 * All dates are computed at call time (relative daysAgo/daysFromNow)
 * so the demo always feels "fresh".
 * ====================================================================
 */

import { ObjectId } from 'mongodb';
import type {
	Case,
	LenderApplication,
	DocumentChecklistItem,
	StageTransition,
	LenderQuery
} from '$lib/types/case.js';
import type { TimelineEvent } from '$lib/types/timeline.js';
import type { RMContact } from '$lib/types/rmContact.js';

// ── Fixed IDs ────────────────────────────────────────────────────
export const DEMO_DSA_ID = new ObjectId('000000000000000de001de01');

// ── Date helpers ─────────────────────────────────────────────────
function daysAgo(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d;
}

function daysFromNow(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

function uuid(): string {
	return crypto.randomUUID();
}

// ── Document checklist builders ──────────────────────────────────

function buildFullDocChecklist(allUploaded: boolean): DocumentChecklistItem[] {
	return [
		{
			doc_id: uuid(),
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(20)
		},
		{
			doc_id: uuid(),
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(20)
		},
		{
			doc_id: uuid(),
			doc_name: 'Passport Photo',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(19)
		},
		{
			doc_id: uuid(),
			doc_name: 'Salary Slips (3 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(18)
		},
		{
			doc_id: uuid(),
			doc_name: 'Bank Statements (6 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(18)
		},
		{
			doc_id: uuid(),
			doc_name: 'Form 16',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(17)
		},
		{
			doc_id: uuid(),
			doc_name: 'ITR (2 years)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(17)
		},
		{
			doc_id: uuid(),
			doc_name: 'Property Agreement',
			category: 'property',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(16)
		},
		{
			doc_id: uuid(),
			doc_name: 'Property Valuation Report',
			category: 'property',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(15)
		},
		{
			doc_id: uuid(),
			doc_name: 'Title Deed',
			category: 'property',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(15)
		},
		{
			doc_id: uuid(),
			doc_name: 'NOC from Builder',
			category: 'property',
			is_mandatory: false,
			status: 'uploaded',
			status_updated_at: daysAgo(14)
		},
		{
			doc_id: uuid(),
			doc_name: 'Loan Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(14)
		},
		{
			doc_id: uuid(),
			doc_name: 'CIBIL Consent',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(13)
		},
		{
			doc_id: uuid(),
			doc_name: 'Processing Fee Cheque',
			category: 'lender_specific',
			is_mandatory: false,
			status: allUploaded ? 'uploaded' : 'not_started',
			status_updated_at: allUploaded ? daysAgo(12) : undefined
		}
	];
}

function buildPLDocChecklist(): DocumentChecklistItem[] {
	return [
		{
			doc_id: uuid(),
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(12)
		},
		{
			doc_id: uuid(),
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(12)
		},
		{
			doc_id: uuid(),
			doc_name: 'Salary Slips (3 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(11)
		},
		{
			doc_id: uuid(),
			doc_name: 'Bank Statements (6 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(10)
		},
		{
			doc_id: uuid(),
			doc_name: 'Form 16',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(10)
		},
		{
			doc_id: uuid(),
			doc_name: 'ITR (2 years)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(9)
		},
		{
			doc_id: uuid(),
			doc_name: 'Loan Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'pending' as any,
			status_updated_at: undefined
		},
		{
			doc_id: uuid(),
			doc_name: 'CIBIL Consent',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'pending' as any,
			status_updated_at: undefined
		}
	];
}

function buildLAPDocChecklist(): DocumentChecklistItem[] {
	return [
		{
			doc_id: uuid(),
			doc_name: 'PAN Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(10)
		},
		{
			doc_id: uuid(),
			doc_name: 'Aadhaar Card',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(10)
		},
		{
			doc_id: uuid(),
			doc_name: 'Passport Photo',
			category: 'identity',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(9)
		},
		{
			doc_id: uuid(),
			doc_name: 'GST Returns (12 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(8)
		},
		{
			doc_id: uuid(),
			doc_name: 'Bank Statements (12 months)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(8)
		},
		{
			doc_id: uuid(),
			doc_name: 'ITR (3 years)',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(7)
		},
		{
			doc_id: uuid(),
			doc_name: 'Balance Sheet & P&L',
			category: 'income',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(7)
		},
		{
			doc_id: uuid(),
			doc_name: 'Property Valuation Report',
			category: 'property',
			is_mandatory: true,
			status: 'uploaded',
			status_updated_at: daysAgo(6),
			validity: {
				valid_from: daysAgo(30),
				valid_until: daysFromNow(10),
				is_fresh: true,
				freshness_rule_days: 60
			}
		},
		{
			doc_id: uuid(),
			doc_name: 'Title Deed',
			category: 'property',
			is_mandatory: true,
			status: 'not_started'
		},
		{
			doc_id: uuid(),
			doc_name: 'Encumbrance Certificate',
			category: 'property',
			is_mandatory: true,
			status: 'not_started'
		},
		{
			doc_id: uuid(),
			doc_name: 'Property Tax Receipts',
			category: 'property',
			is_mandatory: false,
			status: 'not_started'
		},
		{
			doc_id: uuid(),
			doc_name: 'Loan Application Form',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'not_started'
		},
		{
			doc_id: uuid(),
			doc_name: 'CIBIL Consent',
			category: 'lender_specific',
			is_mandatory: true,
			status: 'not_started'
		},
		{
			doc_id: uuid(),
			doc_name: 'Business Proof',
			category: 'other',
			is_mandatory: false,
			status: 'not_started'
		}
	];
}

// ====================================================================
// EXPORTED: getDemoCases()
// ====================================================================

export function getDemoCases(): Case[] {
	const dsaId = DEMO_DSA_ID;
	// ── Case 1: HL — Andheri Flat (sanctioned) ───────────────────
	const case1LenderAppId = uuid();
	const case1StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(28), notes: 'Case created' },
		{
			from: 'intake',
			to: 'profiling',
			timestamp: daysAgo(26),
			notes: 'Customer details collected'
		},
		{
			from: 'profiling',
			to: 'file_building',
			timestamp: daysAgo(22),
			notes: 'Documents gathering started'
		},
		{
			from: 'file_building',
			to: 'submitted',
			timestamp: daysAgo(15),
			notes: 'File submitted to HDFC Bank'
		},
		{
			from: 'submitted',
			to: 'processing',
			timestamp: daysAgo(12),
			notes: 'HDFC Bank login confirmed'
		},
		{
			from: 'processing',
			to: 'sanctioned',
			timestamp: daysAgo(3),
			notes: 'Sanction received from HDFC Bank'
		}
	];

	const case1LenderApp: LenderApplication = {
		lender_application_id: case1LenderAppId,
		lender_id: 'hdfc-bank',
		lender_name: 'HDFC Bank',
		status: 'sanctioned',
		status_history: [
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(22) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(22) },
			{ from: 'file_building', to: 'ready', timestamp: daysAgo(16) },
			{ from: 'ready', to: 'submitted', timestamp: daysAgo(15) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(12) },
			{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(3) }
		],
		lender_tracking: {
			login_number: 'HDFC-HL-2026-98712',
			login_date: daysAgo(12),
			technical_status: 'positive',
			legal_status: 'clear',
			credit_approval: 'approved'
		},
		sanction: {
			amount: 5200000,
			roi: 8.5,
			tenure_months: 240,
			sanction_date: daysAgo(3),
			sanction_letter_ref: 'HDFC/SL/2026/00456'
		},
		eligibility_snapshot: {
			traffic_light: 'green',
			message: 'Profile eligible at HDFC Bank',
			computed_at: daysAgo(22)
		},
		document_checklist: buildFullDocChecklist(true),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(22),
		updated_at: daysAgo(3)
	};

	const case1: Case = {
		case_id: 'SAMPLE-HL-2026-0001',
		dsa_id: dsaId,
		label: 'HL \u2014 Andheri Flat',
		loan: { type: 'Home Loan', amount_required: 5500000, tenure_years: 20, purpose: 'Purchase' },
		stage: 'sanctioned',
		stage_history: case1StageHistory,
		lender_applications: [case1LenderApp],
		primary_lender_id: case1LenderAppId,
		optional_contact: { full_name: 'Rahul Sharma', mobile: '9876543210' },
		source: { type: 'referral', label: 'CA Referral' },
		created_at: daysAgo(28),
		updated_at: daysAgo(3),
		is_archived: false,
		is_sample: true
	};

	// ── Case 2: PL — Working Capital (query) ─────────────────────
	const case2LenderApp1Id = uuid();
	const case2LenderApp2Id = uuid();
	const case2QueryId = uuid();

	const case2Query: LenderQuery = {
		query_id: case2QueryId,
		query_text: 'Please provide latest 3 months salary slips',
		category: 'document',
		raised_at: daysAgo(4),
		deadline: daysFromNow(3),
		status: 'open',
		days_open: 4
	};

	const case2LenderApp1: LenderApplication = {
		lender_application_id: case2LenderApp1Id,
		lender_id: 'icici-bank',
		lender_name: 'ICICI Bank',
		status: 'processing',
		status_history: [
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(11) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(11) },
			{ from: 'file_building', to: 'ready', timestamp: daysAgo(9) },
			{ from: 'ready', to: 'submitted', timestamp: daysAgo(8) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(6) }
		],
		lender_tracking: { login_number: 'ICICI-PL-2026-34521', login_date: daysAgo(6) },
		document_checklist: buildPLDocChecklist(),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(11),
		updated_at: daysAgo(6)
	};

	const case2LenderApp2: LenderApplication = {
		lender_application_id: case2LenderApp2Id,
		lender_id: 'axis-bank',
		lender_name: 'Axis Bank',
		status: 'query',
		status_history: [
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(11) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(11) },
			{ from: 'file_building', to: 'ready', timestamp: daysAgo(9) },
			{ from: 'ready', to: 'submitted', timestamp: daysAgo(8) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(6) },
			{ from: 'processing', to: 'query', timestamp: daysAgo(4) }
		],
		document_checklist: buildPLDocChecklist(),
		queries: [case2Query],
		file_snapshots: [],
		created_at: daysAgo(11),
		updated_at: daysAgo(4)
	};

	const case2: Case = {
		case_id: 'SAMPLE-PL-2026-0002',
		dsa_id: dsaId,
		label: 'PL \u2014 Working Capital',
		loan: { type: 'Personal Loan', amount_required: 1500000, purpose: 'Working Capital' },
		stage: 'query',
		stage_history: [
			{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(14) },
			{ from: 'intake', to: 'profiling', timestamp: daysAgo(13) },
			{ from: 'profiling', to: 'file_building', timestamp: daysAgo(11) },
			{ from: 'file_building', to: 'submitted', timestamp: daysAgo(8) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(6) },
			{ from: 'processing', to: 'query', timestamp: daysAgo(4) }
		],
		lender_applications: [case2LenderApp1, case2LenderApp2],
		primary_lender_id: case2LenderApp1Id,
		optional_contact: { full_name: 'Priya Patel', mobile: '9988776655' },
		source: { type: 'walk-in' },
		created_at: daysAgo(14),
		updated_at: daysAgo(4),
		is_archived: false,
		is_sample: true
	};

	// ── Case 3: LAP — Warehouse Loan (file_building) ─────────────
	const case3LenderAppId = uuid();

	const case3LenderApp: LenderApplication = {
		lender_application_id: case3LenderAppId,
		lender_id: 'bajaj-housing-finance',
		lender_name: 'Bajaj Housing Finance',
		status: 'file_building',
		status_history: [
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(7) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(7) }
		],
		document_checklist: buildLAPDocChecklist(),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(7),
		updated_at: daysAgo(6)
	};

	const case3: Case = {
		case_id: 'SAMPLE-LAP-2026-0003',
		dsa_id: dsaId,
		label: 'LAP \u2014 Warehouse Loan',
		loan: {
			type: 'Loan Against Property',
			amount_required: 8000000,
			purpose: 'Business Expansion'
		},
		stage: 'file_building',
		stage_history: [
			{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(10) },
			{ from: 'intake', to: 'profiling', timestamp: daysAgo(9) },
			{ from: 'profiling', to: 'file_building', timestamp: daysAgo(7) }
		],
		lender_applications: [case3LenderApp],
		primary_lender_id: case3LenderAppId,
		optional_contact: { full_name: 'Vikram Industries', mobile: '9112233445' },
		source: { type: 'ca', label: 'CA Mehta & Associates' },
		created_at: daysAgo(10),
		updated_at: daysAgo(6),
		is_archived: false,
		is_sample: true
	};

	// ── Case 4: BT — Rate Reduction (intake) ─────────────────────
	const case4: Case = {
		case_id: 'SAMPLE-BT-2026-0004',
		dsa_id: dsaId,
		label: 'BT \u2014 Rate Reduction',
		loan: { type: 'Balance Transfer', amount_required: 3500000, purpose: 'Rate Reduction' },
		stage: 'intake',
		stage_history: [{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(1) }],
		lender_applications: [],
		optional_contact: { full_name: 'Amit Desai', mobile: '9223344556' },
		source: { type: 'self' },
		created_at: daysAgo(1),
		updated_at: daysAgo(1),
		is_archived: false,
		is_sample: true
	};

	return [case1, case2, case3, case4];
}

// ====================================================================
// EXPORTED: getDemoTimeline()
// ====================================================================

export function getDemoTimeline(): Omit<TimelineEvent, '_id'>[] {
	const now = new Date();

	return [
		// Case 1 events
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'case_created',
			description: 'Case created: HL \u2014 Andheri Flat',
			created_at: daysAgo(28)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(26)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'lender_added',
			description: 'HDFC Bank added as lender',
			metadata: { lender_name: 'HDFC Bank' },
			created_at: daysAgo(22)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(22)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'document_uploaded',
			description: 'All documents uploaded (14/14)',
			created_at: daysAgo(14)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'stage_changed',
			description: 'File submitted to HDFC Bank',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(15)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'lender_status_changed',
			description: 'HDFC Bank: Login confirmed, processing started',
			metadata: { lender_name: 'HDFC Bank', status: 'processing' },
			created_at: daysAgo(12)
		},
		{
			case_id: 'SAMPLE-HL-2026-0001',
			event_type: 'sanction',
			description: 'Sanction received: Rs 52,00,000 at 8.5% for 240 months',
			metadata: { lender_name: 'HDFC Bank', amount: 5200000, roi: 8.5 },
			created_at: daysAgo(3)
		},

		// Case 2 events
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'case_created',
			description: 'Case created: PL \u2014 Working Capital',
			created_at: daysAgo(14)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(13)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'lender_added',
			description: 'ICICI Bank and Axis Bank added as lenders',
			metadata: { lenders: ['ICICI Bank', 'Axis Bank'] },
			created_at: daysAgo(11)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(11)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'stage_changed',
			description: 'Files submitted to lenders',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(8)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'lender_status_changed',
			description: 'ICICI Bank & Axis Bank: Processing started',
			created_at: daysAgo(6)
		},
		{
			case_id: 'SAMPLE-PL-2026-0002',
			event_type: 'query_raised',
			description: 'Axis Bank raised a query: salary slips required',
			metadata: { lender_name: 'Axis Bank' },
			created_at: daysAgo(4)
		},

		// Case 3 events
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'case_created',
			description: 'Case created: LAP \u2014 Warehouse Loan',
			created_at: daysAgo(10)
		},
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(9)
		},
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'lender_added',
			description: 'Bajaj Housing Finance added as lender',
			metadata: { lender_name: 'Bajaj Housing Finance' },
			created_at: daysAgo(7)
		},
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(7)
		},
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'document_uploaded',
			description: '8 of 14 documents uploaded',
			created_at: daysAgo(6)
		},
		{
			case_id: 'SAMPLE-LAP-2026-0003',
			event_type: 'document_expiring',
			description: 'Property Valuation Report expires in 10 days',
			metadata: {
				doc_name: 'Property Valuation Report',
				valid_until: daysFromNow(10).toISOString()
			},
			created_at: now
		},

		// Case 4 events
		{
			case_id: 'SAMPLE-BT-2026-0004',
			event_type: 'case_created',
			description: 'Case created: BT \u2014 Rate Reduction',
			created_at: daysAgo(1)
		}
	];
}

// ====================================================================
// EXPORTED: getDemoRMContacts()
// ====================================================================

export function getDemoRMContacts(): Omit<RMContact, '_id'>[] {
	const dsaId = DEMO_DSA_ID;
	const now = new Date();

	return [
		{
			rm_name: 'Sanjay Kapoor',
			lender_name: 'HDFC Bank',
			branch: 'Andheri West',
			city: 'Mumbai',
			phone: '9800011122',
			email: 'sanjay.kapoor@hdfcbank.com',
			designation: 'Senior RM',
			loan_types_handled: ['Home Loan', 'Loan Against Property'],
			contributed_by: [dsaId],
			contributed_at: now,
			last_confirmed_at: now,
			confirmation_count: 1,
			is_active: true,
			notes_by_dsa: { [dsaId.toString()]: 'Responds quickly, good for HL cases' },
			created_at: now,
			updated_at: now
		},
		{
			rm_name: 'Neha Verma',
			lender_name: 'ICICI Bank',
			branch: 'Bandra',
			city: 'Mumbai',
			phone: '9800033344',
			email: 'neha.verma@icicibank.com',
			designation: 'RM',
			loan_types_handled: ['Personal Loan', 'Home Loan', 'Balance Transfer'],
			contributed_by: [dsaId],
			contributed_at: now,
			last_confirmed_at: now,
			confirmation_count: 1,
			is_active: true,
			notes_by_dsa: { [dsaId.toString()]: 'Handles PL cases well' },
			created_at: now,
			updated_at: now
		}
	];
}

// ====================================================================
// EXPORTED: getDemoDsaProfile()
// ====================================================================

export function getDemoDsaProfile() {
	return {
		name: 'Demo DSA Agent',
		firmName: 'Demo Finance Services',
		city: 'Mumbai',
		dsaCode: 'DEMO-2026',
		businessType: 'Partnership'
	};
}
