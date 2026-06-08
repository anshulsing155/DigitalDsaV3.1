import { describe, it, expect } from 'vitest';
import {
	dsaBusinessProfileSchema,
	dsaPainPointsSchema,
	dsaGoalsSchema,
	dsaWorkflowSchema,
	dsaModuleSelectionSchema,
	dsaOnboardingV2Schema,
	empanelledLenderSchema
} from '$lib/schemas/onboarding/dsaOnboardingV2.schema';
import { PAIN_POINTS_OPTIONS } from '$lib/data/painPoints';
import { AVAILABLE_MODULES, VALID_MODULE_IDS } from '$lib/data/modules';

// ═══════════════════════════════════════════════════════════════
// Helpers — reusable fixtures
// ═══════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

function validLender(overrides: Record<string, unknown> = {}) {
	return {
		lender_name: 'HDFC Bank',
		has_direct_code: false,
		...overrides
	};
}

function validBusinessProfile(overrides: Record<string, unknown> = {}) {
	return {
		team_size: 'solo',
		monthly_file_volume: '0-5',
		primary_loan_types: ['Home Loan'],
		empanelled_lenders: [validLender()],
		geography: { city: 'Mumbai' },
		current_tools: ['excel'],
		has_website: false,
		lead_sources: ['self'],
		...overrides
	};
}

function validPainPoints() {
	return {
		ranked_items: PAIN_POINTS_OPTIONS.slice(0, 5) as unknown as string[],
		ranked_at: NOW
	};
}

function validGoals() {
	return {
		files_per_month: { current: 5, target: 15 },
		disbursement_volume: { current: 50, target: 150 },
		active_lender_count: { current: 3, target: 8 },
		repeat_referral_rate: { current: 10, target: 30 },
		avg_processing_days: { current: 45, target: 20 },
		set_at: NOW
	};
}

function validWorkflow() {
	return {
		customer_interaction: 'both',
		document_collection: 'digital',
		file_preparation: 'self',
		lender_submission: 'portal',
		training_preference: 'video'
	};
}

function validModuleSelection() {
	return {
		active_modules: ['case_builder', 'file_builder']
	};
}

// ═══════════════════════════════════════════════════════════════
// empanelledLenderSchema
// ═══════════════════════════════════════════════════════════════

