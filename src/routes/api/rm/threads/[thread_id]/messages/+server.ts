import type { RequestHandler } from './$types';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards';
import { rmApplications, CommunicationThreads, DsaApplications } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';
import { sendEmail } from '$lib/server/email';
import { FROM_EMAIL } from '$env/static/private';
import logger from '$lib/server/logger';
import { parseJsonBody, apiOk, apiError } from '$lib/server/apiResponse.js';
import { escapeHtml } from '$lib/utils/sanitize';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

/**
 * L-N1 (CODE-REVIEW-2026-05-31): resolve the calling RM to a Mongo doc.
 * Used by both GET (read messages) and POST (send reply). Returns null if
 * the RM cannot be resolved; callers turn that into a 404. The mobile-
 * fallback path stays decrypt-free for GET (read-only, no PII fields
 * touched past this point) — POST keeps decryptUserPii because it reads
 * rmDoc.name for the email-notification template.
 */
async function resolveRm(
	user: { id: string; mobileNumber: string | number },
	{ decrypt }: { decrypt: boolean }
): Promise<{ _id: ObjectId; name?: string } | null> {
	try {
		const doc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
		return doc ?? null;
	} catch {
		const raw = await findUserByMobile(rmApplications, user.mobileNumber);
		if (!raw) return null;
		return decrypt ? await decryptUserPii(raw) : raw;
	}
}

/**
 * GET /api/rm/threads/[thread_id]/messages
 *
 * L-N1 (CODE-REVIEW-2026-05-31): provisions for thread pagination. The
 * communication +page.server.ts no longer ships messages[] in the bulk
 * load — clients call this endpoint on thread selection. Bounded payload
 * regardless of how many threads exist.
 *
 * BOLA-safe: ownership re-verified before reading messages.
 * Rate-limited: same generous backstop as mark-seen (20 / 10s per user)
 * — protects against a runaway $effect on the client.
 */
