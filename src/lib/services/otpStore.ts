/**
 * Server-side OTP storage and management — MongoDB-backed
 * ═══════════════════════════════════════════════════════════════════
 * Uses MongoDB with a TTL index for automatic expiry cleanup.
 * Features:
 *   - Timing-safe OTP comparison (prevents timing attacks)
 *   - Exponential backoff between failed attempts
 *   - Persistent across server restarts
 *   - Automatic cleanup via MongoDB TTL index
 * ═══════════════════════════════════════════════════════════════════
 */

import { UserApplication } from '$lib/database/mongo';
import crypto from 'crypto';
import type { Collection } from 'mongodb';
import logger from '$lib/server/logger';
import type { PmsOtpContext } from '$lib/config/pms/policyTypes';

// ── OTP document structure in MongoDB ──────────────────────────────
interface OTPDocument {
	/** The email address this OTP is for (also the lookup key) */
	email: string;
	/**
	 * SHA-256 hash of the OTP.
	 * We never store the raw OTP — only a hash.
	 * Comparison uses timing-safe equality.
	 */
	otpHash: string;
	/** When this OTP expires (MongoDB TTL index field) */
	expiresAt: Date;
	/** Number of failed verification attempts so far */
	attempts: number;
	/** Max allowed attempts before invalidation */
	maxAttempts: number;
	/**
	 * When the next attempt is allowed (exponential backoff).
	 * null = no backoff active.
	 */
	nextAttemptAfter: Date | null;
	/** When this document was created */
	createdAt: Date;
	/**
	 * PMS-only: bound context for this OTP.
	 * Absent on standard auth OTPs. Additive — no migration needed.
	 */
	context?: PmsOtpContext;
}

// ── Configuration ──────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 10;

/**
 * Backoff delays in milliseconds for each failed attempt.
 * Attempt 1: immediate, Attempt 2: 5s, Attempt 3: 15s,
 * Attempt 4: 30s, Attempt 5: 60s (then locked out).
 */
const BACKOFF_MS = [0, 0, 5_000, 15_000, 30_000, 60_000];

// ── Collection reference ───────────────────────────────────────────
const OTPCollection: Collection<OTPDocument> = UserApplication.collection<OTPDocument>('emailOtps');

/**
 * Ensure the TTL index exists on the `expiresAt` field.
 * MongoDB will automatically delete documents once expiresAt is past.
 * Also creates a unique index on email for fast lookups.
 *
 * Called once on module load (idempotent — createIndex is a no-op if
 * the index already exists).
 */
async function ensureIndexes(): Promise<void> {
	try {
		// TTL index — auto-deletes expired OTPs
		await OTPCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
		// Unique email index — one OTP per email at a time
		await OTPCollection.createIndex({ email: 1 }, { unique: true });
	} catch (error) {
		// Index creation errors are non-fatal if indexes already exist
		logger.error('OTP index creation warning', error);
	}
}

// Ensure indexes on module load (fire-and-forget)
ensureIndexes();

/**
 * Hash an OTP using SHA-256.
 * We store only the hash — never the raw OTP value.
 */
function hashOTP(otp: string): string {
	return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Timing-safe comparison of two hex strings.
 * Prevents timing-based side-channel attacks on OTP verification.
 */
function timingSafeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	const bufA = Buffer.from(a, 'hex');
	const bufB = Buffer.from(b, 'hex');
	return crypto.timingSafeEqual(bufA, bufB);
}

// ── Public API (preserves existing interface) ──────────────────────

class OTPStore {
	/**
	 * Generate and store an OTP for an email address.
	 * If an OTP already exists for this email, it is replaced.
	 */
	async generateAndStore(email: string, otp: string): Promise<void> {
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

		const doc: OTPDocument = {
			email,
			otpHash: hashOTP(otp),
			expiresAt,
			attempts: 0,
			maxAttempts: MAX_ATTEMPTS,
			nextAttemptAfter: null,
			createdAt: new Date()
		};

		// Upsert: replace any existing OTP for this email
		await OTPCollection.replaceOne({ email }, doc, { upsert: true });
	}

	/**
	 * Verify an OTP for an email address.
	 * Returns the same shape as the old in-memory implementation:
	 *   { success: boolean; message: string; remainingAttempts?: number }
	 */
	async verify(
		email: string,
		providedOTP: string
	): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
		const stored = await OTPCollection.findOne({ email });

		if (!stored) {
			return {
				success: false,
				message: 'No OTP found for this email. Please request a new one.'
			};
		}

		// Check if expired (belt-and-suspenders; TTL index handles cleanup)
		if (new Date() > stored.expiresAt) {
			await OTPCollection.deleteOne({ email });
			return {
				success: false,
				message: 'OTP has expired. Please request a new one.'
			};
		}

