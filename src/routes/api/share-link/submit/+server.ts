/**
 * POST /api/share-link/submit
 * ═══════════════════════════════════════════════════════════════════
 * Submits income/credit form data from a shared link.
 * Public endpoint (no app auth) but requires valid token + OTP verification.
 *
 * Request body:
 *   - token: string — the share link token
 *   - mobileNumber: string — applicant's mobile (must match OTP verified)
 *   - data: object — the form data (income entries, credit score, etc.)
 *   - action: 'save' | 'submit' — save as draft or final submit
 *
 * The data is stored in the application record, keyed by applicantIndex.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiOkMessage, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import {
	validateShareLink,
	updateSubmissionStatus,
	getLinkByToken,
	validateShareOtpProof
} from '$lib/server/shareLinks';
import { getCollection } from '$lib/database/mongo.js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const jsonParsed = await parseJsonBody<{
		token: string;
		mobileNumber?: string;
		data: Record<string, unknown>;
		action?: string;
	}>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const { token, mobileNumber, data, action } = jsonParsed.data;

		// Validate inputs
		if (!token || !data) {
			return apiError('Token and data are required');
		}

		// Validate the share link
		const linkResult = await validateShareLink(token);
		if (!linkResult.valid || !linkResult.link) {
			return apiError(linkResult.error || 'Invalid link', 200);
		}

		const link = linkResult.link;

		// Server-side OTP proof validation — verify the HMAC cookie set during OTP verification.
		// This prevents attackers with an intercepted token from calling submit directly.
		if (link.requiresOtp) {
			const otpProof = cookies.get('share-otp-proof');
			if (!mobileNumber || !validateShareOtpProof(otpProof, token, mobileNumber)) {
				return apiError('OTP verification required', 403);
			}
		}

		// Store the submitted data
		const applicationsCollection = await getCollection('applications');

		// Build update object scoped to the correct applicant
		const updatePath = `applicants.${link.applicantIndex}`;
		const updateData: Record<string, unknown> = {};

		// Map submitted data sections to application fields
		if (data.selectedProfiles) {
			updateData[`${updatePath}.selectedIncomeProfiles`] = data.selectedProfiles;
		}
		if (data.incomeEntries) {
			updateData[`${updatePath}.incomeSourceEntries`] = data.incomeEntries;
		}
		if (data.creditScore !== undefined) {
			updateData[`${updatePath}.creditScore`] = data.creditScore;
		}
		if (data.whyLowCredit) {
			updateData[`${updatePath}.whyLowCredit`] = data.whyLowCredit;
		}
		if (data.hasRunningObligations !== undefined) {
			updateData[`${updatePath}.hasRunningObligations`] = data.hasRunningObligations;
		}
		if (data.obligations) {
			updateData[`${updatePath}.obligations`] = data.obligations;
		}
		if (data.uploadedDocuments && Array.isArray(data.uploadedDocuments)) {
			updateData[`${updatePath}.uploadedDocuments`] = data.uploadedDocuments;
			updateData[`${updatePath}.documentsUploadedAt`] = new Date().toISOString();
		}

		// Add metadata
		updateData[`${updatePath}.sharedFormFilledAt`] = new Date().toISOString();
		updateData[`${updatePath}.sharedFormFilledBy`] = 'applicant';
		updateData[`${updatePath}.sharedFormToken`] = token;

		// Update the application (use string _id as stored — MongoDB driver handles comparison)
		await applicationsCollection.updateOne(
			{ _id: link.applicationId as any },
			{ $set: updateData }
		);

		// Update submission status
		const status = action === 'submit' ? 'completed' : 'in_progress';
		await updateSubmissionStatus(token, status);

		return apiOkMessage(
			action === 'submit'
				? 'Your information has been submitted successfully!'
				: 'Your progress has been saved.'
		);
	} catch (error) {
		return apiServerError(error, 'Failed to save your information');
	}
};
