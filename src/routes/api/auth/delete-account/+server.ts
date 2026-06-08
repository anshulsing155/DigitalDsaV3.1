import type { RequestHandler } from './$types';
import { Applicant, DsaApplications, deletedUsers, deletedDsa, Sessions } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { sendEmail } from '$lib/server/email.js';
import { FROM_EMAIL } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiError, apiOkMessage, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';
import logger from '$lib/server/logger.js';
import { dev } from '$app/environment';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import {
	buildTransactionalFooterHtml,
	buildTransactionalFooterText,
	SUPPORT_EMAIL
} from '$lib/server/emailTemplates/footer';

const ADMIN_EMAIL = env.ADMIN_EMAIL || FROM_EMAIL;

/**
 * Delete a user account by MOVING the document to a deleted* archive collection.
 * - Original doc is removed from the active collection (frees mobile number for re-registration)
 * - A copy with deletedAt metadata is inserted into the archive collection (for recovery)
 * - Tokens are cleared and user is logged out
 * - Admin gets notified via email
 */
export const POST: RequestHandler = async ({ locals, cookies, getClientAddress }) => {
	// Upgrade to canonical auth guard (DX-5 style) — replaces the inline
	// locals.user check at the top of the try block.
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlock = blockDemoWrite(locals);
	if (demoBlock) return demoBlock;

	// SEC-4: rate-limit account deletion. Destructive operation — 3/min per
	// user is far more than any legitimate need (a user deletes their account
	// at most once). Per-user identifier so a shared IP doesn't lock out
	// a legitimate delete after one accidental attempt.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-delete:${locals.user!.id}`,
		maxRequests: 3,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many delete attempts. Please wait before trying again.', 429);
	}

	try {
		const user = locals.user!;

		const role = locals.role ?? user.role ?? 'dsa';
		const userId = new ObjectId(user.id);
		const now = new Date();

		// DSA-only platform: DSA or Applicant (admin/user) collections
		let sourceCollection: any;
		let archiveCollection: any;

		if (role === 'dsa') {
			sourceCollection = DsaApplications;
			archiveCollection = deletedDsa;
		} else {
			sourceCollection = Applicant;
			archiveCollection = deletedUsers;
		}

		// 1. Find the original document
		const originalDoc = await sourceCollection.findOne({ _id: userId });

		if (!originalDoc) {
			return apiError('Account not found', 404);
		}

		// SEC-2: decrypt a working copy so the email/cleanup logic below
		// reads plaintext (mobile for the Applicant cleanup lookup, email
		// + name for the deletion confirmation email). The original (still
		// encrypted) doc goes into the archive unchanged — archive
		// preserves on-disk encryption state.
		const originalDocPlain = (await decryptUserPii(originalDoc)) ?? originalDoc;

		// 2. Copy to archive collection with deletion metadata.
		// Archive keeps the encryption state of the active row — if
		// fields were ciphertext in the active collection, they're
		// ciphertext in the archive. Restore-account decrypts on the way
		// back out.
		const { _id, ...docWithoutId } = originalDoc;
		await archiveCollection.insertOne({
			...docWithoutId,
			originalId: _id,
			originalRole: role,
			deletedAt: now,
			deletedReason: 'user_requested'
		});

		// 3. Delete from original collection
		await sourceCollection.deleteOne({ _id: userId });

		// 3a. Revoke EVERY active session row for this user (SEC-8 close-account).
		// Without this, other devices keep valid access tokens until their next
		// ~15-minute refresh-rotation falls over on the missing user row. The
		// UI committed to AWS says closing "immediately stops all email and logs
		// you out of every device" — flipping revoked_at here makes that true
		// instantly: the refresh endpoint's isSessionRevoked() check (hot path)
		// returns true and the device gets kicked on its next request.
		// Best-effort: any failure logs but doesn't roll back the close — the
		// archive + cookie clear already disabled this device, and the orphaned
		// rows are harmless even if revoked_at is never set.
		try {
			const revokeResult = await Sessions.updateMany(
				{ user_id: userId, revoked_at: { $exists: false } },
				{ $set: { revoked_at: now, revoke_reason: 'account_closed' } }
			);
			logger.info(
				{ user_id: String(userId), role, revoked_count: revokeResult.modifiedCount },
				'[delete-account] revoked active sessions'
			);
		} catch (err) {
			logger.warn(
				{ err, user_id: String(userId), role },
				'[delete-account] Sessions revoke failed — proceeding (archive + cookie clear already disabled this device)'
			);
		}

		// 3b. If DSA deletion, also archive the orphaned Applicant record (by mobile)
		//     so re-registration with the same number starts completely clean
		if (role === 'dsa' && originalDocPlain.mobileNumber) {
			const applicantDoc = await findUserByMobile(
				Applicant,
				originalDocPlain.mobileNumber as string | number
			);
			if (applicantDoc) {
				const { _id: appId, ...appWithoutId } = applicantDoc;
				await deletedUsers.insertOne({
					...appWithoutId,
					originalId: appId,
					originalRole: 'user',
					deletedAt: now,
					deletedReason: 'dsa_account_deleted'
				});
				await Applicant.deleteOne({ _id: appId });
			}
		}

		// 4. Send notification emails (fire-and-forget)
		sendDeleteNotificationEmail(
			user.name ?? '',
			user.email ?? '',
			user.mobileNumber ?? '',
			role,
			now
		).catch((err) => {
			logger.error({ err }, 'Failed to send delete notification email');
		});

		// 4b. Send deletion confirmation to the user (30-day recovery info)
		if (originalDocPlain.email) {
			sendUserDeletionConfirmEmail(
				originalDocPlain.email as string,
				(originalDocPlain.name as string) || '',
				role,
				now
			).catch((err) => {
				logger.error({ err }, 'Failed to send user deletion confirmation email');
			});
		}

		// 5. Clear all auth cookies to log out
		const cookieOpts = {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax' as const
		};

		cookies.set('accessToken', '', cookieOpts);
		cookies.set('refreshToken', '', cookieOpts);
		cookies.set('session', '', cookieOpts);
		cookies.set('role', '', cookieOpts);

		return apiOkMessage(
			'Account deleted. Your data will be retained for 30 days for recovery. Log in with the same mobile number to restore.'
		);
	} catch (error) {
		return apiServerError(error, 'Failed to delete account. Please try again.');
	}
};

