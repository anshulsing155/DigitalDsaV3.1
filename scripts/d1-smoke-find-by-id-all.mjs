// Exhaustive: search ALL collections for a given _id during D.1 smoke.
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';

const envText = readFileSync('.env', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
	const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
	if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const targetId = process.argv[2];
if (!targetId) { console.error('Usage: node ... <id>'); process.exit(1); }

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db();
const oid = new ObjectId(targetId);

const colls = await db.listCollections().toArray();
console.log(`\nSearching ${colls.length} collections for _id=${targetId}\n`);
for (const c of colls) {
	try {
		const found = await db.collection(c.name).findOne({ _id: oid });
		if (found) {
			console.log(`✓ MATCH in ${c.name}:`);
			const summary = { ...found };
			// Don't print huge embedded docs — just key fields
			delete summary.payload;
			delete summary.snapshot;
			delete summary.encryptedData;
			console.log(`  ${JSON.stringify(summary, null, 2).slice(0, 600)}`);
		}
	} catch {}
}

// Also search by other id fields commonly used
console.log(`\nSearching by user_id, dsa_id, userId, owner_id, applicantId:\n`);
const otherFields = ['user_id', 'dsa_id', 'userId', 'owner_id', 'applicantId', 'dsaUserId'];
for (const c of colls) {
	for (const field of otherFields) {
		try {
			const found = await db.collection(c.name).findOne({ [field]: oid });
			if (found) {
				console.log(`✓ ${c.name}.${field} matches → _id=${found._id}`);
			}
		} catch {}
		try {
			const found2 = await db.collection(c.name).findOne({ [field]: targetId });
			if (found2) {
				console.log(`✓ ${c.name}.${field} (string) matches → _id=${found2._id}`);
			}
		} catch {}
	}
}

await client.close();
