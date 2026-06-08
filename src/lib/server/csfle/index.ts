/**
 * CSFLE — barrel export.
 * See docs/specs/SEC-2-CSFLE-PLAN.md for the design.
 */

export { getClientEncryption, _resetClientEncryptionForTests } from './client.js';
export { encryptValue, decryptValue, isEncryptedBinary } from './helpers.js';
export { ensureDeksExist, type DekInitResult } from './setup.js';
export { CSFLE_KEYS, DETERMINISTIC, RANDOM, getKeyDef, type CsfleAlgorithm, type CsfleKeyDef } from './keys.js';
export {
	encryptUserPii,
	decryptUserPii,
	encryptMobileForQuery,
	encryptEmailForQuery,
	encryptPanForQuery,
	findUserByMobile,
	findUserByEmail,
	findUserByPan,
	computeBackfillPatch,
	listBackfillableFields
} from './userCrypto.js';
export {
	backfillCollection,
	ensureAuditIndex,
	defaultAuditWriter,
	type BackfillOptions,
	type BackfillBatchResult,
	type BackfillCollectionResult,
	type AuditWriter,
	type AuditEntry
} from './backfill.js';
export {
	encryptSnapshotPayload,
	decryptSnapshotPayload,
	resolveSnapshotPayload
} from './snapshotCrypto.js';
export { backfillSnapshots } from './snapshotBackfill.js';
