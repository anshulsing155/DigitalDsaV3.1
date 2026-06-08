/**
 * D.1 S3 — Billing audit log writer
 * ══════════════════════════════════════════════════════════════════
 * Sibling to `src/lib/server/auditLog.ts` (which writes to PolicyAuditLogs
 * with a policy-shaped schema). Billing events have a different domain
 * shape (event_class + event_name + payload vs target_type + action +
 * details), different retention (6 years for regulatory compliance per
 * spec §11 Q1 vs 2 years for policy audit), and a different access
 * surface (billing endpoints + cron only, vs admin tooling for policy).
 *
 * The S3 I-4 owner decision said "reuse writeAuditLog with collection-
 * override". On reading the existing helper I found the shapes are
 * genuinely different — forcing billing through the policy schema would
 * mean stuffing event_class into target_type and event_name into action,
 * which would defeat the typed-enum protection the policy helper provides.
 * So this is a sibling helper that mirrors the SAME pattern (single entry
 * point, structured insert, swallowed error, logger trail) but writes
 * the billing shape natively. Documented divergence from I-4 in M2's
 * commit body.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §11 Q1
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import { BillingAuditLogs } from '$lib/database/mongo';
import type { BillingAuditLogDoc } from '$lib/types/billingSubscription';
import logger from '$lib/server/logger';

/** Public input shape. _id + created_at are filled by the helper. */
export interface WriteBillingAuditLogEntry {
	event_class: BillingAuditLogDoc['event_class'];
	event_name: string;
	event_id?: string;
	subscription_id?: ObjectId;
	dsa_id?: ObjectId;
	actor: BillingAuditLogDoc['actor'];
	actor_id?: ObjectId;
	/**
	 * Free-form payload. CALLERS MUST scrub PII / secrets before passing
	 * (no mandate_token, no customer_email, no full payment-instrument
	 * details). The OTel PII_ATTR_KEYS scrubber does NOT run on this path
	 * because it's a direct Mongo insert.
	 */
	payload: Record<string, unknown>;
}

/**
 * Insert a billing audit row. Errors are logged but not thrown — audit
 * failures must not abort a charge or webhook handler.
 *
 * Same intentional design as `writeAuditLog`: the operation we're auditing
 * is the SOURCE OF TRUTH; an audit-row failure should never block it.
 */
export async function writeBillingAuditLog(entry: WriteBillingAuditLogEntry): Promise<void> {
	try {
		const doc: BillingAuditLogDoc = {
			...entry,
			created_at: new Date()
		};
		await BillingAuditLogs.insertOne(doc);
	} catch (err) {
		const e = err as { message?: string };
		// Log + swallow. The downstream operation (charge / transition /
		// webhook ack) MUST proceed regardless — audit failure is observable
		// via the logger trail.
		logger.error(
			{
				err: e.message,
				event_class: entry.event_class,
				event_name: entry.event_name,
				subscription_id: entry.subscription_id?.toString(),
				dsa_id: entry.dsa_id?.toString()
			},
			'billingAudit: write failed (swallowed)'
		);
	}
}
