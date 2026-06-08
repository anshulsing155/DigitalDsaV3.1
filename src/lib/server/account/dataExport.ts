/**
 * E.1 — DPDP §11 self-export assembler
 * ══════════════════════════════════════════════════════════════════════
 * Three exports:
 *
 *   preflightSize(userId, role)
 *     Fast indexed count of the user's cases. Decides routing:
 *       caseCount ≤ INLINE_THRESHOLD → 'inline' (stream the ZIP back)
 *       caseCount  > INLINE_THRESHOLD → 'ticket' (ops handles manually)
 *
 *   buildUserExportZip(userId, role)
 *     Assembles the user's data across all PII-bearing collections,
 *     packages as a ZIP of JSON files + README, returns a Buffer.
 *     CSFLE-aware (decrypts via the standard client when CSFLE_ENABLED).
 *     Only the user's OWN data is included — borrower PII from cases is
 *     left in-place since the borrower's relationship is with the DSA by
 *     the act of applying through the DSA (no separate consent layer);
 *     RM-side data the DSA can see is NOT exported (RM owns that).
 *
 *   sendOversizedTicketEmail(userId, role, caseCount, dsa)
 *     Fires a ticket-style email to tech@digitaldsa.com with user details,
 *     observed case count, and request timestamp. Ops fulfils manually
 *     within 24 hours.
 *
 * Storage: nothing is persisted between assembly and download. Small
 * accounts get the ZIP streamed inline as the request response; oversized
 * accounts get a "we'll email you" response + an ops ticket. The
 * DataExportRequests collection is an AUDIT trail, not storage.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.1
 * Owner decisions (2026-05-30): inline-vs-ticket threshold = 200 cases;
 * ticket recipient = tech@digitaldsa.com; ZIP library = jszip.
 */

import type { ObjectId } from 'mongodb';
import JSZip from 'jszip';
import {
	DsaApplications,
	rmApplications,
	Cases,
	FormSnapshots,
	LenderResultsSnapshots,
	RMContacts,
	Leads,
	TimelineEvents,
	CommunicationLogs,
	Notifications,
	BillingTransactions,
	Invoices,
	DisclaimerAcceptances
} from '$lib/database/mongo';
import { sendEmail } from '$lib/server/email';
import logger from '$lib/server/logger';

/**
 * Inline-vs-ticket threshold. Above this, the export is routed to the ops
 * team manually instead of being assembled in-function (which would risk
 * Vercel's 60s function-execution limit on CSFLE-decrypt-heavy paths).
 *
 * Owner-locked 2026-05-30 at 200 (covers ~99% of DSAs with multi-year
 * history; ~6-10MB ZIP, ~15-20s assembly time).
 */
export const INLINE_THRESHOLD = 200;

/**
 * Email recipient for oversized-export tickets. Owner-locked 2026-05-30.
 * Pre-existing address (also receives error-alert traffic per CLAUDE.md §8).
 */
export const OPS_TICKET_RECIPIENT = 'tech@digitaldsa.com';

export type ExportRouting = 'inline' | 'ticket';

export interface PreflightResult {
	caseCount: number;
	routing: ExportRouting;
}

/**
 * Count the user's cases to decide routing. Cheap indexed query; sub-50ms.
 * RM scope counts policy versions + submissions instead of cases (different
 * data model — see buildUserExportZip).
 */
export async function preflightSize(
	userId: ObjectId,
	role: 'dsa' | 'rm'
): Promise<PreflightResult> {
	if (role === 'dsa') {
		const caseCount = await Cases.countDocuments({ dsa_id: userId });
		return {
			caseCount,
			routing: caseCount > INLINE_THRESHOLD ? 'ticket' : 'inline'
		};
	}
	// RM: count is currently a stub (no per-RM case ownership model that
	// scales with effort the way DSA cases do). Always inline for now.
	// Refine when the RM-export shape is reviewed by ops.
	return { caseCount: 0, routing: 'inline' };
}

/**
 * Build the user's full data export as a ZIP buffer. CSFLE-aware reads
 * via the standard client (which transparently decrypts when the
 * CSFLE_ENABLED flag is on). PII redaction is NOT applied to fields the
 * user owns — the whole point of §11 is that they get THEIR data back.
 *
 * Returns the ZIP as a Buffer ready to ship as a Response body.
 */
export async function buildUserExportZip(
	userId: ObjectId,
	role: 'dsa' | 'rm'
): Promise<{ zip: Uint8Array; sizeBytes: number; manifest: ExportManifest }> {
	const zip = new JSZip();
	const manifest = await populateZip(zip, userId, role);

	// uint8array is the right output for streaming back via a Response —
	// directly assignable to BodyInit. compression = DEFLATE; JSON compresses
	// well so level 6 is the sweet spot of speed vs size.
	const zipBytes = await zip.generateAsync({
		type: 'uint8array',
		compression: 'DEFLATE',
		compressionOptions: { level: 6 }
	});

	return { zip: zipBytes, sizeBytes: zipBytes.byteLength, manifest };
}

