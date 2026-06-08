/**
 * QBC — Quota-Blocked-Case notification emails
 * ══════════════════════════════════════════════════════════════════════
 * Three DSA-facing emails fire across the QBC lifecycle:
 *
 *   sendBufferSaveEmail      — DSA opted to save a case to the buffer
 *                              when their monthly quota was exhausted.
 *                              Fired from /api/evaluate-and-persist after
 *                              the case is persisted at stage='quota_blocked'.
 *
 *   sendAutoUnblockEmail     — Buffer cases auto-transitioned to 'intake'
 *                              and offers were recomputed. Triggered by
 *                              either a plan upgrade or the monthly cycle
 *                              reset. Fired from processBlockedCasesAfter.
 *
 *   sendArchiveExpiredEmail  — Buffer cases sat for >30 days without
 *                              being auto-unblocked and got archived.
 *                              Fired from /api/cron/quota-blocked-archive
 *                              once per affected DSA.
 *
 * All three route through `sendEmail` (src/lib/server/email.ts) which post-
 * SEC-8 dispatches via AWS SES on production, Nodemailer in legacy/dev, or
 * log-only when no credentials are configured.
 *
 * Recipient lookup. Dunning emails read sub.customer_email (populated at
 * mandate-registration time). QBC events can fire for DSAs WITHOUT an
 * active mandate — e.g. a trial Pro user on day 1, or a Basic plan user
 * who overflowed their monthly quota. So we look up the DSA email
 * directly from DsaApplications via resolveDsaEmailRecipient (single
 * projection — no decrypt needed for the email field).
 *
 * Best-effort. Call sites await the result and log on failure but never
 * roll back the underlying DB transition. Matches dunningEmails.ts.
 *
 * English-only in v1; i18n (hi/mr) deferred to Epic H per project
 * convention.
 *
 * Spec: docs/specs/QUOTA-BLOCKED-CASES-SPEC.md §6 + §13 OQ-2.
 * ══════════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import { DsaApplications } from '$lib/database/mongo';
import { sendEmail, type EmailResult } from '$lib/server/email';
import { PUBLIC_BILLING_URL } from '$lib/config/publicAppUrl';
import logger from '$lib/server/logger';
import type { UnblockReason } from './quotaUnblock';

// ── Recipient lookup ───────────────────────────────────────────

export interface DsaEmailRecipient {
	to: string;
	name?: string;
}

/**
 * Look up a DSA's email + name for QBC notifications. Returns null + logs
 * if the DSA has no email on file (data drift — should never happen for
 * an onboarded DSA, but guard so the calling cron/route never crashes).
 *
 * The `email` field is plaintext on DsaApplications (Pitfall #68 / SEC-2
 * Phase C did not encrypt the email column — only mobileNumber + name +
 * PAN). Single projection, no findUserByMobile needed.
 */
export async function resolveDsaEmailRecipient(
	dsaId: ObjectId
): Promise<DsaEmailRecipient | null> {
	const dsa = await DsaApplications.findOne(
		{ _id: dsaId },
		{ projection: { email: 1, name: 1 } }
	);
	const to = dsa?.email?.trim();
	if (!dsa || !to) {
		logger.warn(
			{ dsa_id: String(dsaId) },
			'[QBC-email] DSA has no email on file — skipping notification'
		);
		return null;
	}
	return { to, name: dsa.name };
}