/**
 * Send account deletion notification to admin
 */
async function sendDeleteNotificationEmail(
	name: string,
	email: string,
	mobile: string,
	role: string,
	deletedAt: Date
) {
	const roleLabel = role.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	const dateStr = deletedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

	// Strip CRLF from user-provided values before interpolating into email.
	// Prevents header/MIME injection via the user-controlled `name`. `role`
	// is server-controlled but sanitized defensively for uniformity.
	const safeName = String(name ?? '').replace(/[\r\n]/g, '');
	const safeRole = String(roleLabel ?? '').replace(/[\r\n]/g, '');

	if (!ADMIN_EMAIL) {
		logger.warn('No ADMIN_EMAIL or FROM_EMAIL configured — skipping delete notification');
		return;
	}

	await sendEmail({
		from: `"DigitalDSA Notifications" <${FROM_EMAIL}>`,
		to: ADMIN_EMAIL,
		subject: `Account Deleted — ${safeName} (${safeRole})`,
		html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <table width="100%" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #dc2626; padding: 20px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 1px;">Account Deleted</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; color: #333333;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      A user has deleted their account on <strong>DigitalDSA</strong>.
                    </p>
                    <table width="100%" cellpadding="8" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; margin: 0 0 20px;">
                      <tr style="background: #f9fafb;">
                        <td style="font-weight: bold; color: #6b7280; width: 120px; font-size: 14px;">Name</td>
                        <td style="font-size: 14px;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #6b7280; font-size: 14px;">Email</td>
                        <td style="font-size: 14px;">${email}</td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="font-weight: bold; color: #6b7280; font-size: 14px;">Mobile</td>
                        <td style="font-size: 14px;">${mobile}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: bold; color: #6b7280; font-size: 14px;">Role</td>
                        <td style="font-size: 14px;">${safeRole}</td>
                      </tr>
                      <tr style="background: #f9fafb;">
                        <td style="font-weight: bold; color: #6b7280; font-size: 14px;">Deleted At</td>
                        <td style="font-size: 14px;">${dateStr}</td>
                      </tr>
                    </table>
                    <p style="font-size: 14px; color: #6b7280; margin: 0;">
                      Data moved to archive (deleted* collection). User can re-register with same mobile. Recovery possible from archive.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                    &copy; ${new Date().getFullYear()} DigitalDSA. Confidential.<br/>
                    <a href="${PUBLIC_APP_BASE_URL}" style="color: #2563eb; text-decoration: none;">www.digitaldsa.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
		text: `Account Deleted — DigitalDSA\n\nName: ${safeName}\nEmail: ${email}\nMobile: ${mobile}\nRole: ${safeRole}\nDeleted At: ${dateStr}\n\nData moved to archive. Recovery possible.`
	});
}