		// Check exponential backoff
		if (stored.nextAttemptAfter && new Date() < stored.nextAttemptAfter) {
			const waitSec = Math.ceil((stored.nextAttemptAfter.getTime() - Date.now()) / 1000);
			return {
				success: false,
				message: `Too many attempts. Please wait ${waitSec} seconds before trying again.`,
				remainingAttempts: stored.maxAttempts - stored.attempts
			};
		}

		// Check max attempts
		if (stored.attempts >= stored.maxAttempts) {
			await OTPCollection.deleteOne({ email });
			return {
				success: false,
				message: 'Maximum verification attempts exceeded. Please request a new OTP.'
			};
		}

		// Increment attempts atomically
		const newAttempts = stored.attempts + 1;
		const backoffMs = BACKOFF_MS[Math.min(newAttempts, BACKOFF_MS.length - 1)] || 0;
		const nextAttemptAfter = backoffMs > 0 ? new Date(Date.now() + backoffMs) : null;

		await OTPCollection.updateOne(
			{ email },
			{
				$set: {
					attempts: newAttempts,
					nextAttemptAfter
				}
			}
		);

		// Timing-safe OTP comparison
		const providedHash = hashOTP(providedOTP);
		const isMatch = timingSafeCompare(stored.otpHash, providedHash);

		if (isMatch) {
			// Success — remove OTP from store
			await OTPCollection.deleteOne({ email });
			return {
				success: true,
				message: 'OTP verified successfully'
			};
		}

		// Failed attempt
		const remainingAttempts = stored.maxAttempts - newAttempts;

		if (remainingAttempts <= 0) {
			await OTPCollection.deleteOne({ email });
			return {
				success: false,
				message: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.'
			};
		}

		return {
			success: false,
			message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
			remainingAttempts
		};
	}

	/**
	 * Remove an OTP for an email (used on email-send failure rollback).
	 */
	async remove(email: string): Promise<void> {
		await OTPCollection.deleteOne({ email });
	}

	/**
	 * Check if an active (non-expired) OTP exists for an email.
	 * Used for rate limiting (don't send new OTP if one is active).
	 */
	async exists(email: string): Promise<boolean> {
		const stored = await OTPCollection.findOne({ email });
		if (!stored) return false;

		// Check if expired
		if (new Date() > stored.expiresAt) {
			await OTPCollection.deleteOne({ email });
			return false;
		}

		return true;
	}

	/**
	 * Get the number of active OTPs (for monitoring).
	 */
	async getSize(): Promise<number> {
		return OTPCollection.countDocuments({
			expiresAt: { $gt: new Date() }
		});
	}

	// ── PMS context-bound methods ──────────────────────────────────

	/**
	 * PMS variant of generateAndStore — stores a PmsOtpContext alongside the OTP.
	 * Context is checked on verifyWithContext to prevent replay attacks across
	 * different policies or draft versions.
	 */
	async generateAndStoreWithContext(
		email: string,
		otp: string,
		context: PmsOtpContext
	): Promise<void> {
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

		const doc: OTPDocument = {
			email,
			otpHash: hashOTP(otp),
			expiresAt,
			attempts: 0,
			maxAttempts: MAX_ATTEMPTS,
			nextAttemptAfter: null,
			createdAt: new Date(),
			context
		};

		await OTPCollection.replaceOne({ email }, doc, { upsert: true });
	}

	/**
	 * PMS variant of verify — additionally checks that the stored context matches
	 * the provided context. A mismatch (wrong lenderId, stale draftHash, etc.)
	 * is treated as a verification failure.
	 */
	async verifyWithContext(
		email: string,
		providedOTP: string,
		expectedContext: PmsOtpContext
	): Promise<{ success: boolean; message: string; remainingAttempts?: number }> {
		const stored = await OTPCollection.findOne({ email });

		if (!stored) {
			return {
				success: false,
				message: 'No OTP found for this email. Please request a new one.'
			};
		}

		// Check if expired
		if (new Date() > stored.expiresAt) {
			await OTPCollection.deleteOne({ email });
			return { success: false, message: 'OTP has expired. Please request a new one.' };
		}

		// Context mismatch — OTP was issued for a different purpose/lender/draft
		if (
			!stored.context ||
			stored.context.purpose !== expectedContext.purpose ||
			stored.context.lenderId !== expectedContext.lenderId ||
			stored.context.policyId !== expectedContext.policyId ||
			stored.context.draftHash !== expectedContext.draftHash
		) {
			// Treat as expired: context mismatch means this OTP can't be used here
			await OTPCollection.deleteOne({ email });
			return {
				success: false,
				message: 'OTP is not valid for this action. Please request a new one.'
			};
		}

		// Delegate the rest to the standard verify flow
		return this.verify(email, providedOTP);
	}
}

// Singleton instance
export const otpStore = new OTPStore();
