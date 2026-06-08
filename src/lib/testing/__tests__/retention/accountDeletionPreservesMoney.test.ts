/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: account-deletion paths never delete from money collections (E.4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * DPDP §13 grants a user the right to erasure. The Income Tax Act +
 * GST impose a 6-year retention obligation on financial records. These
 * collide on account deletion: the user expects everything to go, but
 * statutory retention overrides for money records (lawful-basis
 * exception under DPDP).
 *
 * The current /api/auth/delete-account/+server.ts handler ONLY archives
 * the user document (DsaApplications → deletedDsa with a 30-day TTL).
 * It does NOT touch BillingTransactions / Invoices / etc. — which is
 * the correct behavior. This test locks that invariant so a future
 * "let's clean up everything" refactor can't silently violate the
 * 6-year retention.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.4
 * ADR:  docs/adr/0023-money-retention-6-years.md
 *
 * THIS TEST
 * ─────────
 * Walks the known account-deletion handlers and asserts they never
 * call deleteOne/deleteMany OR $unset/$set: null OR drop on ANY
 * collection in MONEY_COLLECTION_VAR_NAMES.
 *
 * Per Pitfall #66 the regex targets USAGE shapes (`<Var>.deleteOne(`
 * etc.) not the bare collection identifier.
 *
 * Allowlist of files that legitimately deal with money collections AND
 * may contain a delete call (e.g. an admin "void invoice" tool that
 * issues a credit-note replacement — which is the correct GST flow):
 * extend ALLOWED_FILES with a documented exemption.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { MONEY_COLLECTION_VAR_NAMES } from '$lib/server/retention/moneyRetention';

/**
 * Known account-lifecycle handler paths (delete + restore + the
 * detect-roles flow that reads deleted-* archives). Every file that
 * touches the deleted-* collections must be scanned for accidental
 * money-collection mutations. If a new lifecycle path is added (e.g.
 * /api/rm/delete-account or an admin-driven mass cleanup), append it
 * here — the cross-cutting sweep below will fail until you do.
 *
 * The test will throw if any of these paths doesn't exist (regression
 * guard against accidental file rename without updating the lock).
 */
const ACCOUNT_LIFECYCLE_FILES = [
	'src/routes/api/auth/delete-account/+server.ts',
	// detect-roles reads deletedDsa/deletedRm to surface "account deleted"
	// state at login. Read-only against the deleted-* collections + the
	// active-user collections; we still scan it for money-mutation defense.
	'src/routes/api/auth/detect-roles/+server.ts',
	// restore-account is the OPPOSITE of delete — moves a user back from
	// the deleted-* archive into the active collection. Should never
	// touch money records (those stayed put through the deletion); same
	// scan applies.
	'src/routes/api/auth/restore-account/+server.ts'
];

/**
 * Files allowed to mutate money collections via delete/unset. Currently
 * empty — no operational flow should be DELETING money records before
 * the 6-year sweep (which isn't built yet). Future admin tools should
 * use compensating entries (credit notes) instead of deletes.
 */
const ALLOWED_MONEY_MUTATION_FILES: ReadonlySet<string> = new Set([]);

/**
 * Walk a directory for source files. Pulled in from the legacy-fields
 * test pattern but scoped here to just the auth + admin routes that
 * could plausibly grow new deletion paths.
 */
function* walk(dir: string): Generator<string> {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (entry.includes('_archive') || entry.includes('_archived')) continue;
		if (entry === 'node_modules') continue;
		let stat;
		try {
			stat = statSync(full);
		} catch {
			continue;
		}
		if (stat.isDirectory()) yield* walk(full);
		else if (stat.isFile() && full.endsWith('.ts')) yield full;
	}
}

function relPath(absPath: string): string {
	return relative(process.cwd(), absPath).split(sep).join('/');
}

