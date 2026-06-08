// Source Management Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// SOURCE CATEGORIES
// ============================================================================

export type SourceCategory =
	| 'builder'
	| 'ca'
	| 'broker'
	| 'referral'
	| 'online'
	| 'walk_in'
	| 'self'
	| 'other';

// ============================================================================
// SOURCE DOCUMENT
// ============================================================================

export interface Source {
	_id?: ObjectId;
	dsa_id: ObjectId;
	name: string;
	category: SourceCategory;
	contact_name?: string;
	contact_phone?: string;
	contact_email?: string;
	city?: string;
	total_leads: number;
	total_cases: number;
	total_sanctioned: number;
	conversion_rate: number;
	is_active: boolean;
	created_at: Date;
	updated_at: Date;
}
