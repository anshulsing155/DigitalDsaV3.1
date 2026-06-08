// Dev-only: simulate Razorpay's mandate.authorized webhook against the
// local DB for subscriptions that are stuck in pending_mandate OR have a
// pending_replacement_registration_id set.
//
// Purpose: in local dev, Razorpay's test-mode webhooks can't reach
// http://localhost:5173 without a tunnel (ngrok / cloudflared), so the
// mandate.authorized event never lands. Two stuck states surface:
//
//   1. INITIAL SUBSCRIBE — state stays at `pending_mandate` after the
//      user completes the Razorpay-hosted auth page on a fresh subscribe.
//      Flip: set mandate_token, anchor_day, next_charge_at, state=active,
//      append state_history. Mirrors webhook handler Flow (A) at
//      src/routes/api/billing/webhook/razorpay/+server.ts:265-319.
//
//   2. UPDATE PAYMENT METHOD — state stays at `active` but with
//      `pending_replacement_registration_id` set, so the Manage panel
//      hides the Update Payment button and the mandate_token never
//      rotates. Swap: replace mandate_token with a fresh one, unset
//      the three pending_replacement_* fields. Mirrors
//      subscriptionStore.swapMandateAfterReplacement() (lines 427-458).
//
// Usage:
//   node scripts/dev-activate-pending-mandate.mjs              # list all stuck rows in either mode
//   node scripts/dev-activate-pending-mandate.mjs <dsa_id>     # auto-detect mode + flip
//
// Safety: refuses to run if MONGODB_URI host contains 'prod' or matches a
// well-known production host pattern. Override with DEV_ACTIVATE_CONFIRM=yes.

import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { randomBytes } from 'crypto';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const uri = process.env.MONGODB_URI;
if (!uri) {
	console.error('MONGODB_URI not set in .env');
	process.exit(1);
}

if (/prod|production/i.test(uri) && process.env.DEV_ACTIVATE_CONFIRM !== 'yes') {
	console.error('Refusing: MONGODB_URI looks like production. Set DEV_ACTIVATE_CONFIRM=yes to override.');
	process.exit(1);
}

const dsaIdArg = process.argv[2];

const client = await new MongoClient(uri).connect();
const db = client.db(process.env.MONGODB_DB_NAME);
const subs = db.collection('billingSubscriptions');

// Find rows stuck in either mode.
const stuck = await subs
	.find({
		$or: [
			{ state: 'pending_mandate' },
			{ pending_replacement_registration_id: { $exists: true } }
		]
	})
	.project({
		_id: 1,
		dsa_id: 1,
		plan_id: 1,
		state: 1,
		created_at: 1,
		pending_registration_id: 1,
		pending_replacement_registration_id: 1,
		mandate_token: 1
	})
	.toArray();

function modeOf(doc) {
	if (doc.state === 'pending_mandate') return 'pending_mandate → active';
	if (doc.pending_replacement_registration_id) return 'replacement swap (active stays, mandate_token rotates)';
	return 'unknown';
}

if (stuck.length === 0) {
	console.log('No subscriptions stuck. Nothing to do.');
	await client.close();
	process.exit(0);
}

console.log(`\nFound ${stuck.length} stuck row(s):\n`);
for (const p of stuck) {
	console.log(
		`  dsa_id=${p.dsa_id}  plan=${p.plan_id}  state=${p.state}  mode="${modeOf(p)}"  pending_reg=${p.pending_registration_id ?? p.pending_replacement_registration_id ?? '<unset>'}`
	);
}

if (!dsaIdArg) {
	console.log('\nRe-run with a dsa_id argument to flip:');
	console.log(`  node scripts/dev-activate-pending-mandate.mjs ${stuck[0].dsa_id}\n`);
	await client.close();
	process.exit(0);
}

const target = stuck.find((p) => p.dsa_id.toString() === dsaIdArg);
if (!target) {
	console.error(`\nNo stuck row found for dsa_id=${dsaIdArg}`);
	await client.close();
	process.exit(1);
}

const now = new Date();

if (target.state === 'pending_mandate') {
	// Mode 1: initial subscribe — webhook handler Flow (A) equivalent.
	const anchorDay = Math.min(now.getUTCDate(), 28);
	const nextCharge = new Date(now);
	nextCharge.setUTCMonth(nextCharge.getUTCMonth() + 1);
	nextCharge.setUTCDate(anchorDay);
	const mandateToken = `mandate_dev_${randomBytes(8).toString('hex')}`;

	console.log(`\nMode 1 — pending_mandate → active for dsa_id=${dsaIdArg}:`);
	console.log(`  mandate_token: ${mandateToken}`);
	console.log(`  anchor_day: ${anchorDay}`);
	console.log(`  next_charge_at: ${nextCharge.toISOString()}`);

	const result = await subs.updateOne(
		{ dsa_id: target.dsa_id, state: 'pending_mandate' },
		{
			$set: {
				state: 'active',
				mandate_token: mandateToken,
				anchor_day: anchorDay,
				next_charge_at: nextCharge,
				updated_at: now,
				failed_attempt_count: 0
			},
			$push: {
				state_history: {
					from: 'pending_mandate',
					to: 'active',
					at: now,
					reason: 'dev-activate-pending-mandate.mjs (manual webhook simulation)',
					meta: { script: 'dev-activate-pending-mandate', mode: 'initial', synthetic: true }
				}
			}
		}
	);

	if (result.modifiedCount === 1) {
		console.log(`\n✅ Flipped successfully. Refresh /dashboard/dsa/billing — should now show "Auto-pay active".`);
	} else {
		console.error(`\n⚠️  No row updated (matchedCount=${result.matchedCount}). Concurrent change?`);
	}
} else if (target.pending_replacement_registration_id) {
	// Mode 2: payment-method update — swapMandateAfterReplacement equivalent.
	const newMandateToken = `mandate_dev_${randomBytes(8).toString('hex')}`;
	const previousToken = target.mandate_token;

	console.log(`\nMode 2 — replacement swap for dsa_id=${dsaIdArg}:`);
	console.log(`  previous mandate_token: ${previousToken ?? '<unset>'}`);
	console.log(`  new mandate_token: ${newMandateToken}`);
	console.log(`  clearing: pending_replacement_registration_id, pending_replacement_expires_at, mandate_update_lock_until`);

	const result = await subs.updateOne(
		{
			_id: target._id,
			pending_replacement_registration_id: target.pending_replacement_registration_id
		},
		{
			$set: {
				mandate_token: newMandateToken,
				updated_at: now
			},
			$unset: {
				pending_replacement_registration_id: '',
				pending_replacement_expires_at: '',
				mandate_update_lock_until: ''
			}
		}
	);

	if (result.modifiedCount === 1) {
		console.log(`\n✅ Swapped successfully. Refresh /dashboard/dsa/billing → Payment Method tab — "Update in progress" banner should disappear and "Update payment method" button should reappear.`);
	} else {
		console.error(`\n⚠️  No row updated (matchedCount=${result.matchedCount}). Concurrent change?`);
	}
} else {
	console.error(`\nRow for dsa_id=${dsaIdArg} is not stuck in a recognized mode. State: ${target.state}`);
}

await client.close();
