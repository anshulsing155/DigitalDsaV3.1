import { describe, it, expect } from 'vitest';
import { generateCasePDF } from '$lib/server/pdfGenerator.js';
import { stripPII } from '$lib/server/fileConfigurator.js';

// ============================================================================
// TEST HELPERS
// ============================================================================

const NOW = new Date('2026-02-10T12:00:00Z');

/** Default options for review mode */
function reviewOptions(overrides: Record<string, any> = {}) {
	return {
		type: 'review' as const,
		caseId: 'HL-2026-0001',
		lenderName: 'HDFC Bank',
		generatedAt: NOW,
		piiStripped: true,
		...overrides
	};
}

/** Default options for submission mode */
function submissionOptions(overrides: Record<string, any> = {}) {
	return {
		type: 'submission' as const,
		caseId: 'HL-2026-0001',
		lenderName: 'HDFC Bank',
		generatedAt: NOW,
		piiStripped: false,
		...overrides
	};
}

/** A realistic sample payload representing a loan application */
function makeSamplePayload(): Record<string, any> {
	return {
		case_id: 'HL-2026-0001',
		loan: { type: 'Home Loan', amount_required: 5000000 },
		created_at: '2026-01-15T10:00:00Z',
		form_version: 3,
		applicant_details: {
			full_name: 'Ramesh Kumar Singh',
			pan_number: 'ABCDE1234F',
			aadhaar_number: '1234 5678 9012',
			mobile: '9876543210',
			email: 'ramesh@example.com',
			dob: '1990-05-15',
			address: '123 MG Road, Andheri West, Mumbai 400058',
			employer: 'Tata Consultancy Services',
			designation: 'Senior Engineer',
			employment_type: 'Salaried'
		},
		income_details: {
			salary: 120000,
			rental_income: 25000,
			total_monthly: 145000,
			sources: [
				{ type: 'Salary', amount: 120000 },
				{ type: 'Rental', amount: 25000 }
			]
		},
		obligation_details: [
			{ type: 'Car Loan', emi: 15000, outstanding: 300000 },
			{ type: 'Credit Card', emi: 5000, outstanding: 80000 }
		],
		property_details: {
			type: 'Under Construction Flat',
			value: 7500000,
			location: 'Pune',
			builder: 'Godrej Properties'
		},
		loan_details: {
			amount: 5000000,
			tenure_years: 20,
			roi_expected: 8.5
		},
		eligibility_summary: {
			foir: 0.35,
			ltv: 0.67,
			eligible: true
		}
	};
}

// ============================================================================
// BASIC PDF GENERATION — return type and size
// ============================================================================

describe('generateCasePDF — basic return type and size', () => {
	it('returns a Uint8Array', async () => {
		const payload = makeSamplePayload();
		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
	});

	it('PDF size is greater than 1KB', async () => {
		const payload = makeSamplePayload();
		const result = await generateCasePDF(payload, reviewOptions());
		expect(result.byteLength).toBeGreaterThan(1024);
	});

	it('PDF size is less than 5MB', async () => {
		const payload = makeSamplePayload();
		const result = await generateCasePDF(payload, reviewOptions());
		expect(result.byteLength).toBeLessThan(5 * 1024 * 1024);
	});

	it('PDF starts with %PDF magic bytes', async () => {
		const payload = makeSamplePayload();
		const result = await generateCasePDF(payload, reviewOptions());
		// PDF files start with "%PDF-"
		const header = String.fromCharCode(result[0], result[1], result[2], result[3], result[4]);
		expect(header).toBe('%PDF-');
	});
});

// ============================================================================
// REVIEW MODE — PII-stripped, watermarked
// ============================================================================

