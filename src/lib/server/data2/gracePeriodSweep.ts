/**
 * DATA-2 — Grace-period sweep: hard-delete revoked vault entries.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §9 (grace-period hard-delete).
 *
 * Runs daily. Finds OutreachVault entries where:
 *   - consent_status === 'revoked'
 *   - grace_period_ends_at <= now
 *
 * For each such entry, in audit-log-first order (mirror of DATA-3):
 *   1. Write a ConsentRevocationLog row with full audit fields
 *   2. Delete the ImageKit consent doc (retry policy from DATA-3's machinery)
 *   3. Update the audit row with the ImageKit deletion outcome
 *   4. Hard-delete the OutreachVault Mongo document
 *
 * If step 4 fails after step 3, we get an orphan audit row (acceptable
 * overcount of erasures) rather than a deleted vault entry with no
 * audit trail (privacy/compliance failure).
 * ══════════════════════════════════════════════════════════════════════════════
 */

import type { Collection } from 'mongodb';
import type { OutreachVaultEntry, ConsentRevocationLogEntry } from './types.js';
import {
	deleteWithRetry,
	type ImagekitDeleteClient,
	type FinalDeletionOutcome
} from '$lib/server/data3/imagekitDelete.js';

export interface SweepDeps {
	vault: Collection<OutreachVaultEntry>;
	revocationLog: Collection<ConsentRevocationLogEntry>;
	imagekit: ImagekitDeleteClient;
	now: Date;
	/** Test injection. Production uses the real sleeper. */
	sleep?: (ms: number) => Promise<void>;
	logger?: { info: (obj: Record<string, unknown>, msg: string) => void; warn?: (obj: Record<string, unknown>, msg: string) => void };
}

export interface SweepResult {
	processed: number;
	hard_deleted: number;
	imagekit_already_gone: number;
	imagekit_abandoned: number;
	errored: number;
}

/**
 * Run one sweep pass. Idempotent: an entry mid-deletion (audit row written,
 * Mongo doc still present) is picked up by the next run and finished.
 */
export async function runGracePeriodSweep(deps: SweepDeps): Promise<SweepResult> {
	const result: SweepResult = {
		processed: 0,
		hard_deleted: 0,
		imagekit_already_gone: 0,
		imagekit_abandoned: 0,
		errored: 0
	};

	// Find revoked entries past their grace window. Cap each run at 500
	// entries — keeps a single sweep bounded; a backlog spans multiple runs.
	const expired = await deps.vault
		.find({
			consent_status: 'revoked',
			grace_period_ends_at: { $lte: deps.now }
		})
		.limit(500)
		.toArray();

	for (const entry of expired) {
		result.processed++;
		try {
			// Step 1: audit row first. If the run crashes mid-loop, we have
			// an audit row but no deletion — the next run sees the orphan
			// audit, sees the vault entry still present, and retries the delete.
			const auditDoc: ConsentRevocationLogEntry = {
				vault_entry_id: entry._id!,
				dsa_id: entry.dsa_id,
				case_id: entry.case_id,
				consent_template_version: entry.consent_doc_ref.template_version,
				consent_signed_at: entry.consent_signed_at,
				revoked_at: entry.revoked_at!,
				revoked_by: entry.revoked_by!,
				grace_period_ends_at: entry.grace_period_ends_at!,
				hard_deleted_at: deps.now,
				imagekit_deletion_status: 'success', // overwritten below based on outcome
				actor: 'system_sweep',
				created_at: deps.now
			};

			// Idempotency: if a prior run already wrote this audit, the upsert
			// keyed on vault_entry_id is a no-op for the doc but we continue
			// to step 2/3/4 to finish the delete chain.
			await deps.revocationLog.updateOne(
				{ vault_entry_id: entry._id! },
				{ $setOnInsert: auditDoc },
				{ upsert: true }
			);

			// Step 2: delete the ImageKit consent doc.
			let outcome: FinalDeletionOutcome;
			try {
				outcome = await deleteWithRetry({
					client: deps.imagekit,
					fileId: entry.consent_doc_ref.imagekit_file_id,
					sleep: deps.sleep
				});
			} catch (err) {
				deps.logger?.warn?.(
					{ vault_entry_id: entry._id?.toString(), err: String(err) },
					'DATA-2: ImageKit delete threw unexpectedly — skipping vault delete this pass'
				);
				result.errored++;
				continue;
			}

			// Step 3: record the ImageKit outcome on the audit row.
			let status: ConsentRevocationLogEntry['imagekit_deletion_status'];
			if (outcome.kind === 'success') {
				status = 'success';
			} else if (outcome.kind === 'already_deleted') {
				status = 'already_gone';
				result.imagekit_already_gone++;
			} else {
				status = 'failed';
				result.imagekit_abandoned++;
			}
			await deps.revocationLog.updateOne(
				{ vault_entry_id: entry._id! },
				{ $set: { imagekit_deletion_status: status, hard_deleted_at: deps.now } }
			);

			// Step 4: only hard-delete the vault entry if the ImageKit step
			// did NOT abandon. An abandoned ImageKit delete means the file
			// still lives in their bucket — we keep the Mongo entry so a
			// future sweep can retry. (Spec §9 says treat 404 as success;
			// the `already_deleted` outcome already maps to that.)
			if (outcome.kind === 'success' || outcome.kind === 'already_deleted') {
				await deps.vault.deleteOne({ _id: entry._id! });
				result.hard_deleted++;
				deps.logger?.info(
					{
						vault_entry_id: entry._id?.toString(),
						dsa_id: entry.dsa_id.toString(),
						imagekit_status: status
					},
					'DATA-2: vault entry hard-deleted after grace period'
				);
			} else {
				deps.logger?.warn?.(
					{
						vault_entry_id: entry._id?.toString(),
						attempts: outcome.kind === 'abandoned' ? outcome.attempts : undefined,
						error_code: outcome.kind === 'abandoned' ? outcome.error_code : undefined
					},
					'DATA-2: ImageKit delete abandoned — vault entry kept for next sweep retry'
				);
			}
		} catch (err) {
			result.errored++;
			deps.logger?.warn?.(
				{ vault_entry_id: entry._id?.toString(), err: String(err) },
				'DATA-2: sweep step failed for entry'
			);
		}
	}

	return result;
}
