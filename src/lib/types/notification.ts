/**
 * Notification Types — in-app notification system
 */
import type { ObjectId } from 'mongodb';

/** Categories of notifications */
export type NotificationType =
	| 'case_status'
	| 'lead'
	| 'feedback'
	| 'system'
	| 'billing'
	// PMS notifications (Policy Management System)
	| 'pms_renewal_due'
	| 'pms_assignment_transferred'
	| 'pms_policy_submitted'
	| 'pms_policy_approved'
	| 'pms_policy_rejected';

/** Full notification document as stored in MongoDB */
export interface NotificationDoc {
	_id?: ObjectId;
	user_id: string;
	user_role: 'dsa' | 'rm' | 'admin';
	type: NotificationType;
	title: string;
	message: string;
	case_id?: string;
	action_url?: string;
	read: boolean;
	created_at: Date;
	/** Arbitrary key-value context (e.g. lenderId, policyId, assignmentId) */
	metadata?: Record<string, unknown>;
}

/** Input for creating a new notification (auto-set fields omitted) */
export interface CreateNotificationInput {
	user_id: string;
	user_role: 'dsa' | 'rm' | 'admin';
	type: NotificationType;
	title: string;
	message: string;
	case_id?: string;
	action_url?: string;
	metadata?: Record<string, unknown>;
}
