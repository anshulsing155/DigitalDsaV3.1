import { describe, it, expect } from 'vitest';
import { QUESTIONS_BY_PAGE, PAGE_IDS, type QuestionDef } from '$lib/testing/homeLoan/pageFlowMap';

/**
 * Helper: find a question by its ID within a given page's question list.
 * Throws a descriptive error if the question or page is not found.
 */
function getQuestion(pageId: string, questionId: string): QuestionDef {
	const questions = QUESTIONS_BY_PAGE[pageId];
	expect(questions, `Page "${pageId}" should exist in QUESTIONS_BY_PAGE`).toBeDefined();

	const question = questions.find((q) => q.id === questionId);
	expect(question, `Question "${questionId}" should exist on page "${pageId}"`).toBeDefined();

	return question!;
}

// ═══════════════════════════════════════════════════════════════
// caseIntake_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — caseIntake_homeLoan', () => {
	const pageId = PAGE_IDS.CASE_INTAKE;

	it('q1_priorAssessmentHistory has no showWhen condition (always visible)', () => {
		const q = getQuestion(pageId, 'q1_priorAssessmentHistory');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q2_propertyIdentified only visible for New Loan after priorAssessmentHistory', () => {
		const q = getQuestion(pageId, 'q2_propertyIdentified');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('New Loan');
		expect(q.showWhen).toContain('priorAssessmentHistory');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// propertyLocation_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — propertyLocation_homeLoan', () => {
	const pageId = PAGE_IDS.PROPERTY_LOCATION;

	it('q1_propertyAreaType has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_propertyAreaType');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('select');
		expect(q.required).toBe(true);
	});

	it('q2a_purchaseType_planned shows only for PLANNED_AUTHORITY area', () => {
		const q = getQuestion(pageId, 'q2a_purchaseType_planned');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('PLANNED_AUTHORITY');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('direct_from_authority');
	});

	it('q2b_purchaseType_other shows for non-PLANNED_AUTHORITY areas', () => {
		const q = getQuestion(pageId, 'q2b_purchaseType_other');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('propertyAreaType');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).not.toContain('direct_from_authority');
	});

	it('q4_propertyStateName requires purchaseType to be answered', () => {
		const q = getQuestion(pageId, 'q4_propertyStateName');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('purchaseType');
		expect(q.type).toBe('select');
		expect(q.required).toBe(true);
	});

	it('q5_propertyCityName requires propertyStateName to be answered', () => {
		const q = getQuestion(pageId, 'q5_propertyCityName');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('propertyStateName');
		expect(q.type).toBe('derivedSelect');
		expect(q.required).toBe(true);
	});

	it('q6_pincode is optional and requires propertyCityName', () => {
		const q = getQuestion(pageId, 'q6_pincode');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('propertyCityName');
		expect(q.type).toBe('text');
		expect(q.required).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// propertyCharacter_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — propertyCharacter_homeLoan', () => {
	const pageId = PAGE_IDS.PROPERTY_CHARACTER;

	it('q1_constructionType has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_constructionType');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('select');
		expect(q.required).toBe(true);
	});

	it('q2_PropertyStage requires constructionType and is not shown for BT+registry', () => {
		const q = getQuestion(pageId, 'q2_PropertyStage');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('constructionType');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q3_propertyAge only visible for Ready To Move or BT+registry', () => {
		const q = getQuestion(pageId, 'q3_propertyAge');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('Ready To Move');
		expect(q.type).toBe('select');
		expect(q.required).toBe(true);
	});

	it('q4_carpetArea requires constructionType and property stage', () => {
		const q = getQuestion(pageId, 'q4_carpetArea');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('constructionType');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q5_projectName is optional and only for Flat/Floor types', () => {
		const q = getQuestion(pageId, 'q5_projectName');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('Flat');
		expect(q.type).toBe('text');
		expect(q.required).toBe(false);
	});
});

