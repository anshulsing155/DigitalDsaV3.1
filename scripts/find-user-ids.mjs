// One-shot: find user IDs + sample RmLenderAssignment rows so we can
// confirm what rmUserId format the live data uses.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

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

const rm = await db.collection('rmApplications').findOne({
	$or: [{ mobileNumber: 9811556664 }, { mobileNumber: '9811556664' }]
});
const dsa = await db.collection('DsaApplications').findOne({
	$or: [{ mobileNumber: 9811556664 }, { mobileNumber: '9811556664' }]
});
const admin = await db.collection('adminUsers').findOne({
	$or: [{ mobileNumber: 9811556664 }, { mobileNumber: '9811556664' }]
});
const applicant = await db.collection('userApplications').findOne({
	$or: [{ mobileNumber: 9811556664 }, { mobileNumber: '9811556664' }]
});

const userIds = [rm?._id, dsa?._id, admin?._id, applicant?._id]
	.filter(Boolean)
	.map((o) => o.toString());

// Look for existing assignments using any of our user IDs
const existingForThisUser = await db
	.collection('rm_lender_assignments')
	.find({ rmUserId: { $in: userIds } })
	.toArray();

// Sample a few rows from anywhere to see the typical rmUserId shape
const samples = await db
	.collection('rm_lender_assignments')
	.find({}, { projection: { rmUserId: 1, lenderId: 1, status: 1 } })
	.limit(5)
	.toArray();

console.log(JSON.stringify({
	candidate_userIds: {
		rmApplications: rm?._id?.toString(),
		DsaApplications: dsa?._id?.toString(),
		adminUsers: admin?._id?.toString(),
		Applicant: applicant?._id?.toString()
	},
	existingAssignmentsForAnyOfTheseUserIds: existingForThisUser.map((a) => ({
		_id: a._id.toString(),
		rmUserId: a.rmUserId,
		lenderId: a.lenderId,
		status: a.status
	})),
	sampleAssignmentsFromDB: samples.map((s) => ({
		rmUserId: s.rmUserId,
		lenderId: s.lenderId,
		status: s.status
	}))
}, null, 2));

await client.close();
