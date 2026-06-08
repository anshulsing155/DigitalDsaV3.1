/**
 * Share Link Service — Server-side CRUD for shareable form links
 * ═══════════════════════════════════════════════════════════════════
 * Manages the lifecycle of shareable form links:
 *   1. Generate — DSA creates a token-based link for applicant
 *   2. Validate — Check if token is valid, active, and not expired
 *   3. Verify — OTP-based identity verification before form access
 *   4. Submit — Applicant submits form data via the link
 *   5. Revoke — DSA can deactivate a link
 *
 * Storage: MongoDB collection "shareLinks"
 * Tokens: crypto.randomUUID() — 128-bit UUID v4
 * ═══════════════════════════════════════════════════════════════════
 */

import { ShareLinks } from '$lib/database/mongo.js';
import type { FormShareLink } from '$lib/types/incomeProfile';
import crypto from 'crypto';
import { HMAC_SECRET } from '$env/static/private';

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a secure, URL-safe share token.
 * Uses crypto.randomUUID() for uniqueness + a short random suffix
 * to prevent brute-force guessing.
 */
export function generateShareToken(): string {
	const uuid = crypto.randomUUID();
	const suffix = crypto.randomBytes(4).toString('hex');
	return `${uuid}-${suffix}`;
}

// ============================================================================
// CREATE SHARE LINK
// ============================================================================

/**
 * Create a new share link record in the database.
 *
 * @param params - Share link creation parameters
 * @returns The created FormShareLink with generated token
 */
export async function createShareLink(params: {
	applicationId: string;
	applicantIndex: number;
	createdBy: string;
	sections: string[];
	readOnlyFields?: string[];
	customTitle?: string;
	customSubtitle?: string;
	requiresOtp?: boolean;
	expiryHours?: number;
	maxUses?: number;
	prefilledData?: Record<string, unknown>;
}): Promise<FormShareLink> {
	const collection = ShareLinks;

	const token = generateShareToken();
	const now = new Date();
	const expiryHours = params.expiryHours ?? 72; // Default: 3 days

	const shareLink: FormShareLink = {
		token,
		applicationId: params.applicationId,
		applicantIndex: params.applicantIndex,
		createdBy: params.createdBy,
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + expiryHours * 60 * 60 * 1000).toISOString(),
		maxUses: params.maxUses ?? 10,
		useCount: 0,
		isActive: true,
		sections: params.sections,
		readOnlyFields: params.readOnlyFields ?? [],
		customTitle: params.customTitle ?? 'Income & Credit Information',
		customSubtitle:
			params.customSubtitle ??
			'Please fill in your income details and credit information accurately.',
		requiresOtp: params.requiresOtp ?? true,
		expiryHours,
		prefilledData: params.prefilledData ?? {},
		submissionStatus: 'pending'
	};

	await collection.insertOne(shareLink);

	return shareLink;
}

// ============================================================================
// VALIDATE SHARE LINK
// ============================================================================

/**
 * Validate a share link token.
 * Checks: exists, active, not expired, max uses not exceeded.
 *
 * @param token - The share link token
 * @returns Validation result with link data if valid
 */
export async function validateShareLink(token: string): Promise<{
	valid: boolean;
	link?: FormShareLink;
	error?: string;
}> {
	const collection = ShareLinks;

	const link = (await collection.findOne({ token })) as FormShareLink | null;

	if (!link) {
		return { valid: false, error: 'Link not found or has been removed' };
	}

	if (!link.isActive) {
		return { valid: false, error: 'This link has been deactivated by the sender' };
	}

	if (new Date(link.expiresAt) < new Date()) {
		return { valid: false, error: 'This link has expired. Please request a new one.' };
	}

	if (link.useCount >= link.maxUses) {
		return { valid: false, error: 'This link has reached its maximum usage limit' };
	}

	return { valid: true, link };
}

// ============================================================================
// INCREMENT USE COUNT
// ============================================================================

/**
 * Increment the use count for a share link (called on each access).
 */
export async function incrementUseCount(token: string): Promise<void> {
	const collection = ShareLinks;

	await collection.updateOne({ token }, { $inc: { useCount: 1 } });
}

