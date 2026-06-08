/**
 * PolicyCaptureWizard autosave contract — regression guard for the resume
 * off-by-one fixed 2026-05-21.
 *
 * Bug: doSave() recorded `current_step` from the pre-increment value, so a
 * reload reopened the PREVIOUS step. Fix: navigation advances `currentStep`
 * first (the resume point) and flushes the LEAVING step's data via a separate
 * `dataStepIndex`. These tests assert that contract on the pure body builder.
 */

import { describe, it, expect } from 'vitest';
import { buildCapturePatchBody } from '$lib/components/policy-capture/captureSaveContract';
import { getVisibleSteps, createDefaultPolicyCaptureData } from '$lib/types/policyCapture';

const visibleSteps = getVisibleSteps('PL'); // Personal Loan: 8 steps
const baseArgs = {
	completedSteps: [0],
	completionPercent: 25,
	unknownFields: [] as string[],
	captureData: createDefaultPolicyCaptureData(),
	visibleSteps
};

describe('buildCapturePatchBody — resume/save contract', () => {
	it('records current_step as the DESTINATION step (not the one being left)', () => {
		// goNext from step 0 → currentStep is already 1 (destination), data flushed for step 0.
		const body = buildCapturePatchBody({ ...baseArgs, currentStep: 1, dataStepIndex: 0 });
		expect(body.current_step).toBe(1);
	});

	it('flushes the LEAVING step’s data, not the destination’s', () => {
		// Leaving step 0 (core_parameters) while moving to step 1 (eligibility).
		const body = buildCapturePatchBody({ ...baseArgs, currentStep: 1, dataStepIndex: 0 });
		expect(Object.keys(body.data)).toEqual(['core_parameters']);
		expect(Object.keys(body.data)).not.toContain('eligibility');
	});

	it('on goPrev, current_step is the lower destination, data flushed for the higher leaving step', () => {
		// Leaving step 2 (credit_cibil) back to step 1 (eligibility).
		const body = buildCapturePatchBody({ ...baseArgs, currentStep: 1, dataStepIndex: 2 });
		expect(body.current_step).toBe(1);
		expect(Object.keys(body.data)).toEqual(['credit_cibil']);
	});

	it('on a plain save (no navigation), both indices match — saves the current step', () => {
		const body = buildCapturePatchBody({ ...baseArgs, currentStep: 3, dataStepIndex: 3 });
		expect(body.current_step).toBe(3);
		expect(Object.keys(body.data)).toEqual([visibleSteps[3].dataKey]);
	});

	it('passes through completed_steps, completion_percent, and unknown_fields unchanged', () => {
		const body = buildCapturePatchBody({
			...baseArgs,
			currentStep: 1,
			dataStepIndex: 0,
			completedSteps: [0, 1],
			completionPercent: 40,
			unknownFields: ['core_parameters.roi']
		});
		expect(body.completed_steps).toEqual([0, 1]);
		expect(body.completion_percent).toBe(40);
		expect(body.unknown_fields).toEqual(['core_parameters.roi']);
	});
});
