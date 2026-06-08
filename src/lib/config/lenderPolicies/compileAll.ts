/**
 * Compile All Lenders — Generates rule documents for every lender
 * ══════════════════════════════════════════════════════════════════
 * Iterates the full LENDER_DIRECTORY, applies category defaults +
 * lender-specific overrides, and compiles ParsedLenderRuleDocuments.
 *
 * Output: One ParsedLenderRuleDocument per lender × per product.
 * For 87 lenders averaging 3 products each = ~260 rule documents.
 *
 * Usage:
 *   const allRuleDocs = compileAllLenders();
 *   // Upsert into MongoDB LenderRuleArtifacts
 * ══════════════════════════════════════════════════════════════════
 */

import type { ParsedLenderRuleDocument } from '$lib/ruleEngine/types';
import type { LoanProduct } from './types';
import { LENDER_DIRECTORY } from './lenderDirectory';
import { getCategoryDefaults } from './categoryDefaults';
import { compileRuleDocs } from './compiler';
import { LENDER_OVERRIDES, applyOverride } from './lenderOverrides';

/** Compiled output for a single lender */
export interface CompiledLenderOutput {
	lenderId: string;
	lenderName: string;
	/** Number of products compiled */
	productCount: number;
	/** Whether lender-specific overrides were applied */
	hasOverrides: boolean;
	/** The compiled rule documents (one per product) */
	ruleDocs: ParsedLenderRuleDocument[];
}

/**
 * Compile rule documents for ALL lenders in the directory.
 * Returns a flat array of all ParsedLenderRuleDocuments.
 */
export function compileAllLenders(): ParsedLenderRuleDocument[] {
	const allDocs: ParsedLenderRuleDocument[] = [];

	for (const entry of LENDER_DIRECTORY) {
		const config = getCategoryDefaults(entry.classification);
		const override = LENDER_OVERRIDES[entry.lenderId];

		const finalConfig = override ? applyOverride(config, override) : config;

		const docs = compileRuleDocs(
			entry.lenderId,
			entry.lenderName,
			entry.classification,
			entry.loanProducts as LoanProduct[],
			finalConfig
		);

		allDocs.push(...docs);
	}

	return allDocs;
}

/**
 * Compile all lenders with detailed output per lender.
 * Useful for debugging and reporting which lenders have overrides.
 */
export function compileAllLendersDetailed(): CompiledLenderOutput[] {
	const results: CompiledLenderOutput[] = [];

	for (const entry of LENDER_DIRECTORY) {
		const config = getCategoryDefaults(entry.classification);
		const override = LENDER_OVERRIDES[entry.lenderId];
		const hasOverrides = !!override;

		const finalConfig = hasOverrides ? applyOverride(config, override) : config;

		const ruleDocs = compileRuleDocs(
			entry.lenderId,
			entry.lenderName,
			entry.classification,
			entry.loanProducts as LoanProduct[],
			finalConfig
		);

		results.push({
			lenderId: entry.lenderId,
			lenderName: entry.lenderName,
			productCount: ruleDocs.length,
			hasOverrides,
			ruleDocs
		});
	}

	return results;
}

/**
 * Get compilation statistics.
 */
export function getCompilationStats(): {
	totalLenders: number;
	totalRuleDocs: number;
	lendersWithOverrides: number;
	lendersWithDefaults: number;
	byClassification: Record<string, number>;
	byProduct: Record<string, number>;
} {
	const detailed = compileAllLendersDetailed();
	const byClassification: Record<string, number> = {};
	const byProduct: Record<string, number> = {};

	let totalRuleDocs = 0;
	let lendersWithOverrides = 0;

	for (const entry of detailed) {
		totalRuleDocs += entry.ruleDocs.length;
		if (entry.hasOverrides) lendersWithOverrides++;

		// Count by classification
		const lender = LENDER_DIRECTORY.find((l) => l.lenderId === entry.lenderId);
		if (lender) {
			byClassification[lender.classification] = (byClassification[lender.classification] || 0) + 1;
		}

		// Count by product
		for (const doc of entry.ruleDocs) {
			for (const lt of doc.loan_types) {
				byProduct[lt] = (byProduct[lt] || 0) + 1;
			}
		}
	}

	return {
		totalLenders: detailed.length,
		totalRuleDocs,
		lendersWithOverrides,
		lendersWithDefaults: detailed.length - lendersWithOverrides,
		byClassification,
		byProduct
	};
}
