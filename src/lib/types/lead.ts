// Lead Management Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// LEAD STATUS
// ============================================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'dropped' | 'follow_up';

// ============================================================================
// LEAD STATUS HISTORY
// ============================================================================

export interface LeadStatusChange {
	from: LeadStatus;
	to: LeadStatus;
	timestamp: Date;
	notes?: string;
}

// ============================================================================
// LEAD DOCUMENT
// ============================================================================

export interface Lead {
	_id?: ObjectId;
	lead_id: string; // Auto: LD-{YEAR}-{SEQ}
	dsa_id: ObjectId;
	created_by_member_id?: ObjectId;
	label: string;
	loan_type?: string;
	estimated_amount?: number;
	source_id?: ObjectId;
	optional_contact?: {
		full_name?: string;
		mobile?: string;
		email?: string;
	};
	status: LeadStatus;
	status_history: LeadStatusChange[];
	converted_case_id?: string;
	follow_up_date?: Date;
	notes?: string;
	created_at: Date;
	updated_at: Date;
	is_archived: boolean;
}
