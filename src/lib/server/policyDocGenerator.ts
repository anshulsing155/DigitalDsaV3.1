/**
 * Policy Document Generator
 * ══════════════════════════════════════════════════════════════════
 * Template-based (not AI) generator that converts structured
 * PolicyVersion data into clean, human-readable HTML summaries.
 *
 * Shows: rates, fees, charges, insurance, turnaround, limits,
 * special schemes, geographic applicability.
 *
 * Deterministic and fast — regenerated on every version edit.
 * Used in: admin preview, PDF export.
 * (RM review uses the interactive client-side PolicyFieldReview component.)
 * ══════════════════════════════════════════════════════════════════
 */

import type { PolicyFields } from '$lib/types/policyEngine.js';
import {
	FIELD_GROUPS,
	POLICY_FIELD_LABELS,
	formatPolicyValue,
	isBooleanField
} from '$lib/config/policyFieldUtils.js';

// ============================================================================
// HTML GENERATOR
// ============================================================================

export interface DocGeneratorInput {
	lender_name: string;
	product_label: string;
	variation_label: string;
	geo_label: string;
	policy_fields: PolicyFields;
	version_number: number;
	effective_from?: Date;
	source_type?: string;
}

/**
 * Generate a human-readable HTML document from policy version data.
 * Returns clean HTML suitable for embedding in admin views and PDF export.
 */
export function generatePolicyDoc(input: DocGeneratorInput): string {
	const {
		lender_name,
		product_label,
		variation_label,
		geo_label,
		policy_fields,
		version_number,
		effective_from,
		source_type
	} = input;

	const lines: string[] = [];

	// Header
	lines.push(`<div class="policy-doc">`);
	lines.push(`<div class="policy-doc-header">`);
	lines.push(`<h2>${escapeHtml(lender_name)}</h2>`);
	lines.push(
		`<p class="policy-doc-subtitle">${escapeHtml(product_label)} &mdash; ${escapeHtml(variation_label)}</p>`
	);
	lines.push(`<div class="policy-doc-meta">`);
	lines.push(`<span class="policy-doc-meta-item">${escapeHtml(geo_label)}</span>`);
	lines.push(`<span class="policy-doc-meta-sep">&bull;</span>`);
	lines.push(`<span class="policy-doc-meta-item">Version ${version_number}</span>`);
	if (effective_from) {
		lines.push(`<span class="policy-doc-meta-sep">&bull;</span>`);
		lines.push(
			`<span class="policy-doc-meta-item">Effective: ${effective_from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>`
		);
	}
	if (source_type) {
		lines.push(`<span class="policy-doc-meta-sep">&bull;</span>`);
		lines.push(`<span class="policy-doc-meta-item">Source: ${escapeHtml(source_type)}</span>`);
	}
	lines.push(`</div>`);
	lines.push(`</div>`);

	// Field groups
	const setFieldKeys = new Set(Object.keys(policy_fields));
	let hasAnyContent = false;

	for (const group of FIELD_GROUPS) {
		const activeFields = group.keys.filter((k) => setFieldKeys.has(k));
		if (activeFields.length === 0) continue;

		hasAnyContent = true;
		lines.push(`<div class="policy-doc-section">`);
		lines.push(`<h3>${escapeHtml(group.title)}</h3>`);
		lines.push(`<table class="policy-doc-table">`);

		for (let i = 0; i < activeFields.length; i++) {
			const key = activeFields[i];
			const label = POLICY_FIELD_LABELS[key];
			const value = policy_fields[key];
			const formatted = formatPolicyValue(key, value);
			const rowClass = i % 2 === 1 ? ' class="policy-doc-row-alt"' : '';

			lines.push(`<tr${rowClass}>`);
			lines.push(`<td class="policy-doc-label">${escapeHtml(label)}</td>`);

			// Boolean fields get colored badges
			if (isBooleanField(key) && typeof value === 'boolean') {
				const badgeClass = value ? 'policy-doc-badge-yes' : 'policy-doc-badge-no';
				lines.push(
					`<td class="policy-doc-value"><span class="${badgeClass}">${escapeHtml(formatted)}</span></td>`
				);
			} else {
				lines.push(`<td class="policy-doc-value">${escapeHtml(formatted)}</td>`);
			}

			lines.push(`</tr>`);
		}

		lines.push(`</table>`);
		lines.push(`</div>`);
	}

	if (!hasAnyContent) {
		lines.push(`<p class="policy-doc-empty">No policy fields have been set for this version.</p>`);
	}

	lines.push(`</div>`);

	return lines.join('\n');
}

/**
 * Generate a plain-text/markdown version for simpler contexts.
 */
export function generatePolicyDocMarkdown(input: DocGeneratorInput): string {
	const {
		lender_name,
		product_label,
		variation_label,
		geo_label,
		policy_fields,
		version_number,
		effective_from,
		source_type
	} = input;

	const lines: string[] = [];

	lines.push(`# ${lender_name}`);
	lines.push(`**${product_label}** — ${variation_label}`);
	lines.push('');
	lines.push(`Geography: ${geo_label} | Version ${version_number}`);
	if (effective_from) {
		lines.push(
			`Effective: ${effective_from.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
		);
	}
	if (source_type) {
		lines.push(`Source: ${source_type}`);
	}
	lines.push('');
	lines.push('---');
	lines.push('');

	const setFieldKeys = new Set(Object.keys(policy_fields));
	let hasAnyContent = false;

	for (const group of FIELD_GROUPS) {
		const activeFields = group.keys.filter((k) => setFieldKeys.has(k));
		if (activeFields.length === 0) continue;

		hasAnyContent = true;
		lines.push(`## ${group.title}`);
		lines.push('');

		for (const key of activeFields) {
			const label = POLICY_FIELD_LABELS[key];
			const value = policy_fields[key];
			lines.push(`- **${label}**: ${formatPolicyValue(key, value)}`);
		}

		lines.push('');
	}

	if (!hasAnyContent) {
		lines.push('*No policy fields have been set for this version.*');
	}

	return lines.join('\n');
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
