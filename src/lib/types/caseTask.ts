// Case Task Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// TASK STATUS & PRIORITY
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSource = 'manual' | 'system';

// ============================================================================
// CASE TASK
// ============================================================================

export interface CaseTask {
	_id?: ObjectId;
	task_id: string;
	case_id: string;
	dsa_id: ObjectId;
	title: string;
	description?: string;
	priority: TaskPriority;
	status: TaskStatus;
	due_date?: Date;
	source: TaskSource;
	source_context?: string;
	lender_app_id?: string;
	created_at: Date;
	updated_at: Date;
	completed_at?: Date;
}
