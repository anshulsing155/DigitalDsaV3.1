import { ApplicantSchema, ApplicantsSchema } from '$lib/schemas/applicant.schema';
import { applicantsStore, applicantErrors } from '$lib/stores/loanData';
import { get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

/* --------------------------------------------------
   VALIDATE A SINGLE FIELD (INLINE FIELD VALIDATION)
-------------------------------------------------- */
export function validateApplicantField(
	applicant: Record<string, unknown>,
	index: number,
	field: string
) {
	const schemaOption = ApplicantSchema.options.find(
		(option: { shape: { applicantType: { value: unknown } } }) =>
			option.shape.applicantType.value === applicant.applicantType
	);

	if (!schemaOption) return;
	const shape = schemaOption.shape as Record<
		string,
		{
			safeParse: (value: unknown) => {
				success: boolean;
				error?: { issues: { message: string }[] };
			};
		}
	>;
	const fieldSchema = shape[field];
	if (!fieldSchema) return;

	const result = fieldSchema.safeParse(applicant[field]);

	applicantErrors.update((errors: Record<number, Record<string, string>>) => {
		const next = { ...errors };
		next[index] = next[index] || {};

		if (!result.success && result.error) {
			next[index][field] = result.error.issues[0].message;
		} else {
			delete next[index][field];
		}

		if (Object.keys(next[index]).length === 0) delete next[index];
		return next;
	});
}

/* --------------------------------------------------
   VALIDATE EXISTING ROLE INLINE (CALLED ON CHANGE)
-------------------------------------------------- */
export function validateExistingRolesInline() {
	const applicants = get(applicantsStore);

	const normalizedApplicants = applicants.map((a: Record<string, unknown>) => ({
		...a,
		existingRole: a.existingRole || undefined
	}));

	const result = ApplicantsSchema.safeParse(normalizedApplicants);

	applicantErrors.update((errors: Record<number, Record<string, string>>) => {
		const next = { ...errors };

		// applicants.forEach((_, i) => {
		// 	if (next[i]?.existingRole) {
		// 		delete next[i].existingRole;
		// 		if (Object.keys(next[i]).length === 0) delete next[i];
		// 	}
		// });

		if (!result.success) {
			result.error.issues.forEach((issue) => {
				const [index, field] = issue.path;
				if (typeof index === 'number' && field === 'existingRole') {
					next[index] = next[index] || {};
					next[index].existingRole = issue.message;
				}
			});
		}

		return next;
	});
}

/* --------------------------------------------------
   MAIN VALIDATION — OPTION A (RECOMMENDED)
   RETURNS: [{ index, status, errors }, ...]
-------------------------------------------------- */
export function validateAllApplicants() {
	const applicants = get(applicantsStore);

	const normalizedApplicants = applicants.map((a: Record<string, unknown>) => ({
		...a,
		existingRole: a.existingRole || undefined
	}));

	const result = ApplicantsSchema.safeParse(normalizedApplicants);

	// Always clear errors first
	applicantErrors.set({});

	/* SUCCESS CASE — RETURN CLEAN RESULT */
	if (result.success) {
		applicantsStore.update((apps: Record<string, unknown>[]) =>
			apps.map((a: Record<string, unknown>) => ({
				...a,
				hasError: false,
				shake: false
			}))
		);

		// Return per-index valid status array
		return normalizedApplicants.map((_: Record<string, unknown>, index: number) => ({
			index,
			status: true,
			errors: null
		}));
	}

	/* FAILURE CASE — PROCESS ERRORS */
	const formattedErrors: Record<number, Record<string, string>> = {};

	result.error.issues.forEach((issue) => {
		const [index, field] = issue.path;

		if (typeof index === 'number') {
			formattedErrors[index] = formattedErrors[index] || {};

			// union failure
			if (issue.code === 'invalid_union' || issue.code === 'invalid_value') {
				formattedErrors[index].applicantType = 'Please select applicant type';
			} else {
				const fieldKey = typeof field === 'string' ? field : '_form';
				formattedErrors[index][fieldKey] = issue.message;
			}
		}
	});

	// Store errors
	applicantErrors.set(formattedErrors);

	// Update applicants with shake/hasError
	applicantsStore.update((apps: Record<string, unknown>[]) =>
		apps.map((app: Record<string, unknown>, index: number) => ({
			...app,
			hasError: !!formattedErrors[index],
			shake: !!formattedErrors[index]
		}))
	);

	// Remove shake after animation
	setTimeout(() => {
		applicantsStore.update((apps: Record<string, unknown>[]) =>
			apps.map((app: Record<string, unknown>) => ({
				...app,
				shake: false
			}))
		);
	}, 400);

	// Return per-applicant status
	return normalizedApplicants.map((_: Record<string, unknown>, index: number) => ({
		index,
		status: !formattedErrors[index],
		errors: formattedErrors[index] ?? null
	}));
}

export function addApplicant() {
	// 1️⃣ Run full validation (sets hasError / shake internally)
	validateAllApplicants();

	const applicants = get(applicantsStore);

	// 2️⃣ Ensure ALL existing applicants are complete
	const allComplete = applicants.every(
		(a: Record<string, unknown>) => ApplicantSchema.safeParse(a).success
	);

	if (!allComplete) return;

	// 3️⃣ Add a NEW applicant with a UNIQUE ID
	applicantsStore.update((apps: Record<string, unknown>[]) => [
		...apps,
		{
			id: uuidv4(), // ✅ REQUIRED
			applicantType: '',
			fullName: '',
			age: '',
			gender: '',
			maritalStatus: '',
			isNRI: '',
			companyName: '',
			companyType: '',
			existingRole: '',
			hasError: false, // ✅ UI SAFE
			shake: false // ✅ UI SAFE
		}
	]);
}
