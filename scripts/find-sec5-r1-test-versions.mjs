// One-shot helper for SEC-5 R1 smoke testing — extended.
// Reports the dev database state for policy versions + RM assignments so
// we know what testable data exists. Read-only.

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoClient } from 'mongodb';

const RM_MOBILE = 9811556664;

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
	$or: [{ mobileNumber: RM_MOBILE }, { mobileNumber: String(RM_MOBILE) }]
});

const totalVersions = await db.collection('policyVersions').countDocuments({});
const byStatus = await db
	.collection('policyVersions')
	.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
	.toArray();

const sampleVersions = await db
	.collection('policyVersions')
	.find({}, { projection: { _id: 1, policy_rule_id: 1, status: 1, version_number: 1 } })
	.limit(5)
	.toArray();

const totalRules = await db.collection('policyRules').countDocuments({});
const totalAssignments = await db.collection('rm_lender_assignments').countDocuments({});

console.log(JSON.stringify({
	rm: rm ? { _id: rm._id.toString(), mobile: rm.mobileNumber } : null,
	totalAssignments,
	totalVersions,
	versionsByStatus: byStatus,
	sampleVersions: sampleVersions.map((v) => ({
		_id: v._id.toString(),
		policy_rule_id: v.policy_rule_id,
		status: v.status,
		version_number: v.version_number
	})),
	totalRules
}, null, 2));

await client.close();