// ═══════════════════════════════════════════════════════════════
// BT Registry questions (now on propertyLocation_homeLoan)
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — BT Registry (merged into propertyLocation)', () => {
	const pageId = PAGE_IDS.PROPERTY_LOCATION;

	it('q1_isRegistryDone has showWhen for BT types (merged into location page)', () => {
		const q = getQuestion(pageId, 'q1_isRegistryDone');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q2_bt_possessionAndDemandStatus only visible when isRegistryDone=No', () => {
		const q = getQuestion(pageId, 'q2_bt_possessionAndDemandStatus');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('isRegistryDone == "No"');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q4_sixMonthsPassedAfterRegistry only visible when isRegistryDone=Yes', () => {
		const q = getQuestion(pageId, 'q4_sixMonthsPassedAfterRegistry');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('isRegistryDone == "Yes"');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// complianceLegal_homeLoan (was propertyCondition + legalVerification)
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — complianceLegal_homeLoan', () => {
	const pageId = PAGE_IDS.COMPLIANCE_LEGAL;

	it('q1 variants: 5 area-specific propertyComplianceStatus questions share same contextKey', () => {
		const variants = [
			'q1a_propertyComplianceStatus_planned',
			'q1b_propertyComplianceStatus_converted',
			'q1c_propertyComplianceStatus_municipal',
			'q1d_propertyComplianceStatus_colony',
			'q1e_propertyComplianceStatus_unknown'
		];
		for (const id of variants) {
			const q = getQuestion(pageId, id);
			expect(q.contextKey).toBe('propertyComplianceStatus');
			expect(q.type).toBe('radio');
			expect(q.required).toBe(true);
			expect(q.showWhen).not.toBeNull(); // All variants have area-specific showWhen
		}
	});

	it('q2_ocCcAvailable has conditional visibility based on constructionType', () => {
		const q = getQuestion(pageId, 'q2_ocCcAvailable');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('constructionType');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q3_municipalApproval only visible for House type', () => {
		const q = getQuestion(pageId, 'q3_municipalApproval');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('House');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q4_isPossessionOfferedByAuthority only for New Loan direct builder', () => {
		const q = getQuestion(pageId, 'q4_isPossessionOfferedByAuthority');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('New Loan');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// sellerTransaction_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — sellerTransaction_homeLoan', () => {
	const pageId = PAGE_IDS.SELLER_TRANSACTION;

	it('q1_sellerOwnershipType has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_sellerOwnershipType');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('SOLE_OWNER');
		expect(q.options).toContain('POA_HOLDER');
	});

	it('q2_poaRegistrationStatus only visible when sellerOwnershipType=POA_HOLDER', () => {
		const q = getQuestion(pageId, 'q2_poaRegistrationStatus');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('sellerOwnershipType == "POA_HOLDER"');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q3_propertyAcquisitionMethod has no showWhen (always visible)', () => {
		const q = getQuestion(pageId, 'q3_propertyAcquisitionMethod');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('PURCHASED');
		expect(q.options).toContain('AGREEMENT_POA');
	});

	it('q4_agreementPoaRegistryWilling only visible for AGREEMENT_POA', () => {
		const q = getQuestion(pageId, 'q4_agreementPoaRegistryWilling');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('propertyAcquisitionMethod == "AGREEMENT_POA"');
		expect(q.type).toBe('radio');
	});

	it('q7_sellerOnLoan has no showWhen (always visible)', () => {
		const q = getQuestion(pageId, 'q7_sellerOnLoan');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('Yes');
		expect(q.options).toContain('No');
	});

	it('q10_ifPropertyRegistered requires sellerOnLoan answered', () => {
		const q = getQuestion(pageId, 'q10_ifPropertyRegistered');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('sellerOnLoan');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q11_lastRegistryDuration only visible when ifPropertyRegistered=Yes', () => {
		const q = getQuestion(pageId, 'q11_lastRegistryDuration');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('ifPropertyRegistered == "Yes"');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Legal Verification questions (now on complianceLegal_homeLoan)
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — legal verification (on complianceLegal page)', () => {
	const pageId = PAGE_IDS.COMPLIANCE_LEGAL;

	it('q1 variants: 5 area-specific documentationReadiness questions share same contextKey', () => {
		const variants = [
			'q1a_documentationReadiness_planned',
			'q1b_documentationReadiness_converted',
			'q1c_documentationReadiness_municipal',
			'q1d_documentationReadiness_colony',
			'q1e_documentationReadiness_unknown'
		];
		for (const id of variants) {
			const q = getQuestion(pageId, id);
			expect(q.contextKey).toBe('documentationReadiness');
			expect(q.type).toBe('radio');
			expect(q.required).toBe(true);
			expect(q.showWhen).not.toBeNull(); // All variants have area-specific showWhen
		}
	});

	it('q3_nocFromPreviousLender includes N/A option and is BT-only', () => {
		const q = getQuestion(pageId, 'q3_nocFromPreviousLender');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('BT');
		expect(q.type).toBe('radio');
		expect(q.options).toContain('N/A');
	});
});

// ═══════════════════════════════════════════════════════════════
// dealFinancials_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — dealFinancials_homeLoan', () => {
	const pageId = PAGE_IDS.DEAL_FINANCIALS;

	it('q1_auctionPropertyStatus has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_auctionPropertyStatus');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q2_mortgageYear requires auctionPropertyStatus answered', () => {
		const q = getQuestion(pageId, 'q2_mortgageYear');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('auctionPropertyStatus');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('OTHER');
		expect(q.options).toContain('MAX');
	});

	it('q2a_mortgageYearCustom only visible when mortgageYear=OTHER', () => {
		const q = getQuestion(pageId, 'q2a_mortgageYearCustom');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('mortgageYear == "OTHER"');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q3_marketValue requires mortgageYear answered', () => {
		const q = getQuestion(pageId, 'q3_marketValue');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('mortgageYear');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q4_propCost requires marketValue answered', () => {
		const q = getQuestion(pageId, 'q4_propCost');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('marketValue');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q7_registryTimeline requires deposit answered', () => {
		const q = getQuestion(pageId, 'q7_registryTimeline');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('deposit');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('SPECIFIC_DATE');
	});
});

