/**
 * DataExportRequests — DPDP §11 self-export audit ledger
 * ══════════════════════════════════════════════════════════════════════
 * One row per user-initiated data-export request. Powers two things:
 *
 *   1. Rate-limit enforcement — a user can request once per 30 days. The
 *      endpoint looks up the most-recent row (sorted by requested_at desc)
 *      and rejects if it's within the 30-day window.
 *
 *   2. Compliance audit trail — every request + the routing decision
 *      (inline-streamed vs queued-to-ops) is durably logged with timestamp,
 *      observed case count, and bytes streamed (when applicable). DPDP §11
 *      access claims need a paper trail of when each request fulfilled.
 *
 * Storage strategy: the export ZIP itself is NEVER persisted. Small accounts
 * (≤200 cases) get the ZIP streamed back as the request response — no
 * intermediate storage anywhere. Oversized accounts get a friendly "we'll
 * email you within 24 hours" response, and the ops team handles the export
 * manually (a ticket email lands in tech@digitaldsa.com with user details).
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.1
 */

import type { ObjectId } from 'mongodb';

export interface DataExportRequestDoc {
	_id?: ObjectId;
	/** The user (DSA or RM) who requested the export. */
	user_id: ObjectId;
	/** Which role the request was made under (affects what's included). */
	role: 'dsa' | 'rm';
	/** When the request hit the server. Used for the 30-day rate-limit lookup. */
	requested_at: Date;
	/**
	 * 'streamed' — ZIP was built + sent back inline, no further action needed.
	 * 'queued'   — over the inline threshold; ticket email fired to ops team,
	 *              human-driven export expected within 24 hours.
	 */
	status: 'streamed' | 'queued';
	/** Case count observed at preflight (drives the routing decision + sizing audit). */
	case_count: number;
	/** Total bytes streamed (only set on 'streamed' rows). */
	bytes_streamed?: number;
	/** Captured for audit; not surfaced in UI. */
	user_agent?: string;
	/** Captured for audit; not surfaced in UI. */
	ip_address?: string;
}
