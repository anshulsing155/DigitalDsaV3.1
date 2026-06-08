/**
 * Synthetic Profile — anonymized LoanApplicationPayload data for test/demo.
 *
 * Used to generate realistic sample cases without PII.
 * Each profile contains a complete LoanApplicationPayload
 * with fictional names and addresses.
 */

import type { ObjectId } from 'mongodb';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';

export interface SyntheticProfile {
	_id?: ObjectId;
	/** Unique identifier for this profile (e.g. "SP-HL-001") */
	profile_id: string;
	/** Loan type this profile represents */
	loan_type: string;
	/** Complete loan application payload (same shape as fixture profiles) */
	payload: LoanApplicationPayload;
	/** Classification metadata */
	metadata: {
		employment_type: string;
		applicant_count: number;
		/** Optional tags for filtering (e.g. "high-income", "nri", "bt-topup") */
		tags?: string[];
	};
	created_at: Date;
}
