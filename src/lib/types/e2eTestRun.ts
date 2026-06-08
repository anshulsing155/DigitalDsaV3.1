/**
 * E2E Test Run — admin-triggered Playwright form-fill orchestration.
 *
 * Each run represents a single E2E form fill driven by a fixture
 * or synthetic profile payload.
 */

import type { ObjectId } from 'mongodb';
import type { E2eFillConfig } from '$lib/server/testing/payloadToFillInstructions.js';

export type TestRunType =
	| 'form-fill'
	| 'selector-health'
	| 'accessibility'
	| 'applicant-stage'
	| 'full-path'
	| 'unit-tests';

export interface E2eTestRun {
	_id?: ObjectId;
	/** Unique run identifier (e.g. "e2e-run-abc123") */
	run_id: string;
	/** Type of test being run. Defaults to 'form-fill' for backward compat. */
	test_type: TestRunType;
	/** Source of the profile data (only for form-fill / applicant-stage / full-path) */
	profile_type?: 'fixture' | 'synthetic';
	/** Fixture ID or synthetic profile ID */
	profile_id?: string;
	/** Loan type being tested */
	loan_type?: string;
	/** Current run status */
	status: 'pending' | 'running' | 'page_filling' | 'completed' | 'failed' | 'timed_out';
	/** Current page being filled (0-based) */
	current_page?: number;
	/** Total number of pages to fill */
	total_pages?: number;
	/** Current page ID being filled */
	current_page_id?: string;
	/** Screenshots captured during the run */
	screenshots: Array<{
		page_id: string;
		path: string;
		timestamp: Date;
	}>;
	/** Stored fill config for debugging */
	fill_config?: E2eFillConfig;
	/** Error message if run failed */
	error?: string;
	/** Stdout/stderr output from the test process */
	output?: string;
	/** Duration in milliseconds */
	duration_ms?: number;
	/** Admin who triggered the run */
	created_by: ObjectId;
	created_at: Date;
	updated_at: Date;
	completed_at?: Date;
}
