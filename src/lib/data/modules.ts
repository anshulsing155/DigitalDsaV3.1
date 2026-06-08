/**
 * Available modules for DSA Onboarding v2 — Section E.
 * Used by both the Zod schema (validation) and the UI (rendering).
 */
export const AVAILABLE_MODULES = [
	{
		id: 'case_builder',
		name: 'Case Builder',
		description: 'Create and manage loan files for your customers'
	},
	{
		id: 'file_builder',
		name: 'File Builder',
		description: 'Generate professional loan files and PDFs for lender submission'
	},
	{
		id: 'communication',
		name: 'Communication Hub',
		description: 'Template-based messaging for customers and RMs'
	},
	{
		id: 'rm_database',
		name: 'RM Database',
		description: 'Access lender RM contacts and get suggestions'
	},
	{
		id: 'crm',
		name: 'Basic CRM',
		description: 'Track leads, sources, and conversions'
	},
	{
		id: 'analytics',
		name: 'Performance Analytics',
		description: 'Track your progress against business goals'
	}
] as const;

export type ModuleId = (typeof AVAILABLE_MODULES)[number]['id'];

export const VALID_MODULE_IDS = AVAILABLE_MODULES.map((m) => m.id) as unknown as [
	ModuleId,
	...ModuleId[]
];
