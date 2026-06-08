/**
 * POST /api/cases/[case_id]/share-with-rm
 * ═══════════════════════════════════════════════════════════════════
 * DSA shares a case with an RM.
 * Creates a communication thread and returns WhatsApp/email share data.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { CommunicationThreads, RMContacts, rmApplications } from '$lib/database/mongo.js';
import { generateWhatsAppUrl } from '$lib/server/templateRenderer.js';
import { blockDemoWrite } from '$lib/server/guards.js';
import { sendEmail } from '$lib/server/email.js';
import { FROM_EMAIL } from '$env/static/private';
import logger from '$lib/server/logger.js';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Block non-owner team members entirely
	const ctx = locals.user?.teamContext;
	if (ctx && !ctx.isOwner) {
		return apiError('Only the team owner can share cases with RMs', 403);
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const jsonParsed = await parseJsonBody<{ rm_id: string; lender_name?: string; message?: string }>(
		request
	);
	if (!jsonParsed.ok) return jsonParsed.response;
	const { rm_id, lender_name, message } = jsonParsed.data;

	try {
		// Verify DSA ownership
		const dsaResult = await resolveEffectiveDsaId(locals);
		if (!dsaResult.ok) {
			return apiError(dsaResult.error, 401);
		}

		const caseResult = await verifyCaseOwnership(params.case_id!, dsaResult.dsaId);
		if (!caseResult.ok) {
			return apiError(caseResult.error, 404);
		}

		if (!rm_id) {
			return apiError('RM ID is required', 400);
		}

		// Look up RM details — could be from RMContacts or rmApplications
		let rmName = '';
		let rmPhone = '';

		// Try rmApplications first (registered partner)
		try {
			const rmAppDoc = await rmApplications.findOne({ _id: new ObjectId(rm_id) });
			if (rmAppDoc) {
				rmName = rmAppDoc.name || '';
				rmPhone = String(rmAppDoc.mobileNumber || '');
			}
		} catch {
			// Not a valid ObjectId or not found — try RMContacts
		}

		if (!rmName) {
			const rmContactDoc = await RMContacts.findOne({ _id: new ObjectId(rm_id) });
			if (rmContactDoc) {
				rmName = rmContactDoc.rm_name || '';
				rmPhone = rmContactDoc.phone || '';
			}
		}

		if (!rmName && !rmPhone) {
			return apiError('RM not found', 404);
		}

		const caseDoc = caseResult.caseDoc;

		// Create or update communication thread
		const existingThread = await CommunicationThreads.findOne({
			case_id: params.case_id,
			dsa_id: dsaResult.dsaId,
			rm_id: new ObjectId(rm_id)
		});

		const threadMessage = {
			sender_role: 'dsa' as const,
			sender_id: dsaResult.dsaId,
			message: message || `Case ${caseDoc.label} shared for ${lender_name || 'review'}`,
			message_type: 'case_shared' as const,
			created_at: new Date()
		};

		if (existingThread) {
			await CommunicationThreads.updateOne(
				{ _id: existingThread._id },
				{
					$push: { messages: threadMessage } as any,
					$set: { updated_at: new Date() }
				}
			);
		} else {
			await CommunicationThreads.insertOne({
				case_id: params.case_id!,
				dsa_id: dsaResult.dsaId,
				rm_id: new ObjectId(rm_id),
				rm_name: rmName,
				dsa_name: locals.user?.name || '',
				lender_name: lender_name || '',
				messages: [threadMessage],
				status: 'active',
				created_at: new Date(),
				updated_at: new Date()
			});
		}

		// Fire-and-forget email notification to RM (if registered + has email).
		// SEC-2: encrypted-first lookup; decrypt so we can read the
		// rmOfficialEmail / email fields below as plaintext.
		try {
			const rmAppDocRaw = rmPhone ? await findUserByMobile(rmApplications, rmPhone) : null;
			const rmAppDoc = await decryptUserPii(rmAppDocRaw);
			const rmEmail = rmAppDoc?.rmOfficialEmail || rmAppDoc?.email;
			if (rmEmail) {
				sendEmail({
					from: `"DigitalDSA" <${FROM_EMAIL}>`,
					to: rmEmail,
					subject: `New case shared by ${locals.user?.name || 'a DSA'} — DigitalDSA`,
					html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                            <h2 style="color:#1a1a1a;margin-bottom:16px;">New Case Shared With You</h2>
                            <p style="font-size:15px;color:#475569;line-height:1.6;">
                                <strong>${locals.user?.name || 'A DSA'}</strong> has shared a case with you on DigitalDSA.
                            </p>
                            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                <tr><td style="padding:8px 12px;background:#f8fafc;font-size:14px;color:#64748b;">Case</td><td style="padding:8px 12px;background:#f8fafc;font-size:14px;font-weight:600;">${caseDoc.label}</td></tr>
                                <tr><td style="padding:8px 12px;font-size:14px;color:#64748b;">Loan Type</td><td style="padding:8px 12px;font-size:14px;">${caseDoc.loan?.type || 'N/A'}</td></tr>
                                ${lender_name ? `<tr><td style="padding:8px 12px;background:#f8fafc;font-size:14px;color:#64748b;">Lender</td><td style="padding:8px 12px;background:#f8fafc;font-size:14px;">${lender_name}</td></tr>` : ''}
                            </table>
                            <p style="font-size:14px;color:#64748b;">Log in to your RM dashboard to view the details.</p>
                            <p style="font-size:13px;color:#94a3b8;margin-top:24px;">&copy; ${new Date().getFullYear()} DigitalDSA</p>
                        </div>
                    `
				}).catch((e) => logger.error({ err: e }, 'RM notification email failed'));
			}
		} catch {
			// Non-blocking — ignore email errors
		}

		// Generate WhatsApp share URL
		const whatsappMessage = [
			`Hi ${rmName},`,
			``,
			`I'd like to share a case file with you:`,
			`Case: ${caseDoc.label}`,
			`Loan Type: ${caseDoc.loan?.type || 'N/A'}`,
			lender_name ? `Lender: ${lender_name}` : '',
			message ? `\nNote: ${message}` : '',
			``,
			`— Sent via Digital DSA`
		]
			.filter(Boolean)
			.join('\n');

		const whatsappUrl = rmPhone ? generateWhatsAppUrl(rmPhone, whatsappMessage) : null;

		return apiOk({
			whatsappUrl,
			rmName,
			rmPhone,
			caseName: caseDoc.label
		});
	} catch (error) {
		return apiServerError(error, 'Failed to share case');
	}
};
