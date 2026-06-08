// SEC-5 R1 smoke — seed dev MongoDB with the minimum data needed to
// exercise both the positive (RM owns this bank's policy → 200) and
// negative (RM doesn't own this bank → 403) paths of the rm/review
// route.
//
// Idempotent: rerunning replaces the test rows by their stable keys.
// All seeded rows are prefixed with "sec5-r1-test-" so they're easy to
// spot + remove later.
//
// Run: node scripts/seed-sec5-r1-test-data.mjs
//
// Cleanup: node scripts/seed-sec5-r1-test-data.mjs --cleanup

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

// ── Constants (must match values that already exist in dev MongoDB) ─────────
// IMPORTANT: rmUserId in RmLenderAssignments is the AdminUsers._id (not the
// rmApplications._id) for admin-mirror users. Verified against the live data
// (79 existing assignments for this user all use the AdminUsers._id).
const TEST_RM_USER_ID = '69945147c3ee59f0cbb211d4'; // AdminUsers._id for 9811556664
const TEST_LENDER_A_ID = 'sec5-r1-test-lender-a';
const TEST_LENDER_B_ID = 'sec5-r1-test-lender-b';
const TEST_RULE_A_ID = 'sec5-r1-test-rule-a';
const TEST_RULE_B_ID = 'sec5-r1-test-rule-b';
const TEST_PREFIX = 'sec5-r1-test-';

// ── Env loader ──────────────────────────────────────────────────────────────
async function loadEnv() {
	for (const f of ['.env', '.env.local']) {
		const p = resolve(process.cwd(), f);
		if (!existsSync(p)) continue;
		const text = await readFile(p, 'utf-8');
		for (const line of text.split(/\r?\n/)) {
			const t = line.trim();
			if (!t || t.startsWith('#')) continue;
			const eq = t.indexOf('=');
			if (eq <= 0) continue;
			let v = t.slice(eq + 1).trim();
			if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
				v = v.slice(1, -1);
			}
			process.env[t.slice(0, eq).trim()] = v;
		}
	}
}

await loadEnv();
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('digitaldsa');

const cleanup = process.argv.includes('--cleanup');

if (cleanup) {
	// ── Cleanup mode ────────────────────────────────────────────────────────
	const a = await db.collection('rm_lender_assignments').deleteMany({
		lenderId: { $in: [TEST_LENDER_A_ID, TEST_LENDER_B_ID] }
	});
	const b = await db.collection('policyVersions').deleteMany({
		policy_rule_id: { $in: [TEST_RULE_A_ID, TEST_RULE_B_ID] }
	});
	const c = await db.collection('policyRules').deleteMany({
		policy_rule_id: { $in: [TEST_RULE_A_ID, TEST_RULE_B_ID] }
	});
	console.log(JSON.stringify({
		ok: true,
		removed: {
			rm_lender_assignments: a.deletedCount,
			policyVersions: b.deletedCount,
			policyRules: c.deletedCount
		}
	}, null, 2));
	await client.close();
	process.exit(0);
}

// ── Seed mode ───────────────────────────────────────────────────────────────
const now = new Date();
const oneMonthOut = new Date(now);
oneMonthOut.setDate(oneMonthOut.getDate() + 30);

// 1) RM assignment — test RM is assigned ONLY to Lender A (not B).
//    This is what makes the cross-bank check fail for Lender B's version.
await db.collection('rm_lender_assignments').replaceOne(
	{ rmUserId: TEST_RM_USER_ID, lenderId: TEST_LENDER_A_ID },
	{
		rmUserId: TEST_RM_USER_ID,
		lenderId: TEST_LENDER_A_ID,
		lenderName: 'SEC-5 R1 Test Lender A',
		officialBankEmail: 'test-rm-a@sec5r1-test.local',
		status: 'active',
		onboardedAt: now,
		lastMonthlyVerifiedAt: now,
		nextVerificationDueBy: oneMonthOut,
		suspendedAt: null,
		suspendedReason: null,
		transferredTo: null,
		transferredAt: null
	},
	{ upsert: true }
);

// 2) PolicyRule for each lender. The rm/review page reads the version's
//    rule, then checks `rule.lender_id` against the RM's assignments.
async function upsertRule(ruleId, lenderId) {
	await db.collection('policyRules').replaceOne(
		{ policy_rule_id: ruleId },
		{
			policy_rule_id: ruleId,
			variation_id: `${TEST_PREFIX}variation`,
			geo_scope_id: `${TEST_PREFIX}geo`,
			lender_id: lenderId,
			product_id: `${lenderId}:HL`,
			active_version_id: null,
			active_version_number: null,
			is_cross_variation: false,
			is_active: true,
			created_at: now,
			updated_at: now
		},
		{ upsert: true }
	);
}
await upsertRule(TEST_RULE_A_ID, TEST_LENDER_A_ID);
await upsertRule(TEST_RULE_B_ID, TEST_LENDER_B_ID);

// 3) PolicyVersion for each rule, in pending_rm_review status (the only
//    status the rm/review page accepts — anything else 400s before the
//    BOLA check fires).
async function upsertVersion(ruleId, lenderId) {
	// Deterministic _id derived from the rule id so reruns are idempotent.
	// SHA-1 first 24 hex chars gives distinct IDs for distinct rule strings,
	// unlike the naive prefix-padding approach which collided for any two
	// IDs sharing a leading byte sequence.
	const stableHex = createHash('sha1').update(ruleId).digest('hex').slice(0, 24);
	const versionOid = new ObjectId(stableHex);
	await db.collection('policyVersions').replaceOne(
		{ _id: versionOid },
		{
			_id: versionOid,
			policy_rule_id: ruleId,
			version_number: 1,
			status: 'pending_rm_review',
			policy_fields: {},
			rule_overlays: [],
			provenance: {
				source_type: 'admin_manual',
				document_ids: []
			},
			created_at: now,
			updated_at: now
		},
		{ upsert: true }
	);
	return versionOid.toString();
}

const versionAId = await upsertVersion(TEST_RULE_A_ID, TEST_LENDER_A_ID);
const versionBId = await upsertVersion(TEST_RULE_B_ID, TEST_LENDER_B_ID);

console.log(JSON.stringify({
	ok: true,
	rm: { _id: TEST_RM_USER_ID, mobile: 9811556664 },
	assigned_to_lender_a: TEST_LENDER_A_ID,
	NOT_assigned_to_lender_b: TEST_LENDER_B_ID,
	versions: {
		// Hitting /dashboard/rm/review/{lenderA_version_id} should LOAD (positive)
		lender_a_version_id: versionAId,
		// Hitting /dashboard/rm/review/{lenderB_version_id} should 403 (R1 fix)
		lender_b_version_id: versionBId
	}
}, null, 2));

await client.close();
