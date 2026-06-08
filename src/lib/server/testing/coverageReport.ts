/**
 * E2E Coverage Gap Report
 * ══════════════════════════════════════════════════════════════════
 * Compares what the form schema asks (via reverse map) against what
 * payloadToFormAnswers() can provide. Returns a per-loan-type coverage
 * report showing mapped vs unmapped bindsTo keys.
 * ══════════════════════════════════════════════════════════════════
 */

import { buildReverseMap } from '$lib/server/formEngine/reverseSchemaMap.js';
import { getAvailableLoanTypes } from '$lib/server/formEngine/schemaLoader.js';
import { payloadToFormAnswers } from './payloadToFillInstructions.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder/types.js';

// ============================================================================
// Types
// ============================================================================

export interface LoanNameCoverage {
	/** Loan-product name ("Home Loan", "LAP", etc.) — canonical `loanName`. */
	loanName: string;
	totalFormQuestions: number;
	mappedCount: number;
	unmappedCount: number;
	coveragePercent: number;
	unmappedKeys: string[];
	/** Keys that payloadToFormAnswers produces but no schema question expects */
	extraKeys: string[];
}

export interface CoverageReport {
	generatedAt: string;
	loanNames: LoanNameCoverage[];
	overallCoverage: number;
}

// ============================================================================
// Max-populated dummy payload for coverage testing
// ============================================================================

/**
 * Create a maximally-populated payload so payloadToFormAnswers()
 * produces every key it possibly can. Values don't need to be realistic —
 * we're just checking which keys get produced.
 */
