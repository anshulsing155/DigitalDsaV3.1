// JSON Logic rule type (json-logic-js doesn't export types)
export type RulesLogic = Record<string, unknown> | boolean | string | number | unknown[];

// Top-level schema for the form
export interface QuestionnaireSchema {
	type: 'array';
	items: Question[];
	schemaVersion: string; // e.g., '1.0'
}

// Individual question definition
export interface Question {
	id: string; // Unique ID, e.g., 'q1_vehicle_type', matches ^q[0-9]+(_[a-zA-Z0-9]+)*$
	bindsTo?: string; // Path in applicationData, e.g., 'applicant.vehicleDetails.type'
	contextKey?: string; // Path to field defining context, e.g., 'applicant.vehicleDetails.type' for storing in 'conditionsByVehicleType.car'
	type: QuestionType; // Input type
	question: string; // Text shown to user
	options?: Option[]; // For radio/dropdown questions
	validation?: Validation; // Input validation rules
	showWhen?: RulesLogic; // JSON Logic for visibility, e.g., {"==": [{"var": "applicant.vehicleDetails.type"}, "car"]}
	uiGroup: string; // Group for UI organization, e.g., 'vehicleInfo'
	uiMeta?: UiMeta; // UI-related metadata
	whyAsked?: string; // Explanation for transparency
	defaultValue?: string | number | boolean; // Fallback value when no answer exists
	subQuestions?: Question[]; // Nested questions for array-type inputs
	dependencies?: string[]; // IDs of questions this depends on
	translations?: Record<string, string>; // e.g., { 'es': '¿Qué tipo de vehículo?' }
	derivedLogicGroup?: string; // Group for derived logic, e.g., 'vehicleDetails'
	// Extended UI properties
	subLabel?: string; // Secondary label text
	derivedClass?: string; // CSS class for derived styling
	readonly?: boolean; // Whether field is read-only
	switch?: boolean; // Toggle switch mode for boolean inputs
	required?: boolean; // Whether field is required
	description?: string; // Tooltip/help text
	fieldType?: string; // Specific field type variant
	multipleSelectClass?: string; // CSS class for multiple select components
	// Index signature for additional dynamic properties
	[key: string]: unknown;
}

// Supported question types
export type QuestionType =
	| 'text' // Single-line text
	| 'number' // Numeric input
	| 'currency' // Monetary input
	| 'boolean' // True/false input
	| 'radio' // Multiple-choice, single selection
	| 'array' // Repeating group of questions
	| 'richtext' // Multi-line formatted text
	| 'tel' // Telephone number
	| 'textarea' // Multi-line plain text
	| 'month-year'; // Month/year date picker (for D5 authority allotment dates)

// Options for radio-type questions
export interface Option {
	label: string; // Display text, e.g., 'Car'
	value: string | number; // Stored value, e.g., 'car' or numeric
	flagKeys?: string[]; // Flags to set when selected, e.g., ['hasCar', 'isVehicleLoan']
	description?: string; // Option description/tooltip
	disabled?: boolean; // Whether option is disabled
	// Index signature for additional properties
	[key: string]: unknown;
}

// Validation rules for input
export interface Validation {
	required?: boolean; // Must be filled
	min?: number; // Minimum value (number/currency)
	max?: number; // Maximum value (number/currency)
	minLength?: number; // Minimum string length
	maxLength?: number; // Maximum string length
	pattern?: string; // Regex pattern, e.g., '^[0-9]+$'
	minItems?: number; // Minimum array items
	errorMessage?: string; // Custom error message
}

// UI metadata for enhanced user experience
export interface UiMeta {
	placeholder?: string; // Placeholder text
	inputPrefix?: string; // e.g., '₹' for currency
	inputSuffix?: string; // e.g., '%' for percentage
	icon?: string; // Icon name for UI
	ariaLabel?: string; // Accessibility label
	description?: string; // Additional help text
	// Extended UI properties
	min?: string | number; // Minimum value for range inputs
	max?: string | number; // Maximum value for range inputs
	rows?: number; // Number of rows for textarea
	readonly?: boolean; // Read-only mode
	showTitleDropdown?: boolean; // Show title in dropdown
	suggestedValue?: string; // Auto-suggested value (e.g. authority for city)
	fallbackToText?: boolean; // Show text input when no dynamic options available
	fallbackLabel?: string; // Label for fallback text input
	fallbackPlaceholder?: string; // Placeholder for fallback text input
	// Index signature for additional properties
	[key: string]: unknown;
}
