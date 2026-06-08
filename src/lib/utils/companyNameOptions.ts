/**
 * Assemble the company list for the Director-in-Company income combobox.
 *
 * Mirrors firmNameOptions.ts (which serves the partnership/LLP combobox), but
 * for the `director_company` profile: it lists the case's Company applicants
 * whose company type maps to the director-company income profile (Private
 * Limited, OPC, Public Limited, Section 8).
 *
 * Unlike FirmNameOption (a bare name suggestion), each option carries the
 * `companyId`, `companyType`, and `registrationCountry` so the income form can
 * LINK the entry to the real Company applicant on select — set sourceCompanyId,
 * auto-fill + lock the company specifics, and prevent a director from typing a
 * company name that conflicts with the actual applicant on the case.
 *
 * See CLAUDE.md Pitfall (director income auto-fill) + directorAutoIncome.ts.
 */

import { getProfileForCompanyType } from './directorAutoIncome';

export interface CompanyLinkOption {
	/** Display label (the company name). */
	label: string;
	/** Combobox value = the company name (becomes the entry's entityName). */
	value: string;
	/** The Company applicant id — used to link the income entry (sourceCompanyId). */
	companyId: string;
	/** Full company-type name as stored on the applicant (e.g. "Private Limited"). */
	companyType: string;
	/** Registration country, when known (drives registeredInIndia). */
	registrationCountry?: string;
}

interface ApplicantLike {
	id?: string;
	applicantType?: string;
	companyType?: string;
	companyName?: string;
	fullName?: string;
	registrationCountry?: string;
}

export function assembleCompanyNameOptions(
	applicants: readonly ApplicantLike[]
): CompanyLinkOption[] {
	const seen = new Set<string>();
	const options: CompanyLinkOption[] = [];

	for (const a of applicants) {
		if (a.applicantType !== 'Company') continue;

		const companyType = (a.companyType ?? '').toString();
		// Only companies whose income profile is director_company (Pvt Ltd / OPC /
		// Public Ltd / Section 8). Partnership/LLP belong to the firm combobox.
		if (getProfileForCompanyType(companyType) !== 'director_company') continue;

		const name = (a.companyName ?? a.fullName ?? '').toString().trim();
		const id = (a.id ?? '').toString();
		if (!name || !id) continue;

		const normalized = name.toLowerCase().replace(/\s+/g, ' ');
		if (seen.has(normalized)) continue;
		seen.add(normalized);

		options.push({
			label: name,
			value: name,
			companyId: id,
			companyType,
			registrationCountry: (a.registrationCountry ?? '').toString() || undefined
		});
	}

	return options;
}
