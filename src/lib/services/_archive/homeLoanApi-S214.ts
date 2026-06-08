/**
 * ════════════════════════════════════════════════════════════════════
 * ARCHIVED 2026-06-02 (S214, TECH-DEBT-CLEANUP D7 — see ADR-0020 + ADR-0024)
 *
 * Was: src/lib/services/homeLoanApi.ts
 *
 * Reason: the entire bank-loan-management external API surface was retired
 * indefinitely (owner confirmation 2026-05-31). This file's 3 submit
 * functions (submitHomeLoanApplication / submitBalanceTransferApplication /
 * submitTopupLoanApplication) were never called from anywhere in the live
 * tree post-rule-engine, and its 6 storage helpers (getStored…Offers /
 * clearStored…Offers) were called only by the 2 dead offer routes
 * (/topup-loan-offers, /balance-transfer-offers) which themselves had no
 * writer for the localStorage keys they read. So this file was 100% dead
 * code by the time S214 archived it.
 *
 * Zero-importer proof at archive time:
 *   Grep "submit(Home|BalanceTransfer|Topup)LoanApplication" src/  → 0
 *   Grep "from .\$lib/services/homeLoanApi." src/                   → 0 (post-S214)
 *   Live offer flow uses /api/evaluate-and-persist + MongoDB
 *   LenderResultsSnapshots — see docs/OFFERS-ARCHITECTURE.md.
 *
 * The 2 offer routes that used to consume this file were archived in the
 * same commit:
 *   src/routes/(app)/(offers)/_archived_topup-loan-offers/
 *   src/routes/(app)/(offers)/_archived_balance-transfer-offers/
 *
 * The 2 outbound payload-shape shims in lap/+page.svelte and
 * plot-loan/+page.svelte (which built objects with this file's PascalCase
 * field names but never sent them anywhere — pure validation scaffolding)
 * were collapsed into direct `combinedAnswers` existence checks in the
 * same commit.
 *
 * Conceptual concern (preserved for historical record): the `LoanType`
 * field in this file's `HomeLoanApplication` interface was PascalCase and
 * carried whatever the unsecured form picked (often 'Debt Consolidation' /
 * 'Debt Consolidation with Extra Funds'). Per ADR-0024 D-1, DC and BT are
 * operationally distinct customer journeys and should not have been
 * conflated under a single API contract. Restoring this file would
 * reintroduce that incorrect conflation as well as the dormant API
 * dependency.
 *
 * Restore path: git show <pre-S214-sha>:src/lib/services/homeLoanApi.ts
 *
 * Lock test asserting no live importers: see
 * src/lib/testing/__tests__/legacyPayloadFieldsAbsent.test.ts
 * (the "import path 'bank-loan-management' absent" assertion was extended
 * in S214 to also cover the `$lib/services/homeLoanApi` import path).
 * ════════════════════════════════════════════════════════════════════
 */

import type { LoanOffer } from '$lib/types/loanTypes';
import logger from '$lib/utils/clientLogger';

export interface HomeLoanApplication {
	loanTransaction: {
		LoanName: string;
		LoanType: string;
		propertyIdentified: string;
		propertyStateName: string;
		propertyCityName: string;
		residenceOptionSame: string;
		residenceStateName: string;
		residenceCityName: string;
		approvedByAuthority: string;
		asPerMap: string;
		ApplicantIsNRI: string;
		ifPropertyRegistered: string;
		propertyType: string;
		purchaseType: string;
		constructionType: string;
		PropertyStage: string;
		purchasedFrom: string;
		approvedBankForSelectedByUser: string;
		tellUsApplying: string;
		numberOfDirectorOrApplicant: number;
		mortgageYear: number;
		propCost: number;
		deposit: number;
		RequiredLoanAmount: number;
		sanctionAmount: number;
		withPersonalLoan?: string;
		// Balance Transfer specific fields
		principalOutstanding?: number;
		existingInterestRate?: number;
		remainingTenure?: number;
		selectSingleBank?: string;
		includedCurrentEMIsAmount?: number;
		sixMonthsPassedAfterRegistry: string;
		haveYouTakenHomeInsurance?: string;
		outstandingInsuranceAmount?: number;
		currentPropertyValue?: number;
		newTenure?: number;
		// Top-up specific fields
		requiredTopupAmount?: number;
		topupTerm?: number;
	};
	allApplicantDetails: Array<{
		title: string;
		fullName: string;
		existingRoleOfPerson?: string;
		TypeOfResidence?: string;
		age: number;
		employmentType: string;
		PFdeducted?: string;
		RelationWithPrimary?: string;
		creditScore: string;
		monthlyIncome?: number;

		netIncome?: number;
		grossIncome?: number;
		monthlyOtherIncome: number;
		totalEMIs: number;
		totalLimit?: number;
		tableLoanEntries?: Array<{
			loanType: string;
			bankName: string;
			selectedToClose: string;
			emi: string;
			emiFormatted: string;
			totalLimit: string;
			totalLimitFormatted: string;
			tenure: string;
			interestRate: string;
			remainingLimit: string;
			remainingLimitFormatted: string;
			remainingTenure: string;
			utilizedAmountFormatted: string;
			utilizedAmount: string;
		}>;
		tableLimitEntries?: Array<{
			loanType: string;
			bankName: string;
			selectedToClose: string;
			emi: string;
			emiFormatted: string;
			totalLimit: string;
			totalLimitFormatted: string;
			tenure: string;
			interestRate: string;
			remainingLimit: string;
			remainingLimitFormatted: string;
			remainingTenure: string;
			utilizedAmountFormatted: string;
			utilizedAmount: string;
		}>;
	}>;
}

