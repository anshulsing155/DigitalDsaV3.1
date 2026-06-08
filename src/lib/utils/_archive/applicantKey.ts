// export function applicantKey(applicant: Record<string, unknown>): string | null {
// 	const name = applicant?.fullName?.trim().toLowerCase();
// 	const type = applicant?.applicantType;

// 	if (!name || !type) return null;

// 	return `${type}-${name}`;
// }

// $lib/utils/ApplicantUtils/applicantKey.ts
export function applicantKey(applicant: Record<string, unknown> | null | undefined): string | null {
	return (applicant?.id as string) ?? null;
}