function createMaxPayload(): LoanApplicationPayload {
	return {
		loanTransaction: {
			loanName: 'Home Loan',
			loanType: 'Balance Transfer With Top-up',
			numberOfApplicants: 2,
			applicationStructure: 'Couple',
			facilityType: 'Term Loan',

			// Property
			propertyIdentified: true,
			propertyState: 'Maharashtra',
			propertyCity: 'Pune',
			propertyPincode: '411001',
			propertyType: 'Flat',
			purchaseType: 'direct_from_builder',
			constructionStatus: 'Ready to Move',
			propertyStage: 'Superstructure',
			propertyComplianceStatus: 'fully_compliant',
			propertyRegistered: true,
			propertyCost: 7500000,
			atsValue: 7000000,
			downPayment: 1500000,

			// Residence
			residenceSameAsProperty: false,
			applicantResidingInProperty: true,
			propertyOccupancyStatus: 'self_occupied',
			residenceState: 'Maharashtra',
			residenceCity: 'Mumbai',

			// Amounts
			loanAmount: 6000000,
			tenureYears: 20,

			// BT
			currentBank: 'HDFC Bank',
			principalOutstanding: 4000000,
			currentInterestRate: 8.5,
			remainingTenure: 180,
			currentEMI: 35000,
			sixMonthsAfterRegistry: true,
			currentPropertyValue: 8000000,
			newTenure: 240,
			loanVintage: '3-5yr',
			repaymentTrack: 'CLEAN',

			// Top-up
			topUpAmount: 500000,
			topUpTenure: 10,

			// NRI
			hasNRIApplicant: false,

			// LAP-specific
			carpetAreaRaw: 1200,
			carpetAreaUnit: 'sqft',
			propertyAreaType: 'PLANNED_AUTHORITY',
			societyStatus: 'FORMED',
			pendingSocietyDues: 'NO',
			approachRoadWidth: 'ABOVE_12FT',
			restrictedZone: 'NO',
			floodDisasterZone: 'NO',
			leaseRemainingPeriod: 'MORE_THAN_30',
			existingEncumbrance: 'NONE',
			ocCcAvailable: 'YES',
			municipalApproval: 'YES',
			rentalIncome: 25000,
			loanPurpose: 'Business Expansion',

			// DOD
			dodMonthlyWithdrawal: 100000,

			// HL Redesign: Three-Cost Model
			marketValue: 8000000,
			registryValue: 7200000,
			advanceInAgreement: 500000,

			// HL Redesign: BT Existing Loan Signals
			interestRateType: 'FLOATING',
			emiBounceHistory: '0',
			sanctionAmount: 5000000,
			topUpPurpose: 'RENOVATION',

			// HL Redesign: New Signals
			registryTimeline: 'WITHIN_3_MONTHS',
			auctionPropertyStatus: 'STANDARD',
			priorAssessmentHistory: 'first_assessment',

			// Area-Specific Compliance
			reraRegistrationStatus: 'REGISTERED',
			naConversionStatus: 'REGISTERED',
			zoneClassification: 'RESIDENTIAL',
			municipalTaxStatus: 'PAID_REGULAR',
			unauthorizedAdditions: 'NONE',
			revenueRecordStatus: 'AVAILABLE_CURRENT',
			colonyRegularizationStatus: 'REGULARIZED',
			gramPanchayatPermission: 'YES',
			titleChainStatus: 'CLEAR',
			encumbranceCertStatus: 'CLEAR',
			successionStatus: 'NOT_INHERITED',
			revenueRecordMutation: 'MUTATED',

			// Seller & Transaction
			sellerOwnershipType: 'SOLE_OWNER',
			propertyAcquisitionMethod: 'PURCHASED',

			// Property Usage
			propertyUsageIntent: 'SELF_USE',

			// BT registry
			documentationReadiness: ['title_deed', 'sale_agreement', 'ec'],
			nocFromPreviousLender: 'YES',
			loanDisbursementDate: '2020-06',
			btEmisPaid: 48,
			loanAccountNumber: 'HL123456789',

			// LAP legal
			originalDocumentsAvailable: 'YES',
			ownershipChainComplete: 'YES',
			noLegalDispute: 'YES',
			encumbranceCertificateVerified: 'YES',
			rentalAgreementType: 'REGISTERED',

			// Unsecured
			urgencyLevel: 'STANDARD',
			existingBankRelationship: 'YES',
			dcExistingBank: 'HDFC Bank'
		},
		allApplicantDetails: [
			{
				applicantType: 'Individual',
				fullName: 'Test User',
				age: 35,
				gender: 'Male',
				maritalStatus: 'Married',
				employmentType: 'Salaried(Private)',
				grossIncome: 100000,
				netIncome: 80000,
				monthlyOtherIncome: 10000,
				creditScore: 750,
				residenceType: 'Rented',
				hasExistingObligations: true,
				isNRI: false,
				professionType: 'CA',
				businessType: 'Trading',
				gstRegistrationDate: '2020-01',
				averageBankBalance: 500000,
				averageCashAmount: 100000,

				// Unsecured business fields
				businessEntityType: 'Proprietorship',
				businessIndustrySector: 'Trading',
				businessVintage: '3-5yr',
				gstRegistrationStatus: 'REGISTERED',
				annualTurnoverRange: '1CR_5CR',
				numberOfEmployees: '11_50',
				banksOfCurrentAccount: ['HDFC Bank', 'SBI'],

				// Company
				companyName: 'Test Corp',
				companyType: 'Private Limited',
				companyAge: 5
			}
		]
	};
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a coverage report for a single loan product.
 */
export function getLoanNameCoverage(loanName: string): LoanNameCoverage {
	// Get all bindsTo keys the form schema expects
	const reverseMap = buildReverseMap(loanName);
	const schemaKeys = new Set(reverseMap.keys());

	// Get all keys that payloadToFormAnswers can produce
	const maxPayload = createMaxPayload();
	// Adjust loan name to match the target product
	maxPayload.loanTransaction.loanName = loanName;
	const flatAnswers = payloadToFormAnswers(maxPayload);
	const answerKeys = new Set(Object.keys(flatAnswers));

	// Compute coverage
	const unmappedKeys: string[] = [];
	for (const key of schemaKeys) {
		if (!answerKeys.has(key)) {
			unmappedKeys.push(key);
		}
	}

	const extraKeys: string[] = [];
	for (const key of answerKeys) {
		if (!schemaKeys.has(key)) {
			extraKeys.push(key);
		}
	}

	const mappedCount = schemaKeys.size - unmappedKeys.length;

	return {
		loanName,
		totalFormQuestions: schemaKeys.size,
		mappedCount,
		unmappedCount: unmappedKeys.length,
		coveragePercent: schemaKeys.size > 0 ? Math.round((mappedCount / schemaKeys.size) * 100) : 100,
		unmappedKeys: unmappedKeys.sort(),
		extraKeys: extraKeys.sort()
	};
}

/**
 * Generate coverage report across all loan products.
 */
export function generateCoverageReport(): CoverageReport {
	const loanNames = getAvailableLoanTypes();
	const coverages = loanNames.map(getLoanNameCoverage);

	const totalQuestions = coverages.reduce((sum, c) => sum + c.totalFormQuestions, 0);
	const totalMapped = coverages.reduce((sum, c) => sum + c.mappedCount, 0);

	return {
		generatedAt: new Date().toISOString(),
		loanNames: coverages,
		overallCoverage: totalQuestions > 0 ? Math.round((totalMapped / totalQuestions) * 100) : 100
	};
}
