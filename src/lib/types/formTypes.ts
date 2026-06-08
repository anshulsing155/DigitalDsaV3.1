import type { RulesLogic } from './questionSchema';

// Re-export canonical types from form.ts
export type { Applicant, LoanEntry, ObligationType } from './form';

export interface Question {
	id: string;
	contextKey?: string;
	bindsTo?: string;
	bindsTo_template?: string;
	type: string;
	question?: string;
	description?: string;
	descriptionHeader?: string;
	descriptionText?: string;
	options?: Option[];
	required?: boolean;
	showWhen?: RulesLogic;
	validation?: {
		condition?: RulesLogic;
		message?: string;
	};
	warning?: {
		condition?: RulesLogic;
	};
	affirmative?: {
		condition?: RulesLogic;
	};
	errorMessage?: Record<string, string>;
	layoutGroup?: string;
	layoutCols?: number;
	modalWidth?: string;
	uiType?: string;
	uiMeta?: {
		icon?: string;
		placeholder?: string;
		showTitleDropdown?: boolean;
	};
	valueType?: 'string' | 'number';
	textFieldClass?: string;
	radioClass?: string;
	selectClass?: string;
	optionContainerClass?: string;
	parentClass?: string;
	fieldType?: string;
	searchBarNeeded?: boolean;
	continueButton?: boolean;
	infoIcon?: string;
	maxLimit?: number;
	minLimit?: number;
}

export interface Page {
	id?: string;
	questions: Question[];
	title?: string;
	showWhen?: RulesLogic;
	nextButtonVisibility?: { mode: string[] };
	pageType?: string;
}

export interface Schema {
	pages: Page[];
}

export interface Answers {
	[key: string]: any;
}

export interface LoanDataStore {
	[key: string]: Answers | string | undefined;
	loanName?: string;
}

export interface DynamicLabel {
	var: string;
}

export interface Option {
	label: string | DynamicLabel;
	value: string | number;
	gender?: string;
	description?: string;
	icon?: string;
	color?: string;
	selectedColor?: string;
	showWhen?: RulesLogic;
	Classification?: string;
	nestedLabel?: string;
	optionsDescription?: string;
}

// LoanEntry and Applicant are now re-exported from './form' at the top of this file

export interface LoanValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface ComponentValidationState {
	isValid: boolean;
	errors: string[];
	componentName: string;
}
