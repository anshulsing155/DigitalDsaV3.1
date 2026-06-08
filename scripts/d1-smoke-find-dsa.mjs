// One-shot diagnostic: where does the dev login user (9811556664) live?
// Used during D.1 S2 smoke to triage the "DSA not found" 404 surfaced by
// the subscribe-recurring endpoint. Safe to delete after smoke closes.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// Parse .env manually so we don't add a dotenv dependency just for this.
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

const client = await new MongoClient(uri).connect();
const db = client.db();

console.log(`\nLooking up mobile 9811556664 across user-facing collections:\n`);
const collections = ['DsaApplications', 'Applicant', 'rmApplications', 'AdminUsers'];
for (const name of collections) {
	const docs = await db
		.collection(name)
		.find(
			{ mobileNumber: { $in: [9811556664, '9811556664', '+919811556664'] } },
			{ projection: { _id: 1, name: 1, mobileNumber: 1, email: 1, onboardingCompleted: 1 } }
		)
		.toArray();
	console.log(`  ${name}: ${docs.length} doc(s)`);
	for (const d of docs) {
		console.log(
			`    _id=${d._id}  name="${d.name ?? '<unset>'}"  mobile=${d.mobileNumber}  email=${d.email ?? '<unset>'}  onboarded=${d.onboardingCompleted ?? 'n/a'}`
		);
	}
}
await client.close();
console.log('');
