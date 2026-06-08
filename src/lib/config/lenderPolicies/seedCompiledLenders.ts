/**
 * Seed Compiled Lenders — Populate lenderRuleArtifacts from policy system
 * ══════════════════════════════════════════════════════════════════
 * Compiles all 77 lenders from the lender directory using category
 * defaults + Tier 1 overrides, then upserts the resulting
 * ParsedLenderRuleDocuments into MongoDB.
 *
 * Idempotent: uses $setOnInsert with upsert so existing active docs
 * are never overwritten. To refresh, delete the old artifact first.
 *
 * Usage:
 *   import { seedCompiledLenders } from '$lib/config/lenderPolicies/seedCompiledLenders';
 *   const { inserted, skipped, total } = await seedCompiledLenders();
 * ══════════════════════════════════════════════════════════════════
 */

import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { compileAllLenders } from './compileAll.js';

/**
 * Compile all lenders and upsert their rule documents into MongoDB.
 * Each document gets artifact_id = `{lender_id}-compiled-v1`.
 *
 * Returns counts of inserted (new) and skipped (already existed) documents.
 */
export async function seedCompiledLenders(): Promise<{
	inserted: number;
	skipped: number;
	total: number;
}> {
	const allDocs = compileAllLenders();
	const now = new Date();
	let inserted = 0;
	let skipped = 0;

	for (const doc of allDocs) {
		// Stable artifact ID: lender + first loan type (one doc per product)
		const productSuffix = doc.loan_types[0]?.toLowerCase().replace(/\s+/g, '-') ?? 'generic';
		const artifactId = `${doc.lender_id}-${productSuffix}-compiled-v1`;

		const result = await LenderRuleArtifacts.updateOne(
			{ artifact_id: artifactId },
			{
				$setOnInsert: {
					artifact_id: artifactId,
					lender_id: doc.lender_id,
					lender_name: doc.lender_name,
					classification: doc.classification,
					loan_types: doc.loan_types,
					version: 1,
					status: 'active',
					json_logic: doc as unknown as Record<string, unknown>,
					human_readable: `Compiled from lender policy system: ${doc.lender_name} (${doc.classification}) — ${doc.loan_types.join(', ')}`,
					confidence_scores: null,
					parse_iterations: [],
					rm_review: { queries: [] },
					source_document_urls: [],
					parsed_by: 'system:lender-policy-compiler',
					created_at: now,
					activated_at: now,
					updated_at: now
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) {
			inserted++;
		} else {
			skipped++;
		}
	}

	return { inserted, skipped, total: allDocs.length };
}
