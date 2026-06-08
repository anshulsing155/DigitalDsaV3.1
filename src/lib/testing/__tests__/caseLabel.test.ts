/**
 * Case-label generator — Audit B.1 (name-free descriptor).
 */

import { describe, it, expect } from 'vitest';
import {
	buildCaseLabel,
	classifyApplicantProfile,
	dsaCaseTitle,
	resolveActiveAnswers
} from '$lib/utils/caseLabel';

describe('resolveActiveAnswers', () => {
	it('returns the answers nested under loanData[loanName]', () => {
		const loanData = {
			loanName: 'Home Loan',
			'Home Loan': { propertyCityName: 'Gorakhpur', projectNameManual: 'X' },
			'Loan Against Property': { residenceCityName: 'Other' }
		};
		expect(resolveActiveAnswers(loanData).propertyCityName).toBe('Gorakhpur');
	});
	it('falls back to the flat object when not nested', () => {
		expect(resolveActiveAnswers({ propertyCityName: 'Pune' }).propertyCityName).toBe('Pune');
	});
	it('handles null/undefined', () => {
		expect(resolveActiveAnswers(null)).toEqual({});
		expect(resolveActiveAnswers(undefined)).toEqual({});
	});
});

describe('classifyApplicantProfile', () => {
	it('Company applicant type → Company', () => {
		expect(classifyApplicantProfile({ applicantType: 'Company', employmentType: 'whatever' })).toBe(
			'Company'
		);
	});
	it('salaried variants → Salaried', () => {
		expect(classifyApplicantProfile({ employmentType: 'Salaried(Government)' })).toBe('Salaried');
		expect(classifyApplicantProfile({ incomeType: 'salaried_regular' })).toBe('Salaried');
	});
	it('professional → SEP', () => {
		expect(classifyApplicantProfile({ employmentType: 'Self-Employed Professional' })).toBe('SEP');
		expect(classifyApplicantProfile({ incomeType: 'professional_practice' })).toBe('SEP');
	});
	it('business / self-employed / director / partner → SENP', () => {
		expect(classifyApplicantProfile({ incomeType: 'business_proprietorship' })).toBe('SENP');
		expect(classifyApplicantProfile({ employmentType: 'Self-Employed (Business)' })).toBe('SENP');
		expect(classifyApplicantProfile({ incomeType: 'director_company' })).toBe('SENP');
	});
	it('pension → Pensioner', () => {
		expect(classifyApplicantProfile({ incomeType: 'pension' })).toBe('Pensioner');
	});
	it('nothing usable → null (label omits the profile)', () => {
		expect(classifyApplicantProfile({})).toBeNull();
		expect(classifyApplicantProfile({ employmentType: '' })).toBeNull();
	});
});

describe('buildCaseLabel — name-free descriptor', () => {
	it('type + city + profile', () => {
		expect(buildCaseLabel({ loanTypeLabel: 'Home Loan', city: 'Ghaziabad', profile: 'SENP' })).toBe(
			'Home Loan — Ghaziabad — SENP case'
		);
	});
	it('with project name', () => {
		expect(
			buildCaseLabel({
				loanTypeLabel: 'Home Loan',
				project: 'Prestige Lakeside',
				city: 'Ghaziabad',
				profile: 'Salaried'
			})
		).toBe('Home Loan — Prestige Lakeside — Ghaziabad — Salaried case');
	});
	it('no profile → omits the "case" suffix', () => {
		expect(buildCaseLabel({ loanTypeLabel: 'Personal Loan', city: 'Pune' })).toBe(
			'Personal Loan — Pune'
		);
	});
	it('type only', () => {
		expect(buildCaseLabel({ loanTypeLabel: 'Business Loan' })).toBe('Business Loan');
	});
	it('NEVER contains a customer name', () => {
		const label = buildCaseLabel({
			loanTypeLabel: 'Home Loan',
			project: 'Prestige',
			city: 'Mumbai',
			profile: 'SEP'
		});
		expect(label).not.toMatch(/rajesh|kumar|sharma/i);
	});
	it('long project name truncated', () => {
		expect(
			buildCaseLabel({
				loanTypeLabel: 'Home Loan',
				project: 'Verylongprojectname Township Phase Four Extension',
				city: 'Pune'
			})
		).toBe('Home Loan — Verylongprojectname Township P… — Pune');
	});
});

describe('dsaCaseTitle — DSA-only, appends full name', () => {
	it('appends the full name for the DSA view', () => {
		expect(dsaCaseTitle('Home Loan — Ghaziabad — SENP case', 'Rajesh Kumar')).toBe(
			'Home Loan — Ghaziabad — SENP case — Rajesh Kumar'
		);
	});
	it('no name → label unchanged (matches the partner-facing value)', () => {
		expect(dsaCaseTitle('Home Loan — Ghaziabad — SENP case', '')).toBe(
			'Home Loan — Ghaziabad — SENP case'
		);
	});
});
