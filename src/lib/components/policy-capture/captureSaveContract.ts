import type { PolicyCaptureData, PolicyCaptureStep } from '$lib/types/policyCapture.js';

/**
 * Builds the autosave PATCH body for the policy-capture wizard.
 *
 * The contract that prevents the resume off-by-one (fixed 2026-05-21):
 *   - `current_step` is the step the user will RESUME on (the destination after
 *     navigation), so reload reopens where they actually are.
 *   - the flushed `data` belongs to `dataStepIndex` — the step being LEFT — so a
 *     last-second edit isn't lost when the user navigates before the autosave
 *     debounce fires. The two indices differ during navigation.
 */
export function buildCapturePatchBody(args: {
	currentStep: number;
	dataStepIndex: number;
	completedSteps: number[];
	completionPercent: number;
	unknownFields: string[];
	captureData: PolicyCaptureData;
	visibleSteps: PolicyCaptureStep[];
}) {
	const stepDataKey = args.visibleSteps[args.dataStepIndex].dataKey;
	return {
		current_step: args.currentStep,
		completed_steps: args.completedSteps,
		completion_percent: args.completionPercent,
		unknown_fields: args.unknownFields,
		data: { [stepDataKey]: args.captureData[stepDataKey] }
	};
}
