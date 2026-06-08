/**
 * Calculator Configuration — The key to white-label readiness.
 *
 * Every calculator component receives a `CalculatorConfig` object that controls:
 * - Branding (logo, company name, colors)
 * - Feature gates (which calculators are enabled, lead capture, comparison)
 * - API access (whether to use rule engine or client-side math)
 * - CTA behavior (where "Apply" leads, how leads are captured)
 *
 * THREE CONTEXTS use the same components with different configs:
 *
 * 1. DASHBOARD — DSA's own use
 *    { context: 'dashboard', apiAccess: 'rule-engine', branding: null, ... }
 *
 * 2. PUBLIC — DigitalDSA's public website
 *    { context: 'public', apiAccess: 'client-side', branding: null, ... }
 *
 * 3. EMBED — White-label widget on DSA's website
 *    { context: 'embed', apiAccess: 'scoped-api', branding: { logo, color, name }, ... }
 *
 * By passing config as a prop (not reading global state), the components stay
 * pure and embeddable anywhere — no dependency on dashboard layout, auth, or stores.
 */

// ============================================================================
// TYPES
// ============================================================================

/** How the calculator gets its data */
export type ApiAccessLevel =
	| 'client-side' // Public: all math runs in browser, no API calls
	| 'rule-engine' // Dashboard: calls /api/rule-engine/evaluate for real lender policies
	| 'scoped-api'; // Embed: calls /api/widget/calculate with API key, scoped response

/** Where the calculator is rendered */
export type CalculatorContext = 'dashboard' | 'public' | 'embed';

/** Custom branding for white-label embeds */
export interface BrandingConfig {
	/** DSA's company logo URL */
	logoUrl?: string;

	/** DSA's company name (shown in header/footer) */
	companyName?: string;

	/** Primary brand color (overrides --ddsa-primary-500 in the embed) */
	primaryColor?: string;

	/** Whether to show "Powered by DigitalDSA" watermark */
	showWatermark: boolean;
}

/** What happens when user clicks "Apply" or "Get Detailed Analysis" */
export interface CtaConfig {
	/** Show the CTA button at all? */
	enabled: boolean;

	/** Button label */
	label: string;

	/** Where to navigate on click (internal route or external URL) */
	targetUrl?: string;

	/** Whether clicking captures lead data (name, phone, email) before redirecting */
	captureLeadFirst: boolean;

	/** Webhook URL for lead data (embed only) */
	webhookUrl?: string;
}

/** Which tools are available in this context */
export interface ToolGateConfig {
	emiCalculator: boolean;
	eligibilityCalculator: boolean;
	affordabilityCalculator: boolean;
	balanceTransferCalculator: boolean;
	stampDutyCalculator: boolean;
	partPaymentPlanner: boolean;
	flexibleEmiPlanner: boolean;
	combinedPlanner: boolean;
	budgetPlanner: boolean;
}

/** The master config object passed to every calculator component */
export interface CalculatorConfig {
	/** Where this calculator is being rendered */
	context: CalculatorContext;

	/** How to get calculation data */
	apiAccess: ApiAccessLevel;

	/** Custom branding (null = use DigitalDSA default branding) */
	branding: BrandingConfig | null;

	/** CTA button configuration */
	cta: CtaConfig;

	/** Which tools are enabled */
	gates: ToolGateConfig;

	/** API key for embed context (used for scoped API calls) */
	apiKey?: string;

	/** DSA ID for lead attribution */
	dsaId?: string;

	/** Whether to show the tool navigator tabs (switch between calculators) */
	showToolNav: boolean;

	/** Whether to show the comparison feature (select banks to compare) */
	showComparison: boolean;

	/** Maximum number of applicants allowed (1-4) */
	maxApplicants: number;
}

// ============================================================================
// PRESETS — Ready-made configs for the 3 contexts
// ============================================================================

/** All tools enabled */
const ALL_TOOLS_ON: ToolGateConfig = {
	emiCalculator: true,
	eligibilityCalculator: true,
	affordabilityCalculator: true,
	balanceTransferCalculator: true,
	stampDutyCalculator: true,
	partPaymentPlanner: true,
	flexibleEmiPlanner: true,
	combinedPlanner: true,
	budgetPlanner: true
};

/**
 * Config for the DSA Dashboard.
 * Full access to everything — rule engine, all tools, comparison, lead capture.
 */
