import type { PainPointOption } from '$lib/data/painPoints';
import type { ModuleId } from '$lib/data/modules';

// ── Section A: Business Profile ─────────────────────────────────

export type TeamSize = 'solo' | '2-5' | '6-15' | '15+';
export type MonthlyFileVolume = '0-5' | '5-15' | '15-30' | '30+';
export type CurrentTool = 'excel' | 'paper' | 'whatsapp' | 'other_software' | 'none';
export type LeadSource = 'self' | 'broker' | 'builder' | 'ca' | 'digital' | 'walk_in' | 'referral';

export interface EmpanelledLender {
	lender_name: string;
	dsa_code?: string;
	has_direct_code: boolean;
	rm_name?: string;
	rm_phone?: string;
	rm_email?: string;
	relationship_since?: Date;
}

export interface DsaBusinessProfile {
	firm_name?: string;
	gstin?: string;
	years_in_business?: number;
	team_size: TeamSize;
	monthly_file_volume: MonthlyFileVolume;
	primary_loan_types: string[];
	empanelled_lenders: EmpanelledLender[];
	geography: {
		city: string;
		areas_of_operation?: string[];
	};
	current_tools: CurrentTool[];
	has_website: boolean;
	lead_sources: LeadSource[];
}

// ── Section B: Pain Points (forced ranking) ─────────────────────

export interface DsaPainPoints {
	ranked_items: PainPointOption[];
	ranked_at: Date;
}

// ── Section C: 6-Month Goals ────────────────────────────────────

export interface CurrentTargetPair {
	current: number;
	target: number;
}

export interface DsaGoals {
	files_per_month: CurrentTargetPair;
	disbursement_volume: CurrentTargetPair;
	active_lender_count: CurrentTargetPair;
	repeat_referral_rate: CurrentTargetPair;
	avg_processing_days: CurrentTargetPair;
	set_at: Date;
}

// ── Section D: Workflow Preferences ─────────────────────────────

export type CustomerInteraction = 'in_person' | 'remote' | 'both';
export type DocumentCollection = 'physical' | 'digital' | 'both';
export type FilePreparation = 'self' | 'back_office' | 'both';
export type LenderSubmission = 'email' | 'physical' | 'portal' | 'mixed';
export type TrainingPreference = 'video' | 'live' | 'self_serve' | 'none';

export interface DsaWorkflow {
	customer_interaction: CustomerInteraction;
	document_collection: DocumentCollection;
	file_preparation: FilePreparation;
	lender_submission: LenderSubmission;
	training_preference: TrainingPreference;
}

// ── Section E: Module Selection ─────────────────────────────────

export interface DsaModuleSelection {
	active_modules: ModuleId[];
}

// ── Subscription ────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface DsaSubscription {
	tier: SubscriptionTier;
	started_at?: Date;
	expires_at?: Date;
}

// ── Combined v2 profile extension ───────────────────────────────

export interface DsaOnboardingV2Data {
	business_profile?: DsaBusinessProfile;
	pain_points_ranking?: DsaPainPoints;
	goals?: DsaGoals;
	workflow?: DsaWorkflow;
	active_modules?: ModuleId[];
	onboarding_v2_completed?: boolean;
	subscription?: DsaSubscription;
	feature_flags?: Record<string, boolean>;
}
