// Find which collection has a given _id (used during D.1 smoke when the
// JWT userId didn't match the DsaApplications._id from the mobile lookup).
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const targetId = process.argv[2];
if (!targetId) {
	console.error('Usage: node scripts/d1-smoke-find-by-id.mjs <_id-hex-string>');
	process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
const oid = new ObjectId(targetId);

console.log(`\nSearching for _id=${targetId} across user collections + billing:\n`);
const collections = ['DsaApplications', 'Applicant', 'rmApplications', 'AdminUsers', 'billingSubscriptions'];
for (const name of collections) {
	const docs = await db
		.collection(name)
		.find({ _id: oid })
		.toArray();
	console.log(`  ${name}: ${docs.length} doc(s)`);
	for (const d of docs) {
		const summary = {
			_id: d._id?.toString(),
			name: d.name,
			mobile: d.mobileNumber,
			email: d.email,
			onboarded: d.onboardingCompleted,
			dsa_id: d.dsa_id?.toString(),
			state: d.state
		};
		console.log(`    ${JSON.stringify(summary)}`);
	}
}
// Also search by mobile to spot duplicates
console.log(`\nAll DsaApplications docs with mobile 9811556664:\n`);
const allDsa = await db
	.collection('DsaApplications')
	.find(
		{ mobileNumber: { $in: [9811556664, '9811556664', '+919811556664'] } },
		{ projection: { _id: 1, name: 1, mobileNumber: 1, email: 1, createdAt: 1, onboardingCompleted: 1 } }
	)
	.toArray();
console.log(`  Count: ${allDsa.length}`);
for (const d of allDsa) console.log(`    ${JSON.stringify({ _id: d._id?.toString(), name: d.name, email: d.email, onboarded: d.onboardingCompleted, createdAt: d.createdAt })}`);

await client.close();
