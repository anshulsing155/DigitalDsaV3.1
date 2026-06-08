/**
 * Policy Engine Seed Script
 * ══════════════════════════════════════════════════════════════════
 * Seeds the policy engine collections with foundational data:
 *   1. Lenders — from bankName.ts (50+ banks)
 *   2. GeoScopes — PAN India + 37 states/UTs from gstStateCodes.json
 *   3. Migration — existing LenderRuleArtifacts -> new system
 *
 * Idempotent: uses upsert so safe to re-run.
 *
 * Usage: Import and call seedPolicyEngine() from an API route or script.
 * Cannot run with plain `node` due to $lib imports — use a SvelteKit
 * server-side context (e.g. admin API route).
 * ══════════════════════════════════════════════════════════════════
 */

import { ObjectId } from 'mongodb';
import {
	Lenders,
	LenderProducts,
	ProductVariations,
	GeoScopes,
	PolicyRules,
	PolicyVersions,
	LenderRuleArtifacts,
	LenderRuleFixtures
} from '$lib/database/mongo.js';
import { bankData } from '$lib/config/bankSelection/bankName.js';
import gstStateCodes from '$lib/config/gstStateCodes.json';
import { toLenderSlug } from '$lib/types/policyEngine.js';
import type { ProductType, PolicyFields, PolicyFieldKey } from '$lib/types/policyEngine.js';

// ============================================================================
// 1. SEED LENDERS
// ============================================================================

