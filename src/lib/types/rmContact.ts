// RM Contact Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// RM CONTACT TYPE
// ============================================================================

export interface RMContact {
	_id?: ObjectId;
	rm_name: string;
	lender_name: string;
	branch?: string;
	city?: string;
	phone?: string;
	email?: string;
	whatsapp?: string;
	designation?: 'RM' | 'Senior RM' | 'Credit Manager' | 'Branch Manager' | 'Other';
	loan_types_handled?: string[];
	contributed_by: ObjectId[];
	contributed_at: Date;
	last_confirmed_at: Date;
	confirmation_count: number;
	is_active: boolean;
	notes_by_dsa: Record<string, string>; // { [dsa_id]: "responds fast" }
	created_at: Date;
	updated_at: Date;
}
