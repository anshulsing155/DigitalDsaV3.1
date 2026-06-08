import type { ObjectId } from 'mongodb';

export interface ThreadMessage {
	sender_role: 'dsa' | 'rm';
	sender_id: ObjectId;
	message: string;
	message_type: 'text' | 'case_shared' | 'query' | 'response';
	created_at: Date;
}

export interface CommunicationThread {
	_id?: ObjectId;
	case_id: string;
	dsa_id: ObjectId;
	rm_id: ObjectId;
	rm_name: string;
	dsa_name: string;
	lender_name: string;
	messages: ThreadMessage[];
	status: 'active' | 'closed';
	created_at: Date;
	updated_at: Date;
	/**
	 * Audit-fix (RM dashboard audit 2026-05-30): per-RM last-seen
	 * timestamp. Server compares it against DSA-authored message
	 * timestamps to compute unread counts on the thread list.
	 * Missing/null on legacy threads → treated as never-seen, so the
	 * first-load badge surfaces every existing DSA message until the
	 * RM opens the thread (acceptable migration behavior).
	 */
	rm_last_seen_at?: Date | null;
}
