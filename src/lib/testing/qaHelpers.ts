import { ObjectId } from 'mongodb';
import type { QaScenarioMeta } from '$lib/types/qaScenario.js';

/**
 * Extracts indexed meta fields from a derived scenario name.
 * Name format: "{LoanType} · {FormPath} · {Employment} · {City} · CIBIL {n} · {Structure} [· Tags...]"
 * Shared by the save and clone endpoints to keep derivation consistent.
 */
export function extractMeta(
	loanAnswers: Record<string, unknown>,
	applicants: Array<Record<string, unknown>>,
	autoName: string
): QaScenarioMeta {
	const parts = autoName.split(' · ');
	const primary = applicants[0] ?? {};
	const cibil = Number(primary['creditScore'] ?? 0);

	const city = String(
		loanAnswers['propertyCityName'] ??
		loanAnswers['businessCityName'] ??
		loanAnswers['residenceCityName'] ??
		''
	);

	// Edge tags are anything after the 6th segment
	const tags: string[] = parts.slice(6);

	return {
		loanType: parts[0] ?? '',
		formPath: parts[1] ?? '',
		employment: parts[2] ?? '',
		city,
		cibil: isNaN(cibil) ? 0 : cibil,
		applicantCount: Number(loanAnswers['__applicantCount'] ?? applicants.length),
		tags
	};
}

export function toObjectId(id: string): ObjectId | null {
	try { return new ObjectId(id); } catch { return null; }
}
