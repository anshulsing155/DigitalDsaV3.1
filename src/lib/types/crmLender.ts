// CRM Lender Relationship Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// CRM LENDER DOCUMENT
// ============================================================================

export interface CRMLender {
	_id?: ObjectId;
	dsa_id: ObjectId;
	lender_name: string;
	branch?: string;
	city?: string;
	rm_contact_ids: ObjectId[];
	empanelled: boolean;
	dsa_code_at_lender?: string;
	total_cases: number;
	total_sanctioned: number;
	avg_processing_days: number;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}
