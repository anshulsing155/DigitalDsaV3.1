// Landing page TypeScript interfaces

export interface TrustIndicator {
	label: string;
	value: string;
	icon?: string;
}

export interface HeroProps {
	headline: string;
	subheadline: string;
	ctaText: string;
	trustIndicators: TrustIndicator[];
}

export interface LoanProduct {
	id: string;
	name: string;
	category: 'secured' | 'unsecured';
	description: string;
	features: string[];
	interestRate: string;
	icon: string;
	route: string;
	maxAmount?: string;
	maxTenure?: string;
}

export interface ProcessStep {
	step: number;
	title: string;
	description: string;
	duration: string;
	icon: string;
}

export interface Testimonial {
	name: string;
	loanType: string;
	amount: string;
	review: string;
	rating: number;
	location?: string;
	saved?: string;
}

export interface TrustMetric {
	label: string;
	value: string;
	description: string;
}

export interface ComparisonPoint {
	feature: string;
	us: string;
	others: string;
}

export interface FAQ {
	question: string;
	answer: string;
	category: string;
}

export interface LandingPageConfig {
	hero: {
		headline: string;
		subheadline: string;
		ctaText: string;
		trustIndicators: TrustIndicator[];
	};
	loanProducts: LoanProduct[];
	processSteps: ProcessStep[];
	testimonials: Testimonial[];
	trustMetrics: TrustMetric[];
	comparisonPoints: ComparisonPoint[];
	faqs: FAQ[];
}

export interface NavigationState {
	currentSection: string;
	scrollPosition: number;
	mobileMenuOpen: boolean;
}
