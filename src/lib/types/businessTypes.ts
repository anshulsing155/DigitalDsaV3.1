import type { RulesLogic } from './questionSchema';

export interface BusinessOption {
	label: string;
	value: string | number;
	showWhen?: RulesLogic;
}

export interface BusinessActivityState {
	selectedBusinessType?: string;
	businessActivityDetails?: (string | number)[];
	allBusinessActivitySelections?: Record<string, (string | number)[]>;
	// Migrated from Set to a plain map so we can persist both `true` and `false` values
	// Keys are coerced to strings when stored; value `true` means selected.
	globalBusinessSelections?: Record<string, boolean>;
}

export interface BusinessSubmissionData {
	selectedBusinessType?: string;
	businessActivityDetails?: (string | number)[];
}
