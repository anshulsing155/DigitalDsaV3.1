interface ZodIssue {
	path: (string | number)[];
	message: string;
}

interface ZodError {
	issues: ZodIssue[];
}

export function mapZodErrors(error: ZodError): Record<string, string>[] {
	const errors: Record<string, string>[] = [];

	error.issues.forEach((issue: ZodIssue) => {
		const [index, field] = issue.path;

		if (typeof index === 'number') {
			errors[index] ||= {};
			errors[index][field as string] = issue.message;
		}
	});

	return errors;
}