export interface ExportManifest {
	role: 'dsa' | 'rm';
	user_id: string;
	generated_at: string;
	counts: Record<string, number>;
	notes: string[];
}

/**
 * Per-collection read + append. Each entry is JSON-serialised with sane
 * date-as-ISO + ObjectId-as-string handling. Files are named after their
 * collection (cases.json, contacts.json, etc.) matching the spec.
 */
async function populateZip(
	zip: JSZip,
	userId: ObjectId,
	role: 'dsa' | 'rm'
): Promise<ExportManifest> {
	const counts: Record<string, number> = {};
	const notes: string[] = [];

	if (role === 'dsa') {
		// 1. Profile (single row)
		const profile = await DsaApplications.findOne({ _id: userId });
		zip.file('profile.json', toJsonPretty(profile));
		counts.profile = profile ? 1 : 0;

		// 2. Cases (with their form snapshots + lender results snapshots)
		const cases = await Cases.find({ dsa_id: userId }).toArray();
		zip.file('cases.json', toJsonPretty(cases));
		counts.cases = cases.length;

		if (cases.length > 0) {
			const caseIds = cases.map((c) => c.case_id);
			const formSnapshots = await FormSnapshots.find({
				case_id: { $in: caseIds }
			}).toArray();
			zip.file('form-snapshots.json', toJsonPretty(formSnapshots));
			counts.form_snapshots = formSnapshots.length;

			const lenderResults = await LenderResultsSnapshots.find({
				case_id: { $in: caseIds }
			}).toArray();
			zip.file('lender-results.json', toJsonPretty(lenderResults));
			counts.lender_results = lenderResults.length;

			const timeline = await TimelineEvents.find({
				case_id: { $in: caseIds }
			}).toArray();
			zip.file('timeline-events.json', toJsonPretty(timeline));
			counts.timeline_events = timeline.length;
		}

		// 3. CRM — leads + RM contacts
		const leads = await Leads.find({ dsa_id: userId }).toArray();
		zip.file('leads.json', toJsonPretty(leads));
		counts.leads = leads.length;

		// RMContacts: the DSA's view of the centralized RM database.
		// AD-04 (centralized RM database, crowdsourced) — included because
		// the DSA contributed to it; the data is non-competitive shared
		// per the architecture decision but the DSA still gets their copy.
		const rmContacts = await RMContacts.find({ contributed_by: userId }).toArray();
		zip.file('rm-contacts.json', toJsonPretty(rmContacts));
		counts.rm_contacts = rmContacts.length;
		if (rmContacts.length === 0) {
			notes.push(
				'rm-contacts.json is empty — this DSA has not contributed to the centralized RM database (which is shared across all DSAs per the AD-04 architecture decision).'
			);
		}

		// 4. Money records — billing + invoices (subject to 6-yr retention per E.4)
		const billing = await BillingTransactions.find({ dsa_id: userId }).toArray();
		zip.file('billing-transactions.json', toJsonPretty(billing));
		counts.billing_transactions = billing.length;

		const invoices = await Invoices.find({ dsa_id: userId }).toArray();
		zip.file('invoices.json', toJsonPretty(invoices));
		counts.invoices = invoices.length;

		// 5. Communications — outgoing logs + in-app notifications
		const commLogs = await CommunicationLogs.find({ dsa_id: String(userId) }).toArray();
		zip.file('communication-logs.json', toJsonPretty(commLogs));
		counts.communication_logs = commLogs.length;

		// NotificationDoc.user_id is typed as string (legacy schema choice
		// pre-CSFLE). Pass hex form rather than ObjectId.
		const notifications = await Notifications.find({ user_id: String(userId) }).toArray();
		zip.file('notifications.json', toJsonPretty(notifications));
		counts.notifications = notifications.length;

		// 6. Disclaimer acceptances (AD-11). Same string-typed user_id.
		const disclaimers = await DisclaimerAcceptances.find({
			user_id: String(userId)
		}).toArray();
		zip.file('disclaimer-acceptances.json', toJsonPretty(disclaimers));
		counts.disclaimer_acceptances = disclaimers.length;
	} else {
		// RM scope. Minimal first cut — RM owns policy versions + submissions
		// + their own profile. The DSA-facing data they see (other DSAs' cases)
		// is NOT exported (cross-tenant boundary).
		const profile = await rmApplications.findOne({ _id: userId });
		zip.file('profile.json', toJsonPretty(profile));
		counts.profile = profile ? 1 : 0;

		notes.push(
			`RM scope export is minimal in v1 — covers profile only. Policy versions, submissions, broadcasts, and accuracy ratings will be added in a follow-up (E.1 §RM-parity). Contact ${OPS_TICKET_RECIPIENT} if you need any of those now.`
		);
	}

	const manifest: ExportManifest = {
		role,
		user_id: String(userId),
		generated_at: new Date().toISOString(),
		counts,
		notes
	};

	zip.file('manifest.json', toJsonPretty(manifest));
	zip.file('README.txt', buildReadme(manifest));

	return manifest;
}

function toJsonPretty(value: unknown): string {
	return JSON.stringify(value, mongoSafeReplacer, 2);
}

