/**
 * Server Load — /f/[token]
 * ═══════════════════════════════════════════════════════════════════
 * Validates the share link token on the server before rendering.
 * If invalid/expired, returns error data (no redirect needed —
 * the page component handles the error state).
 *
 * Loads DSA branding (firm name, logo) for white-label display.
 *
 * This is a PUBLIC route — no auth guard applied.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { validateShareLink, incrementUseCount } from '$lib/server/shareLinks';
import { DsaApplications } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ params }) => {
	const { token } = params;

	if (!token) {
		return {
			valid: false,
			error: 'No form token provided'
		};
	}

	const result = await validateShareLink(token);

	if (!result.valid || !result.link) {
		return {
			valid: false,
			error: result.error || 'This link is no longer valid'
		};
	}

	// Increment use count on page load
	await incrementUseCount(token);

	// Look up DSA branding
	let branding: { firmName?: string; logoUrl?: string; primaryColor?: string } | undefined;

	if (result.link.createdBy) {
		try {
			let dsaQuery: Record<string, unknown>;
			try {
				dsaQuery = { _id: new ObjectId(result.link.createdBy) };
			} catch {
				dsaQuery = { _id: result.link.createdBy };
			}

			const dsaDoc = await DsaApplications.findOne(dsaQuery as any, {
				projection: { name: 1, lenderName: 1, businessType: 1, imageDetails: 1 }
			});

			if (dsaDoc) {
				const firmName =
					dsaDoc.businessType === 'Individual'
						? (dsaDoc as any).name
						: (dsaDoc as any).lenderName || (dsaDoc as any).name;
				const logoUrl = (dsaDoc as any).imageDetails?.profileImage || undefined;

				if (firmName || logoUrl) {
					branding = { firmName, logoUrl };
				}
			}
		} catch {
			// Non-critical — if DSA lookup fails, render without branding
		}
	}

	// Use stored branding from link if present, otherwise use looked-up branding
	const effectiveBranding = result.link.branding || branding;

	// Return public-safe data
	return {
		valid: true,
		token,
		link: {
			customTitle: result.link.customTitle,
			customSubtitle: result.link.customSubtitle,
			sections: result.link.sections,
			requiresOtp: result.link.requiresOtp,
			prefilledData: result.link.prefilledData,
			submissionStatus: result.link.submissionStatus,
			expiresAt: result.link.expiresAt
		},
		branding: effectiveBranding
	};
};