describe('empanelledLenderSchema', () => {
	it('accepts minimal lender (lender_name + has_direct_code=false)', () => {
		const result = empanelledLenderSchema.safeParse(validLender());
		expect(result.success).toBe(true);
	});

	it('accepts lender with all optional fields', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: 'ICICI Bank',
			dsa_code: 'DSA-ICICI-001',
			has_direct_code: true,
			rm_name: 'Amit Sharma',
			rm_phone: '9876543210',
			rm_email: 'amit@icici.com',
			relationship_since: '2022-01-01'
		});
		expect(result.success).toBe(true);
	});

	it('rejects has_direct_code=true but no dsa_code', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: 'ICICI Bank',
			has_direct_code: true
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.toLowerCase().includes('dsa code'))).toBe(true);
		}
	});

	it('rejects has_direct_code=true with empty dsa_code', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: 'ICICI Bank',
			has_direct_code: true,
			dsa_code: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects has_direct_code=true with whitespace-only dsa_code', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: 'ICICI Bank',
			has_direct_code: true,
			dsa_code: '   '
		});
		expect(result.success).toBe(false);
	});

	it('accepts has_direct_code=false without dsa_code', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: 'SBI',
			has_direct_code: false
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid rm_phone', () => {
		const result = empanelledLenderSchema.safeParse({
			...validLender(),
			rm_phone: '12345'
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid 10-digit rm_phone starting with 6-9', () => {
		const result = empanelledLenderSchema.safeParse({
			...validLender(),
			rm_phone: '9876543210'
		});
		expect(result.success).toBe(true);
	});

	it('rejects rm_phone starting with digit < 6', () => {
		const result = empanelledLenderSchema.safeParse({
			...validLender(),
			rm_phone: '5876543210'
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid rm_email', () => {
		const result = empanelledLenderSchema.safeParse({
			...validLender(),
			rm_email: 'not-an-email'
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid rm_email', () => {
		const result = empanelledLenderSchema.safeParse({
			...validLender(),
			rm_email: 'rm@bank.com'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing lender_name', () => {
		const result = empanelledLenderSchema.safeParse({
			has_direct_code: false
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty lender_name', () => {
		const result = empanelledLenderSchema.safeParse({
			lender_name: '',
			has_direct_code: false
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaBusinessProfileSchema — Section A
// ═══════════════════════════════════════════════════════════════

describe('dsaBusinessProfileSchema — Section A', () => {
	it('accepts full business profile', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({
				firm_name: 'ABC Financial Services',
				gstin: '22ABCDE1234F1Z5',
				years_in_business: 5
			})
		);
		expect(result.success).toBe(true);
	});

	it('accepts minimal (just required fields)', () => {
		const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile());
		expect(result.success).toBe(true);
	});

	it('rejects bad GSTIN format', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ gstin: 'INVALID-GSTIN' })
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.toLowerCase().includes('gst'))).toBe(true);
		}
	});

	it('accepts valid GSTIN format', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ gstin: '27AABCU9603R1ZM' })
		);
		expect(result.success).toBe(true);
	});

	it('accepts empty GSTIN (optional field)', () => {
		const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile({ gstin: undefined }));
		expect(result.success).toBe(true);
	});

	it('accepts empanelled lenders with RM details', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({
				empanelled_lenders: [
					{
						lender_name: 'HDFC Bank',
						has_direct_code: true,
						dsa_code: 'DSA-HDFC-001',
						rm_name: 'Vijay',
						rm_phone: '9876543210',
						rm_email: 'vijay@hdfc.com'
					}
				]
			})
		);
		expect(result.success).toBe(true);
	});

	it('rejects empanelled lender with has_direct_code=true but no dsa_code', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({
				empanelled_lenders: [
					{
						lender_name: 'HDFC Bank',
						has_direct_code: true
					}
				]
			})
		);
		expect(result.success).toBe(false);
	});

	it('rejects empty empanelled_lenders array', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ empanelled_lenders: [] })
		);
		expect(result.success).toBe(false);
	});

	it('accepts multiple lead sources', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({
				lead_sources: ['self', 'broker', 'builder', 'ca', 'digital', 'walk_in', 'referral']
			})
		);
		expect(result.success).toBe(true);
	});

	it('rejects empty lead_sources', () => {
		const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile({ lead_sources: [] }));
		expect(result.success).toBe(false);
	});

	it('rejects empty primary_loan_types', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ primary_loan_types: [] })
		);
		expect(result.success).toBe(false);
	});

	it('rejects empty current_tools', () => {
		const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile({ current_tools: [] }));
		expect(result.success).toBe(false);
	});

	it('rejects invalid team_size enum', () => {
		const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile({ team_size: '50+' }));
		expect(result.success).toBe(false);
	});

	it('accepts all valid team_size values', () => {
		for (const size of ['solo', '2-5', '6-15', '15+']) {
			const result = dsaBusinessProfileSchema.safeParse(validBusinessProfile({ team_size: size }));
			expect(result.success, `team_size "${size}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid monthly_file_volume values', () => {
		for (const vol of ['0-5', '5-15', '15-30', '30+']) {
			const result = dsaBusinessProfileSchema.safeParse(
				validBusinessProfile({ monthly_file_volume: vol })
			);
			expect(result.success, `monthly_file_volume "${vol}" should be valid`).toBe(true);
		}
	});

	it('rejects negative years_in_business', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ years_in_business: -1 })
		);
		expect(result.success).toBe(false);
	});

	it('accepts zero years_in_business', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ years_in_business: 0 })
		);
		expect(result.success).toBe(true);
	});

	it('rejects missing geography.city', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ geography: { city: '' } })
		);
		expect(result.success).toBe(false);
	});

	it('accepts all valid current_tools values', () => {
		const tools = ['excel', 'paper', 'whatsapp', 'other_software', 'none'];
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ current_tools: tools })
		);
		expect(result.success).toBe(true);
	});

	it('rejects invalid current_tools value', () => {
		const result = dsaBusinessProfileSchema.safeParse(
			validBusinessProfile({ current_tools: ['crm_system'] })
		);
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaPainPointsSchema — Section B
// ═══════════════════════════════════════════════════════════════

describe('dsaPainPointsSchema — Section B', () => {
	it('accepts exactly 5 unique items from the master list', () => {
		const result = dsaPainPointsSchema.safeParse(validPainPoints());
		expect(result.success).toBe(true);
	});

	it('rejects less than 5 items', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: PAIN_POINTS_OPTIONS.slice(0, 4),
			ranked_at: NOW
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.includes('5'))).toBe(true);
		}
	});

	it('rejects more than 5 items', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: PAIN_POINTS_OPTIONS.slice(0, 6),
			ranked_at: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects duplicate items', () => {
		const first = PAIN_POINTS_OPTIONS[0];
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: [
				first,
				first,
				PAIN_POINTS_OPTIONS[1],
				PAIN_POINTS_OPTIONS[2],
				PAIN_POINTS_OPTIONS[3]
			],
			ranked_at: NOW
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(
				messages.some(
					(m) => m.toLowerCase().includes('unique') || m.toLowerCase().includes('duplicate')
				)
			).toBe(true);
		}
	});

	it('rejects items not from the master list', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: [
				'Not a real pain point',
				PAIN_POINTS_OPTIONS[0],
				PAIN_POINTS_OPTIONS[1],
				PAIN_POINTS_OPTIONS[2],
				PAIN_POINTS_OPTIONS[3]
			],
			ranked_at: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty ranked_items array', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: [],
			ranked_at: NOW
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing ranked_at', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: PAIN_POINTS_OPTIONS.slice(0, 5)
		});
		expect(result.success).toBe(false);
	});

	it('verifies master list has at least 10 pain points', () => {
		expect(PAIN_POINTS_OPTIONS.length).toBe(10);
	});

	it('accepts items from different positions in the master list', () => {
		const result = dsaPainPointsSchema.safeParse({
			ranked_items: [
				PAIN_POINTS_OPTIONS[0],
				PAIN_POINTS_OPTIONS[2],
				PAIN_POINTS_OPTIONS[5],
				PAIN_POINTS_OPTIONS[7],
				PAIN_POINTS_OPTIONS[9]
			],
			ranked_at: NOW
		});
		expect(result.success).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaGoalsSchema — Section C
// ═══════════════════════════════════════════════════════════════

describe('dsaGoalsSchema — Section C', () => {
	it('accepts all 5 metric pairs with positive numbers', () => {
		const result = dsaGoalsSchema.safeParse(validGoals());
		expect(result.success).toBe(true);
	});

	it('accepts zero as current and target values', () => {
		const result = dsaGoalsSchema.safeParse({
			files_per_month: { current: 0, target: 0 },
			disbursement_volume: { current: 0, target: 0 },
			active_lender_count: { current: 0, target: 0 },
			repeat_referral_rate: { current: 0, target: 0 },
			avg_processing_days: { current: 0, target: 0 },
			set_at: NOW
		});
		expect(result.success).toBe(true);
	});

	it('rejects negative current value', () => {
		const goals = validGoals();
		goals.files_per_month.current = -1;
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.includes('0 or greater'))).toBe(true);
		}
	});

	it('rejects negative target value', () => {
		const goals = validGoals();
		goals.disbursement_volume.target = -50;
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});

	it('rejects negative value in active_lender_count.current', () => {
		const goals = validGoals();
		goals.active_lender_count.current = -3;
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});

	it('rejects negative value in repeat_referral_rate.target', () => {
		const goals = validGoals();
		goals.repeat_referral_rate.target = -10;
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});

	it('rejects negative value in avg_processing_days.current', () => {
		const goals = validGoals();
		goals.avg_processing_days.current = -5;
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});

	it('rejects missing set_at', () => {
		const { set_at, ...noDate } = validGoals();
		const result = dsaGoalsSchema.safeParse(noDate);
		expect(result.success).toBe(false);
	});

	it('rejects missing metric pair', () => {
		const { files_per_month, ...noFiles } = validGoals();
		const result = dsaGoalsSchema.safeParse(noFiles);
		expect(result.success).toBe(false);
	});

	it('rejects incomplete metric pair (missing target)', () => {
		const goals = validGoals();
		(goals.files_per_month as any) = { current: 5 };
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});

	it('rejects incomplete metric pair (missing current)', () => {
		const goals = validGoals();
		(goals.disbursement_volume as any) = { target: 100 };
		const result = dsaGoalsSchema.safeParse(goals);
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaWorkflowSchema — Section D
// ═══════════════════════════════════════════════════════════════

describe('dsaWorkflowSchema — Section D', () => {
	it('accepts valid workflow with all fields', () => {
		const result = dsaWorkflowSchema.safeParse(validWorkflow());
		expect(result.success).toBe(true);
	});

	it('rejects unknown customer_interaction value', () => {
		const result = dsaWorkflowSchema.safeParse({
			...validWorkflow(),
			customer_interaction: 'phone_only'
		});
		expect(result.success).toBe(false);
	});

	it('accepts all valid customer_interaction values', () => {
		for (const val of ['in_person', 'remote', 'both']) {
			const result = dsaWorkflowSchema.safeParse({
				...validWorkflow(),
				customer_interaction: val
			});
			expect(result.success, `customer_interaction "${val}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid document_collection values', () => {
		for (const val of ['physical', 'digital', 'both']) {
			const result = dsaWorkflowSchema.safeParse({
				...validWorkflow(),
				document_collection: val
			});
			expect(result.success, `document_collection "${val}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid file_preparation values', () => {
		for (const val of ['self', 'back_office', 'both']) {
			const result = dsaWorkflowSchema.safeParse({
				...validWorkflow(),
				file_preparation: val
			});
			expect(result.success, `file_preparation "${val}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid lender_submission values', () => {
		for (const val of ['email', 'physical', 'portal', 'mixed']) {
			const result = dsaWorkflowSchema.safeParse({
				...validWorkflow(),
				lender_submission: val
			});
			expect(result.success, `lender_submission "${val}" should be valid`).toBe(true);
		}
	});

	it('accepts all valid training_preference values', () => {
		for (const val of ['video', 'live', 'self_serve', 'none']) {
			const result = dsaWorkflowSchema.safeParse({
				...validWorkflow(),
				training_preference: val
			});
			expect(result.success, `training_preference "${val}" should be valid`).toBe(true);
		}
	});

	it('rejects missing customer_interaction', () => {
		const { customer_interaction, ...noCI } = validWorkflow();
		const result = dsaWorkflowSchema.safeParse(noCI);
		expect(result.success).toBe(false);
	});

	it('rejects missing document_collection', () => {
		const { document_collection, ...noDC } = validWorkflow();
		const result = dsaWorkflowSchema.safeParse(noDC);
		expect(result.success).toBe(false);
	});

	it('rejects missing file_preparation', () => {
		const { file_preparation, ...noFP } = validWorkflow();
		const result = dsaWorkflowSchema.safeParse(noFP);
		expect(result.success).toBe(false);
	});

	it('rejects missing lender_submission', () => {
		const { lender_submission, ...noLS } = validWorkflow();
		const result = dsaWorkflowSchema.safeParse(noLS);
		expect(result.success).toBe(false);
	});

	it('rejects missing training_preference', () => {
		const { training_preference, ...noTP } = validWorkflow();
		const result = dsaWorkflowSchema.safeParse(noTP);
		expect(result.success).toBe(false);
	});

	it('rejects invalid document_collection value', () => {
		const result = dsaWorkflowSchema.safeParse({
			...validWorkflow(),
			document_collection: 'email'
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid file_preparation value', () => {
		const result = dsaWorkflowSchema.safeParse({
			...validWorkflow(),
			file_preparation: 'outsource'
		});
		expect(result.success).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaModuleSelectionSchema — Section E
// ═══════════════════════════════════════════════════════════════

describe('dsaModuleSelectionSchema — Section E', () => {
	it('accepts array of valid module IDs', () => {
		const result = dsaModuleSelectionSchema.safeParse(validModuleSelection());
		expect(result.success).toBe(true);
	});

	it('accepts all available module IDs', () => {
		const allIds = AVAILABLE_MODULES.map((m) => m.id);
		const result = dsaModuleSelectionSchema.safeParse({
			active_modules: allIds
		});
		expect(result.success).toBe(true);
	});

	it('accepts single module ID', () => {
		const result = dsaModuleSelectionSchema.safeParse({
			active_modules: ['case_builder']
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty array (min 1)', () => {
		const result = dsaModuleSelectionSchema.safeParse({
			active_modules: []
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const messages = result.error.issues.map((i) => i.message);
			expect(messages.some((m) => m.includes('at least one'))).toBe(true);
		}
	});

	it('rejects unknown module ID', () => {
		const result = dsaModuleSelectionSchema.safeParse({
			active_modules: ['nonexistent_module']
		});
		expect(result.success).toBe(false);
	});

	it('rejects mix of valid and invalid module IDs', () => {
		const result = dsaModuleSelectionSchema.safeParse({
			active_modules: ['case_builder', 'invalid_module']
		});
		expect(result.success).toBe(false);
	});

	it('accepts each valid module ID individually', () => {
		const validIds = AVAILABLE_MODULES.map((m) => m.id);
		for (const id of validIds) {
			const result = dsaModuleSelectionSchema.safeParse({
				active_modules: [id]
			});
			expect(result.success, `module ID "${id}" should be valid`).toBe(true);
		}
	});

	it('verifies AVAILABLE_MODULES has 6 modules', () => {
		expect(AVAILABLE_MODULES.length).toBe(6);
	});

	it('verifies VALID_MODULE_IDS matches AVAILABLE_MODULES ids', () => {
		const expectedIds = AVAILABLE_MODULES.map((m) => m.id);
		expect(VALID_MODULE_IDS).toEqual(expectedIds);
	});
});

// ═══════════════════════════════════════════════════════════════
// dsaOnboardingV2Schema — combined schema
// ═══════════════════════════════════════════════════════════════

describe('dsaOnboardingV2Schema — combined schema', () => {
	it('accepts empty object (all optional for partial save)', () => {
		const result = dsaOnboardingV2Schema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts partial (only business_profile)', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			business_profile: validBusinessProfile()
		});
		expect(result.success).toBe(true);
	});

	it('accepts partial (only pain_points_ranking)', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			pain_points_ranking: validPainPoints()
		});
		expect(result.success).toBe(true);
	});

	it('accepts partial (only goals)', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			goals: validGoals()
		});
		expect(result.success).toBe(true);
	});

	it('accepts partial (only workflow)', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			workflow: validWorkflow()
		});
		expect(result.success).toBe(true);
	});

	it('accepts partial (only active_modules)', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			active_modules: ['case_builder', 'analytics']
		});
		expect(result.success).toBe(true);
	});

	it('accepts all sections complete', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			business_profile: validBusinessProfile(),
			pain_points_ranking: validPainPoints(),
			goals: validGoals(),
			workflow: validWorkflow(),
			active_modules: ['case_builder', 'file_builder', 'analytics'],
			onboarding_v2_completed: true,
			subscription: {
				tier: 'pro',
				started_at: NOW
			},
			feature_flags: {
				beta_features: true,
				dark_mode: false
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts with onboarding_v2_completed flag', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			onboarding_v2_completed: true
		});
		expect(result.success).toBe(true);
	});

	it('accepts with subscription', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			subscription: {
				tier: 'free'
			}
		});
		expect(result.success).toBe(true);
	});

	it('accepts all subscription tiers', () => {
		for (const tier of ['free', 'pro', 'enterprise']) {
			const result = dsaOnboardingV2Schema.safeParse({
				subscription: { tier }
			});
			expect(result.success, `subscription tier "${tier}" should be valid`).toBe(true);
		}
	});

	it('rejects invalid subscription tier', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			subscription: { tier: 'premium' }
		});
		expect(result.success).toBe(false);
	});

	it('accepts with feature_flags', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			feature_flags: { beta: true, v2: false }
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid business_profile within combined schema', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			business_profile: {
				team_size: 'invalid',
				monthly_file_volume: '0-5',
				primary_loan_types: ['Home Loan'],
				empanelled_lenders: [validLender()],
				geography: { city: 'Mumbai' },
				current_tools: ['excel'],
				has_website: false,
				lead_sources: ['self']
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid pain_points_ranking within combined schema', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			pain_points_ranking: {
				ranked_items: ['not a valid pain point'],
				ranked_at: NOW
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid goals within combined schema', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			goals: {
				files_per_month: { current: -1, target: 10 },
				disbursement_volume: { current: 50, target: 150 },
				active_lender_count: { current: 3, target: 8 },
				repeat_referral_rate: { current: 10, target: 30 },
				avg_processing_days: { current: 45, target: 20 },
				set_at: NOW
			}
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid active_modules within combined schema', () => {
		const result = dsaOnboardingV2Schema.safeParse({
			active_modules: ['nonexistent_module']
		});
		expect(result.success).toBe(false);
	});
});
