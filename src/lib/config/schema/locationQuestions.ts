/**
 * Shared Location Question Factories — used across all 6 loan types.
 *
 * Three pre-built factories:
 *   buildPropertyLocationQuestion()  — secured loans (home, LAP, plot)
 *   buildResidenceLocationQuestion() — all loans with residence capture
 *   buildBusinessLocationQuestion()  — unsecured loans (business, professional)
 *
 * Each returns a RawSchemaQuestion with type: 'location' and a locationConfig.
 * Override any field via the optional config parameter.
 *
 * Follows the caseIntakeQuestions.ts pattern.
 */

import type { RawSchemaQuestion, RulesLogic, SwitchArray } from './schemaTypes.js';

// ── Types ──────────────────────────────────────────────────────────

interface LocationQuestionOverrides {
	/** Question ID. Defaults vary by factory. */
	id?: string;
	/** Question text — can be a string or a JSON-Logic switch expression. */
	question?: string | SwitchArray;
	/** Plain-text description shown below the question. */
	description?: string;
	/** Bold header text shown above the description. */
	descriptionHeader?: string;
	/** CSS class for spacing. */
	selectClass?: string;
	/** Visibility condition. */
	showWhen?: RulesLogic;
	/** Override individual locationConfig fields. */
	locationConfig?: Partial<LocationConfig>;
}

interface LocationConfig {
	prefix: 'property' | 'residence' | 'business';
	dataSource: 'selected' | 'all';
	showArea: boolean;
	showPincode: boolean;
	stateRequired: boolean;
	cityRequired: boolean;
	areaRequired: boolean;
	pincodeRequired: boolean;
}

// ── Base Builder ───────────────────────────────────────────────────

function buildLocationQuestion(
	id: string,
	question: string | SwitchArray,
	defaultLocationConfig: LocationConfig,
	defaults: {
		selectClass: string;
		description?: string;
		descriptionHeader?: string;
		showArea: boolean;
	},
	overrides?: LocationQuestionOverrides
): RawSchemaQuestion {
	const showArea = overrides?.locationConfig?.showArea ?? defaults.showArea;

	const icons: Record<string, string> = {
		state: 'map',
		city: 'building-2',
		pincode: 'hash'
	};
	if (showArea) {
		icons.area = 'map-pinned';
	}

	const result: RawSchemaQuestion = {
		id: overrides?.id ?? id,
		type: 'location',
		selectClass: overrides?.selectClass ?? defaults.selectClass,
		required: true,
		question: overrides?.question ?? question,
		locationConfig: {
			...defaultLocationConfig,
			...overrides?.locationConfig
		},
		uiMeta: { icons }
	};

	// Add optional text fields
	const desc = overrides?.description ?? defaults.description;
	if (desc) result.description = desc;

	const descHeader = overrides?.descriptionHeader ?? defaults.descriptionHeader;
	if (descHeader) result.descriptionHeader = descHeader;

	if (overrides?.showWhen) {
		result.showWhen = overrides.showWhen;
	}

	return result;
}

// ── Property Location (secured loans) ──────────────────────────────

const PROPERTY_LOCATION_CONFIG: LocationConfig = {
	prefix: 'property',
	dataSource: 'selected',
	showArea: true,
	showPincode: true,
	stateRequired: true,
	cityRequired: true,
	areaRequired: false,
	pincodeRequired: false
};

/**
 * Build a property location question for secured loans (home, LAP, plot).
 * Default: prefix=property, dataSource=selected, showArea=true.
 */
export function buildPropertyLocationQuestion(
	overrides?: LocationQuestionOverrides
): RawSchemaQuestion {
	return buildLocationQuestion(
		'q_propertyLocation',
		'Where is the property located?',
		PROPERTY_LOCATION_CONFIG,
		{
			selectClass: 'mt-8 md:mt-12',
			descriptionHeader:
				'Accurate location helps identify lender availability and negative areas — incorrect pincode may lead to wrong lender matches.',
			showArea: true
		},
		overrides
	);
}

// ── Residence Location ─────────────────────────────────────────────

const RESIDENCE_LOCATION_CONFIG: LocationConfig = {
	prefix: 'residence',
	dataSource: 'all',
	showArea: false,
	showPincode: true,
	stateRequired: true,
	cityRequired: true,
	areaRequired: false,
	pincodeRequired: false
};

/**
 * Build a residence location question.
 * Default: prefix=residence, dataSource=all, showArea=false.
 */
export function buildResidenceLocationQuestion(
	overrides?: LocationQuestionOverrides
): RawSchemaQuestion {
	return buildLocationQuestion(
		'q_residenceLocation',
		'Applicant residence location',
		RESIDENCE_LOCATION_CONFIG,
		{
			selectClass: 'mt-8 md:mt-12',
			description:
				'Select the Indian state and city where the applicant currently resides. For NRI applicants, select the city of nearest family member or GPA (General Power of Attorney) holder.',
			showArea: false
		},
		overrides
	);
}

// ── Business Location (unsecured loans) ────────────────────────────

const BUSINESS_LOCATION_CONFIG: LocationConfig = {
	prefix: 'business',
	dataSource: 'all',
	showArea: false,
	showPincode: true,
	stateRequired: true,
	cityRequired: true,
	areaRequired: false,
	pincodeRequired: false
};

/**
 * Build a business/practice location question for unsecured loans.
 * Default: prefix=business, dataSource=all, showArea=false.
 */
export function buildBusinessLocationQuestion(
	overrides?: LocationQuestionOverrides
): RawSchemaQuestion {
	return buildLocationQuestion(
		'q_businessLocation',
		'Where is the business located?',
		BUSINESS_LOCATION_CONFIG,
		{
			selectClass: 'mt-[2rem] md:mt-[3rem]',
			description:
				"Select the state and city where the business is registered or primarily operates. For NRI applicants, select the location of the GPA (General Power of Attorney) holder's business.",
			showArea: false
		},
		overrides
	);
}
