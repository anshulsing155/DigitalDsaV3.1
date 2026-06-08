// D.1 smoke cleanup — reset the digitaldsa subscription back to a clean state
// and delete the synthetic webhook event from dedup table. Run once at the
// end of the smoke. Safe to delete this script after.
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const DSA_ID = '69932b7080fbf75296f09faa';
const EVENT_ID = 'evt_smoke_subscription_activated_001';

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();

// 1. Delete the digitaldsa subscription doc entirely (it was a smoke artifact
//    that was active'd via a synthetic webhook — not a real subscription).
const subRes = await db.collection('billingSubscriptions').deleteOne({ dsa_id: new ObjectId(DSA_ID) });
console.log(`billingSubscriptions deleted: ${subRes.deletedCount}`);

// 2. Delete the synthetic webhook event from the dedup table.
const evtRes = await db.collection('processedWebhookEvents').deleteMany({ provider_event_id: EVENT_ID });
console.log(`processedWebhookEvents deleted: ${evtRes.deletedCount}`);

await client.close();
