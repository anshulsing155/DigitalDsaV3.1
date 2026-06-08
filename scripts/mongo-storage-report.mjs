#!/usr/bin/env node
// Read-only storage report: every DB on the cluster + every collection in each DB.
// Safe to run even when writes are blocked (over-quota).
// Usage: node scripts/mongo-storage-report.mjs

import { MongoClient } from 'mongodb';
import { readFileSync } from 'node:fs';

// Minimal .env loader (no dotenv dep)
try {
	const env = readFileSync('.env', 'utf8');
	for (const line of env.split(/\r?\n/)) {
		const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (!m) continue;
		const [, k, vRaw] = m;
		if (process.env[k]) continue;
		process.env[k] = vRaw.replace(/^['"]|['"]$/g, '');
	}
} catch {
	// .env missing — fall through; will fail on URI check
}

const uri = process.env.MONGODB_URI;
if (!uri) {
	console.error('MONGODB_URI missing from .env');
	process.exit(1);
}

const fmtBytes = (b) => {
	if (b == null) return '—';
	if (b < 1024) return `${b} B`;
	if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
	if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
	return `${(b / 1024 ** 3).toFixed(2)} GB`;
};

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
	await client.connect();
	console.log('Connected to cluster.\n');

	// 1. List all databases
	const adminDb = client.db().admin();
	const { databases } = await adminDb.listDatabases();

	// Sort DBs by sizeOnDisk
	databases.sort((a, b) => (b.sizeOnDisk || 0) - (a.sizeOnDisk || 0));

	console.log('═══════════════════════════════════════════════════════════');
	console.log('DATABASES ON CLUSTER (sorted by size on disk)');
	console.log('═══════════════════════════════════════════════════════════');
	console.log(`${pad('Database', 30)} ${padL('Size on disk', 14)} ${padL('Empty?', 8)}`);
	console.log('-'.repeat(56));
	let total = 0;
	for (const db of databases) {
		total += db.sizeOnDisk || 0;
		console.log(
			`${pad(db.name, 30)} ${padL(fmtBytes(db.sizeOnDisk), 14)} ${padL(db.empty ? 'yes' : '', 8)}`
		);
	}
	console.log('-'.repeat(56));
	console.log(`${pad('TOTAL', 30)} ${padL(fmtBytes(total), 14)}\n`);

	// 2. For each non-system DB, list collections with stats
	const skipDbs = new Set(['admin', 'local', 'config']);
	for (const db of databases) {
		if (skipDbs.has(db.name)) continue;
		if (db.empty) continue;

		const dbHandle = client.db(db.name);
		const colls = await dbHandle.listCollections().toArray();

		// Gather stats per collection via $collStats aggregation
		const rows = [];
		for (const c of colls) {
			try {
				const stats = await dbHandle
					.collection(c.name)
					.aggregate([{ $collStats: { storageStats: {} } }])
					.toArray();
				const s = stats[0]?.storageStats ?? {};
				rows.push({
					name: c.name,
					count: s.count ?? 0,
					size: s.size ?? 0, // logical (uncompressed) document size
					storageSize: s.storageSize ?? 0, // compressed on disk
					indexSize: s.totalIndexSize ?? 0,
					avgObjSize: s.avgObjSize ?? 0
				});
			} catch (err) {
				rows.push({ name: c.name, error: err.message });
			}
		}

		rows.sort((a, b) => (b.storageSize || 0) - (a.storageSize || 0));

		console.log('═══════════════════════════════════════════════════════════');
		console.log(`DATABASE: ${db.name}  —  ${rows.length} collections`);
		console.log('═══════════════════════════════════════════════════════════');
		console.log(
			`${pad('Collection', 38)} ${padL('Docs', 9)} ${padL('Logical', 11)} ${padL('On disk', 11)} ${padL('Indexes', 11)} ${padL('Avg/doc', 10)}`
		);
		console.log('-'.repeat(94));

		let dbDocs = 0,
			dbLogical = 0,
			dbDisk = 0,
			dbIdx = 0;
		for (const r of rows) {
			if (r.error) {
				console.log(`${pad(r.name, 38)} ERROR: ${r.error}`);
				continue;
			}
			dbDocs += r.count;
			dbLogical += r.size;
			dbDisk += r.storageSize;
			dbIdx += r.indexSize;
			console.log(
				`${pad(r.name, 38)} ${padL(r.count.toLocaleString(), 9)} ${padL(fmtBytes(r.size), 11)} ${padL(fmtBytes(r.storageSize), 11)} ${padL(fmtBytes(r.indexSize), 11)} ${padL(fmtBytes(r.avgObjSize), 10)}`
			);
		}
		console.log('-'.repeat(94));
		console.log(
			`${pad('TOTAL', 38)} ${padL(dbDocs.toLocaleString(), 9)} ${padL(fmtBytes(dbLogical), 11)} ${padL(fmtBytes(dbDisk), 11)} ${padL(fmtBytes(dbIdx), 11)}`
		);
		console.log();
	}
} catch (err) {
	console.error('Report failed:', err.message);
	process.exitCode = 1;
} finally {
	await client.close();
}
