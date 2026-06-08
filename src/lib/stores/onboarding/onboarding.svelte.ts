/**
 * Onboarding Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks onboarding wizard state: step, data, validation errors.
 * Migrated from multiple writables to a single class-based $state.
 *
 * Types are re-exported so existing type-only importers continue to work
 * via the bridge in onboarding.ts.
 * ============================================================================
 */

// ── Step 0: Role selection ───────────────────────────────────
// ── Step 1: Common fields + role-specific fields ─────────────
export interface CommonFields {
	name: string;
	age: number | undefined;
	gender: string;
	email: string;
	city: string;
	occupation: string;
	selectedRole: 'user' | 'dsa' | 'rm' | 'property-consultant' | '';
}

// ── Role-specific fields (collected in Step 1) ───────────────
export interface DsaStep2Fields {
	hasDirectDsaCode: boolean | undefined;
	lenderName: string;
	dsaCode: string;
	panNumber: string;
	workingCity: string;
	gstNumber: string;
}

export interface RmStep2Fields {
	officialEmail: string;
	workingCity: string;
}

export interface PcStep2Fields {
	reraNumber: string;
	panNumber: string;
	workingCity: string;
}

// ── Combined data shape ──────────────────────────────────────
export interface OnboardingData extends CommonFields {
	// Role-specific data (nested to avoid field name collisions)
	dsa?: DsaStep2Fields;
	rm?: RmStep2Fields;
	pc?: PcStep2Fields;

	// New 3-step onboarding fields (v3)
	panNumber?: string;
	workingCity?: string;
	loanTypes?: string[];
	empanelledLenders?: string[];
	monthlyVolume?: string;
	painPoints?: string[];

	// Legacy index signature for backward compatibility during migration
	[key: string]: any;
}

export interface OnboardingErrors {
	[key: string]: string | undefined;
}

export interface OnboardingStep {
	id?: string | number;
	name?: string;
	title?: string;
	component?: unknown;
	[key: string]: unknown;
}

// ── Default values ───────────────────────────────────────────

function createDefaultOnboardingData(): OnboardingData {
	return {
		name: '',
		age: undefined,
		gender: '',
		email: '',
		city: '',
		occupation: '',
		selectedRole: ''
	};
}

// ── State Class ──────────────────────────────────────────────

class OnboardingState {
	/** Current active step index */
	activeStep = $state<number>(0);

	/** Onboarding form data */
	data = $state<OnboardingData>(createDefaultOnboardingData());

	/** Step names/titles */
	steps = $state<string[]>([]);

	/** Indices of completed steps */
	completedSteps = $state<number[]>([]);

	/** Validation errors keyed by field name */
	errors = $state<OnboardingErrors>({});

	// Legacy stores (kept for backward compat)
	/** @deprecated Use `data` instead */
	userData = $state<OnboardingData>({} as OnboardingData);

	/** @deprecated Use `errors` instead */
	userErrors = $state<OnboardingErrors>({});

	// ── Data Methods ──────────────────────────────────────

	/** Update onboarding data with a partial merge */
	updateData(updater: (current: OnboardingData) => OnboardingData): void {
		this.data = updater({ ...this.data });
	}

	/** Replace onboarding data entirely */
	setData(data: OnboardingData): void {
		this.data = data;
	}

	// ── Error Methods ─────────────────────────────────────

	/** Set validation errors */
	setErrors(errors: OnboardingErrors): void {
		this.errors = errors;
	}

	/** Update errors with a partial merge */
	updateErrors(updater: (current: OnboardingErrors) => OnboardingErrors): void {
		this.errors = updater({ ...this.errors });
	}

	// ── Step Methods ──────────────────────────────────────

	/** Set step names */
	setSteps(steps: string[]): void {
		this.steps = steps;
	}

	/** Set active step */
	setActiveStep(step: number): void {
		this.activeStep = step;
	}

	/** Mark a step as completed */
	markCompleted(step: number): void {
		if (!this.completedSteps.includes(step)) {
			this.completedSteps = [...this.completedSteps, step];
		}
	}

	/** Unmark a step as completed */
	unmarkCompleted(step: number): void {
		if (this.completedSteps.includes(step)) {
			this.completedSteps = this.completedSteps.filter((s) => s !== step);
		}
	}

	/** Update completed steps via callback */
	updateCompletedSteps(updater: (current: number[]) => number[]): void {
		this.completedSteps = updater([...this.completedSteps]);
	}

	// ── Reset ─────────────────────────────────────────────

	/** Reset all onboarding state */
	reset(): void {
		this.activeStep = 0;
		this.data = createDefaultOnboardingData();
		this.steps = [];
		this.completedSteps = [];
		this.errors = {};
		this.userData = {} as OnboardingData;
		this.userErrors = {};
	}
}

export const onboardingState = new OnboardingState();
