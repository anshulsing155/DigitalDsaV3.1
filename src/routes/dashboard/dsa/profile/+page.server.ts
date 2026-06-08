import type { PageServerLoad } from './$types';
import { DsaApplications } from '$lib/database/mongo';
import { PAIN_POINTS_OPTIONS } from '$lib/data/painPoints.js';
import { AVAILABLE_MODULES } from '$lib/data/modules.js';
import type { DsaOnboardingV2Data } from '$lib/types/dsaOnboardingV2';
import { DEMO_USER_ID } from '$lib/services/jwtService';
import { requireRole } from '$lib/server/guards';
import logger from '$lib/server/logger.js';

export const load: PageServerLoad = async ({ parent, locals }) => {
	requireRole(locals, 'dsa');
	const parentData = await parent();
	const user = parentData.user;

	const emptyV2Data: DsaOnboardingV2Data = {
		business_profile: undefined,
		pain_points_ranking: undefined,
		goals: undefined,
		workflow: undefined,
		active_modules: undefined,
		onboarding_v2_completed: false
	};

	const sharedOptions = {
		painPointOptions: [...PAIN_POINTS_OPTIONS],
		availableModules: AVAILABLE_MODULES.map((m) => ({
			id: m.id,
			name: m.name,
			description: m.description
		}))
	};

	if (!user?.mobileNumber) {
		return { v2Data: emptyV2Data, ...sharedOptions };
	}

	// ── Demo mode: return sample profile data ───────────────────
	if (user.id === DEMO_USER_ID) {
		const demoV2Data: DsaOnboardingV2Data = {
			business_profile: {
				firm_name: 'Demo Finance Services',
				team_size: '2-5',
				monthly_file_volume: '5-15',
				primary_loan_types: ['Home Loan', 'Loan Against Property', 'Personal Loan'],
				empanelled_lenders: [
					{ lender_name: 'HDFC Bank', has_direct_code: true, dsa_code: 'DEMO-HDFC' },
					{ lender_name: 'ICICI Bank', has_direct_code: true, dsa_code: 'DEMO-ICICI' },
					{ lender_name: 'Axis Bank', has_direct_code: false }
				],
				geography: { city: 'Mumbai', areas_of_operation: ['Andheri', 'Bandra', 'Powai'] },
				current_tools: ['whatsapp', 'excel'],
				has_website: false,
				lead_sources: ['referral', 'ca', 'walk_in']
			},
			pain_points_ranking: {
				ranked_items: [
					'Tracking file status across multiple lenders',
					'Document collection from customers is chaotic',
					"Don't know which lender suits which customer profile"
				],
				ranked_at: new Date()
			},
			goals: {
				files_per_month: { current: 8, target: 15 },
				disbursement_volume: { current: 3000000, target: 8000000 },
				active_lender_count: { current: 4, target: 8 },
				repeat_referral_rate: { current: 20, target: 40 },
				avg_processing_days: { current: 25, target: 21 },
				set_at: new Date()
			},
			workflow: {
				customer_interaction: 'both',
				document_collection: 'both',
				file_preparation: 'self',
				lender_submission: 'mixed',
				training_preference: 'video'
			},
			active_modules: ['case_builder', 'crm', 'communication'],
			onboarding_v2_completed: true
		};

		return { v2Data: demoV2Data, ...sharedOptions };
	}

	// V2 onboarding fields are stored on the DSA doc but not declared in the Dsa schema.
	// This local type expresses what the projection returns.
	type DsaV2Projection = Partial<DsaOnboardingV2Data>;

	try {
		// Schema stores mobileNumber as a number; in the wild it has been written
		// as a string in older docs, so we match both forms via $in.
		const mobileNumber = Number(user.mobileNumber);
		const mobileFilter: { $in: (string | number)[] } = {
			$in: [mobileNumber, user.mobileNumber]
		};
		const dsa = (await DsaApplications.findOne(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ mobileNumber: mobileFilter as any },
			{
				projection: {
					business_profile: 1,
					pain_points_ranking: 1,
					goals: 1,
					workflow: 1,
					active_modules: 1,
					onboarding_v2_completed: 1
				}
			}
		)) as DsaV2Projection | null;

		const v2Data: DsaOnboardingV2Data = {
			business_profile: dsa?.business_profile ?? undefined,
			pain_points_ranking: dsa?.pain_points_ranking ?? undefined,
			goals: dsa?.goals ?? undefined,
			workflow: dsa?.workflow ?? undefined,
			active_modules: dsa?.active_modules ?? undefined,
			onboarding_v2_completed: dsa?.onboarding_v2_completed ?? false
		};

		return { v2Data, ...sharedOptions };
	} catch (error) {
		logger.error({ err: error }, 'Profile page load error');
		return { v2Data: emptyV2Data, ...sharedOptions };
	}
};