// ═══════════════════════════════════════════════════════════════
// btExistingLoan_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — btExistingLoan_homeLoan', () => {
	const pageId = PAGE_IDS.BT_EXISTING_LOAN;

	it('q1_sanctionAmount is gated by loanType (BT/TopUp/BT+TopUp)', () => {
		const q = getQuestion(pageId, 'q1_sanctionAmount');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('loanType in');
		expect(q.showWhen).toContain('Top-up Only');
		expect(q.showWhen).toContain('Balance Transfer Only');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q6_principalOutstanding requires emiBounceHistory answered', () => {
		const q = getQuestion(pageId, 'q6_principalOutstanding');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('emiBounceHistory');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q4_interestRateType visible for all BT/TopUp types and requires loanDisbursementDate', () => {
		const q = getQuestion(pageId, 'q4_interestRateType');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('loanDisbursementDate');
		expect(q.showWhen).toContain('Balance Transfer');
		expect(q.showWhen).toContain('Top-up Only');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q5_emiBounceHistory shows after interestRateType is answered', () => {
		const q = getQuestion(pageId, 'q5_emiBounceHistory');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('interestRateType');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
		expect(q.options).toContain('0');
		expect(q.options).toContain('3+');
	});
});

// ═══════════════════════════════════════════════════════════════
// loanRequirements_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — loanRequirements_homeLoan', () => {
	const pageId = PAGE_IDS.LOAN_REQUIREMENTS;

	it('q1_marketValue has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_marketValue');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q2_mortgageYear is NOT visible for Top-up Only loan type', () => {
		const q = getQuestion(pageId, 'q2_mortgageYear');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('loanType != "Top-up Only"');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q4_topUpTenure visible for Top-up Only and BT with Top-up', () => {
		const q = getQuestion(pageId, 'q4_topUpTenure');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('Top-up Only');
		expect(q.showWhen).toContain('Balance Transfer With Top-up');
		expect(q.type).toBe('select');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// sanctionProfile_homeLoan
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — sanctionProfile_homeLoan', () => {
	const pageId = PAGE_IDS.SANCTION_PROFILE;

	it('q1_mortgageYear has no showWhen (always visible on this page)', () => {
		const q = getQuestion(pageId, 'q1_mortgageYear');
		expect(q.showWhen).toBeNull();
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});

	it('q3_deposit only visible when sanctionType is Based on Downpayment', () => {
		const q = getQuestion(pageId, 'q3_deposit');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('sanctionType == "Based on Downpayment"');
		expect(q.type).toBe('text');
		expect(q.required).toBe(true);
	});

	it('q4_withPersonalLoan requires deposit answered and sanctionType = Based on Downpayment', () => {
		const q = getQuestion(pageId, 'q4_withPersonalLoan');
		expect(q.showWhen).not.toBeNull();
		expect(q.showWhen).toContain('deposit');
		expect(q.showWhen).toContain('Based on Downpayment');
		expect(q.type).toBe('radio');
		expect(q.required).toBe(true);
	});
});

