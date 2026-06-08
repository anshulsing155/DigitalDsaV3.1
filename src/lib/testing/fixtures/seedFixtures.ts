/**
 * Fixture Seeding System
 * ══════════════════════════════════════════════════════════════════
 * Seeds the LenderRuleFixtures collection with the 15 test fixture
 * profiles, and optionally seeds sample rule documents into
 * LenderRuleArtifacts.
 *
 * Called by:
 *   - POST /api/admin/seed (admin dashboard)
 *   - Manual seeding scripts
 *
 * All operations are idempotent (safe to call multiple times).
 * ══════════════════════════════════════════════════════════════════
 */

import { LenderRuleFixtures, LenderRuleArtifacts, Lenders } from '$lib/database/mongo.js';
import type { LenderClassification } from '$lib/types/policyEngine';
import { ALL_FIXTURES } from './fixtureProfiles.js';
import { seedSampleRuleDocuments } from '$lib/ruleEngine/sampleRuleDocs.js';
import { seedSyntheticProfiles as seedSynthetics } from '$lib/database/seedPolicyEngine.js';

// ── Seed Fixture Profiles ─────────────────────────────────────────

/**
 * Seed all 15 fixture profiles into LenderRuleFixtures.
 * Uses upsert-by-fixture_id so it's safe to call repeatedly.
 */
export async function seedFixtureProfiles(): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0;
	let skipped = 0;
	const now = new Date();

	for (let i = 0; i < ALL_FIXTURES.length; i++) {
		const { name, fixture } = ALL_FIXTURES[i];
		const fixtureId = `fixture-${String(i + 1).padStart(2, '0')}`;

		const result = await LenderRuleFixtures.updateOne(
			{ fixture_id: fixtureId },
			{
				$setOnInsert: {
					fixture_id: fixtureId,
					name,
					description: name,
					payload: fixture as unknown as Record<string, unknown>,
					created_at: now
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

	return { inserted, skipped };
}

// ── Seed Real Bank Rule Documents ──────────────────────────────────

/**
 * Seed the 7 realistic bank rule documents (if available).
 * Falls back gracefully if realBankRuleDocs is not yet created.
 */
async function seedRealBankRuleDocs(): Promise<{ inserted: number; skipped: number }> {
	try {
		const { seedRealBankRuleDocuments } = await import('$lib/ruleEngine/realBankRuleDocs.js');
		return seedRealBankRuleDocuments();
	} catch {
		// Module not yet available — that's fine, skip
		return { inserted: 0, skipped: 0 };
	}
}

// ── Seed Lender Entries (for Policy Engine tree view) ──────────────

/**
 * The 10 banks seeded by sample + real bank rule documents.
 * Must match the lender_id values used in sampleRuleDocs.ts and realBankRuleDocs.ts.
 */
const SEEDED_BANKS: Array<{
	lender_id: string;
	lender_name: string;
	classification: LenderClassification;
	bank_name_value: string;
}> = [
	// 3 sample banks
	{
		lender_id: 'sample-pvt-bank',
		lender_name: 'Sample PVT Bank',
		classification: 'PVT',
		bank_name_value: 'Sample PVT Bank'
	},
	{
		lender_id: 'sample-gov-bank',
		lender_name: 'Sample GOV Bank',
		classification: 'GOV',
		bank_name_value: 'Sample GOV Bank'
	},
	{
		lender_id: 'sample-nbfc',
		lender_name: 'Sample NBFC',
		classification: 'NBFC',
		bank_name_value: 'Sample NBFC'
	},
	// 7 real banks
	{
		lender_id: 'hdfc-bank',
		lender_name: 'HDFC Bank',
		classification: 'PVT',
		bank_name_value: 'HDFC Bank'
	},
	{
		lender_id: 'icici-bank',
		lender_name: 'ICICI Bank',
		classification: 'PVT',
		bank_name_value: 'ICICI Bank'
	},
	{
		lender_id: 'axis-bank',
		lender_name: 'Axis Bank',
		classification: 'PVT',
		bank_name_value: 'Axis Bank'
	},
	{
		lender_id: 'sbi',
		lender_name: 'State Bank of India',
		classification: 'GOV',
		bank_name_value: 'State Bank of India'
	},
	{
		lender_id: 'bajaj-housing',
		lender_name: 'Bajaj Housing Finance',
		classification: 'NBFC',
		bank_name_value: 'Bajaj Housing Finance'
	},
	{
		lender_id: 'tata-capital',
		lender_name: 'Tata Capital',
		classification: 'NBFC',
		bank_name_value: 'Tata Capital'
	},
	{
		lender_id: 'lic-hfl',
		lender_name: 'LIC Housing Finance',
		classification: 'NBFC',
		bank_name_value: 'LIC Housing Finance'
	}
];

/**
 * Seed minimal Lender entries into the Lenders collection.
 * This makes the Policy Engine tree view show seeded banks.
 * Idempotent via upsert-by-lender_id.
 */
export async function seedLenderEntries(): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0;
	let skipped = 0;
	const now = new Date();

	for (const bank of SEEDED_BANKS) {
		const result = await Lenders.updateOne(
			{ lender_id: bank.lender_id },
			{
				$setOnInsert: {
					lender_id: bank.lender_id,
					lender_name: bank.lender_name,
					classification: bank.classification,
					status: 'active' as const,
					bank_name_value: bank.bank_name_value,
					created_at: now,
					updated_at: now
				}
			},
			{ upsert: true }
		);
		if (result.upsertedCount > 0) inserted++;
		else skipped++;
	}

	return { inserted, skipped };
}

// ── Seed Everything ────────────────────────────────────────────────

export interface SeedResult {
	fixtures: { inserted: number; skipped: number };
	sample_rules: { inserted: number; skipped: number };
	real_bank_rules: { inserted: number; skipped: number };
	compiled_lenders: { inserted: number; skipped: number; total: number };
	lender_entries: { inserted: number; skipped: number };
	synthetic_profiles: { inserted: number; skipped: number };
}

/**
 * Master seed function: seeds fixtures, sample rules, real bank rules,
 * compiled lender policies, lender entries, and synthetic profiles.
 * All operations are idempotent.
 */
export async function seedAll(): Promise<SeedResult> {
	const [fixtures, sampleRules, realBankRules, compiledLenders, lenderEntries, syntheticProfiles] =
		await Promise.all([
			seedFixtureProfiles(),
			seedSampleRuleDocuments(),
			seedRealBankRuleDocs(),
			seedCompiledLenderDocs(),
			seedLenderEntries(),
			seedSynthetics()
		]);

	return {
		fixtures,
		sample_rules: sampleRules,
		real_bank_rules: realBankRules,
		compiled_lenders: compiledLenders,
		lender_entries: lenderEntries,
		synthetic_profiles: syntheticProfiles
	};
}

/**
 * Seed compiled lender policy documents (77 lenders × ~3 products).
 * Falls back gracefully if the lender policy system is not available.
 */
async function seedCompiledLenderDocs(): Promise<{
	inserted: number;
	skipped: number;
	total: number;
}> {
	try {
		const { seedCompiledLenders } =
			await import('$lib/config/lenderPolicies/seedCompiledLenders.js');
		return seedCompiledLenders();
	} catch {
		// Module not yet available — that's fine, skip
		return { inserted: 0, skipped: 0, total: 0 };
	}
}