// ============================================================================
// UPDATE SUBMISSION STATUS
// ============================================================================

/**
 * Update the submission status and timestamp for a share link.
 */
export async function updateSubmissionStatus(
	token: string,
	status: 'pending' | 'in_progress' | 'completed'
): Promise<void> {
	const collection = ShareLinks;

	await collection.updateOne(
		{ token },
		{
			$set: {
				submissionStatus: status,
				lastSubmittedAt: new Date().toISOString()
			}
		}
	);
}

// ============================================================================
// REVOKE SHARE LINK
// ============================================================================

/**
 * Deactivate a share link. Called by the DSA to revoke access.
 */
export async function revokeShareLink(token: string, userId: string): Promise<boolean> {
	const collection = ShareLinks;

	const result = await collection.updateOne(
		{ token, createdBy: userId },
		{ $set: { isActive: false } }
	);

	return result.modifiedCount > 0;
}

// ============================================================================
// GET LINKS FOR APPLICATION
// ============================================================================

/**
 * Get all share links created for a specific application.
 * Used by the DSA dashboard to see link status.
 */
export async function getLinksForApplication(
	applicationId: string,
	createdBy: string
): Promise<FormShareLink[]> {
	const collection = ShareLinks;

	const links = await collection
		.find({ applicationId, createdBy })
		.sort({ createdAt: -1 })
		.toArray();

	return links as unknown as FormShareLink[];
}

// ============================================================================
// GET LINK BY TOKEN
// ============================================================================

/**
 * Get a share link by its token (internal use).
 */
export async function getLinkByToken(token: string): Promise<FormShareLink | null> {
	const collection = ShareLinks;

	return (await collection.findOne({ token })) as FormShareLink | null;
}

// ============================================================================
// GET LINKS FOR DSA (all links by creator)
// ============================================================================

/**
 * Get all share links created by a specific DSA user.
 * Used by the shared-links management page.
 */
export async function getLinksForDsa(
	createdBy: string,
	statusFilter?: string
): Promise<FormShareLink[]> {
	const collection = ShareLinks;

	const query: Record<string, unknown> = { createdBy };

	if (statusFilter === 'active') {
		query.isActive = true;
		query.expiresAt = { $gt: new Date().toISOString() };
		query.submissionStatus = { $ne: 'completed' };
	} else if (statusFilter === 'completed') {
		query.submissionStatus = 'completed';
	} else if (statusFilter === 'expired') {
		query.isActive = true;
		query.expiresAt = { $lte: new Date().toISOString() };
	} else if (statusFilter === 'revoked') {
		query.isActive = false;
	}

	const links = await collection.find(query).sort({ createdAt: -1 }).toArray();

	return links as unknown as FormShareLink[];
}

// ============================================================================
// OTP PROOF — HMAC-based server-side verification proof
// ============================================================================

const OTP_PROOF_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Create an HMAC-based proof that OTP was verified for a given token + mobile.
 * Returns a timestamped proof string: `{timestamp}.{hmac}`
 */
export function createShareOtpProof(token: string, mobileNumber: string): string {
	const timestamp = Date.now().toString();
	const data = `${token}:${mobileNumber}:${timestamp}`;
	const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
	return `${timestamp}.${hmac}`;
}

/**
 * Validate an OTP proof cookie against the expected token + mobile.
 * Checks TTL expiry and HMAC integrity using timing-safe comparison.
 */
export function validateShareOtpProof(
	proof: string | undefined,
	token: string,
	mobileNumber: string
): boolean {
	if (!proof) return false;

	const dotIndex = proof.indexOf('.');
	if (dotIndex === -1) return false;

	const timestamp = proof.substring(0, dotIndex);
	const receivedHmac = proof.substring(dotIndex + 1);

	// Check TTL
	const age = Date.now() - parseInt(timestamp, 10);
	if (isNaN(age) || age > OTP_PROOF_TTL_MS || age < 0) return false;

	// Verify HMAC with timing-safe comparison
	const data = `${token}:${mobileNumber}:${timestamp}`;
	const expectedHmac = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');

	if (receivedHmac.length !== expectedHmac.length) return false;
	return crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac));
}
