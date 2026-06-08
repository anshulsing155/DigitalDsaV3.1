import { describe, it, expect } from 'vitest';
import {
	QUESTIONS_BY_PAGE,
	PAGE_IDS,
	getApplicantStepSequence,
	APPLICANT_STEPS
} from '$lib/testing/homeLoan/pageFlowMap';

describe('Next Button Logic', () => {
	it('all required questions must be answered for page to be complete', () => {
		const pageIds = Object.values(PAGE_IDS);

		for (const pageId of pageIds) {
			// Skip the applicants page which is handled separately
			if (pageId === PAGE_IDS.APPLICANTS) continue;
			// Skip applicant profile page which is handled by ApplicantProfilePage component
			if (pageId === PAGE_IDS.APPLICANT_PROFILE) continue;
			// Skip income/credit/obligations pages which are handled by dedicated components
			if (
				pageId === PAGE_IDS.INCOME_PROFILES ||
				pageId === PAGE_IDS.INCOME_DETAILS ||
				pageId === PAGE_IDS.CREDIT_SCORE ||
				pageId === PAGE_IDS.OBLIGATIONS
			)
				continue;
			// Authority page has all optional questions (allotment info is nice-to-have)
			if (pageId === PAGE_IDS.SELLER_TRANSACTION_AUTHORITY) continue;

			const questions = QUESTIONS_BY_PAGE[pageId];
			expect(questions, `Page "${pageId}" should have questions defined`).toBeDefined();
			expect(Array.isArray(questions), `Page "${pageId}" questions should be an array`).toBe(true);

			const requiredQuestions = questions.filter((q) => q.required === true);
			expect(
				requiredQuestions.length,
				`Page "${pageId}" should have at least one required question`
			).toBeGreaterThan(0);

			// Every required question must have required:true explicitly
			for (const q of requiredQuestions) {
				expect(q.required, `Question "${q.id}" on page "${pageId}" should be required`).toBe(true);
			}
		}
	});

	it('caseIntake requires priorAssessmentHistory', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.CASE_INTAKE];
		expect(questions).toBeDefined();

		const priorAssessmentHistory = questions.find((q) => q.contextKey === 'priorAssessmentHistory');
		expect(
			priorAssessmentHistory,
			'priorAssessmentHistory question should exist on caseIntake page'
		).toBeDefined();
		expect(priorAssessmentHistory!.required).toBe(true);
	});

	it('caseIntake has propertyIdentified conditional on loanType', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.CASE_INTAKE];
		expect(questions).toBeDefined();

		const propertyIdentified = questions.find((q) => q.contextKey === 'propertyIdentified');
		expect(propertyIdentified, 'propertyIdentified should exist on caseIntake page').toBeDefined();
		expect(propertyIdentified!.required).toBe(true);
		expect(propertyIdentified!.showWhen).not.toBeNull();
		expect(propertyIdentified!.showWhen).toContain('New Loan');
	});

	it('propertyLocation requires propertyAreaType, propertyStateName, propertyCityName', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.PROPERTY_LOCATION];
		expect(questions).toBeDefined();

		const requiredContextKeys = ['propertyAreaType', 'propertyStateName', 'propertyCityName'];

		for (const contextKey of requiredContextKeys) {
			const question = questions.find((q) => q.contextKey === contextKey);
			expect(question, `"${contextKey}" should exist on propertyLocation page`).toBeDefined();
			expect(
				question!.required,
				`"${contextKey}" should be required on propertyLocation page`
			).toBe(true);
		}
	});

	it('propertyLocation has purchaseType (propertyType removed — duplicate of constructionType)', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.PROPERTY_LOCATION];
		expect(questions).toBeDefined();

		const purchaseType = questions.find((q) => q.contextKey === 'purchaseType');
		expect(purchaseType, 'purchaseType should exist on propertyLocation page').toBeDefined();
		expect(purchaseType!.required).toBe(true);

		// propertyType was removed — it duplicated constructionType on propertyCharacter page
		const propertyType = questions.find((q) => q.contextKey === 'propertyType');
		expect(propertyType, 'propertyType should NOT exist on propertyLocation page').toBeUndefined();
	});

	it('propertyCharacter requires constructionType, PropertyStage, carpetArea', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.PROPERTY_CHARACTER];
		expect(questions).toBeDefined();

		const requiredContextKeys = ['constructionType', 'PropertyStage', 'carpetArea'];

		for (const contextKey of requiredContextKeys) {
			const question = questions.find((q) => q.contextKey === contextKey);
			expect(question, `"${contextKey}" should exist on propertyCharacter page`).toBeDefined();
			expect(
				question!.required,
				`"${contextKey}" should be required on propertyCharacter page`
			).toBe(true);
		}
	});

	it('propertyCharacter includes propertyAge with conditional visibility', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.PROPERTY_CHARACTER];
		expect(questions).toBeDefined();

		const propertyAge = questions.find((q) => q.contextKey === 'propertyAge');
		expect(propertyAge, 'propertyAge should exist on propertyCharacter page').toBeDefined();
		expect(propertyAge!.required).toBe(true);
		expect(propertyAge!.showWhen).not.toBeNull();
		expect(propertyAge!.showWhen).toContain('Ready To Move');
	});

	it('complianceLegal requires propertyComplianceStatus (area-specific variants)', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.COMPLIANCE_LEGAL];
		expect(questions).toBeDefined();

		// 5 area-specific variants all share the same contextKey
		const complianceVariants = questions.filter((q) => q.contextKey === 'propertyComplianceStatus');
		expect(
			complianceVariants.length,
			'should have 5 area-specific variants of propertyComplianceStatus'
		).toBe(5);

		// Each variant is required and has a showWhen condition
		for (const variant of complianceVariants) {
			expect(variant.required, `${variant.id} should be required`).toBe(true);
			expect(variant.showWhen, `${variant.id} should have showWhen`).not.toBeNull();
			expect(variant.showWhen).toContain('propertyAreaType');
		}
	});

	it('sellerTransaction requires sellerOnLoan', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.SELLER_TRANSACTION];
		expect(questions).toBeDefined();

		const sellerOnLoan = questions.find((q) => q.contextKey === 'sellerOnLoan');
		expect(sellerOnLoan, 'sellerOnLoan should exist on sellerTransaction page').toBeDefined();
		expect(sellerOnLoan!.required).toBe(true);
		expect(sellerOnLoan!.showWhen).toBeNull();
	});

	it('complianceLegal requires documentationReadiness (area-specific variants)', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.COMPLIANCE_LEGAL];
		expect(questions).toBeDefined();

		// 5 area-specific variants all share the same contextKey
		const readinessVariants = questions.filter((q) => q.contextKey === 'documentationReadiness');
		expect(
			readinessVariants.length,
			'should have 5 area-specific variants of documentationReadiness'
		).toBe(5);

		// Each variant is required and has a showWhen condition
		for (const variant of readinessVariants) {
			expect(variant.required, `${variant.id} should be required`).toBe(true);
			expect(variant.showWhen, `${variant.id} should have showWhen`).not.toBeNull();
			expect(variant.showWhen).toContain('propertyAreaType');
		}
	});

	it('dealFinancials requires auctionPropertyStatus, mortgageYear, marketValue, propCost', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.DEAL_FINANCIALS];
		expect(questions).toBeDefined();

		const requiredContextKeys = [
			'auctionPropertyStatus',
			'mortgageYear',
			'marketValue',
			'propCost'
		];

		for (const contextKey of requiredContextKeys) {
			const question = questions.find((q) => q.contextKey === contextKey);
			expect(question, `"${contextKey}" should exist on dealFinancials page`).toBeDefined();
			expect(question!.required, `"${contextKey}" should be required on dealFinancials page`).toBe(
				true
			);
		}
	});

	it('btExistingLoan requires sanctionAmount, principalOutstanding', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.BT_EXISTING_LOAN];
		expect(questions).toBeDefined();

		const sanctionAmount = questions.find((q) => q.contextKey === 'sanctionAmount');
		const principalOutstanding = questions.find((q) => q.contextKey === 'principalOutstanding');

		expect(sanctionAmount, 'sanctionAmount should exist on btExistingLoan page').toBeDefined();
		expect(sanctionAmount!.required).toBe(true);

		expect(
			principalOutstanding,
			'principalOutstanding should exist on btExistingLoan page'
		).toBeDefined();
		expect(principalOutstanding!.required).toBe(true);
	});

	it('loanRequirements requires marketValue', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.LOAN_REQUIREMENTS];
		expect(questions).toBeDefined();

		const marketValue = questions.find((q) => q.contextKey === 'marketValue');
		expect(marketValue, 'marketValue should exist on loanRequirements page').toBeDefined();
		expect(marketValue!.required).toBe(true);
	});

	it('sanctionProfile requires mortgageYear, sanctionType', () => {
		const questions = QUESTIONS_BY_PAGE[PAGE_IDS.SANCTION_PROFILE];
		expect(questions).toBeDefined();

		const mortgageYear = questions.find((q) => q.contextKey === 'mortgageYear');
		const sanctionType = questions.find((q) => q.contextKey === 'sanctionType');

		expect(mortgageYear, 'mortgageYear should exist on sanctionProfile page').toBeDefined();
		expect(mortgageYear!.required).toBe(true);

		expect(sanctionType, 'sanctionType should exist on sanctionProfile page').toBeDefined();
		expect(sanctionType!.required).toBe(true);
	});

	it('every page has at least one required question', () => {
		const pageIds = Object.values(PAGE_IDS);

		for (const pageId of pageIds) {
			if (pageId === PAGE_IDS.APPLICANTS) continue;
			if (pageId === PAGE_IDS.APPLICANT_PROFILE) continue;
			if (
				pageId === PAGE_IDS.INCOME_PROFILES ||
				pageId === PAGE_IDS.INCOME_DETAILS ||
				pageId === PAGE_IDS.CREDIT_SCORE ||
				pageId === PAGE_IDS.OBLIGATIONS
			)
				continue;
			// Authority page has all optional questions (allotment info is nice-to-have)
			if (pageId === PAGE_IDS.SELLER_TRANSACTION_AUTHORITY) continue;

			const questions = QUESTIONS_BY_PAGE[pageId];
			expect(questions, `Page "${pageId}" should have questions defined`).toBeDefined();

			const requiredQuestions = questions.filter((q) => q.required === true);
			expect(
				requiredQuestions.length,
				`Page "${pageId}" should have at least one required question`
			).toBeGreaterThan(0);
		}
	});

	it('applicant step sequence affects next button', () => {
		// Single applicant: no relationships step
		const singleSteps = getApplicantStepSequence(1);
		expect(singleSteps).toEqual([APPLICANT_STEPS.BASIC_DETAILS, APPLICANT_STEPS.INCOME_CREDIT]);
		expect(singleSteps).not.toContain(APPLICANT_STEPS.RELATIONSHIPS);

		// Multiple applicants: relationships step is included
		const multipleSteps = getApplicantStepSequence(2);
		expect(multipleSteps).toEqual([
			APPLICANT_STEPS.BASIC_DETAILS,
			APPLICANT_STEPS.RELATIONSHIPS,
			APPLICANT_STEPS.INCOME_CREDIT
		]);
		expect(multipleSteps).toContain(APPLICANT_STEPS.RELATIONSHIPS);

		// Even more applicants: same 3-step sequence
		const manySteps = getApplicantStepSequence(5);
		expect(manySteps).toEqual([
			APPLICANT_STEPS.BASIC_DETAILS,
			APPLICANT_STEPS.RELATIONSHIPS,
			APPLICANT_STEPS.INCOME_CREDIT
		]);
		expect(manySteps.length).toBe(3);
	});
});
