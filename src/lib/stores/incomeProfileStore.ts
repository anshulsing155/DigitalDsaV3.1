/**
 * Income Profile Store
 *
 * Saves and restores income profiles per applicant per employment type.
 * When a user switches employment types, their income data is preserved
 * and can be restored when they switch back.
 *
 * Data persists to sessionStorage via sessionPersisted bridge.
 */

import { get } from 'svelte/store';
import { sessionPersisted } from './_bridge.svelte';
import clientLogger from '$lib/utils/clientLogger';

// Keys that are specific to income/employment profiles (not basic applicant info)
const INCOME_PROFILE_KEYS = [
	// Professional/Business details
	'professionType',
	'isLawyerBarCouncil',
	'businessActivityDetails',
	'businessActivityDetailsVisible',
	'businessActivityDetailsValidate',
	'GSTRegistrationYear',
	'financialsTable',
	'financialsTableVisible',
	'financialsTableValidate',
	'averageBankBalance',
	'cashAmount',
	'creditScore',
	'whyPrimaryLowCredit',
	'whyPrimaryLowCreditVisible',
	'whyPrimaryLowCreditValidate',
	'ObligationsRunning',
	'tableLoanEntries',
	'tableLimitEntries',
	'tableLoanEntriesValidate',
	'tableLimitEntriesValidate',
	'totalEMIs',
	'totalLimit',
	// Salaried-specific
	'salariedActivityDetails',
	'salariedActivityDetailsVisible',
	'salariedActivityDetailsValidate',
	'grossIncome',
	'netIncome',
	'companyName',
	'yearsInCurrentJob',
	'totalExperience',
	// Business-specific
	'businessType',
	'businessName',
	'businessVintage',
	'annualTurnover',
	'ITRFiledYears',
	// Pensioner-specific
	'pensionType',
	'monthlyPension',
	'pensionStartDate',
	// Common income fields
	'incomeTableEntries',
	'incomeTableEntriesValidate',
	// Company-specific
	'companyType',
	'registrationNumber',
	'incorporationDate',
	'directors',
	'directorsValidate'
];

// Type for stored profile
interface IncomeProfile {
	employmentType: string;
	data: Record<string, unknown>;
	savedAt: number;
}

// Type for the store state
// Structure: { [applicantIndex]: { [employmentType]: IncomeProfile } }
interface IncomeProfileState {
	profiles: Record<number, Record<string, IncomeProfile>>;
}

// Create the persisted store (survives page refresh)
const createIncomeProfileStore = () => {
	const { subscribe, set, update } = sessionPersisted<IncomeProfileState>('income-profiles', {
		profiles: {}
	});

	return {
		subscribe,

		/**
		 * Save the current income profile for an applicant
		 */
		saveProfile: (
			applicantIndex: number,
			employmentType: string,
			answers: Record<string, unknown>
		) => {
			if (!employmentType) return;

			// Extract only income-related keys
			const profileData: Record<string, unknown> = {};
			for (const key of INCOME_PROFILE_KEYS) {
				if (key in answers && answers[key] !== undefined && answers[key] !== null) {
					// Deep clone arrays and objects
					const value = answers[key];
					if (Array.isArray(value)) {
						profileData[key] = [...value];
					} else if (typeof value === 'object' && value !== null) {
						profileData[key] = { ...value };
					} else {
						profileData[key] = value;
					}
				}
			}

			// Only save if there's meaningful data
			const hasData = Object.keys(profileData).some((key) => {
				const val = profileData[key];
				if (val === '' || val === false || val === null || val === undefined) return false;
				if (Array.isArray(val) && val.length === 0) return false;
				if (typeof val === 'object' && Object.keys(val).length === 0) return false;
				return true;
			});

			if (!hasData) return;

			update((state) => {
				const newState = { ...state };
				if (!newState.profiles[applicantIndex]) {
					newState.profiles[applicantIndex] = {};
				}
				newState.profiles[applicantIndex][employmentType] = {
					employmentType,
					data: profileData,
					savedAt: Date.now()
				};
				return newState;
			});

			clientLogger.debug(
				`[IncomeProfileStore] Saved profile for applicant ${applicantIndex}, type: ${employmentType}`
			);
		},

		/**
		 * Get a saved income profile for an applicant
		 */
		getProfile: (applicantIndex: number, employmentType: string): IncomeProfile | null => {
			const state = get({ subscribe });
			return state.profiles[applicantIndex]?.[employmentType] || null;
		},

		/**
		 * Check if a profile exists for an applicant and employment type
		 */
		hasProfile: (applicantIndex: number, employmentType: string): boolean => {
			const state = get({ subscribe });
			return !!state.profiles[applicantIndex]?.[employmentType];
		},

		/**
		 * Get all saved profiles for an applicant
		 */
		getApplicantProfiles: (applicantIndex: number): Record<string, IncomeProfile> => {
			const state = get({ subscribe });
			return state.profiles[applicantIndex] || {};
		},

		/**
		 * Clear a specific profile
		 */
		clearProfile: (applicantIndex: number, employmentType: string) => {
			update((state) => {
				const newState = { ...state };
				if (newState.profiles[applicantIndex]) {
					delete newState.profiles[applicantIndex][employmentType];
				}
				return newState;
			});
		},

		/**
		 * Clear all profiles for an applicant
		 */
		clearApplicantProfiles: (applicantIndex: number) => {
			update((state) => {
				const newState = { ...state };
				delete newState.profiles[applicantIndex];
				return newState;
			});
		},

		/**
		 * Clear all profiles
		 */
		clearAll: () => {
			set({ profiles: {} });
		},

		/**
		 * Get list of saved employment types for an applicant
		 */
		getSavedEmploymentTypes: (applicantIndex: number): string[] => {
			const state = get({ subscribe });
			return Object.keys(state.profiles[applicantIndex] || {});
		}
	};
};

export const incomeProfileStore = createIncomeProfileStore();

// Export the keys for use in components
export { INCOME_PROFILE_KEYS };