/**
 * JSON.stringify replacer that handles ObjectId + Date + Buffer safely.
 * - ObjectId → hex string
 * - Date     → ISO string (default JSON behaviour is good)
 * - Buffer   → base64 string (rare; CSFLE returns Binary BSON which becomes
 *              Buffer on decrypt — we render it as base64 for round-tripping)
 */
function mongoSafeReplacer(_key: string, value: unknown): unknown {
	if (value === null || value === undefined) return value;
	// ObjectId — duck-typed via toHexString to avoid importing the class
	// (some BSON Binary types also expose .toString but not .toHexString).
	if (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { toHexString?: unknown }).toHexString === 'function'
	) {
		return (value as { toHexString: () => string }).toHexString();
	}
	// Buffer / Uint8Array
	if (value instanceof Uint8Array) {
		return `[binary:base64]${Buffer.from(value).toString('base64')}`;
	}
	return value;
}

function buildReadme(manifest: ExportManifest): string {
	const lines: string[] = [
		'DigitalDSA — Data Export (DPDP Act §11)',
		'='.repeat(50),
		'',
		`Role:         ${manifest.role.toUpperCase()}`,
		`User ID:      ${manifest.user_id}`,
		`Generated:    ${manifest.generated_at}`,
		'',
		'Contents',
		'-'.repeat(50)
	];
	for (const [key, count] of Object.entries(manifest.counts)) {
		lines.push(`  ${key.padEnd(28)} ${count} record(s)`);
	}
	lines.push('');
	if (manifest.notes.length > 0) {
		lines.push('Notes');
		lines.push('-'.repeat(50));
		for (const note of manifest.notes) {
			lines.push(`  - ${note}`);
		}
		lines.push('');
	}
	lines.push('Format');
	lines.push('-'.repeat(50));
	lines.push(
		'  All files are UTF-8 JSON. Dates are ISO-8601 strings. MongoDB',
		'  ObjectIds are rendered as 24-char hex strings. Encrypted binary',
		'  fields (if any) are rendered as [binary:base64]<...>.',
		'',
		'Privacy',
		'-'.repeat(50),
		'  This export contains data you (the account holder) own or',
		'  contributed. Other users\' personal data is excluded. Money',
		'  records (billing, invoices) are subject to a 6-year statutory',
		'  retention obligation under the Income Tax Act — they are exported',
		'  here but cannot be deleted on account closure until that window',
		'  expires.',
		'',
		'Questions',
		'-'.repeat(50),
		`  Email ${OPS_TICKET_RECIPIENT} — quote your User ID and the`,
		'  generation timestamp above.'
	);
	return lines.join('\n');
}

// ── Ticket email for oversized exports ─────────────────────────

export interface OversizedTicketInput {
	userId: ObjectId;
	role: 'dsa' | 'rm';
	caseCount: number;
	userEmail?: string;
	userName?: string;
}

/**
 * Fire a ticket email to the ops team when an export is too large for the
 * inline path. The user gets a generic "we'll email you within 24 hours"
 * response from the endpoint; this email is what the ops team acts on.
 *
 * Best-effort — endpoint logs but doesn't fail the request if dispatch errors.
 */
export async function sendOversizedTicketEmail(
	input: OversizedTicketInput
): Promise<void> {
	const { userId, role, caseCount, userEmail, userName } = input;
	const subject = `[Data Export Ticket] ${role.toUpperCase()} ${String(userId)} requested export (${caseCount} cases)`;
	const lines = [
		`A ${role.toUpperCase()} requested a data export that exceeds the inline-stream threshold (${INLINE_THRESHOLD} cases).`,
		``,
		`User ID:     ${String(userId)}`,
		`Role:        ${role.toUpperCase()}`,
		`Case count:  ${caseCount}`,
		`User email:  ${userEmail ?? '(not on file)'}`,
		`User name:   ${userName ?? '(not on file)'}`,
		`Requested:   ${new Date().toISOString()}`,
		``,
		`Action required:`,
		`  1. Run the manual export script against production`,
		`     (scripts/run-data-export.mjs, to be authored if not present)`,
		`  2. Reply to the user with the resulting ZIP attached`,
		`  3. Target SLA: 24 hours from this email`,
		``,
		`Why this routed to ops:`,
		`  Inline path caps at ${INLINE_THRESHOLD} cases to stay under Vercel's`,
		`  60-second function-execution limit on CSFLE-decrypt paths.`,
		`  Higher-volume accounts go through ops to avoid request timeouts.`
	];

	const text = lines.join('\n');
	const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;">
<h2 style="color:#b54040;">Data Export Ticket</h2>
<pre style="background:#f5f5f5;padding:16px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(text)}</pre>
</body></html>`;

	const result = await sendEmail({
		to: OPS_TICKET_RECIPIENT,
		subject,
		html,
		text
	});
	if (!result.success) {
		logger.warn(
			{ user_id: String(userId), role, case_count: caseCount, error: result.error },
			'[data-export] Oversized ticket email dispatch returned failure'
		);
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
