/**
 * CSFLE — ClientEncryption factory.
 *
 * Lazy-initializes a `ClientEncryption` instance bound to:
 *   - the local KMS provider (CMK from QE_LOCAL_MASTER_KEY env var)
 *   - the key vault namespace `encryption.__keyVault`
 *   - the existing MongoDB client (unencrypted — CSFLE explicit mode does
 *     NOT use auto-encryption, so no schema map is needed and no native
 *     binary is required at runtime)
 *
 * The singleton is created on first call. Re-uses the existing Mongo client
 * to avoid opening a second connection pool. If `CSFLE_ENABLED` is unset or
 * not `'true'`, the factory returns null — callers must handle this and
 * fall back to passthrough behavior during the Phase A/B/C migration.
 *
 * Reference: docs/specs/SEC-2-CSFLE-PLAN.md
 */

import { env } from '$env/dynamic/private';
import { createRequire } from 'node:module';
import type { MongoClient } from 'mongodb';
import logger from '$lib/server/logger.js';

// `require` is not defined in Vite's ESM dev runtime — we use Node's
// createRequire shim to keep the lazy-load pattern below working in both
// production (Vercel, Node ESM) and Vite dev. Bound to this file's URL
// so resolution works the same way require() would.
const nodeRequire = createRequire(import.meta.url);

const DEFAULT_KEY_VAULT_NAMESPACE = 'encryption.__keyVault';
const CMK_REQUIRED_BYTES = 96;

// `ClientEncryption` is typed as `unknown` here because we lazy-require it
// only when CSFLE is actually enabled. The `mongodb-client-encryption`
// package has a native binding that fails to load in non-Node test
// environments (vitest's pool). By gating the require behind the enabled
// check we keep tests + non-CSFLE runtimes clean.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClientEncryption: any = null;
let initAttempted = false;

/**
 * Returns the ClientEncryption singleton, or null if CSFLE is disabled.
 *
 * @param mongoClient The unencrypted MongoDB client (from $lib/database/mongo).
 * @returns ClientEncryption instance or null. Callers MUST handle null.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getClientEncryption(mongoClient: MongoClient): any {
	if (cachedClientEncryption) return cachedClientEncryption;
	if (initAttempted) return null;
	initAttempted = true;

	if (env.CSFLE_ENABLED !== 'true') {
		logger.info('[csfle] disabled (CSFLE_ENABLED is not "true") — encryption helpers passthrough');
		return null;
	}

	const cmkBase64 = env.QE_LOCAL_MASTER_KEY;
	if (!cmkBase64) {
		logger.error('[csfle] CSFLE_ENABLED=true but QE_LOCAL_MASTER_KEY is unset — refusing to start');
		throw new Error('CSFLE_ENABLED=true but QE_LOCAL_MASTER_KEY is missing');
	}

	const cmk = Buffer.from(cmkBase64, 'base64');
	if (cmk.length !== CMK_REQUIRED_BYTES) {
		logger.error(
			{ actualBytes: cmk.length, requiredBytes: CMK_REQUIRED_BYTES },
			'[csfle] QE_LOCAL_MASTER_KEY decodes to wrong byte length — refusing to start'
		);
		throw new Error(
			`QE_LOCAL_MASTER_KEY must decode to exactly ${CMK_REQUIRED_BYTES} bytes, got ${cmk.length}`
		);
	}

	const keyVaultNamespace = env.CSFLE_KEY_VAULT_NAMESPACE || DEFAULT_KEY_VAULT_NAMESPACE;

	// Lazy-require ClientEncryption only when we actually need it. This
	// avoids loading the `mongodb-client-encryption` native binding in
	// environments where CSFLE is off (e.g., unit tests, Vite dev with
	// CSFLE_ENABLED=false). `nodeRequire` is the createRequire shim
	// defined at module load — needed because bare `require` is not
	// defined in Vite's ESM runtime, even when this branch is reached
	// only with CSFLE actually on.
	const { ClientEncryption } = nodeRequire('mongodb') as typeof import('mongodb');
	cachedClientEncryption = new ClientEncryption(mongoClient, {
		keyVaultNamespace,
		kmsProviders: { local: { key: cmk } }
	});

	logger.info({ keyVaultNamespace }, '[csfle] ClientEncryption initialized (local KMS)');
	return cachedClientEncryption;
}

/**
 * Reset the cached instance. Test-only — DO NOT call from production code.
 * Used in unit tests to force re-init with different env vars.
 */
export function _resetClientEncryptionForTests(): void {
	cachedClientEncryption = null;
	initAttempted = false;
}