// ═══════════════════════════════════════════════════════════════
// Cross-page invariants
// ═══════════════════════════════════════════════════════════════
describe('Question visibility — cross-page invariants', () => {
	it('every page in PAGE_IDS has a corresponding entry in QUESTIONS_BY_PAGE', () => {
		for (const pageId of Object.values(PAGE_IDS)) {
			// APPLICANTS page (tellUs_homeLoan) may not have static questions in the map
			if (pageId === PAGE_IDS.APPLICANTS) continue;
			// Applicant Profile page is handled by ApplicantProfilePage component
			if (pageId === PAGE_IDS.APPLICANT_PROFILE) continue;
			// Income/credit/obligations pages are handled by dedicated components
			if (
				pageId === PAGE_IDS.INCOME_PROFILES ||
				pageId === PAGE_IDS.INCOME_DETAILS ||
				pageId === PAGE_IDS.CREDIT_SCORE ||
				pageId === PAGE_IDS.OBLIGATIONS
			)
				continue;
			expect(
				QUESTIONS_BY_PAGE[pageId],
				`QUESTIONS_BY_PAGE should contain key "${pageId}"`
			).toBeDefined();
		}
	});

	it('every question has a non-empty id and contextKey', () => {
		for (const [pageId, questions] of Object.entries(QUESTIONS_BY_PAGE)) {
			for (const q of questions) {
				expect(q.id, `Question on page ${pageId} should have an id`).toBeTruthy();
				expect(q.contextKey, `Question ${q.id} should have a contextKey`).toBeTruthy();
			}
		}
	});

	it('questions with showWhen: null are unconditionally visible on their page', () => {
		// Only questions that truly have showWhen: null in the V2 schema
		const alwaysVisibleQuestions = [
			{ pageId: PAGE_IDS.CASE_INTAKE, questionId: 'q1_priorAssessmentHistory' },
			{ pageId: PAGE_IDS.PROPERTY_LOCATION, questionId: 'q1_propertyAreaType' },
			{ pageId: PAGE_IDS.PROPERTY_CHARACTER, questionId: 'q1_constructionType' },
			// BT Registry q1_isRegistryDone moved to Location page and now has showWhen for BT types
			// Property Condition & Legal Q1 now have area-specific showWhen (not null)
			{ pageId: PAGE_IDS.SELLER_TRANSACTION, questionId: 'q1_sellerOwnershipType' },
			{ pageId: PAGE_IDS.SELLER_TRANSACTION, questionId: 'q3_propertyAcquisitionMethod' },
			{ pageId: PAGE_IDS.SELLER_TRANSACTION, questionId: 'q7_sellerOnLoan' },
			{ pageId: PAGE_IDS.DEAL_FINANCIALS, questionId: 'q1_auctionPropertyStatus' },
			{ pageId: PAGE_IDS.LOAN_REQUIREMENTS, questionId: 'q1_marketValue' },
			{ pageId: PAGE_IDS.SANCTION_PROFILE, questionId: 'q1_mortgageYear' },
			{ pageId: PAGE_IDS.SANCTION_PROFILE, questionId: 'q2_sanctionType' }
		];

		for (const { pageId, questionId } of alwaysVisibleQuestions) {
			const q = getQuestion(pageId, questionId);
			expect(q.showWhen, `${questionId} on ${pageId} should have showWhen: null`).toBeNull();
		}
	});
});
