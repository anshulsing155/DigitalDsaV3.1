import type { RulesLogic } from './questionSchema';

export interface DsaGuidance {
	summary?: string;
	keyPoints?: string[];
	watchFor?: string[];
	proTips?: string[];
}

export interface CaseRouteData {
	loanName: string;
	loanType?: string;
	propertyArea?: string;
	propertyStage?: string;
	applicantCount?: number;
	loanAmount?: number;
}

export interface SectionContextInfo {
	title?: string;
	description?: string;
	whyImportant?: string[];
	tips?: string[];
	icon?: string;
	dsaGuidance?: DsaGuidance;
	getDynamicGuidance?: (answers: Record<string, unknown>) => Partial<DsaGuidance>;
}

export interface WizardSubsection {
	id: string;
	label: string;
	pageIds: string[];
	showWhen?: (answers: Record<string, unknown>) => boolean;
	applicantStep?: number;
	contextInfo?: SectionContextInfo;
}

export interface WizardSection {
	id: string;
	label: string;
	icon?: string;
	subsections: WizardSubsection[];
	showWhen?: (answers: Record<string, unknown>) => boolean;
	contextInfo?: SectionContextInfo;
}

export interface WizardSectionConfig {
	loanProduct: string;
	sections: WizardSection[];
}
