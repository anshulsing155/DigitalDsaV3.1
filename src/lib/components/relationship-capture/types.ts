/**
 * Relationship Capture System - TypeScript Types
 * For Indian Loan Applications
 */

// ============================================================================
// APPLICANT TYPES
// ============================================================================

export type Gender = 'male' | 'female';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'separated';

export type ApplicantRole = 'both' | 'repayment_only' | 'property_only';

export interface Applicant {
	id: string;
	name: string;
	age?: number;
	gender: Gender;
	maritalStatus: MaritalStatus;
	role: ApplicantRole;
	income?: number;
	employmentType?: string;
	fullName?: string;
	/** True if this person is a non-co-applicant director/partner from a Company */
	_isLinkedDirector?: boolean;
	/** Company name this director/partner belongs to */
	_companyName?: string;
	/** Role within the company (Director / Partner) */
	_directorRole?: string;
}

// ============================================================================
// RELATIONSHIP TYPES
// ============================================================================

export type RelationType =
	// Direct Family (Nuclear)
	| 'Husband of'
	| 'Wife of'
	| 'Father of'
	| 'Mother of'
	| 'Son of'
	| 'Daughter of'
	| 'Brother of'
	| 'Sister of'
	// Extended Family - Grandparents
	| 'Grandfather of'
	| 'Grandmother of'
	| 'Grandson of'
	| 'Granddaughter of'
	// Extended Family - In-laws
	| 'Father-in-law of'
	| 'Mother-in-law of'
	| 'Son-in-law of'
	| 'Daughter-in-law of'
	| 'Brother-in-law of'
	| 'Sister-in-law of'
	// Extended Family - Collateral
	| 'Uncle of'
	| 'Aunt of'
	| 'Nephew of'
	| 'Niece of'
	| 'Cousin of'
	// Non-family
	| 'Friend of'
	| 'Business partner of'
	| 'No relation';

export type RelationshipCategory =
	| 'direct_family'
	| 'grandparent_family'
	| 'in_law_family'
	| 'extended_family'
	| 'non_family';

export type RelationshipSource = 'user-defined' | 'inferred';

export interface Relationship {
	id: string;
	fromId: string;
	toId: string;
	relationType: RelationType;
	category: RelationshipCategory;
	source: RelationshipSource;
	inferredVia?: string; // Connecting person ID for inferred relationships
	createdAt: Date;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
	field: 'personA' | 'relation' | 'personB' | 'general';
	message: string;
	code: string;
	severity?: 'error' | 'warning';
}

export type PersonBValidity = 'valid' | 'unlikely' | 'invalid';

export interface PersonBOption {
	applicant: Applicant;
	unlikely: boolean;
}

export interface RelationOption {
	relation: RelationType;
	unlikely: boolean;
}

export interface ForbiddenRelation {
	fromId: string;
	toId: string;
	forbiddenRelations: RelationType[];
	reason: string;
}

// ============================================================================
// GRAPH CONNECTIVITY TYPES
// ============================================================================

export interface ConnectedGroup {
	id: string;
	applicantIds: string[];
	size: number;
}

export interface GraphStatus {
	isComplete: boolean;
	totalGroups: number;
	groups: ConnectedGroup[];
	suggestions: ConnectionSuggestion[];
	completionPercentage: number;
}

export interface ConnectionSuggestion {
	fromId: string;
	toId: string;
	explanation: string;
	suggestedRelationType?: string;
}

// ============================================================================
// INFERENCE TYPES
// ============================================================================

export interface InferencePath {
	relationships: Relationship[];
	inferredRelation: RelationType;
	confidence: number;
}

export interface InferenceResult {
	certain: Relationship[];
	forbidden: ForbiddenRelation[];
}

// ============================================================================
// LENDER VALIDATION TYPES
// ============================================================================

export interface LenderRule {
	lenderId: string;
	lenderName: string;
	interestRate: number;
	maxLoanAmount: number;
	processingFee: number;
	rules: {
		description: string;
		relationshipRules: any; // JSON Logic object
	};
}

export interface LenderOffer {
	lenderId: string;
	lenderName: string;
	interestRate: number;
	maxLoanAmount: number;
	processingFee: number;
	termsAndConditions: string;
}

export interface ValidationResult {
	lenderId: string;
	lenderName: string;
	passed: boolean;
	reasons: string[];
	offer?: LenderOffer;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface RelationshipStats {
	totalRelationships: number;
	userDefinedCount: number;
	inferredCount: number;

	// By category
	directFamilyCount: number;
	grandparentFamilyCount: number;
	inLawFamilyCount: number;
	extendedFamilyCount: number;
	nonFamilyCount: number;

	// By role
	bothCount: number;
	repaymentOnlyCount: number;
	propertyOnlyCount: number;

	// Graph status
	isFullyConnected: boolean;
	groupCount: number;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface RelationshipFormState {
	personA: Applicant | null;
	relation: RelationType | null;
	personB: Applicant | null;
	validationErrors: ValidationError[];
	isValid: boolean;
}

export interface RoleDisplay {
	label: string;
	description: string;
	color: string;
}
