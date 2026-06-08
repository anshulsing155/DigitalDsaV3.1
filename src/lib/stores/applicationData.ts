/**
 * Compatibility Bridge: applicationData.ts
 *
 * Source of truth: src/lib/state/form.svelte.ts (FormStateManager)
 *
 * This file re-exports a store-compatible wrapper so the 3 consumer files
 * that import from '$lib/stores/applicationData' continue to work unchanged.
 *
 * Consumers:
 * - src/routes/(app)/form/+layout.svelte
 * - src/routes/(app)/form/+page.svelte
 * - src/routes/applicantForm/+layout.svelte
 *
 * Will be removed in Phase 8 when all consumers migrate to direct formState access.
 *
 * @deprecated Use formState from '$lib/state/form.svelte' instead.
 */

import { fromRune } from '$lib/stores/_bridge.svelte';
import { formState } from '$lib/state/form.svelte';
import type { ApplicationData } from '$lib/schemas/applicationDataSchema';

/** @deprecated Use formState.applicationData from '$lib/state/form.svelte' */
export const applicationData = fromRune<ApplicationData>(
	() => formState.applicationData as unknown as ApplicationData,
	(v) => formState.replaceApplicationData(v as any)
);