// ── HTML helpers ───────────────────────────────────────────────

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatDateForDsa(iso: string): string {
	// "2026-07-04T..." → "4 Jul 2026" — DSA-readable, no time component.
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/** Shared QBC email frame — same visual language as dunningEmails. */
function buildQbcEmailHtml(
	heading: string,
	leadParagraph: string,
	ctaLabel: string,
	additionalParagraphs: string[] = []
): string {
	const extra = additionalParagraphs.map((p) => `<p>${p}</p>`).join('\n');
	return `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; max-width: 560px; margin: 0 auto; padding: 24px;">
<h2 style="color: #2d3748;">${escapeHtml(heading)}</h2>
<p>Hi,</p>
<p>${leadParagraph}</p>
${extra}
<p style="margin: 28px 0;">
  <a href="${PUBLIC_BILLING_URL}" style="display: inline-block; background: #cb997e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escapeHtml(ctaLabel)}</a>
</p>
<p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 16px; margin-top: 28px;">
  This is an automated email from DigitalDSA. Reply to this email or write to <a href="mailto:support@digitaldsa.com" style="color: #666;">support@digitaldsa.com</a> if you need help.
</p>
</body></html>`;
}

function buildQbcEmailText(
	heading: string,
	leadParagraph: string,
	ctaLabel: string,
	additionalParagraphs: string[] = []
): string {
	const extra = additionalParagraphs.join('\n\n');
	return `${heading}

Hi,

${leadParagraph}

${extra ? `${extra}\n\n` : ''}${ctaLabel}: ${PUBLIC_BILLING_URL}

—
This is an automated email from DigitalDSA. Reply to this email or write to support@digitaldsa.com if you need help.`;
}

// ── Template 1: buffer-save ────────────────────────────────────

export interface BufferSaveEmailInput {
	recipient: DsaEmailRecipient;
	planName: string;
	caseLabel: string;
	nextCycleAtIso: string;
}

/**
 * "Your case is saved to the buffer — it'll process when your next cycle
 * starts on X, or right now if you upgrade."
 *
 * Fires once per buffer-save (one case → one email).
 */
export async function sendBufferSaveEmail(
	input: BufferSaveEmailInput
): Promise<EmailResult> {
	const { recipient, planName, caseLabel, nextCycleAtIso } = input;
	const cycleDate = formatDateForDsa(nextCycleAtIso);

	const heading = `Your case is saved — it'll process on ${cycleDate}`;
	const lead = `You've hit your monthly case limit on the <strong>${escapeHtml(planName)}</strong> plan, so we saved <strong>${escapeHtml(caseLabel)}</strong> to your buffer.`;
	const extra = [
		`On <strong>${escapeHtml(cycleDate)}</strong>, your next billing cycle starts and this case will auto-process — you'll get an email with the offers as soon as that happens.`,
		`Need the offers sooner? You can upgrade your plan right now and the case will process immediately.`
	];

	return sendEmail({
		to: recipient.to,
		subject: `Case saved to buffer — processing on ${cycleDate}`,
		html: buildQbcEmailHtml(heading, lead, 'Upgrade now', extra),
		text: buildQbcEmailText(
			heading,
			`You've hit your monthly case limit on the ${planName} plan, so we saved "${caseLabel}" to your buffer.`,
			'Upgrade now',
			[
				`On ${cycleDate}, your next billing cycle starts and this case will auto-process — you'll get an email with the offers as soon as that happens.`,
				`Need the offers sooner? You can upgrade your plan right now and the case will process immediately.`
			]
		)
	});
}

// ── Template 2: auto-unblock ───────────────────────────────────

export interface AutoUnblockEmailInput {
	recipient: DsaEmailRecipient;
	planName: string;
	unblockedCount: number;
	reason: UnblockReason;
}

/**
 * "Good news — N saved cases just moved out of the buffer and are processing."
 *
 * Fires once per auto-unblock batch (one DSA → one email, regardless of
 * how many cases moved). The reason drives the headline wording.
 */
export async function sendAutoUnblockEmail(
	input: AutoUnblockEmailInput
): Promise<EmailResult> {
	const { recipient, planName, unblockedCount, reason } = input;
	const caseWord = unblockedCount === 1 ? 'case is' : 'cases are';
	const caseCountLabel = unblockedCount === 1 ? '1 saved case' : `${unblockedCount} saved cases`;

	const reasonLine =
		reason === 'upgrade'
			? `Your <strong>${escapeHtml(planName)}</strong> plan upgrade freed up capacity, so we pulled them from the buffer automatically.`
			: `Your monthly cycle reset on the <strong>${escapeHtml(planName)}</strong> plan freed up capacity, so we pulled them from the buffer automatically.`;

	const heading =
		reason === 'upgrade'
			? `Upgrade processed — ${caseCountLabel} now active`
			: `New cycle — ${caseCountLabel} now active`;

	const lead = `Good news — ${caseCountLabel} from your buffer ${caseWord} now processing.`;
	const extra = [
		reasonLine,
		`Lender offers usually take a few seconds to compute. Open the dashboard to see the results, or wait for the per-case offer emails.`
	];

	return sendEmail({
		to: recipient.to,
		subject: heading,
		html: buildQbcEmailHtml(heading, lead, 'Open dashboard', extra),
		text: buildQbcEmailText(
			heading,
			`Good news — ${caseCountLabel} from your buffer ${caseWord} now processing.`,
			'Open dashboard',
			[
				reason === 'upgrade'
					? `Your ${planName} plan upgrade freed up capacity, so we pulled them from the buffer automatically.`
					: `Your monthly cycle reset on the ${planName} plan freed up capacity, so we pulled them from the buffer automatically.`,
				`Lender offers usually take a few seconds to compute. Open the dashboard to see the results, or wait for the per-case offer emails.`
			]
		)
	});
}

// ── Template 3: archive-expired ────────────────────────────────

export interface ArchiveExpiredEmailInput {
	recipient: DsaEmailRecipient;
	archivedCount: number;
}

/**
 * "N saved cases were archived after 30 days. Data isn't lost; reopen any
 * case from the Cases list to re-submit."
 *
 * Fires once per affected DSA per archive cron run. Sent with deliberately
 * gentle tone — the archive doesn't delete; it just stops auto-processing.
 */
export async function sendArchiveExpiredEmail(
	input: ArchiveExpiredEmailInput
): Promise<EmailResult> {
	const { recipient, archivedCount } = input;
	const caseWord = archivedCount === 1 ? 'case was' : 'cases were';
	const caseCountLabel = archivedCount === 1 ? '1 saved case' : `${archivedCount} saved cases`;

	const heading = `${caseCountLabel} archived from your buffer`;
	const lead = `${caseCountLabel} sat in your buffer for over 30 days and ${caseWord} archived as part of routine cleanup.`;
	const extra = [
		`<strong>Nothing was deleted</strong> — the case data is preserved. You can reopen any archived case from your Cases list and re-submit it if you want offers computed.`,
		`Cases land in the buffer when you've hit your monthly quota. To avoid this in future, upgrade your plan or process cases as the cycle progresses.`
	];

	return sendEmail({
		to: recipient.to,
		subject: heading,
		html: buildQbcEmailHtml(heading, lead, 'Open cases', extra),
		text: buildQbcEmailText(
			heading,
			`${caseCountLabel} sat in your buffer for over 30 days and ${caseWord} archived as part of routine cleanup.`,
			'Open cases',
			[
				`Nothing was deleted — the case data is preserved. You can reopen any archived case from your Cases list and re-submit it if you want offers computed.`,
				`Cases land in the buffer when you've hit your monthly quota. To avoid this in future, upgrade your plan or process cases as the cycle progresses.`
			]
		)
	});
}
