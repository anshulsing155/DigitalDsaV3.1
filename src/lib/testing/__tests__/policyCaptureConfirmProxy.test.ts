/**
 * canConfirmProxy — A.2 Slice 3 guard.
 * Only an unconfirmed admin proxy capture is confirmable by the RM.
 */

import { describe, it, expect } from 'vitest';
import { canConfirmProxy } from '$lib/types/policyCapture';
import type { PolicyCaptureProvenance } from '$lib/types/policyCapture';

describe('canConfirmProxy', () => {
	it('allows confirming an admin-keyed proxy capture', () => {
		const prov: PolicyCaptureProvenance = {
			source_type: 'admin_manual_proxy',
			captured_by: 'admin1',
			captured_for_rm: 'rm1'
		};
		expect(canConfirmProxy(prov)).toBe(true);
	});

	it('rejects a normal RM self-capture (nothing to confirm)', () => {
		expect(canConfirmProxy({ source_type: 'rm_self' })).toBe(false);
	});

	it('rejects an already-confirmed capture (no re-confirm)', () => {
		expect(canConfirmProxy({ source_type: 'rm_confirmed', confirmed_by: 'rm1' })).toBe(false);
	});

	it('rejects when provenance is absent (legacy self-capture)', () => {
		expect(canConfirmProxy(undefined)).toBe(false);
	});
});