export const GET: RequestHandler = async ({ locals, params, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const user = locals.user!;

	const ip = getClientAddress();
	const limited = await rateLimit(ip, {
		maxRequests: 20,
		windowMs: 10_000,
		identifier: `rm_thread_messages_get:${user.id}`
	});
	if (limited) return apiError('Too many requests. Please slow down.', 429);

	const rmDoc = await resolveRm(user, { decrypt: false });
	if (!rmDoc?._id) return apiError('RM profile not found', 404);

	let threadOid: ObjectId;
	try {
		threadOid = new ObjectId(params.thread_id);
	} catch {
		return apiError('Invalid thread ID', 400);
	}

	const thread = await CommunicationThreads.findOne(
		{ _id: threadOid, rm_id: rmDoc._id },
		{ projection: { messages: 1 } }
	);
	if (!thread) return apiError('Thread not found or access denied', 404);

	// Normalize Date → ISO so the wire shape matches what the page-server
	// load used to ship inline. Client renderer is unchanged.
	const messages = (thread.messages || []).map((m) => ({
		sender_role: m.sender_role,
		message: m.message,
		message_type: m.message_type,
		created_at:
			m.created_at instanceof Date
				? m.created_at.toISOString()
				: new Date(m.created_at).toISOString()
	}));

	return apiOk({ messages });
};

// RM templates for template-based replies
const RM_REPLY_TEMPLATES = [
	{
		id: 'ack_received',
		label: 'File Received',
		body: 'File received. We will start processing and update you shortly.'
	},
	{
		id: 'query_documents',
		label: 'Need Documents',
		body: 'We need additional documents for this case. Please check the query details and share at the earliest.'
	},
	{
		id: 'processing_update',
		label: 'Processing Update',
		body: 'Your file is currently being processed. We will update you once there is progress.'
	},
	{
		id: 'sanction_update',
		label: 'Sanction Update',
		body: 'Good news! The loan has been sanctioned. Please check the sanction details.'
	},
	{ id: 'general_note', label: 'General Note', body: '' }
] as const;

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;
	const demoBlock = blockDemoWrite(locals);
	if (demoBlock) return demoBlock;

	const user = locals.user!;
	const threadId = params.thread_id;

	// SEC-2: POST uses decrypt:true because the email-notification template
	// below reads rmDoc.name. GET handler uses decrypt:false (no PII read).
	const rmDoc = await resolveRm(user, { decrypt: true });
	if (!rmDoc?._id) {
		return apiError('RM profile not found', 404);
	}

	// Verify thread exists and belongs to this RM
	let threadOid: ObjectId;
	try {
		threadOid = new ObjectId(threadId);
	} catch {
		return apiError('Invalid thread ID', 400);
	}

	const thread = await CommunicationThreads.findOne({
		_id: threadOid,
		rm_id: rmDoc._id
	});

	if (!thread) {
		return apiError('Thread not found or access denied', 404);
	}

	const jsonParsed = await parseJsonBody<{ template_id?: string; custom_message?: string }>(
		request
	);
	if (!jsonParsed.ok) return jsonParsed.response;
	const { template_id, custom_message } = jsonParsed.data;

	// Resolve message text
	let messageText: string;

	if (template_id) {
		const template = RM_REPLY_TEMPLATES.find((t) => t.id === template_id);
		if (!template) {
			return apiError('Invalid template', 400);
		}
		// general_note uses custom_message, others use template body
		messageText = template.id === 'general_note' ? (custom_message || '').trim() : template.body;
	} else if (custom_message?.trim()) {
		messageText = custom_message.trim();
	} else {
		return apiError('Message is required', 400);
	}

	if (!messageText || messageText.length > 2000) {
		return apiError('Message must be 1-2000 characters', 400);
	}

	const message = {
		sender_role: 'rm' as const,
		sender_id: rmDoc._id,
		message: messageText,
		message_type: 'text' as const,
		created_at: new Date()
	};

	// Defense-in-depth: scope the write to (_id, rm_id). The findOne above
	// is the BOLA gate; this keeps the write safe even if someone removes
	// the gate in a future refactor.
	await CommunicationThreads.updateOne(
		{ _id: threadOid, rm_id: rmDoc._id },
		{
			$push: { messages: message } as any,
			$set: { updated_at: new Date() }
		}
	);

	// Fire-and-forget email notification to DSA (if DSA has email)
	try {
		const dsaDoc = await DsaApplications.findOne({ _id: thread.dsa_id });
		const dsaEmail = (dsaDoc as any)?.email;
		if (dsaEmail) {
			// Escape every interpolated value — these flow into an HTML email
			// body. `messageText` is RM-typed free text and is the primary
			// injection vector; rmName + case_id are DB-sourced but escaped
			// for defense-in-depth.
			const safeRmName = escapeHtml(rmDoc.name || 'An RM');
			const safeCaseId = escapeHtml(String(thread.case_id));
			const safeMessage = escapeHtml(messageText.slice(0, 500));
			sendEmail({
				from: `"DigitalDSA" <${FROM_EMAIL}>`,
				to: dsaEmail,
				subject: `New message from ${safeRmName} — DigitalDSA`,
				html: `
					<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
						<h2 style="color:#1a1a1a;margin-bottom:16px;">New Message from ${safeRmName}</h2>
						<p style="font-size:15px;color:#475569;line-height:1.6;">
							You have a new message regarding case <strong>${safeCaseId}</strong>.
						</p>
						<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
							<p style="font-size:14px;color:#334155;margin:0;white-space:pre-wrap;">${safeMessage}</p>
						</div>
						<p style="font-size:14px;color:#64748b;">Log in to your DSA dashboard to view and reply.</p>
						<p style="font-size:13px;color:#94a3b8;margin-top:24px;">&copy; ${new Date().getFullYear()} DigitalDSA</p>
					</div>
				`
			}).catch((e) => logger.error({ err: e }, 'DSA notification email failed'));
		}
	} catch {
		// Non-blocking — ignore email errors
	}

	return apiOk();
};
