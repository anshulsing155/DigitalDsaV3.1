/**
 * Sample Data Seeder
 * ══════════════════════════════════════════════════════════════════
 * Creates 4 demo cases (with timeline events and RM contacts) when
 * a DSA completes onboarding v2.
 *
 * Idempotent: if SAMPLE- cases already exist for this DSA, the
 * function returns immediately without creating duplicates.
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import { Cases, RMContacts, TimelineEvents } from '$lib/database/mongo.js';
import type {
	Case,
	LenderApplication,
	DocumentChecklistItem,
	StageTransition,
	StatusTransition,
	LenderQuery
} from '$lib/types/case.js';
import type { TimelineEvent } from '$lib/types/timeline.js';
import type { RMContact } from '$lib/types/rmContact.js';

// ── Helpers ──────────────────────────────────────────────────────

/** Days ago from now */
function daysAgo(days: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d;
}

/** Days from now */
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
	const docs: DocumentChecklistItem[] = [
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
	return docs;
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
	const docs: DocumentChecklistItem[] = [
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
	return docs;
}

// ══════════════════════════════════════════════════════════════════
// MAIN SEEDER
// ══════════════════════════════════════════════════════════════════

export async function seedSampleData(dsaId: ObjectId, _dsaName: string): Promise<void> {
	// ── Idempotency check ────────────────────────────────────────
	const existingSamples = await Cases.countDocuments({
		dsa_id: dsaId,
		is_sample: true
	});

	if (existingSamples > 0) {
		return; // Already seeded — do nothing
	}

	const now = new Date();

	// ══════════════════════════════════════════════════════════════
	// SAMPLE CASE 1: HL — Andheri Flat (Home Loan, sanctioned)
	// ══════════════════════════════════════════════════════════════

	const case1Id = 'SAMPLE-HL-2026-0001';
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

	const case1LenderStatusHistory: StatusTransition[] = [
		{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(22) },
		{ from: 'selected', to: 'file_building', timestamp: daysAgo(22) },
		{ from: 'file_building', to: 'ready', timestamp: daysAgo(16) },
		{ from: 'ready', to: 'submitted', timestamp: daysAgo(15) },
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(12) },
		{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(3) }
	];

	const case1LenderApp: LenderApplication = {
		lender_application_id: case1LenderAppId,
		lender_id: 'hdfc-bank',
		lender_name: 'HDFC Bank',
		status: 'sanctioned',
		status_history: case1LenderStatusHistory,
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
		case_id: case1Id,
		dsa_id: dsaId,
		label: 'HL — Andheri Flat',
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

	const case1Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case1Id,
			event_type: 'case_created',
			description: 'Case created: HL — Andheri Flat',
			created_at: daysAgo(28)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(26)
		},
		{
			case_id: case1Id,
			event_type: 'lender_added',
			description: 'HDFC Bank added as lender',
			metadata: { lender_name: 'HDFC Bank' },
			created_at: daysAgo(22)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(22)
		},
		{
			case_id: case1Id,
			event_type: 'document_uploaded',
			description: 'All documents uploaded (14/14)',
			created_at: daysAgo(14)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'File submitted to HDFC Bank',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(15)
		},
		{
			case_id: case1Id,
			event_type: 'lender_status_changed',
			description: 'HDFC Bank: Login confirmed, processing started',
			metadata: { lender_name: 'HDFC Bank', status: 'processing' },
			created_at: daysAgo(12)
		},
		{
			case_id: case1Id,
			event_type: 'sanction',
			description: 'Sanction received: Rs 52,00,000 at 8.5% for 240 months',
			metadata: { lender_name: 'HDFC Bank', amount: 5200000, roi: 8.5 },
			created_at: daysAgo(3)
		}
	];

	// ══════════════════════════════════════════════════════════════
	// SAMPLE CASE 2: PL — Working Capital (Personal Loan, query)
	// ══════════════════════════════════════════════════════════════

	const case2Id = 'SAMPLE-PL-2026-0002';
	const case2LenderApp1Id = uuid();
	const case2LenderApp2Id = uuid();
	const case2QueryId = uuid();

	const case2StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(14) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(13) },
		{ from: 'profiling', to: 'file_building', timestamp: daysAgo(11) },
		{ from: 'file_building', to: 'submitted', timestamp: daysAgo(8) },
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(6) },
		{ from: 'processing', to: 'query', timestamp: daysAgo(4) }
	];

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
		lender_tracking: {
			login_number: 'ICICI-PL-2026-34521',
			login_date: daysAgo(6)
		},
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
		case_id: case2Id,
		dsa_id: dsaId,
		label: 'PL — Working Capital',
		loan: { type: 'Personal Loan', amount_required: 1500000, purpose: 'Working Capital' },
		stage: 'query',
		stage_history: case2StageHistory,
		lender_applications: [case2LenderApp1, case2LenderApp2],
		primary_lender_id: case2LenderApp1Id,
		optional_contact: { full_name: 'Priya Patel', mobile: '9988776655' },
		source: { type: 'walk-in' },
		created_at: daysAgo(14),
		updated_at: daysAgo(4),
		is_archived: false,
		is_sample: true
	};

	const case2Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case2Id,
			event_type: 'case_created',
			description: 'Case created: PL — Working Capital',
			created_at: daysAgo(14)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(13)
		},
		{
			case_id: case2Id,
			event_type: 'lender_added',
			description: 'ICICI Bank and Axis Bank added as lenders',
			metadata: { lenders: ['ICICI Bank', 'Axis Bank'] },
			created_at: daysAgo(11)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(11)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Files submitted to lenders',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(8)
		},
		{
			case_id: case2Id,
			event_type: 'lender_status_changed',
			description: 'ICICI Bank & Axis Bank: Processing started',
			created_at: daysAgo(6)
		},
		{
			case_id: case2Id,
			event_type: 'query_raised',
			description: 'Axis Bank raised a query: salary slips required',
			metadata: { lender_name: 'Axis Bank', query_id: case2QueryId },
			created_at: daysAgo(4)
		}
	];

	// ══════════════════════════════════════════════════════════════
	// SAMPLE CASE 3: LAP — Warehouse Loan (LAP, file_building)
	// ══════════════════════════════════════════════════════════════

	const case3Id = 'SAMPLE-LAP-2026-0003';
	const case3LenderAppId = uuid();

	const case3StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(10) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(9) },
		{ from: 'profiling', to: 'file_building', timestamp: daysAgo(7) }
	];

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
		case_id: case3Id,
		dsa_id: dsaId,
		label: 'LAP — Warehouse Loan',
		loan: {
			type: 'Loan Against Property',
			amount_required: 8000000,
			purpose: 'Business Expansion'
		},
		stage: 'file_building',
		stage_history: case3StageHistory,
		lender_applications: [case3LenderApp],
		primary_lender_id: case3LenderAppId,
		optional_contact: { full_name: 'Vikram Industries', mobile: '9112233445' },
		source: { type: 'ca', label: 'CA Mehta & Associates' },
		created_at: daysAgo(10),
		updated_at: daysAgo(6),
		is_archived: false,
		is_sample: true
	};

	const case3Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case3Id,
			event_type: 'case_created',
			description: 'Case created: LAP — Warehouse Loan',
			created_at: daysAgo(10)
		},
		{
			case_id: case3Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(9)
		},
		{
			case_id: case3Id,
			event_type: 'lender_added',
			description: 'Bajaj Housing Finance added as lender',
			metadata: { lender_name: 'Bajaj Housing Finance' },
			created_at: daysAgo(7)
		},
		{
			case_id: case3Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(7)
		},
		{
			case_id: case3Id,
			event_type: 'document_uploaded',
			description: '8 of 14 documents uploaded',
			created_at: daysAgo(6)
		},
		{
			case_id: case3Id,
			event_type: 'document_expiring',
			description: 'Property Valuation Report expires in 10 days',
			metadata: {
				doc_name: 'Property Valuation Report',
				valid_until: daysFromNow(10).toISOString()
			},
			created_at: now
		}
	];

	// ══════════════════════════════════════════════════════════════
	// SAMPLE CASE 4: BT — Rate Reduction (Balance Transfer, intake)
	// ══════════════════════════════════════════════════════════════

	const case4Id = 'SAMPLE-BT-2026-0004';

	const case4StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(1) }
	];

	const case4: Case = {
		case_id: case4Id,
		dsa_id: dsaId,
		label: 'BT — Rate Reduction',
		loan: { type: 'Balance Transfer', amount_required: 3500000, purpose: 'Rate Reduction' },
		stage: 'intake',
		stage_history: case4StageHistory,
		lender_applications: [],
		optional_contact: { full_name: 'Amit Desai', mobile: '9223344556' },
		source: { type: 'self' },
		created_at: daysAgo(1),
		updated_at: daysAgo(1),
		is_archived: false,
		is_sample: true
	};

	const case4Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case4Id,
			event_type: 'case_created',
			description: 'Case created: BT — Rate Reduction',
			created_at: daysAgo(1)
		}
	];

	// ══════════════════════════════════════════════════════════════
	// SAMPLE RM CONTACTS (HDFC & ICICI)
	// ══════════════════════════════════════════════════════════════

	const rmHdfc: Omit<RMContact, '_id'> = {
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
	};

	const rmIcici: Omit<RMContact, '_id'> = {
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
	};

	// ══════════════════════════════════════════════════════════════
	// INSERT ALL DATA
	// ══════════════════════════════════════════════════════════════

	await Promise.all([
		// Insert 4 cases
		Cases.insertMany([case1, case2, case3, case4]),

		// Insert all timeline events
		TimelineEvents.insertMany([
			...case1Timeline,
			...case2Timeline,
			...case3Timeline,
			...case4Timeline
		] as TimelineEvent[]),

		// Upsert RM contacts (don't duplicate if they already exist)
		// Note: contributed_by excluded from $setOnInsert to avoid conflict with $addToSet
		RMContacts.updateOne(
			{ rm_name: rmHdfc.rm_name, lender_name: rmHdfc.lender_name },
			{
				$setOnInsert: {
					rm_name: rmHdfc.rm_name,
					lender_name: rmHdfc.lender_name,
					branch: rmHdfc.branch,
					city: rmHdfc.city,
					phone: rmHdfc.phone,
					email: rmHdfc.email,
					designation: rmHdfc.designation,
					loan_types_handled: rmHdfc.loan_types_handled,
					contributed_at: rmHdfc.contributed_at,
					last_confirmed_at: rmHdfc.last_confirmed_at,
					confirmation_count: rmHdfc.confirmation_count,
					is_active: rmHdfc.is_active,
					notes_by_dsa: rmHdfc.notes_by_dsa,
					created_at: rmHdfc.created_at,
					updated_at: rmHdfc.updated_at
				},
				$addToSet: { contributed_by: dsaId }
			},
			{ upsert: true }
		),
		RMContacts.updateOne(
			{ rm_name: rmIcici.rm_name, lender_name: rmIcici.lender_name },
			{
				$setOnInsert: {
					rm_name: rmIcici.rm_name,
					lender_name: rmIcici.lender_name,
					branch: rmIcici.branch,
					city: rmIcici.city,
					phone: rmIcici.phone,
					email: rmIcici.email,
					designation: rmIcici.designation,
					loan_types_handled: rmIcici.loan_types_handled,
					contributed_at: rmIcici.contributed_at,
					last_confirmed_at: rmIcici.last_confirmed_at,
					confirmation_count: rmIcici.confirmation_count,
					is_active: rmIcici.is_active,
					notes_by_dsa: rmIcici.notes_by_dsa,
					created_at: rmIcici.created_at,
					updated_at: rmIcici.updated_at
				},
				$addToSet: { contributed_by: dsaId }
			},
			{ upsert: true }
		)
	]);
}
