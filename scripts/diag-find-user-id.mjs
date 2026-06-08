// One-shot diagnostic: locate the JWT user id across user-facing collections.
// Use to triage USER_NOT_DSA log lines — paste the jwt_user_id from the log
// as the only arg. Safe to delete after the triage closes.
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const id = process.argv[2];
if (!id) {
	console.error('Usage: node scripts/diag-find-user-id.mjs <ObjectId>');
	process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
const oid = new ObjectId(id);

console.log(`\nLooking up _id=${id} across collections:\n`);
for (const name of ['DsaApplications', 'Applicant', 'rmApplications', 'AdminUsers']) {
	const doc = await db
		.collection(name)
		.findOne(
			{ _id: oid },
			{
				projection: {
					_id: 1,
					name: 1,
					mobileNumber: 1,
					email: 1,
					role: 1,
					onboardingCompleted: 1,
					createdAt: 1,
					is_active: 1
				}
			}
		);
	if (doc) {
		console.log(`  ${name}: FOUND`);
		console.log(`    name=${doc.name ?? '<unset>'}  mobile=${doc.mobileNumber}  email=${doc.email ?? '<unset>'}`);
		console.log(`    role=${doc.role ?? '<unset>'}  onboarded=${doc.onboardingCompleted ?? 'n/a'}  active=${doc.is_active ?? 'n/a'}  createdAt=${doc.createdAt ?? 'n/a'}`);
	} else {
		console.log(`  ${name}: not found`);
	}
}
await client.close();
console.log('');