export interface HomeLoanApiResponse {
	offers: LoanOffer[];
	status: string;
	message?: string;
}

export async function submitHomeLoanApplication(
	applicationData: HomeLoanApplication
): Promise<HomeLoanApiResponse> {
	try {
		const response = await fetch('https://bank-loan-management.vercel.app/api/loan-offers', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(applicationData)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Handle different response structures
		let offers = [];
		if (Array.isArray(data)) {
			// If response is directly an array of offers
			offers = data;
		} else if (data.offers && Array.isArray(data.offers)) {
			// If response has offers property
			offers = data.offers;
		} else if (data.bankName) {
			// If response is a single offer object
			offers = [data];
		}

		// Store the offers in localStorage for the offers page
		if (offers.length > 0) {
			localStorage.setItem('homeLoanOffers', JSON.stringify(offers));
		}

		return {
			offers: offers,
			status: 'success',
			message: data.message || 'Application submitted successfully'
		};
	} catch (error) {
		logger.error('HomeLoanApi: home loan application submission error', error);
		throw new Error(
			error instanceof Error ? error.message : 'Failed to submit home loan application'
		);
	}
}

export function getStoredHomeLoanOffers(): LoanOffer[] {
	try {
		const storedOffers = localStorage.getItem('homeLoanOffers');
		return storedOffers ? JSON.parse(storedOffers) : [];
	} catch (error) {
		logger.error('HomeLoanApi: error retrieving stored home loan offers', error);
		return [];
	}
}

export function clearStoredHomeLoanOffers(): void {
	localStorage.removeItem('homeLoanOffers');
}

// Balance Transfer specific API function
export async function submitBalanceTransferApplication(
	applicationData: HomeLoanApplication
): Promise<HomeLoanApiResponse> {
	try {
		const response = await fetch('https://bank-loan-management.vercel.app/api/loan-offers', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(applicationData)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Handle different response structures
		let offers = [];
		if (Array.isArray(data)) {
			offers = data;
		} else if (data.offers && Array.isArray(data.offers)) {
			offers = data.offers;
		} else if (data.bankName) {
			offers = [data];
		}

		// Store offers in localStorage with balance transfer prefix
		if (offers.length > 0) {
			localStorage.setItem('balanceTransferOffers', JSON.stringify(offers));
		}

		return {
			offers: offers,
			status: 'success',
			message: data.message || 'Balance transfer application submitted successfully'
		};
	} catch (error) {
		logger.error('HomeLoanApi: error submitting balance transfer application', error);
		throw error;
	}
}

// Top-up loan specific API function
export async function submitTopupLoanApplication(
	applicationData: HomeLoanApplication
): Promise<HomeLoanApiResponse> {
	try {
		const response = await fetch('https://bank-loan-management.vercel.app/api/loan-offers', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(applicationData)
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Handle different response structures
		let offers = [];
		if (Array.isArray(data)) {
			offers = data;
		} else if (data.offers && Array.isArray(data.offers)) {
			offers = data.offers;
		} else if (data.bankName) {
			offers = [data];
		}

		// Store offers in localStorage with top-up prefix
		if (offers.length > 0) {
			localStorage.setItem('topupLoanOffers', JSON.stringify(offers));
		}

		return {
			offers: offers,
			status: 'success',
			message: data.message || 'Top-up application submitted successfully'
		};
	} catch (error) {
		logger.error('HomeLoanApi: error submitting top-up loan application', error);
		throw error;
	}
}

// Get stored balance transfer offers
export function getStoredBalanceTransferOffers(): LoanOffer[] {
	try {
		const storedOffers = localStorage.getItem('balanceTransferOffers');
		return storedOffers ? JSON.parse(storedOffers) : [];
	} catch (error) {
		logger.error('HomeLoanApi: error retrieving stored balance transfer offers', error);
		return [];
	}
}

// Get stored top-up loan offers
export function getStoredTopupLoanOffers(): LoanOffer[] {
	try {
		const storedOffers = localStorage.getItem('topupLoanOffers');
		return storedOffers ? JSON.parse(storedOffers) : [];
	} catch (error) {
		logger.error('HomeLoanApi: error retrieving stored top-up loan offers', error);
		return [];
	}
}

// Clear stored balance transfer offers
export function clearStoredBalanceTransferOffers(): void {
	localStorage.removeItem('balanceTransferOffers');
}

// Clear stored top-up loan offers
export function clearStoredTopupLoanOffers(): void {
	localStorage.removeItem('topupLoanOffers');
}
