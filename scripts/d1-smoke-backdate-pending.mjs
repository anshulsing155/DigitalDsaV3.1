// Backdate the pending_mandate billingSubscriptions doc for digitaldsa so
// the pending-cleanup cron (Test 14) sweeps it. Used to clear the
// MockProvider attempt before re-running Test 11 against Razorpay.
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
const coll = db.collection('billingSubscriptions');
const dsaId = new ObjectId('69932b7080fbf75296f09faa');

console.log('BEFORE:');
const before = await coll.find({ dsa_id: dsaId }).toArray();
for (const d of before) {
	console.log(`  _id=${d._id} state=${d.state} updated_at=${d.updated_at?.toISOString?.() ?? d.updated_at} pending_id=${d.pending_registration_id}`);
}

// Backdate updated_at to 48h ago — well past the 24h pending-cleanup threshold.
const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
const res = await coll.updateMany(
	{ dsa_id: dsaId, state: 'pending_mandate' },
	{ $set: { updated_at: twoDaysAgo } }
);
console.log(`\nBackdated ${res.modifiedCount} doc(s) to 48h ago.\n`);

console.log('AFTER:');
const after = await coll.find({ dsa_id: dsaId }).toArray();
for (const d of after) {
	console.log(`  _id=${d._id} state=${d.state} updated_at=${d.updated_at?.toISOString?.() ?? d.updated_at}`);
}

await client.close();