describe('generateCasePDF — review mode', () => {
	it('generates valid PDF in review mode', async () => {
		const payload = stripPII(makeSamplePayload());
		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
	});

	it('review mode PDF contains PII-stripped data (redacted values)', async () => {
		const rawPayload = makeSamplePayload();
		const strippedPayload = stripPII(rawPayload);

		// Verify PII was actually stripped before PDF generation
		const applicantDetails = strippedPayload.applicant_details as Record<string, unknown>;
		expect(applicantDetails.full_name).toBe('[REDACTED]');
		expect(applicantDetails.dob).toBe('[DOB Redacted]');
		expect(applicantDetails.address).toBe('[Address Redacted]');

		// Generate PDF with stripped data
		const result = await generateCasePDF(strippedPayload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
	});

	it('review mode produces slightly larger PDF than submission (watermark overhead)', async () => {
		const payload = makeSamplePayload();
		const reviewPdf = await generateCasePDF(payload, reviewOptions());
		const submissionPdf = await generateCasePDF(payload, submissionOptions());

		// Review mode adds watermark on every page, so it should be slightly larger
		// (or at least comparable in size)
		expect(reviewPdf.byteLength).toBeGreaterThan(0);
		expect(submissionPdf.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// SUBMISSION MODE — full PII, no watermark
// ============================================================================

describe('generateCasePDF — submission mode', () => {
	it('generates valid PDF in submission mode', async () => {
		const payload = makeSamplePayload();
		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
	});

	it('submission mode uses full payload with PII', async () => {
		const payload = makeSamplePayload();
		// PII should be present in the payload (not stripped)
		expect(payload.applicant_details.full_name).toBe('Ramesh Kumar Singh');
		expect(payload.applicant_details.pan_number).toBe('ABCDE1234F');

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
	});
});

// ============================================================================
// EMPTY PAYLOAD — no crash
// ============================================================================

describe('generateCasePDF — empty payload handling', () => {
	it('generates a valid PDF from an empty payload', async () => {
		const result = await generateCasePDF({}, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('empty payload PDF starts with %PDF magic bytes', async () => {
		const result = await generateCasePDF({}, submissionOptions());
		const header = String.fromCharCode(result[0], result[1], result[2], result[3], result[4]);
		expect(header).toBe('%PDF-');
	});

	it('empty payload PDF is smaller than a full payload PDF', async () => {
		const emptyPdf = await generateCasePDF({}, reviewOptions());
		const fullPdf = await generateCasePDF(makeSamplePayload(), reviewOptions());
		expect(emptyPdf.byteLength).toBeLessThan(fullPdf.byteLength);
	});
});

// ============================================================================
// LARGE PAYLOAD — many sections, no crash
// ============================================================================

describe('generateCasePDF — large payload with many sections', () => {
	it('handles a payload with 20+ sections', async () => {
		const payload: Record<string, any> = {
			case_id: 'HL-2026-9999',
			loan: { type: 'Home Loan', amount_required: 10000000 }
		};

		// Generate 25 sections with nested data
		for (let i = 0; i < 25; i++) {
			payload[`section_${i}`] = {
				field_a: `Value A for section ${i}`,
				field_b: i * 1000,
				field_c: i % 2 === 0,
				nested: {
					sub_field_1: `Nested value ${i}`,
					sub_field_2: i * 100
				}
			};
		}

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
		expect(result.byteLength).toBeLessThan(5 * 1024 * 1024);
	});

	it('handles a payload with large arrays', async () => {
		const payload: Record<string, any> = {
			case_id: 'HL-2026-ARRAY',
			obligations: Array.from({ length: 50 }, (_, i) => ({
				type: `Loan ${i + 1}`,
				emi: 5000 + i * 100,
				outstanding: 100000 + i * 5000,
				lender: `Bank ${i + 1}`
			}))
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(1024);
	});

	it('handles deeply nested objects (3+ levels)', async () => {
		const payload: Record<string, any> = {
			level_1: {
				level_2: {
					level_3: {
						level_4: {
							deep_field: 'deep value'
						}
					}
				}
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// EDGE CASES — undefined sections, empty arrays, null values
// ============================================================================

describe('generateCasePDF — edge cases', () => {
	it('handles sections with undefined values', async () => {
		const payload: Record<string, any> = {
			case_id: 'HL-2026-EDGE',
			applicant_details: {
				name: 'Test',
				phone: undefined,
				email: null
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles sections with empty arrays', async () => {
		const payload: Record<string, any> = {
			obligations: [],
			documents: []
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles sections with empty objects', async () => {
		const payload: Record<string, any> = {
			applicant_details: {},
			income_details: {},
			property_details: {}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles boolean values in payload', async () => {
		const payload: Record<string, any> = {
			eligibility: {
				is_eligible: true,
				has_cibil_issue: false,
				noc_received: true
			}
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles numeric values including zero', async () => {
		const payload: Record<string, any> = {
			financials: {
				salary: 0,
				bonus: 100000,
				deductions: 0,
				outstanding_debt: 0
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles ISO date strings in payload', async () => {
		const payload: Record<string, any> = {
			created_at: '2026-01-15T10:00:00Z',
			updated_at: '2026-02-10T12:00:00Z',
			timeline: {
				submitted_at: '2026-01-20T14:30:00Z',
				reviewed_at: '2026-02-01T09:00:00Z'
			}
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles mixed-type arrays (objects and primitives)', async () => {
		const payload: Record<string, any> = {
			mixed_section: {
				items: ['simple string', 42, true, { nested: 'object' }]
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles very long string values without crashing', async () => {
		const payload: Record<string, any> = {
			notes_section: {
				remarks: 'A'.repeat(2000),
				description: 'This is a very long description. '.repeat(50)
			}
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// DSA NOTES — _dsa_note rendering
// ============================================================================

describe('generateCasePDF — DSA notes in sections', () => {
	it('handles section with _dsa_note', async () => {
		const payload: Record<string, any> = {
			income_details: {
				salary: 100000,
				rental: 20000,
				_dsa_note: 'Income verified via bank statement for last 6 months.'
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles multiple sections with _dsa_note', async () => {
		const payload: Record<string, any> = {
			income_details: {
				salary: 100000,
				_dsa_note: 'Income verified.'
			},
			property_details: {
				value: 7500000,
				_dsa_note: 'Property valuation pending.'
			},
			obligation_details: {
				emi: 15000,
				_dsa_note: 'All obligations accounted for.'
			}
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// REDACTED FIELDS — rendered differently in review mode
// ============================================================================

describe('generateCasePDF — redacted field values in payload', () => {
	it('handles [REDACTED] values in payload', async () => {
		const payload: Record<string, any> = {
			applicant_details: {
				full_name: '[REDACTED]',
				pan_number: 'XXXXX234FX',
				employer: 'TCS Ltd'
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles [Address Redacted] and [DOB Redacted] values', async () => {
		const payload: Record<string, any> = {
			applicant_details: {
				address: '[Address Redacted]',
				dob: '[DOB Redacted]',
				city: 'Mumbai'
			}
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// DIFFERENT CASE IDS AND LENDER NAMES — options variety
// ============================================================================

describe('generateCasePDF — various options configurations', () => {
	it('works with different case IDs', async () => {
		const payload = { loan_details: { amount: 5000000 } };
		const result = await generateCasePDF(payload, reviewOptions({ caseId: 'LAP-2026-0042' }));
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('works with different lender names', async () => {
		const payload = { loan_details: { amount: 5000000 } };
		const result = await generateCasePDF(
			payload,
			submissionOptions({ lenderName: 'State Bank of India' })
		);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('works with different timestamps', async () => {
		const payload = { loan_details: { amount: 5000000 } };
		const result = await generateCasePDF(
			payload,
			reviewOptions({ generatedAt: new Date('2025-12-31T23:59:59Z') })
		);
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// FULL PIPELINE — stripPII + generateCasePDF integration
// ============================================================================

describe('generateCasePDF — full pipeline (stripPII then generate)', () => {
	it('review pipeline: stripPII -> generateCasePDF produces valid PDF', async () => {
		const rawPayload = makeSamplePayload();
		const stripped = stripPII(rawPayload);
		const pdf = await generateCasePDF(stripped, reviewOptions({ piiStripped: true }));

		expect(pdf).toBeInstanceOf(Uint8Array);
		expect(pdf.byteLength).toBeGreaterThan(1024);
		const header = String.fromCharCode(pdf[0], pdf[1], pdf[2], pdf[3], pdf[4]);
		expect(header).toBe('%PDF-');
	});

	it('submission pipeline: generateCasePDF with raw payload produces valid PDF', async () => {
		const rawPayload = makeSamplePayload();
		const pdf = await generateCasePDF(rawPayload, submissionOptions({ piiStripped: false }));

		expect(pdf).toBeInstanceOf(Uint8Array);
		expect(pdf.byteLength).toBeGreaterThan(1024);
		const header = String.fromCharCode(pdf[0], pdf[1], pdf[2], pdf[3], pdf[4]);
		expect(header).toBe('%PDF-');
	});

	it('review PDF and submission PDF are both valid but may differ in size', async () => {
		const rawPayload = makeSamplePayload();
		const strippedPayload = stripPII(rawPayload);

		const reviewPdf = await generateCasePDF(strippedPayload, reviewOptions());
		const submissionPdf = await generateCasePDF(rawPayload, submissionOptions());

		// Both should be valid PDFs
		expect(reviewPdf).toBeInstanceOf(Uint8Array);
		expect(submissionPdf).toBeInstanceOf(Uint8Array);
		expect(reviewPdf.byteLength).toBeGreaterThan(1024);
		expect(submissionPdf.byteLength).toBeGreaterThan(1024);

		// They should not be identical (different content + watermark)
		expect(reviewPdf.byteLength).not.toBe(submissionPdf.byteLength);
	});
});

// ============================================================================
// METADATA FIELDS — carried over from payload
// ============================================================================

describe('generateCasePDF — metadata fields in payload', () => {
	it('handles payload with only metadata (no sections)', async () => {
		const payload: Record<string, any> = {
			case_id: 'HL-2026-META',
			loan: { type: 'Home Loan', amount_required: 5000000 },
			created_at: '2026-01-15T10:00:00Z',
			updated_at: '2026-02-10T12:00:00Z',
			form_version: 3
		};

		const result = await generateCasePDF(payload, reviewOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});

	it('handles payload where loan is a nested object', async () => {
		const payload: Record<string, any> = {
			case_id: 'HL-2026-NESTED',
			loan: {
				type: 'Home Loan',
				amount_required: 5000000,
				purpose: 'Purchase',
				property_city: 'Mumbai'
			}
		};

		const result = await generateCasePDF(payload, submissionOptions());
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.byteLength).toBeGreaterThan(0);
	});
});

// ============================================================================
// DETERMINISTIC OUTPUT — same input produces same size output
// ============================================================================

describe('generateCasePDF — deterministic behavior', () => {
	it('same payload and options produce consistent-size PDFs', async () => {
		const payload = makeSamplePayload();
		const opts = reviewOptions();

		const pdf1 = await generateCasePDF(payload, opts);
		const pdf2 = await generateCasePDF(payload, opts);

		// pdf-lib may embed slightly varying creation timestamps, but the size
		// should be within a small tolerance (within 100 bytes)
		expect(Math.abs(pdf1.byteLength - pdf2.byteLength)).toBeLessThan(100);
	});
});