/**
 * Send account deletion confirmation to the user with 30-day recovery info
 */
async function sendUserDeletionConfirmEmail(
	userEmail: string,
	name: string,
	role: string,
	deletedAt: Date
) {
	const dateStr = deletedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
	const expiryDate = new Date(deletedAt);
	expiryDate.setDate(expiryDate.getDate() + 30);
	const expiryStr = expiryDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

	// Strip CRLF from user-controlled name before interpolating into body.
	const safeName = String(name ?? '').replace(/[\r\n]/g, '');

	await sendEmail({
		from: `"DigitalDSA" <${FROM_EMAIL}>`,
		to: userEmail,
		subject: 'Your DigitalDSA Account Has Been Deleted',
		html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td>
              <table width="100%" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #2563eb; padding: 20px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 18px; letter-spacing: 1px;">Account Deleted</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; color: #333333;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hi${safeName ? ` ${safeName}` : ''},
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
                      Your DigitalDSA account was deleted on <strong>${dateStr}</strong>.
                    </p>
                    <div style="background: #f5ebe5; border-left: 4px solid #cb997e; padding: 16px 20px; border-radius: 4px; margin: 0 0 20px;">
                      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px; font-weight: bold; color: #5f3a26;">
                        30-Day Recovery Window
                      </p>
                      <p style="font-size: 14px; line-height: 1.6; margin: 0; color: #2f1d13;">
                        Your data will be retained until <strong>${expiryStr}</strong>. To restore your account, simply log in with the same mobile number and choose "Restore Account" when prompted.
                      </p>
                    </div>
                    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 10px; color: #6b7280;">
                      After 30 days, your data will be permanently deleted and cannot be recovered.
                    </p>
                    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px; color: #6b7280;">
                      If you did not request this deletion, reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}" style="color: #4b5563;">${SUPPORT_EMAIL}</a> immediately.
                    </p>
                    ${buildTransactionalFooterHtml({ recipientEmail: userEmail })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
		text: `Hi${safeName ? ` ${safeName}` : ''},\n\nYour DigitalDSA account was deleted on ${dateStr}.\n\n30-Day Recovery Window:\nYour data will be retained until ${expiryStr}. To restore your account, log in with the same mobile number and choose "Restore Account" when prompted.\n\nAfter 30 days, your data will be permanently deleted.\n\nIf you did not request this deletion, reply to this email or write to ${SUPPORT_EMAIL} immediately.${buildTransactionalFooterText({ recipientEmail: userEmail })}`,
		replyTo: SUPPORT_EMAIL
	});
}
