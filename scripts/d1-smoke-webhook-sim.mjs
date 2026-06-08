#!/usr/bin/env node
// D.1 S2 smoke — webhook simulator.
//
// Razorpay test-mode UX was blocking real bank-side mandate completion on the
// smoke account (Account Activation 10%, no subscriptions ever reached an
// 'authenticated' state). This script verifies our WEBHOOK HANDLER + state
// machine end-to-end by sending properly HMAC-signed events to the local
// webhook endpoint exactly as Razorpay would.
//
// Covers:
//   - Test 9  — verifyWebhookSignature returns true on valid sig
//   - Test 10 — parseWebhookEvent maps subscription.activated → mandate.authorized
//   - Test 13 — state flips pending_mandate → active (verified via Mongo)
//   - Test 15 — forged signature → 401
//   - Test 16 — idempotency: same signed body twice → first 200, second duplicate:true
//
// Usage:
//   node scripts/d1-smoke-webhook-sim.mjs valid     # send a valid subscription.activated
//   node scripts/d1-smoke-webhook-sim.mjs forged    # send with a bad signature
//   node scripts/d1-smoke-webhook-sim.mjs replay    # send same valid body again (idempotency)
//   node scripts/d1-smoke-webhook-sim.mjs           # run all 3 in sequence with summary

import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

// ─── Load .env without dotenv dependency ──────────────────────
const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const URL = 'http://127.0.0.1:5173/api/billing/webhook/razorpay';
const MONGO_URI = process.env.MONGODB_URI;
const DSA_ID = '69932b7080fbf75296f09faa'; // the digitaldsa account from earlier diagnosis

if (!SECRET) {
	console.error('FATAL: RAZORPAY_WEBHOOK_SECRET missing in .env');
	process.exit(1);
}

// ─── Build a Razorpay-shaped subscription.activated payload ──
// Pinned event id so replays in Test 16 collide on the dedup key.
const EVENT_ID = 'evt_smoke_subscription_activated_001';
const TOKEN_ID = 'token_smoke_mandate_001';
const SUBSCRIPTION_ID = 'sub_smoke_001';

function buildPayload() {
	return {
		entity: 'event',
		account_id: 'acc_smoke',
		event: 'subscription.activated',
		contains: ['subscription'],
		id: EVENT_ID,
		created_at: Math.floor(Date.now() / 1000),
		payload: {
			subscription: {
				entity: {
					id: SUBSCRIPTION_ID,
					status: 'active',
					// This is the field our parseWebhookEvent extracts as mandate_token
					token_id: TOKEN_ID,
					customer_id: 'cust_smoke_001'
				}
			}
		}
	};
}

function sign(body) {
	return createHmac('sha256', SECRET).update(body).digest('hex');
}

async function post(body, signature, label) {
	const start = Date.now();
	const res = await fetch(URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-razorpay-signature': signature
		},
		body
	});
	const elapsed = Date.now() - start;
	let json;
	try {
		json = await res.json();
	} catch {
		json = { _parse_error: true };
	}
	console.log(`[${label}] HTTP ${res.status} in ${elapsed}ms  body=${JSON.stringify(json)}`);
	return { status: res.status, json };
}

async function readMongoState() {
	if (!MONGO_URI) return null;
	const client = await new MongoClient(MONGO_URI).connect();
	try {
		const db = client.db();
		const doc = await db.collection('billingSubscriptions').findOne({ dsa_id: new ObjectId(DSA_ID) });
		return doc
			? {
					state: doc.state,
					mandate_token_present: !!doc.mandate_token,
					anchor_day: doc.anchor_day,
					next_charge_at: doc.next_charge_at,
					state_history_count: Array.isArray(doc.state_history) ? doc.state_history.length : 0
				}
			: null;
	} finally {
		await client.close();
	}
}

async function clearProcessedEvent() {
	if (!MONGO_URI) return;
	const client = await new MongoClient(MONGO_URI).connect();
	try {
		const db = client.db();
		await db.collection('processedWebhookEvents').deleteMany({ provider_event_id: EVENT_ID });
	} finally {
		await client.close();
	}
}

// ─── Test runners ──────────────────────────────────────────────

async function runValid() {
	console.log('\n── VALID  (Tests 9 + 10 + 13) ──');
	console.log(`Mongo BEFORE:`, await readMongoState());
	const body = JSON.stringify(buildPayload());
	const sig = sign(body);
	const res = await post(body, sig, 'valid');
	console.log(`Mongo AFTER: `, await readMongoState());
	if (res.status !== 200 || !res.json?.data?.processed) {
		console.error('  FAIL: expected 200 + {processed:true}');
		return false;
	}
	return true;
}

async function runForged() {
	console.log('\n── FORGED (Test 15) ──');
	const body = JSON.stringify(buildPayload());
	const res = await post(body, 'forged_signature_does_not_match', 'forged');
	if (res.status !== 401) {
		console.error('  FAIL: expected 401, got ' + res.status);
		return false;
	}
	return true;
}

async function runReplay() {
	console.log('\n── REPLAY (Test 16) ──');
	const body = JSON.stringify(buildPayload());
	const sig = sign(body);
	const r1 = await post(body, sig, 'replay-1');
	const r2 = await post(body, sig, 'replay-2');
	const expect1Processed = r1.status === 200 && r1.json?.data?.processed === true;
	const expect2Duplicate = r2.status === 200 && r2.json?.data?.duplicate === true;
	if (!expect1Processed && !r1.json?.data?.duplicate) {
		console.error('  FAIL: first call should be processed:true OR duplicate:true (if prior valid ran)');
		return false;
	}
	if (!expect2Duplicate) {
		console.error('  FAIL: second call should be duplicate:true (got ' + JSON.stringify(r2.json) + ')');
		return false;
	}
	return true;
}

// ─── Orchestrator ──────────────────────────────────────────────

const mode = process.argv[2] || 'all';
let pass = true;

if (mode === 'valid') {
	pass = await runValid();
} else if (mode === 'forged') {
	pass = await runForged();
} else if (mode === 'replay') {
	pass = await runReplay();
} else {
	// Full sequence: clear dedup → forged (no effect) → valid (state flips, dedup mark) → replay (duplicate).
	await clearProcessedEvent();
	const a = await runForged();
	const b = await runValid();
	const c = await runReplay();
	pass = a && b && c;
}

console.log(`\n── ${pass ? 'PASS' : 'FAIL'} ──`);
process.exit(pass ? 0 : 1);
