/**
 * Email suppression list — recipient gate
 * ══════════════════════════════════════════════════════════════════
 * Reads `email_status` from DsaApplications + rmApplications and
 * filters out addresses that AWS SES has reported as a permanent
 * bounce or complaint (set by /api/webhook/ses-bounce).
 *
 * Why filter at our layer when SES has its own account-level
 * suppression list:
 *   - SES suppression silently drops the message at AWS. We never
 *     see the delivery attempt → no operator visibility, no recovery
 *     UX. Our suppression gives us a per-user `email_suppressed_at`
 *     timestamp + an admin flip-back affordance.
 *   - SES suppression is global to the AWS account — flipping it
 *     back requires an AWS console action. Ours is a single Mongo
 *     update.
 *   - Saves on SES API quota for known-dead addresses.
 *
 * Performance note: this adds one indexed Mongo find per sendEmail
 * call (typically ~5 ms). The collections have a `{ email: 1 }`
 * index already (per mongo.ts ensureIndexes setup).
 * ══════════════════════════════════════════════════════════════════
 */

import { DsaApplications, rmApplications } from '$lib/database/mongo';
import logger from '$lib/server/logger';

/**
 * Filter a list of recipient addresses, dropping any that are
 * suppressed in DsaApplications or rmApplications.
 *
 * Returns the surviving recipients + a list of dropped ones for
 * caller-side logging. Drop list is empty in the common case (no
 * suppressed recipients), so the caller can fast-path on `dropped.length === 0`.
 *
 * Errors are caught + logged; on failure we return the ORIGINAL
 * recipients (fail-open). A Mongo blip should not block all email
 * sends — the SES-side suppression list is the backstop.
 */
export async function filterSuppressedRecipients(
	recipients: string[]
): Promise<{ allowed: string[]; dropped: string[] }> {
	if (recipients.length === 0) return { allowed: [], dropped: [] };

	// Normalize to lowercase + trim once. The webhook stores lowercased
	// addresses; matching here is case-insensitive against that input.
	const normalized = recipients.map((r) => r.toLowerCase().trim()).filter(Boolean);
	if (normalized.length === 0) return { allowed: [], dropped: [] };

	try {
		// Suppression matches: email_status starts with 'suppressed_'.
		// We use $in for the two known suppression states rather than a
		// regex so the indexed query stays covered. Cast to the literal
		// union from the Dsa/Rm types so Mongo's typed find narrows $in.
		const SUPPRESSED_STATES: Array<'suppressed_bounce' | 'suppressed_complaint'> = [
			'suppressed_bounce',
			'suppressed_complaint'
		];

		const [dsaHits, rmHits] = await Promise.all([
			DsaApplications.find(
				{ email: { $in: normalized }, email_status: { $in: SUPPRESSED_STATES } },
				{ projection: { email: 1 } }
			)
				.limit(normalized.length)
				.toArray(),
			rmApplications.find(
				{ email: { $in: normalized }, email_status: { $in: SUPPRESSED_STATES } },
				{ projection: { email: 1 } }
			)
				.limit(normalized.length)
				.toArray()
		]);

		const suppressedSet = new Set<string>();
		for (const doc of [...dsaHits, ...rmHits]) {
			const e = (doc as { email?: string }).email;
			if (e) suppressedSet.add(e.toLowerCase().trim());
		}

		if (suppressedSet.size === 0) {
			return { allowed: recipients, dropped: [] };
		}

		const allowed: string[] = [];
		const dropped: string[] = [];
		for (const original of recipients) {
			const norm = original.toLowerCase().trim();
			if (suppressedSet.has(norm)) {
				dropped.push(original);
			} else {
				allowed.push(original);
			}
		}
		return { allowed, dropped };
	} catch (err) {
		// Fail-open: a Mongo problem must NOT silently drop email. Log
		// and return the original list so the send proceeds.
		logger.error(
			{ err: (err as Error).message, recipientCount: recipients.length },
			'suppressionList: Mongo lookup failed — falling back to fail-open (sending to all)'
		);
		return { allowed: recipients, dropped: [] };
	}
}