export async function seedLenders(): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0;
	let skipped = 0;

	for (const bank of bankData) {
		const lender_id = toLenderSlug(bank.value);

		const result = await Lenders.updateOne(
			{ lender_id },
			{
				$setOnInsert: {
					lender_id,
					lender_name: bank.label,
					classification: bank.Classification,
					status: 'active' as const,
					bank_name_value: bank.value,
					created_at: new Date(),
					updated_at: new Date()
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) inserted++;
		else skipped++;
	}

	return { inserted, skipped };
}

// ============================================================================
// 2. SEED GEO SCOPES
// ============================================================================

export async function seedGeoScopes(): Promise<{ inserted: number; skipped: number }> {
	let inserted = 0;
	let skipped = 0;

	// PAN India (root)
	const panResult = await GeoScopes.updateOne(
		{ geo_scope_id: 'pan_india' },
		{
			$setOnInsert: {
				geo_scope_id: 'pan_india',
				level: 'pan_india' as const,
				specificity: 0,
				label: 'PAN India',
				parent_geo_scope_id: null,
				created_at: new Date()
			}
		},
		{ upsert: true }
	);
	if (panResult.upsertedCount > 0) inserted++;
	else skipped++;

	// States/UTs from GST codes
	const codes = gstStateCodes as Record<string, string>;
	const seenStates = new Set<string>();

	for (const [code, stateName] of Object.entries(codes)) {
		// gstStateCodes has duplicate "Andhra Pradesh" at codes 28 and 37
		// Use the state name as slug, skip duplicates
		const stateSlug = toLenderSlug(stateName);

		if (seenStates.has(stateSlug)) {
			skipped++;
			continue;
		}
		seenStates.add(stateSlug);

		const result = await GeoScopes.updateOne(
			{ geo_scope_id: stateSlug },
			{
				$setOnInsert: {
					geo_scope_id: stateSlug,
					level: 'state' as const,
					specificity: 10,
					label: stateName,
					parent_geo_scope_id: 'pan_india',
					gst_state_code: code,
					created_at: new Date()
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) inserted++;
		else skipped++;
	}

	// ── Cities (PMS Phase 2.A — passive intelligence) ─────────────────
	// 25 tier-1 + tier-2 cities under their state parents. Sourced from
	// segment-cities/segment.json (the same list the RM onboarding city
	// picker uses) so a city captured at onboarding is guaranteed to map
	// to an existing geo_scope_id. ID format: <state-slug>:<city-slug>.
	// Mapping below is hand-authored because segment.json doesn't carry
	// the parent state for each city — needed to avoid a separate API.
	const CITY_TO_STATE: Record<string, string> = {
		Delhi: 'Delhi',
		Mumbai: 'Maharashtra',
		Bengaluru: 'Karnataka',
		Hyderabad: 'Telangana',
		Chennai: 'Tamil Nadu',
		Pune: 'Maharashtra',
		Kolkata: 'West Bengal',
		Ahmedabad: 'Gujarat',
		Lucknow: 'Uttar Pradesh',
		Jaipur: 'Rajasthan',
		'Chandigarh Tricity': 'Chandigarh',
		Indore: 'Madhya Pradesh',
		Surat: 'Gujarat',
		Vadodara: 'Gujarat',
		Nagpur: 'Maharashtra',
		Coimbatore: 'Tamil Nadu',
		Kochi: 'Kerala',
		Visakhapatnam: 'Andhra Pradesh',
		Bhubaneswar: 'Odisha',
		Patna: 'Bihar',
		Raipur: 'Chhattisgarh',
		Ranchi: 'Jharkhand',
		Kanpur: 'Uttar Pradesh',
		Bhopal: 'Madhya Pradesh',
		Nashik: 'Maharashtra'
	};

	for (const [cityName, stateName] of Object.entries(CITY_TO_STATE)) {
		const stateSlug = toLenderSlug(stateName);
		const citySlug = toLenderSlug(cityName);
		const geoScopeId = `${stateSlug}:${citySlug}`;

		// Skip if the parent state didn't get seeded (unlikely — GST list
		// covers all states/UTs — but defensive against future state-list
		// rotations or typos in the map).
		if (!seenStates.has(stateSlug)) {
			skipped++;
			continue;
		}

		const cityResult = await GeoScopes.updateOne(
			{ geo_scope_id: geoScopeId },
			{
				$setOnInsert: {
					geo_scope_id: geoScopeId,
					level: 'city' as const,
					specificity: 20,
					label: cityName,
					parent_geo_scope_id: stateSlug,
					created_at: new Date()
				}
			},
			{ upsert: true }
		);
		if (cityResult.upsertedCount > 0) inserted++;
		else skipped++;
	}

	return { inserted, skipped };
}

// ============================================================================
// 3. MIGRATE EXISTING LENDER RULE ARTIFACTS
// ============================================================================
// Creates LenderProduct (standard variation) + PolicyRule@pan_india + PolicyVersion
// from each active LenderRuleArtifact.

export async function migrateArtifacts(): Promise<{
	migrated: number;
	skipped: number;
	errors: string[];
}> {
	let migrated = 0;
	let skipped = 0;
	const errors: string[] = [];

	// Find active/approved artifacts
	const artifacts = await LenderRuleArtifacts.find({
		status: { $in: ['active', 'approved'] }
	}).toArray();

	for (const artifact of artifacts) {
		try {
			const lender_id = artifact.lender_id;

			// Ensure the lender exists
			const lender = await Lenders.findOne({ lender_id });
			if (!lender) {
				errors.push(`Lender not found for artifact ${artifact.artifact_id}: ${lender_id}`);
				skipped++;
				continue;
			}

			// For each loan_type in the artifact, create product + variation + rule + version
			for (const loanType of artifact.loan_types) {
				const product_type = mapLoanTypeToProductType(loanType);
				if (!product_type) {
					errors.push(`Cannot map loan type "${loanType}" in artifact ${artifact.artifact_id}`);
					continue;
				}

				const product_id = `${lender_id}:${product_type}`;
				const variation_id = `${product_id}:standard`;
				const policy_rule_id = `${variation_id}@pan_india`;

				// Check if already migrated
				const existingRule = await PolicyRules.findOne({ policy_rule_id });
				if (existingRule) {
					skipped++;
					continue;
				}

				// Upsert product
				await LenderProducts.updateOne(
					{ product_id },
					{
						$setOnInsert: {
							product_id,
							lender_id,
							product_type,
							is_active: true,
							notes: `Migrated from artifact ${artifact.artifact_id}`,
							created_at: new Date(),
							updated_at: new Date()
						}
					},
					{ upsert: true }
				);

				// Upsert standard variation
				await ProductVariations.updateOne(
					{ variation_id },
					{
						$setOnInsert: {
							variation_id,
							product_id,
							lender_id,
							label: 'Standard',
							slug: 'standard',
							category: 'standard' as const,
							match_condition: null,
							match_priority: 0,
							is_active: true,
							created_at: new Date(),
							updated_at: new Date()
						}
					},
					{ upsert: true }
				);

				// Extract policy fields from json_logic (if present)
				const policy_fields = extractPolicyFields(artifact.json_logic);

				// Create PolicyVersion
				const versionId = new ObjectId();
				await PolicyVersions.insertOne({
					_id: versionId,
					policy_rule_id,
					version_number: 1,
					status: artifact.status === 'active' ? 'active' : 'approved',
					policy_fields,
					rule_overlays: [],
					human_readable_doc: artifact.human_readable || undefined,
					provenance: {
						source_type: 'migration',
						document_ids: [],
						artifact_id: artifact.artifact_id
					},
					changelog: [
						{
							field: '*',
							description: `Migrated from LenderRuleArtifact ${artifact.artifact_id}`
						}
					],
					effective_from: artifact.activated_at || artifact.created_at,
					created_by: 'system:migration',
					created_at: new Date(),
					updated_at: new Date()
				});

				// Create PolicyRule
				await PolicyRules.insertOne({
					_id: new ObjectId(),
					policy_rule_id,
					variation_id,
					geo_scope_id: 'pan_india',
					lender_id,
					product_id,
					active_version_id: artifact.status === 'active' ? versionId : null,
					active_version_number: artifact.status === 'active' ? 1 : null,
					is_cross_variation: false,
					is_active: true,
					created_at: new Date(),
					updated_at: new Date()
				});

				migrated++;
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			errors.push(`Error migrating artifact ${artifact.artifact_id}: ${msg}`);
		}
	}

	return { migrated, skipped, errors };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Map form loan type strings to canonical ProductType codes */
function mapLoanTypeToProductType(loanType: string): ProductType | null {
	const map: Record<string, ProductType> = {
		'Home Loan': 'HL_NEW',
		'Home Loan - New': 'HL_NEW',
		'Home Loan - BT': 'HL_BT',
		'Home Loan - Balance Transfer': 'HL_BT',
		'Home Loan - Top Up': 'HL_TOPUP',
		'Home Loan - BT + Top Up': 'HL_BT_TOPUP',
		'Loan Against Property': 'LAP_NEW',
		LAP: 'LAP_NEW',
		'Loan Against Property - BT': 'LAP_BT',
		'Plot and Construction Loan': 'PLOT_CONST',
		'Personal Loan': 'PL',
		'Business Loan - Unsecured': 'BL_UNSECURED',
		// Short codes used in artifacts
		HL_NEW: 'HL_NEW',
		HL_BT: 'HL_BT',
		HL_TOPUP: 'HL_TOPUP',
		HL_BT_TOPUP: 'HL_BT_TOPUP',
		LAP_NEW: 'LAP_NEW',
		LAP_BT: 'LAP_BT',
		PLOT_CONST: 'PLOT_CONST',
		PL: 'PL',
		BL_UNSECURED: 'BL_UNSECURED',
		BL_SECURED: 'BL_SECURED'
	};
	return map[loanType] || null;
}

/** Extract the 25 universal policy fields from an artifact's json_logic.
 * The artifact may have a `policy` section with these fields already structured. */
function extractPolicyFields(jsonLogic: Record<string, unknown> | null): PolicyFields {
	if (!jsonLogic) return {};

	// Check for explicit policy section
	if (
		jsonLogic.policy &&
		typeof jsonLogic.policy === 'object' &&
		!Array.isArray(jsonLogic.policy)
	) {
		const fields: PolicyFields = {};
		const VALID_KEYS = new Set<string>([
			'roi_type',
			'roi_benchmark',
			'roi_spread',
			'roi_range',
			'teaser_rate',
			'processing_fee_percent',
			'processing_fee_flat',
			'processing_fee_waiver',
			'prepayment_charge_floating',
			'prepayment_charge_fixed',
			'lock_in_period_months',
			'insurance_mandatory',
			'insurance_type',
			'login_to_sanction_days',
			'login_to_disbursal_days',
			'max_age_at_maturity',
			'min_loan_amount',
			'max_loan_amount',
			'women_borrower_discount',
			'festive_offer',
			'stamp_duty_info',
			'legal_technical_fee',
			'cersai_charge',
			'moratorium_available',
			'part_disbursement_allowed',
			'tranche_disbursement_info'
		]);
		const policy = jsonLogic.policy as Record<string, unknown>;
		for (const [key, value] of Object.entries(policy)) {
			if (VALID_KEYS.has(key)) {
				fields[key as PolicyFieldKey] = value;
			}
		}
		return fields;
	}

	return {};
}

// ============================================================================
// 4. SEED FIXTURE PROFILES
// ============================================================================
// Imports the 25 scenario-derived fixture profiles and upserts them into
// LenderRuleFixtures for use by the admin test page.

export async function seedFixtureProfiles(): Promise<{ inserted: number; skipped: number }> {
	// Dynamic import from standalone data file (no vitest dependency)
	const { ALL_FIXTURES } = await import('$lib/testing/fixtures/fixtureProfiles.js');

	const fixtures = ALL_FIXTURES.map((f, i) => ({
		fixture_id: `FIX-${String(i + 1).padStart(2, '0')}`,
		name: f.name,
		description: f.name, // Description is the scenario description
		payload: f.fixture as unknown as Record<string, unknown>
	}));

	let inserted = 0;
	let skipped = 0;

	for (const fix of fixtures) {
		const result = await LenderRuleFixtures.updateOne(
			{ fixture_id: fix.fixture_id },
			{
				$setOnInsert: {
					fixture_id: fix.fixture_id,
					name: fix.name,
					description: fix.description,
					payload: fix.payload,
					created_at: new Date()
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) inserted++;
		else skipped++;
	}

	return { inserted, skipped };
}

// ============================================================================
// 5. SEED SYNTHETIC PROFILES
// ============================================================================

export async function seedSyntheticProfiles(): Promise<{ inserted: number; skipped: number }> {
	const { syntheticProfiles } = await import('$lib/server/testing/syntheticProfiles.js');
	const { SyntheticProfiles } = await import('$lib/database/mongo.js');

	let inserted = 0;
	let skipped = 0;

	for (const sp of syntheticProfiles) {
		const result = await SyntheticProfiles.updateOne(
			{ profile_id: sp.profile_id },
			{
				$setOnInsert: {
					profile_id: sp.profile_id,
					loan_type: sp.loan_type,
					payload: sp.payload,
					metadata: sp.metadata,
					created_at: new Date()
				}
			},
			{ upsert: true }
		);

		if (result.upsertedCount > 0) inserted++;
		else skipped++;
	}

	return { inserted, skipped };
}

// ============================================================================
// MAIN: Run all seed operations
// ============================================================================

export async function seedPolicyEngine(): Promise<{
	lenders: { inserted: number; skipped: number };
	geoScopes: { inserted: number; skipped: number };
	migration: { migrated: number; skipped: number; errors: string[] };
}> {
	const lenders = await seedLenders();
	const geoScopes = await seedGeoScopes();
	const migration = await migrateArtifacts();

	return { lenders, geoScopes, migration };
}
