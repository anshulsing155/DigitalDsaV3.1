/**
 * Shared audit-log helper (C.5).
 *
 * Centralises every audit-row write so each new action site uses the same
 * shape + collection. Pre-C.5 the codebase had a mix of:
 *   - direct PolicyAuditLogs.insertOne calls (rm/submissions, rm/review/respond)
 *   - hacky 'lender' / 'lender_updated' rows for non-policy events
 *     (admins/promote — events stashed in details.event)
 *   - silent no-audit for suspend/role-change (admin/users PATCH)
 *
 * Going forward every privileged admin action calls `writeAuditLog`. New
 * action sites only need to import this and pick the right
 * { target_type, action } pair from the AuditAction + target_type unions
 * in policyEngine.ts.
 *
 * Retention note: PolicyAuditLogs has a 2-year TTL. Per spec C.5, money-
 * events (target_type 'payment' | 'refund') need 6-year retention — when
 * those ship under Epic D, either lift the TTL or route money rows to a
 * separate non-TTL collection. The helper exposes a `retention` hint so
 * callers don't have to track this themselves.
 */

import { PolicyAuditLogs } from '$lib/database/mongo.js';
import type { PolicyAuditLog, AuditAction } from '$lib/types/policyEngine.js';
import logger from '$lib/server/logger.js';

type TargetType = PolicyAuditLog['target_type'];
type ActorRole = PolicyAuditLog['actor_role'];

export interface WriteAuditLogEntry {
	target_type: TargetType;
	target_id: string;
	action: AuditAction;
	actor_id: string;
	actor_name: string;
	actor_role: ActorRole;
	details?: Record<string, unknown>;
}

export interface WriteAuditLogOptions {
	/** 'standard' = 2-year TTL (default). 'extended' = 6-year retention path
	 *  reserved for payment/refund rows under Epic E. Pre-Epic-E both behave
	 *  identically; the hint is plumbed so consumers don't need to revisit. */
	retention?: 'standard' | 'extended';
}

export async function writeAuditLog(
	entry: WriteAuditLogEntry,
	_options: WriteAuditLogOptions = {}
): Promise<void> {
	try {
		await PolicyAuditLogs.insertOne({
			target_type: entry.target_type,
			target_id: entry.target_id,
			action: entry.action,
			actor_id: entry.actor_id,
			actor_name: entry.actor_name,
			actor_role: entry.actor_role,
			details: entry.details ?? {},
			created_at: new Date()
		} as any);
	} catch (err) {
		// Audit writes are best-effort by design — failure must not block the
		// privileged action that produced them (the user has already been
		// suspended / role changed / impersonated). Log loudly so the gap can
		// be investigated.
		logger.error(
			{
				err,
				audit: {
					target_type: entry.target_type,
					target_id: entry.target_id,
					action: entry.action,
					actor_id: entry.actor_id
				}
			},
			'writeAuditLog failed — privileged action proceeded without an audit row'
		);
	}
}
