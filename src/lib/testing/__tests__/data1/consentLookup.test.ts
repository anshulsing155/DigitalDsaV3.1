/**
 * DATA-1 — findConsentDocId unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §6, §10.
 *
 * The consent gate is the legal predicate for any vault write. A bug here
 * would either (a) allow vault writes without consent — a privacy bug, or
 * (b) refuse vault writes despite valid consent — a UX/compliance bug.
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
	findConsentDocId,
	DATA_USAGE_CONSENT_DOC_NAME
} from '$lib/server/data1/consentLookup';
import type { Case, LenderApplication, DocumentChecklistItem } from '$lib/types/case';

function makeChecklistItem(overrides: Partial<DocumentChecklistItem> = {}): DocumentChecklistItem {
	return {
		doc_id: 'doc-1',
		doc_name: 'pan_card',
		category: 'identity',
		is_mandatory: true,
		status: 'not_started',
		...overrides
	};
}

function makeLenderApp(items: DocumentChecklistItem[]): LenderApplication {
	return {
		lender_application_id: 'LA-1',
		lender_id: 'L-HDFC',
		lender_name: 'HDFC',
		status: 'submitted',
		status_history: [],
		document_checklist: items,
		queries: [],
		file_snapshots: [],
		created_at: new Date(),
		updated_at: new Date()
	};
}

function makeCase(apps: LenderApplication[]): Case {
	return {
		case_id: 'HL-2026-0042',
		dsa_id: new ObjectId(),
		label: 'test',
		loan: { type: 'Home Loan' },
		stage: 'sanctioned',
		stage_history: [],
		lender_applications: apps,
		created_at: new Date(),
		updated_at: new Date(),
		is_archived: false,
		is_sample: false
	};
}

describe('findConsentDocId', () => {
	it('returns null when no checklist contains a consent doc', () => {
		const result = findConsentDocId(
			makeCase([
				makeLenderApp([makeChecklistItem({ doc_name: 'pan_card', status: 'uploaded' })])
			])
		);
		expect(result).toBe(null);
	});

	it('returns the doc_id when an uploaded consent doc is present', () => {
		const result = findConsentDocId(
			makeCase([
				makeLenderApp([
					makeChecklistItem({
						doc_id: 'consent-xyz',
						doc_name: DATA_USAGE_CONSENT_DOC_NAME,
						status: 'uploaded'
					})
				])
			])
		);
		expect(result).toBe('consent-xyz');
	});

	it('refuses to accept a consent doc that is not yet uploaded (status: requested / received / not_started)', () => {
		const statuses: Array<DocumentChecklistItem['status']> = [
			'not_started',
			'requested',
			'received',
			'not_applicable'
		];
		for (const status of statuses) {
			const result = findConsentDocId(
				makeCase([
					makeLenderApp([
						makeChecklistItem({
							doc_id: 'consent-xyz',
							doc_name: DATA_USAGE_CONSENT_DOC_NAME,
							status
						})
					])
				])
			);
			expect(result, `status=${status} should not satisfy the consent gate`).toBe(null);
		}
	});

	it('scans across multiple lender applications and returns the first match', () => {
		const result = findConsentDocId(
			makeCase([
				makeLenderApp([makeChecklistItem({ doc_name: 'pan_card', status: 'uploaded' })]),
				makeLenderApp([
					makeChecklistItem({
						doc_id: 'consent-from-second-app',
						doc_name: DATA_USAGE_CONSENT_DOC_NAME,
						status: 'uploaded'
					})
				])
			])
		);
		expect(result).toBe('consent-from-second-app');
	});

	it('handles a case with no lender applications', () => {
		expect(findConsentDocId(makeCase([]))).toBe(null);
	});

	it('handles a lender application with an empty document_checklist', () => {
		expect(findConsentDocId(makeCase([makeLenderApp([])]))).toBe(null);
	});
});
