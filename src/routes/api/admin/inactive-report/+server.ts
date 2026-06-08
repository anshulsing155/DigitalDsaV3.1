import type { RequestHandler } from './$types';
import { Applicant, DsaApplications } from '$lib/database/mongo';
import { sendEmail } from '$lib/server/email.js';
import { FROM_EMAIL } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import { blockDemoWrite, requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import {
	apiOk,
	apiOkMessage,
	apiError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

const ADMIN_EMAIL = env.ADMIN_EMAIL || FROM_EMAIL;

interface InactiveUser {
	name: string;
	email: string;
	mobileNumber: number | string;
	lastActiveAt?: Date | null;
	role: string;
}

/**
 * POST /api/admin/inactive-report
 *
 * Queries all collections for users inactive >180 days,
 * sends a summary email to the admin.
 *
 * Designed to be called by a cron job (e.g., weekly).
 * Protected by a secret key in the request body.
 *
 * Cron setup on MilesWeb cPanel:
 *   curl -X POST https://yourdomain.com/api/admin/inactive-report \
 *     -H "Content-Type: application/json" \
 *     -d '{"cronSecret":"YOUR_CSRF_SECRET_HERE"}'
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const parsed = await parseJsonBody<{ cronSecret?: string }>(request);
		const body = parsed.ok ? parsed.data : {};

		// Simple secret key protection for cron access
		// Reuses CSRF_SECRET as the cron key (or you can add a dedicated CRON_SECRET env var)
		const { cronSecret } = body;
		if (!cronSecret || cronSecret.length < 10) {
			return apiError('Unauthorized', 401);
		}

		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 180);

		// Deleted accounts are physically moved to archive collections,
		// so all docs in active collections are living accounts.
		const inactiveFilter: any = {
			$or: [{ lastActiveAt: { $lt: cutoff } }, { lastActiveAt: { $exists: false } }]
		};
		const projection = { name: 1, email: 1, mobileNumber: 1, lastActiveAt: 1 };

		// DSA-only platform: query Applicant + DsaApplications only
		const [users, dsas] = await Promise.all([
			Applicant.find(inactiveFilter).project(projection).sort({ lastActiveAt: 1 }).toArray(),
			DsaApplications.find(inactiveFilter).project(projection).sort({ lastActiveAt: 1 }).toArray()
		]);

		const allInactive: InactiveUser[] = [
			...users.map((u) => ({
				name: u.name,
				email: u.email,
				mobileNumber: u.mobileNumber,
				lastActiveAt: u.lastActiveAt,
				role: 'User'
			})),
			...dsas.map((u) => ({
				name: u.name,
				email: u.email,
				mobileNumber: u.mobileNumber,
				lastActiveAt: u.lastActiveAt,
				role: 'DSA'
			}))
		];

		if (allInactive.length === 0) {
			return apiOkMessage('No inactive users found. No email sent.');
		}

		// Build the email
		const dateStr = new Date().toLocaleDateString('en-IN', {
			timeZone: 'Asia/Kolkata',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		// Build table rows
		const tableRows = allInactive
			.slice(0, 50)
			.map((u, i) => {
				const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
				const lastActive = u.lastActiveAt
					? new Date(u.lastActiveAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
					: 'Never';
				return `<tr style="background: ${bg};">
                <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${u.name}</td>
                <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${u.mobileNumber}</td>
                <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${u.role}</td>
                <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${lastActive}</td>
            </tr>`;
			})
			.join('');

		const moreText =
			allInactive.length > 50
				? `<p style="font-size: 14px; color: #6b7280; margin: 16px 0 0;">...and ${allInactive.length - 50} more. Check admin dashboard for full list.</p>`
				: '';

		await sendEmail({
			from: `"DigitalDSA Notifications" <${FROM_EMAIL}>`,
			to: ADMIN_EMAIL,
			subject: `Weekly Report — ${allInactive.length} Inactive Users (${dateStr})`,
			html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 700px; margin: 0 auto;">
          <tr>
            <td>
              <table width="100%" style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background-color: #cb997e; padding: 20px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 18px;">Weekly Inactive Users Report</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 30px; color: #333333;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
                      <strong>${allInactive.length}</strong> users have been inactive for more than 180 days.
                    </p>
                    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px;">
                      Report generated on ${dateStr}. Breakdown: ${users.length} Users, ${dsas.length} DSAs.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                      <tr style="background: #2563eb;">
                        <th style="padding: 10px 12px; font-size: 13px; color: #fff; text-align: left;">Name</th>
                        <th style="padding: 10px 12px; font-size: 13px; color: #fff; text-align: left;">Mobile</th>
                        <th style="padding: 10px 12px; font-size: 13px; color: #fff; text-align: left;">Role</th>
                        <th style="padding: 10px 12px; font-size: 13px; color: #fff; text-align: left;">Last Active</th>
                      </tr>
                      ${tableRows}
                    </table>
                    ${moreText}

                    <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0;">
                      Consider sending them a re-engagement offer or message.
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
			text: `Weekly Inactive Users Report — DigitalDSA\n\n${allInactive.length} users inactive for 180+ days.\n\n${allInactive
				.slice(0, 50)
				.map(
					(u) =>
						`${u.name} | ${u.mobileNumber} | ${u.role} | Last: ${u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString('en-IN') : 'Never'}`
				)
				.join('\n')}`
		});

		return apiOk({
			message: `Report sent to ${ADMIN_EMAIL}. ${allInactive.length} inactive users found.`,
			count: allInactive.length
		});
	} catch (error) {
		return apiServerError(error, 'Failed to generate inactive report');
	}
};