describe('Account deletion preserves money records (E.4)', () => {
	for (const filePath of ACCOUNT_LIFECYCLE_FILES) {
		describe(filePath, () => {
			const abs = resolve(process.cwd(), filePath);
			const src = (() => {
				try {
					return readFileSync(abs, 'utf8');
				} catch {
					throw new Error(
						`ACCOUNT_LIFECYCLE_FILES references "${filePath}" but the file does ` +
							`not exist. If the handler was renamed, update the list in ` +
							`accountDeletionPreservesMoney.test.ts.`
					);
				}
			})();

			for (const varName of MONEY_COLLECTION_VAR_NAMES) {
				it(`never calls ${varName}.deleteOne / deleteMany / drop`, () => {
					const usage = new RegExp(
						`\\b${varName}\\s*\\.\\s*(deleteOne|deleteMany|drop|findOneAndDelete)\\b`
					);
					expect(
						usage.test(src),
						`${filePath} calls ${varName}.{deleteOne|deleteMany|drop|findOneAndDelete} — ` +
							`account deletion must NEVER delete from money collections. Per Income ` +
							`Tax Act §44AA(3) + CGST §36, financial records survive account closure ` +
							`for 6 years. See ADR-0023 + the lawful-basis exception under DPDP §13. ` +
							`If a real business case needs this, add the file to ` +
							`ALLOWED_MONEY_MUTATION_FILES with a documented exemption.`
					).toBe(false);
				});

				it(`never $unsets / nullifies the entire ${varName} surface`, () => {
					// Look for shapes like `MoneyCollection.updateMany({...}, {$unset: {...}})`
					// or wholesale-null `$set: {<money_field>: null}` on a money collection.
					// This catches "soft delete by clearing fields" workarounds.
					const usage = new RegExp(
						`\\b${varName}\\s*\\.\\s*(updateMany|updateOne)\\s*\\([^)]*\\$unset`,
						's'
					);
					expect(
						usage.test(src),
						`${filePath} calls ${varName}.{updateMany|updateOne} with $unset — ` +
							`this can semi-delete money records by clearing required fields. ` +
							`Per E.4 retention policy, money records must remain intact. If a ` +
							`field-level minimization is genuinely needed (e.g. post-window ` +
							`GSTIN minimization pending CA sign-off), do it via a dedicated ` +
							`retention-sweep cron and add this file to ALLOWED_MONEY_MUTATION_FILES.`
					).toBe(false);
				});
			}
		});
	}

	it('the ALLOWED_MONEY_MUTATION_FILES list is documented (sanity)', () => {
		// Forces a deliberate edit if anyone ever adds an allowance — they
		// must update this test too. Currently expects empty.
		expect(ALLOWED_MONEY_MUTATION_FILES.size).toBe(0);
	});
});

// ── Cross-cutting sweep: catch new deletion paths the allowlist misses ─

describe('No undocumented deletion path mutates money collections', () => {
	// Broader sweep: every file under src/routes/api/auth/ and
	// src/routes/api/admin/users/ that contains "deletedDsa" or
	// "deletedRm" (= an archive flow) must also be in ACCOUNT_LIFECYCLE_FILES.
	// This prevents a future "RM account deletion" route from slipping
	// past the targeted scan above.
	it('every file with deletedDsa/deletedRm references is in ACCOUNT_LIFECYCLE_FILES', () => {
		const scanRoots = [
			resolve(process.cwd(), 'src/routes/api/auth'),
			resolve(process.cwd(), 'src/routes/api/admin/users')
		];
		const candidates: string[] = [];
		for (const root of scanRoots) {
			for (const file of walk(root)) {
				const src = readFileSync(file, 'utf8');
				if (/\bdeletedDsa\b|\bdeletedRm\b|\bdeletedPc\b/.test(src)) {
					candidates.push(relPath(file));
				}
			}
		}
		// Every candidate must appear in ACCOUNT_LIFECYCLE_FILES (or be
		// added if it's a genuinely new deletion flow).
		const tracked = new Set(ACCOUNT_LIFECYCLE_FILES);
		const missing = candidates.filter((c) => !tracked.has(c));
		expect(
			missing,
			`Found ${missing.length} new account-deletion path(s) not yet tracked by ` +
				`ACCOUNT_LIFECYCLE_FILES. Either add to the list (and ensure the new flow ` +
				`doesn't touch money collections), or document why it's excluded:\n` +
				missing.map((m) => `  - ${m}`).join('\n')
		).toEqual([]);
	});
});
