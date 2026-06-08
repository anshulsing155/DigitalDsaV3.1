/**
 * RM Sample Data Seeder
 * ══════════════════════════════════════════════════════════════════
 * Creates 6 demo cases (with timeline events and communication
 * threads) when an RM completes onboarding.
 *
 * Mirrors the pattern of sampleDataSeeder.ts (DSA seeder) but
 * generates data from the RM's perspective — synthetic DSA
 * personas are local ObjectIds (not persisted to DB).
 *
 * Idempotent: if SAMPLE-RM- communication threads already exist
 * for this RM, the function returns immediately.
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import {
	Cases,
	CommunicationThreads,
	TimelineEvents,
	AccuracyRatings,
	RMBroadcasts,
	PolicyDocuments,
	rmApplications
} from '$lib/database/mongo.js';
import type {
	Case,
	LenderApplication,
	DocumentChecklistItem,
	StageTransition,
	StatusTransition,
	LenderQuery
} from '$lib/types/case.js';
import type { TimelineEvent } from '$lib/types/timeline.js';
import type { CommunicationThread, ThreadMessage } from '$lib/types/communicationThread.js';
import type { AccuracyRating, RMBroadcast, PolicyDocument } from '$lib/types/rmPortal.js';

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

export async function seedRMSampleData(
	rmId: ObjectId,
	rmName: string,
	rmBankName: string
): Promise<void> {
	// ── Idempotency check ────────────────────────────────────────
	const existingSamples = await CommunicationThreads.countDocuments({
		rm_id: rmId,
		case_id: { $regex: /^SAMPLE-RM-/ }
	});

	if (existingSamples > 0) {
		return; // Already seeded — do nothing
	}

	// Fallback so sample data text never has blank lender references
	const bankLabel = rmBankName || 'Your Bank';

	// ── Synthetic DSA Personas (local only, NOT inserted into DB) ─
	const sampleDsa1Id = new ObjectId(); // Rajesh Patel — Mumbai, Individual
	const sampleDsa2Id = new ObjectId(); // Meera Investments — Mumbai, Corporate
	const sampleDsa3Id = new ObjectId(); // Arjun Nair — Pune, Individual

	// ══════════════════════════════════════════════════════════════
	// CASE 1: HL — Borivali Flat (Home Loan, processing)
	// DSA: Rajesh Patel | Lender: HDFC Bank
	// ══════════════════════════════════════════════════════════════

	const case1Id = 'SAMPLE-RM-HL-2026-0001';
	const case1LenderAppId = uuid();

	const case1StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(25), notes: 'Case created' },
		{
			from: 'intake',
			to: 'profiling',
			timestamp: daysAgo(23),
			notes: 'Customer details collected'
		},
		{
			from: 'profiling',
			to: 'file_building',
			timestamp: daysAgo(18),
			notes: 'Documents gathering started'
		},
		{
			from: 'file_building',
			to: 'submitted',
			timestamp: daysAgo(12),
			notes: 'File submitted to HDFC Bank'
		},
		{
			from: 'submitted',
			to: 'processing',
			timestamp: daysAgo(8),
			notes: 'HDFC Bank login confirmed'
		}
	];

	const case1LenderStatusHistory: StatusTransition[] = [
		{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(18) },
		{ from: 'selected', to: 'file_building', timestamp: daysAgo(18) },
		{ from: 'file_building', to: 'ready', timestamp: daysAgo(13) },
		{ from: 'ready', to: 'submitted', timestamp: daysAgo(12) },
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(8) }
	];

	const case1LenderApp: LenderApplication = {
		lender_application_id: case1LenderAppId,
		lender_id: 'hdfc-bank',
		lender_name: 'HDFC Bank',
		status: 'processing',
		status_history: case1LenderStatusHistory,
		lender_tracking: {
			login_number: 'HDFC-HL-2026-77421',
			login_date: daysAgo(8),
			technical_status: 'ordered',
			legal_status: 'pending',
			credit_approval: 'pending'
		},
		eligibility_snapshot: {
			traffic_light: 'green',
			message: 'Profile eligible at HDFC Bank',
			computed_at: daysAgo(18)
		},
		document_checklist: buildFullDocChecklist(true),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(18),
		updated_at: daysAgo(8)
	};

	const case1: Case = {
		case_id: case1Id,
		dsa_id: sampleDsa1Id,
		label: 'HL — Borivali Flat',
		loan: { type: 'Home Loan', amount_required: 6500000, tenure_years: 20, purpose: 'Purchase' },
		stage: 'processing',
		stage_history: case1StageHistory,
		lender_applications: [case1LenderApp],
		primary_lender_id: case1LenderAppId,
		optional_contact: { full_name: 'Suresh Mehta', mobile: '9876501234' },
		source: { type: 'referral', label: 'Builder Referral' },
		created_at: daysAgo(25),
		updated_at: daysAgo(8),
		is_archived: false,
		is_sample: true
	};

	const case1Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case1Id,
			event_type: 'case_created',
			description: 'Case created: HL — Borivali Flat',
			created_at: daysAgo(25)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(23)
		},
		{
			case_id: case1Id,
			event_type: 'lender_added',
			description: 'HDFC Bank added as lender',
			metadata: { lender_name: 'HDFC Bank' },
			created_at: daysAgo(18)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(18)
		},
		{
			case_id: case1Id,
			event_type: 'document_uploaded',
			description: 'All documents uploaded (14/14)',
			created_at: daysAgo(13)
		},
		{
			case_id: case1Id,
			event_type: 'stage_changed',
			description: 'File submitted to HDFC Bank',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(12)
		},
		{
			case_id: case1Id,
			event_type: 'lender_status_changed',
			description: 'HDFC Bank: Login confirmed, processing started',
			metadata: {
				lender_name: 'HDFC Bank',
				status: 'processing',
				login_number: 'HDFC-HL-2026-77421'
			},
			created_at: daysAgo(8)
		},
		{
			case_id: case1Id,
			event_type: 'message_sent',
			description: 'RM confirmed processing has started',
			created_at: daysAgo(7)
		}
	];

	const thread1Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa1Id,
			message:
				'Hi, sharing a home loan case for Borivali flat — Rs 65 lakh. All documents uploaded.',
			message_type: 'case_shared',
			created_at: daysAgo(12)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message: 'Received. File looks complete, will process the login today.',
			message_type: 'text',
			created_at: daysAgo(11)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message:
				'Login confirmed — HDFC-HL-2026-77421. Technical valuation has been ordered. Will update once credit appraisal begins.',
			message_type: 'text',
			created_at: daysAgo(8)
		}
	];

	const thread1: Omit<CommunicationThread, '_id'> = {
		case_id: case1Id,
		dsa_id: sampleDsa1Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Rajesh Patel',
		lender_name: 'HDFC Bank',
		messages: thread1Messages,
		status: 'active',
		created_at: daysAgo(12),
		updated_at: daysAgo(8)
	};

	// ══════════════════════════════════════════════════════════════
	// CASE 2: PL — Business Expansion (Personal Loan, query)
	// DSA: Meera Investments | Lenders: ICICI Bank + Axis Bank
	// ══════════════════════════════════════════════════════════════

	const case2Id = 'SAMPLE-RM-PL-2026-0002';
	const case2LenderApp1Id = uuid();
	const case2LenderApp2Id = uuid();
	const case2QueryId = uuid();

	const case2StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(16) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(15) },
		{ from: 'profiling', to: 'file_building', timestamp: daysAgo(12) },
		{ from: 'file_building', to: 'submitted', timestamp: daysAgo(9) },
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(7) },
		{ from: 'processing', to: 'query', timestamp: daysAgo(4), notes: 'Axis Bank raised query' }
	];

	const case2Query: LenderQuery = {
		query_id: case2QueryId,
		query_text: 'Please provide latest 3 months bank statements',
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
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(12) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(12) },
			{ from: 'file_building', to: 'ready', timestamp: daysAgo(10) },
			{ from: 'ready', to: 'submitted', timestamp: daysAgo(9) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(7) }
		],
		lender_tracking: {
			login_number: 'ICICI-PL-2026-55891',
			login_date: daysAgo(7)
		},
		document_checklist: buildPLDocChecklist(),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(12),
		updated_at: daysAgo(7)
	};

	const case2LenderApp2: LenderApplication = {
		lender_application_id: case2LenderApp2Id,
		lender_id: 'axis-bank',
		lender_name: 'Axis Bank',
		status: 'query',
		status_history: [
			{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(12) },
			{ from: 'selected', to: 'file_building', timestamp: daysAgo(12) },
			{ from: 'file_building', to: 'ready', timestamp: daysAgo(10) },
			{ from: 'ready', to: 'submitted', timestamp: daysAgo(9) },
			{ from: 'submitted', to: 'processing', timestamp: daysAgo(7) },
			{ from: 'processing', to: 'query', timestamp: daysAgo(4) }
		],
		document_checklist: buildPLDocChecklist(),
		queries: [case2Query],
		file_snapshots: [],
		created_at: daysAgo(12),
		updated_at: daysAgo(4)
	};

	const case2: Case = {
		case_id: case2Id,
		dsa_id: sampleDsa2Id,
		label: 'PL — Business Expansion',
		loan: { type: 'Personal Loan', amount_required: 1200000, purpose: 'Business Expansion' },
		stage: 'query',
		stage_history: case2StageHistory,
		lender_applications: [case2LenderApp1, case2LenderApp2],
		primary_lender_id: case2LenderApp1Id,
		optional_contact: { full_name: 'Meera Investments', mobile: '9988112233' },
		source: { type: 'walk-in' },
		created_at: daysAgo(16),
		updated_at: daysAgo(4),
		is_archived: false,
		is_sample: true
	};

	const case2Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case2Id,
			event_type: 'case_created',
			description: 'Case created: PL — Business Expansion',
			created_at: daysAgo(16)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(15)
		},
		{
			case_id: case2Id,
			event_type: 'lender_added',
			description: 'ICICI Bank and Axis Bank added as lenders',
			metadata: { lenders: ['ICICI Bank', 'Axis Bank'] },
			created_at: daysAgo(12)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(12)
		},
		{
			case_id: case2Id,
			event_type: 'stage_changed',
			description: 'Files submitted to lenders',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(9)
		},
		{
			case_id: case2Id,
			event_type: 'lender_status_changed',
			description: 'ICICI Bank & Axis Bank: Processing started',
			created_at: daysAgo(7)
		},
		{
			case_id: case2Id,
			event_type: 'query_raised',
			description: 'Axis Bank raised a query: bank statements required',
			metadata: { lender_name: 'Axis Bank', query_id: case2QueryId },
			created_at: daysAgo(4)
		}
	];

	const thread2Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa2Id,
			message: 'Sharing a PL case for business expansion — Rs 12 lakh. Filed with ICICI and Axis.',
			message_type: 'case_shared',
			created_at: daysAgo(9)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message:
				'Axis Bank has raised a query — they need latest 3 months bank statements. Can you share at the earliest? Deadline is in 3 days.',
			message_type: 'query',
			created_at: daysAgo(4)
		}
	];

	const thread2: Omit<CommunicationThread, '_id'> = {
		case_id: case2Id,
		dsa_id: sampleDsa2Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Meera Investments',
		lender_name: 'Axis Bank',
		messages: thread2Messages,
		status: 'active',
		created_at: daysAgo(9),
		updated_at: daysAgo(4)
	};

	// ══════════════════════════════════════════════════════════════
	// CASE 3: LAP — Commercial Plot (LAP, sanctioned)
	// DSA: Arjun Nair | Lender: Bajaj Housing Finance
	// ══════════════════════════════════════════════════════════════

	const case3Id = 'SAMPLE-RM-LAP-2026-0003';
	const case3LenderAppId = uuid();

	const case3StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(30) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(28) },
		{ from: 'profiling', to: 'file_building', timestamp: daysAgo(24) },
		{
			from: 'file_building',
			to: 'submitted',
			timestamp: daysAgo(18),
			notes: 'File submitted to Bajaj Housing Finance'
		},
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(14), notes: 'Login confirmed' },
		{
			from: 'processing',
			to: 'sanctioned',
			timestamp: daysAgo(2),
			notes: 'Sanction received from Bajaj Housing Finance'
		}
	];

	const case3LenderStatusHistory: StatusTransition[] = [
		{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(24) },
		{ from: 'selected', to: 'file_building', timestamp: daysAgo(24) },
		{ from: 'file_building', to: 'ready', timestamp: daysAgo(19) },
		{ from: 'ready', to: 'submitted', timestamp: daysAgo(18) },
		{ from: 'submitted', to: 'processing', timestamp: daysAgo(14) },
		{ from: 'processing', to: 'sanctioned', timestamp: daysAgo(2) }
	];

	const case3LenderApp: LenderApplication = {
		lender_application_id: case3LenderAppId,
		lender_id: 'bajaj-housing-finance',
		lender_name: 'Bajaj Housing Finance',
		status: 'sanctioned',
		status_history: case3LenderStatusHistory,
		lender_tracking: {
			login_number: 'BHF-LAP-2026-33210',
			login_date: daysAgo(14),
			technical_status: 'positive',
			legal_status: 'clear',
			credit_approval: 'approved'
		},
		sanction: {
			amount: 11500000,
			roi: 9.25,
			tenure_months: 180,
			sanction_date: daysAgo(2),
			sanction_letter_ref: 'BHF/SL/2026/01089'
		},
		eligibility_snapshot: {
			traffic_light: 'green',
			message: 'Profile eligible at Bajaj Housing Finance',
			computed_at: daysAgo(24)
		},
		document_checklist: buildLAPDocChecklist(),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(24),
		updated_at: daysAgo(2)
	};

	const case3: Case = {
		case_id: case3Id,
		dsa_id: sampleDsa3Id,
		label: 'LAP — Commercial Plot',
		loan: {
			type: 'Loan Against Property',
			amount_required: 12000000,
			purpose: 'Business Expansion'
		},
		stage: 'sanctioned',
		stage_history: case3StageHistory,
		lender_applications: [case3LenderApp],
		primary_lender_id: case3LenderAppId,
		optional_contact: { full_name: 'Vikram Enterprises', mobile: '9112200334' },
		source: { type: 'ca', label: 'CA Deshmukh & Associates' },
		created_at: daysAgo(30),
		updated_at: daysAgo(2),
		is_archived: false,
		is_sample: true
	};

	const case3Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case3Id,
			event_type: 'case_created',
			description: 'Case created: LAP — Commercial Plot',
			created_at: daysAgo(30)
		},
		{
			case_id: case3Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(28)
		},
		{
			case_id: case3Id,
			event_type: 'lender_added',
			description: 'Bajaj Housing Finance added as lender',
			metadata: { lender_name: 'Bajaj Housing Finance' },
			created_at: daysAgo(24)
		},
		{
			case_id: case3Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(24)
		},
		{
			case_id: case3Id,
			event_type: 'document_uploaded',
			description: '8 of 14 documents uploaded',
			created_at: daysAgo(19)
		},
		{
			case_id: case3Id,
			event_type: 'stage_changed',
			description: 'File submitted to Bajaj Housing Finance',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(18)
		},
		{
			case_id: case3Id,
			event_type: 'lender_status_changed',
			description: 'Bajaj Housing Finance: Login confirmed, processing started',
			metadata: {
				lender_name: 'Bajaj Housing Finance',
				status: 'processing',
				login_number: 'BHF-LAP-2026-33210'
			},
			created_at: daysAgo(14)
		},
		{
			case_id: case3Id,
			event_type: 'sanction',
			description: 'Sanction received: Rs 1,15,00,000 at 9.25% for 180 months',
			metadata: { lender_name: 'Bajaj Housing Finance', amount: 11500000, roi: 9.25 },
			created_at: daysAgo(2)
		}
	];

	const thread3Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa3Id,
			message:
				'Sharing LAP case for a commercial plot in Hinjewadi, Pune — Rs 1.2 crore. All financials are strong.',
			message_type: 'case_shared',
			created_at: daysAgo(18)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message:
				'File received. Login confirmed — BHF-LAP-2026-33210. Technical & legal verification underway.',
			message_type: 'text',
			created_at: daysAgo(14)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message:
				'Great news — sanction approved for Rs 1.15 Cr at 9.25% for 15 years. Sanction letter ref: BHF/SL/2026/01089. Please confirm disbursement timeline.',
			message_type: 'response',
			created_at: daysAgo(2)
		}
	];

	const thread3: Omit<CommunicationThread, '_id'> = {
		case_id: case3Id,
		dsa_id: sampleDsa3Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Arjun Nair',
		lender_name: 'Bajaj Housing Finance',
		messages: thread3Messages,
		status: 'active',
		created_at: daysAgo(18),
		updated_at: daysAgo(2)
	};

	// ══════════════════════════════════════════════════════════════
	// CASE 4: HL — Thane 2BHK (Home Loan, submitted)
	// DSA: Rajesh Patel | Lender: SBI
	// ══════════════════════════════════════════════════════════════

	const case4Id = 'SAMPLE-RM-HL-2026-0004';
	const case4LenderAppId = uuid();

	const case4StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(14) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(12) },
		{
			from: 'profiling',
			to: 'file_building',
			timestamp: daysAgo(9),
			notes: 'Document collection started'
		},
		{
			from: 'file_building',
			to: 'submitted',
			timestamp: daysAgo(5),
			notes: 'File submitted to SBI'
		}
	];

	const case4LenderStatusHistory: StatusTransition[] = [
		{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(9) },
		{ from: 'selected', to: 'file_building', timestamp: daysAgo(9) },
		{ from: 'file_building', to: 'ready', timestamp: daysAgo(6) },
		{ from: 'ready', to: 'submitted', timestamp: daysAgo(5) }
	];

	const case4LenderApp: LenderApplication = {
		lender_application_id: case4LenderAppId,
		lender_id: 'sbi',
		lender_name: 'SBI',
		status: 'submitted',
		status_history: case4LenderStatusHistory,
		eligibility_snapshot: {
			traffic_light: 'green',
			message: 'Profile eligible at SBI',
			computed_at: daysAgo(9)
		},
		document_checklist: buildFullDocChecklist(true),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(9),
		updated_at: daysAgo(5)
	};

	const case4: Case = {
		case_id: case4Id,
		dsa_id: sampleDsa1Id,
		label: 'HL — Thane 2BHK',
		loan: { type: 'Home Loan', amount_required: 4500000, tenure_years: 15, purpose: 'Purchase' },
		stage: 'submitted',
		stage_history: case4StageHistory,
		lender_applications: [case4LenderApp],
		primary_lender_id: case4LenderAppId,
		optional_contact: { full_name: 'Deepak Joshi', mobile: '9871234560' },
		source: { type: 'referral', label: 'Friend Referral' },
		created_at: daysAgo(14),
		updated_at: daysAgo(5),
		is_archived: false,
		is_sample: true
	};

	const case4Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case4Id,
			event_type: 'case_created',
			description: 'Case created: HL — Thane 2BHK',
			created_at: daysAgo(14)
		},
		{
			case_id: case4Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(12)
		},
		{
			case_id: case4Id,
			event_type: 'lender_added',
			description: 'SBI added as lender',
			metadata: { lender_name: 'SBI' },
			created_at: daysAgo(9)
		},
		{
			case_id: case4Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(9)
		},
		{
			case_id: case4Id,
			event_type: 'document_uploaded',
			description: 'All documents uploaded (14/14)',
			created_at: daysAgo(6)
		},
		{
			case_id: case4Id,
			event_type: 'stage_changed',
			description: 'File submitted to SBI',
			metadata: { from: 'file_building', to: 'submitted' },
			created_at: daysAgo(5)
		}
	];

	const thread4Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa1Id,
			message:
				'Sharing HL case for a 2BHK in Thane — Rs 45 lakh. SBI selected as lender. All docs are in.',
			message_type: 'case_shared',
			created_at: daysAgo(5)
		},
		{
			sender_role: 'rm',
			sender_id: rmId,
			message: 'File received. Will initiate login and update you once processing begins.',
			message_type: 'text',
			created_at: daysAgo(4)
		}
	];

	const thread4: Omit<CommunicationThread, '_id'> = {
		case_id: case4Id,
		dsa_id: sampleDsa1Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Rajesh Patel',
		lender_name: 'SBI',
		messages: thread4Messages,
		status: 'active',
		created_at: daysAgo(5),
		updated_at: daysAgo(4)
	};

	// ══════════════════════════════════════════════════════════════
	// CASE 5: BT — Rate Switch (Balance Transfer, file_building)
	// DSA: Meera Investments | Lender: Kotak Mahindra Bank
	// ══════════════════════════════════════════════════════════════

	const case5Id = 'SAMPLE-RM-BT-2026-0005';
	const case5LenderAppId = uuid();

	const case5StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(7) },
		{ from: 'intake', to: 'profiling', timestamp: daysAgo(6) },
		{
			from: 'profiling',
			to: 'file_building',
			timestamp: daysAgo(4),
			notes: 'Document collection started for BT'
		}
	];

	const case5LenderStatusHistory: StatusTransition[] = [
		{ from: 'selected' as any, to: 'selected', timestamp: daysAgo(4) },
		{ from: 'selected', to: 'file_building', timestamp: daysAgo(4) }
	];

	const case5LenderApp: LenderApplication = {
		lender_application_id: case5LenderAppId,
		lender_id: 'kotak-mahindra-bank',
		lender_name: 'Kotak Mahindra Bank',
		status: 'file_building',
		status_history: case5LenderStatusHistory,
		eligibility_snapshot: {
			traffic_light: 'amber',
			message:
				'Profile conditionally eligible at Kotak Mahindra Bank — BT cases require existing loan account statement',
			computed_at: daysAgo(4)
		},
		document_checklist: buildLAPDocChecklist(),
		queries: [],
		file_snapshots: [],
		created_at: daysAgo(4),
		updated_at: daysAgo(3)
	};

	const case5: Case = {
		case_id: case5Id,
		dsa_id: sampleDsa2Id,
		label: 'BT — Rate Switch',
		loan: { type: 'Balance Transfer', amount_required: 3500000, purpose: 'Rate Reduction' },
		stage: 'file_building',
		stage_history: case5StageHistory,
		lender_applications: [case5LenderApp],
		primary_lender_id: case5LenderAppId,
		optional_contact: { full_name: 'Ramesh Kulkarni', mobile: '9922334455' },
		source: { type: 'self' },
		created_at: daysAgo(7),
		updated_at: daysAgo(3),
		is_archived: false,
		is_sample: true
	};

	const case5Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case5Id,
			event_type: 'case_created',
			description: 'Case created: BT — Rate Switch',
			created_at: daysAgo(7)
		},
		{
			case_id: case5Id,
			event_type: 'stage_changed',
			description: 'Stage changed to Profiling',
			metadata: { from: 'intake', to: 'profiling' },
			created_at: daysAgo(6)
		},
		{
			case_id: case5Id,
			event_type: 'lender_added',
			description: 'Kotak Mahindra Bank added as lender',
			metadata: { lender_name: 'Kotak Mahindra Bank' },
			created_at: daysAgo(4)
		},
		{
			case_id: case5Id,
			event_type: 'stage_changed',
			description: 'Stage changed to File Building',
			metadata: { from: 'profiling', to: 'file_building' },
			created_at: daysAgo(4)
		},
		{
			case_id: case5Id,
			event_type: 'document_uploaded',
			description: '7 of 14 documents uploaded',
			created_at: daysAgo(3)
		}
	];

	const thread5Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa2Id,
			message:
				'Sharing a BT case — Rs 35 lakh, existing loan with another bank at 10.5%. Looking for rate reduction with Kotak. Still gathering documents.',
			message_type: 'case_shared',
			created_at: daysAgo(4)
		}
	];

	const thread5: Omit<CommunicationThread, '_id'> = {
		case_id: case5Id,
		dsa_id: sampleDsa2Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Meera Investments',
		lender_name: 'Kotak Mahindra Bank',
		messages: thread5Messages,
		status: 'active',
		created_at: daysAgo(4),
		updated_at: daysAgo(4)
	};

	// ══════════════════════════════════════════════════════════════
	// CASE 6: HL — Pune Villa (Home Loan, intake)
	// DSA: Arjun Nair | Lender: none yet
	// ══════════════════════════════════════════════════════════════

	const case6Id = 'SAMPLE-RM-HL-2026-0006';

	const case6StageHistory: StageTransition[] = [
		{ from: 'intake' as any, to: 'intake', timestamp: daysAgo(1) }
	];

	const case6: Case = {
		case_id: case6Id,
		dsa_id: sampleDsa3Id,
		label: 'HL — Pune Villa',
		loan: { type: 'Home Loan', amount_required: 9000000, tenure_years: 25, purpose: 'Purchase' },
		stage: 'intake',
		stage_history: case6StageHistory,
		lender_applications: [],
		optional_contact: { full_name: 'Anil Jain', mobile: '9833445566' },
		source: { type: 'builder', label: 'Pune Realtors' },
		created_at: daysAgo(1),
		updated_at: daysAgo(1),
		is_archived: false,
		is_sample: true
	};

	const case6Timeline: Omit<TimelineEvent, '_id'>[] = [
		{
			case_id: case6Id,
			event_type: 'case_created',
			description: 'Case created: HL — Pune Villa',
			created_at: daysAgo(1)
		}
	];

	const thread6Messages: ThreadMessage[] = [
		{
			sender_role: 'dsa',
			sender_id: sampleDsa3Id,
			message:
				'New case — home loan for a villa in Baner, Pune. Rs 90 lakh. Just started intake, will share complete file soon.',
			message_type: 'case_shared',
			created_at: daysAgo(1)
		}
	];

	const thread6: Omit<CommunicationThread, '_id'> = {
		case_id: case6Id,
		dsa_id: sampleDsa3Id,
		rm_id: rmId,
		rm_name: rmName,
		dsa_name: 'Arjun Nair',
		lender_name: '',
		messages: thread6Messages,
		status: 'active',
		created_at: daysAgo(1),
		updated_at: daysAgo(1)
	};

	// ══════════════════════════════════════════════════════════════
	// ACCURACY RATINGS (for cases 1, 3, 4)
	// ══════════════════════════════════════════════════════════════

	const rating1: Omit<AccuracyRating, '_id'> = {
		case_id: case1Id,
		rm_id: rmId,
		lender_app_id: case1LenderAppId,
		lender_name: rmBankName,
		rating: 4,
		category: 'income_estimation',
		comment: 'Income estimation was accurate — salary slips matched the profiled amount.',
		disclaimer_accepted: true,
		created_at: daysAgo(6)
	};

	const rating2: Omit<AccuracyRating, '_id'> = {
		case_id: case3Id,
		rm_id: rmId,
		lender_app_id: case3LenderAppId,
		lender_name: rmBankName,
		rating: 5,
		category: 'property_valuation',
		comment: 'Valuation report was spot-on. Property valued within 2% of estimate.',
		disclaimer_accepted: true,
		created_at: daysAgo(3)
	};

	const rating3: Omit<AccuracyRating, '_id'> = {
		case_id: case4Id,
		rm_id: rmId,
		lender_app_id: case4LenderAppId,
		lender_name: rmBankName,
		rating: 3,
		category: 'eligibility_check',
		disclaimer_accepted: true,
		created_at: daysAgo(4)
	};

	// ══════════════════════════════════════════════════════════════
	// RM BROADCASTS (2 broadcasts to connected DSAs)
	// ══════════════════════════════════════════════════════════════

	const broadcast1: Omit<RMBroadcast, '_id'> = {
		rm_id: rmId,
		rm_name: rmName,
		lender_name: rmBankName,
		title: 'Home Loan Rate Revision',
		body: `${bankLabel} has revised home loan interest rates effective this month. New rates start from 8.35% for salaried customers with CIBIL 750+. Please update your customers accordingly.`,
		footer:
			'\u26a0\ufe0f This information is shared by the RM based on their understanding. The platform does not guarantee it. Please confirm through official channels.',
		target_dsa_ids: [sampleDsa1Id, sampleDsa2Id, sampleDsa3Id],
		read_by: [sampleDsa1Id],
		created_at: daysAgo(5),
		expires_at: daysFromNow(25)
	};

	const broadcast2: Omit<RMBroadcast, '_id'> = {
		rm_id: rmId,
		rm_name: rmName,
		lender_name: rmBankName,
		title: 'Year-End Processing Advisory',
		body: 'Due to year-end rush, please submit all files before the 25th of this month. Files received after that may spill into the next financial year for disbursement.',
		footer:
			'\u26a0\ufe0f This information is shared by the RM based on their understanding. The platform does not guarantee it. Please confirm through official channels.',
		target_dsa_ids: [sampleDsa1Id, sampleDsa2Id, sampleDsa3Id],
		read_by: [],
		created_at: daysAgo(2)
	};

	// ══════════════════════════════════════════════════════════════
	// POLICY DOCUMENT (1 policy uploaded by RM)
	// ══════════════════════════════════════════════════════════════

	const policyDoc1: Omit<PolicyDocument, '_id'> = {
		rm_id: rmId,
		lender_name: rmBankName,
		title: `${bankLabel} — Income Assessment Guidelines 2026`,
		description: 'Updated salary multiplier and ITR assessment rules for home loans and LAP.',
		file_url: 'https://ik.imagekit.io/digitaldsa/sample/policy-income-guidelines-2026.pdf',
		file_id: 'sample-policy-001',
		version: 1,
		notified_dsa_ids: [sampleDsa1Id, sampleDsa3Id],
		created_at: daysAgo(10)
	};

	// ══════════════════════════════════════════════════════════════
	// INSERT ALL DATA
	// ══════════════════════════════════════════════════════════════

	await Promise.all([
		// Insert 6 cases
		Cases.insertMany([case1, case2, case3, case4, case5, case6]),

		// Insert 6 communication threads
		CommunicationThreads.insertMany([
			thread1,
			thread2,
			thread3,
			thread4,
			thread5,
			thread6
		] as CommunicationThread[]),

		// Insert all timeline events (~35 total)
		TimelineEvents.insertMany([
			...case1Timeline,
			...case2Timeline,
			...case3Timeline,
			...case4Timeline,
			...case5Timeline,
			...case6Timeline
		] as TimelineEvent[]),

		// Insert 3 accuracy ratings
		AccuracyRatings.insertMany([rating1, rating2, rating3] as AccuracyRating[]),

		// Insert 2 broadcasts
		RMBroadcasts.insertMany([broadcast1, broadcast2] as RMBroadcast[]),

		// Insert 1 policy document
		PolicyDocuments.insertMany([policyDoc1] as PolicyDocument[]),

		// Mark 2 DSAs as preferred (on rmApplications)
		rmApplications.updateOne(
			{ _id: rmId },
			{ $set: { preferred_dsa_ids: [sampleDsa1Id, sampleDsa3Id] } }
		)
	]);
}
