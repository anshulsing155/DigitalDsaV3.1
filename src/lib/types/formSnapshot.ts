// Form Snapshot Types
import type { ObjectId } from 'mongodb';

// ============================================================================
// FORM SNAPSHOT TYPE
// ============================================================================

export interface FormSnapshot {
	_id?: ObjectId;
	case_id: string;
	version: number;
	/**
	 * Plaintext payload. During the SEC-2 Phase C.2 cutover window, BOTH
	 * `payload` AND `payload_encrypted` are populated on insert — readers
	 * can use either. Backfill writes `payload_encrypted` for historical
	 * rows. Once read sites migrate to `resolveSnapshotPayload()` and the
	 * soak period passes, a future migration drops `payload` and keeps
	 * only `payload_encrypted`. See docs/specs/SEC-2-PHASE-C-PLAN.md §4.4.
	 */
	payload: Record<string, any>;
	/**
	 * Document-level encrypted payload — BSON Binary subtype 6, produced
	 * by `encryptSnapshotPayload()`. Optional during the migration window.
	 * Use `resolveSnapshotPayload(snapshot)` to read transparently; do not
	 * decrypt directly at call sites.
	 *
	 * Random-algorithm encryption: payload is never queried by value
	 * (every consumer fetches by case_id + version then reads fields
	 * client-side), so determinism isn't required.
	 */
	payload_encrypted?: unknown;
	/**
	 * SHA-256 over the PLAINTEXT payload — tamper detection survives
	 * encryption: verify the hash after decrypting `payload_encrypted`
	 * at read time. This invariant (hash is plaintext-derived) is what
	 * preserves AD-05 immutability under the C.2 model.
	 */
	payload_hash: string;
	created_by: ObjectId;
	created_at: Date;
	change_summary?: string;
}