export const DASHBOARD_CONFIG: CalculatorConfig = {
	context: 'dashboard',
	apiAccess: 'rule-engine',
	branding: null,
	cta: {
		enabled: true,
		label: 'Create Case from This Calculation',
		targetUrl: '/form/how-can-we-help',
		captureLeadFirst: false
	},
	gates: ALL_TOOLS_ON,
	showToolNav: true,
	showComparison: true,
	maxApplicants: 4
};

/**
 * Config for public-facing pages on DigitalDSA's own website.
 * Client-side math only, no API calls, basic lead capture.
 */
export const PUBLIC_CONFIG: CalculatorConfig = {
	context: 'public',
	apiAccess: 'client-side',
	branding: null,
	cta: {
		enabled: true,
		label: 'Get Personalized Results — Sign Up as DSA',
		targetUrl: '/partner-signup',
		captureLeadFirst: false
	},
	gates: ALL_TOOLS_ON,
	showToolNav: true,
	showComparison: false,
	maxApplicants: 2
};

/**
 * Config for white-label embeds on DSA websites.
 * Scoped API access, custom branding, lead capture with webhook.
 *
 * This is a TEMPLATE — actual embed configs are built dynamically
 * from the DSA's widget settings stored in MongoDB.
 */
export const EMBED_CONFIG_TEMPLATE: CalculatorConfig = {
	context: 'embed',
	apiAccess: 'scoped-api',
	branding: {
		showWatermark: true // Free tier shows watermark, Pro removes it
	},
	cta: {
		enabled: true,
		label: 'Apply Now',
		captureLeadFirst: true
	},
	gates: {
		emiCalculator: true,
		eligibilityCalculator: false, // Locked behind Pro
		affordabilityCalculator: false,
		balanceTransferCalculator: false,
		stampDutyCalculator: false,
		partPaymentPlanner: false,
		flexibleEmiPlanner: false,
		combinedPlanner: false,
		budgetPlanner: false
	},
	showToolNav: false, // Single calculator per embed
	showComparison: false,
	maxApplicants: 1 // Simplified for embed
};

/**
 * Build an embed config from DSA's stored widget settings.
 * Called by the embed layout's load function after validating the API key.
 */
export function buildEmbedConfig(widgetSettings: {
	dsaId: string;
	apiKey: string;
	theme?: { primaryColor?: string; logoUrl?: string; companyName?: string };
	enabledTools?: string[];
	leadConfig?: { redirectUrl?: string; webhookUrl?: string };
	plan: 'free' | 'pro' | 'enterprise';
	hideWatermark?: boolean;
}): CalculatorConfig {
	const isPro = widgetSettings.plan === 'pro' || widgetSettings.plan === 'enterprise';

	return {
		context: 'embed',
		apiAccess: isPro ? 'scoped-api' : 'client-side',
		branding: {
			logoUrl: widgetSettings.theme?.logoUrl,
			companyName: widgetSettings.theme?.companyName,
			primaryColor: widgetSettings.theme?.primaryColor,
			showWatermark: !widgetSettings.hideWatermark
		},
		cta: {
			enabled: true,
			label: 'Apply Now',
			targetUrl: widgetSettings.leadConfig?.redirectUrl,
			captureLeadFirst: true,
			webhookUrl: widgetSettings.leadConfig?.webhookUrl
		},
		gates: {
			emiCalculator: true, // Always available
			eligibilityCalculator:
				isPro && (widgetSettings.enabledTools?.includes('eligibility') ?? false),
			affordabilityCalculator:
				isPro && (widgetSettings.enabledTools?.includes('affordability') ?? false),
			balanceTransferCalculator:
				isPro && (widgetSettings.enabledTools?.includes('balance-transfer') ?? false),
			stampDutyCalculator: isPro && (widgetSettings.enabledTools?.includes('stamp-duty') ?? false),
			partPaymentPlanner: isPro && (widgetSettings.enabledTools?.includes('part-payment') ?? false),
			flexibleEmiPlanner: isPro && (widgetSettings.enabledTools?.includes('flexible-emi') ?? false),
			combinedPlanner: isPro && (widgetSettings.enabledTools?.includes('combined') ?? false),
			budgetPlanner: isPro && (widgetSettings.enabledTools?.includes('budget') ?? false)
		},
		apiKey: widgetSettings.apiKey,
		dsaId: widgetSettings.dsaId,
		showToolNav: isPro, // Pro embeds get tool switching
		showComparison: isPro,
		maxApplicants: isPro ? 2 : 1
	};
}
