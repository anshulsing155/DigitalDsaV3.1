/**
 * CSFLE — DEK initialization (idempotent).
 *
 * Run once per environment after `QE_LOCAL_MASTER_KEY` is set. Creates every
 * DEK listed in CSFLE_KEYS in the key vault if absent. Safe to re-run — uses
 * `getKeyByAltName` to detect existing DEKs and skips them.
 *
 * Invoked by scripts/sec2-init-deks.ts (one-time CLI runner). Also exposed
 * here so it can be called from a future admin endpoint if needed.
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md §6 Phase A
 */

import type { MongoClient } from 'mongodb';
import { getClientEncryption } from './client.js';
import { CSFLE_KEYS } from './keys.js';
import logger from '$lib/server/logger.js';

export interface DekInitResult {
	created: string[];
	alreadyExisted: string[];
	skipped: string[];
}

/**
 * Ensures every CSFLE_KEYS entry has a corresponding DEK in the key vault.
 * Idempotent.
 */
export async function ensureDeksExist(mongoClient: MongoClient): Promise<DekInitResult> {
	const ce = getClientEncryption(mongoClient);
	if (!ce) {
		logger.warn('[csfle] CSFLE disabled — skipping DEK initialization');
		return {
			created: [],
			alreadyExisted: [],
			skipped: CSFLE_KEYS.map((k) => k.keyAltName)
		};
	}

	const created: string[] = [];
	const alreadyExisted: string[] = [];

	for (const def of CSFLE_KEYS) {
		const existing = await ce.getKeyByAltName(def.keyAltName);
		if (existing) {
			alreadyExisted.push(def.keyAltName);
			continue;
		}

		await ce.createDataKey('local', { keyAltNames: [def.keyAltName] });
		created.push(def.keyAltName);
		logger.info({ keyAltName: def.keyAltName, purpose: def.purpose }, '[csfle] DEK created');
	}

	logger.info(
		{ createdCount: created.length, existingCount: alreadyExisted.length },
		'[csfle] DEK initialization complete'
	);

	return { created, alreadyExisted, skipped: [] };
}
