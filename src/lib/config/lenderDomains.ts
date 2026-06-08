/**
 * Comprehensive whitelist of bank/NBFC/HFC email domains for RM validation.
 * Used on BOTH client (real-time feedback) and server (security enforcement).
 *
 * Sources: RBI registry, RocketReach corporate domain data, official bank websites.
 * Last updated: 2025-02.
 */

/**
 * Dev-only test domain for manual RM onboarding testing.
 * Any email like rm@testbank.digitaldsa.com will pass validation in dev mode.
 * NOT included in production builds — import.meta.env.DEV is compile-time false in prod.
 */
const DEV_TEST_DOMAINS: readonly string[] = import.meta.env.DEV ? ['testbank.digitaldsa.com'] : [];

export const LENDER_DOMAINS: ReadonlySet<string> = new Set([
	// ── Private Sector Banks ──────────────────────────────
	'hdfcbank.com',
	'hdfc.com',
	'icicibank.com',
	'axisbank.com',
	'kotak.com',
	'yesbank.in',
	'indusind.com',
	'federalbank.co.in',
	'southindianbank.com',
	'sib.co.in',
	'kvbmail.com',
	'kvb.co.in',
	'cityunionbank.com',
	'rblbank.com',
	'bandhanbank.com',
	'idfcfirstbank.com',
	'idbi.co.in',
	'idbibank.com',
	'idbibank.in',

	// ── Public Sector Banks ──────────────────────────────
	'sbi.co.in',
	'pnb.co.in',
	'bankofbaroda.co.in',
	'bankofbaroda.com',
	'canarabank.com',
	'canarabank.in',
	'unionbankofindia.co.in',
	'indianbank.co.in',
	'bankofindia.co.in',
	'centralbankofindia.co.in',
	'centralbank.co.in',
	'iob.co.in',
	'ucobank.co.in',
	'mahabank.co.in',
	'psb.co.in',

	// ── Small Finance Banks ──────────────────────────────
	'aubank.in',
	'ujjivansfb.in',
	'equitas.in',
	'janabank.in',
	'esafbank.com',
	'suryodaybank.com',
	'shivalikbank.com',
	'fincarebank.com',
	'capitalsfb.com',
	'nesfb.com',

	// ── RBI .bank.in domains (post Oct 2025 migration) ──
	'hdfc.bank.in',
	'icici.bank.in',
	'axis.bank.in',
	'kotak.bank.in',
	'yes.bank.in',
	'indusind.bank.in',
	'federal.bank.in',
	'southindianbank.bank.in',
	'kvb.bank.in',
	'cityunionbank.bank.in',
	'rbl.bank.in',
	'bandhan.bank.in',
	'idfcfirst.bank.in',
	'idbi.bank.in',
	'sbi.bank.in',
	'pnb.bank.in',
	'bankofbaroda.bank.in',
	'canarabank.bank.in',
	'unionbankofindia.bank.in',
	'indianbank.bank.in',
	'bankofindia.bank.in',
	'centralbank.bank.in',
	'iob.bank.in',
	'ucobank.bank.in',
	'bankofmaharashtra.bank.in',
	'punjabandsindbank.bank.in',
	'aubank.bank.in',
	'ujjivansfb.bank.in',
	'equitas.bank.in',
	'janabank.bank.in',
	'esafbank.bank.in',
	'suryodaybank.bank.in',
	'shivalikbank.bank.in',
	'fincarebank.bank.in',
	'capitalsfb.bank.in',
	'nesfb.bank.in',

	// ── NBFCs (Non-Banking Financial Companies) ──────────
	'bajajfinserv.in',
	'tatacapital.com',
	'ltfs.com',
	'ltfinance.com',
	'mahindrafinance.com',
	'mahindra.com',
	'muthoot.com',
	'manappuram.com',
	'iifl.com',
	'indiainfoline.com',
	'piramal.com',
	'pchf.in',
	'shriramfinance.in',
	'stfc.in',
	'chola.murugappa.com',
	'cholamandalam.com',
	'sundaramfinance.in',
	'adityabirlacapital.com',
	'adityabirla.com',
	'herofincorp.com',
	'fullertonindia.com',
	'hdbfs.com',
	'poonawallafincorp.com',
	'smfgindia.com',
	'fullertonsekuritiesindia.com',
	'godrejcapital.com',

	// ── Housing Finance Companies (HFCs) ─────────────────
	'lichousing.com',
	'pnbhousing.com',
	'canfinhomes.com',
	'gichf.com',
	'sundaramhome.in',
	'homefirstindia.com',
	'aavas.in',
	'aptusindia.com',
	'sammaancapital.com',
	'indiabulls.com',
	'grihashakti.com',
	'muthoothomefin.com',
	'herohousingfinance.com',
	'repcohome.com',
	'icicicihfl.com',
	'godrejhousingfinance.com',

	// ── Dev-Only Test Domains (tree-shaken in production) ─
	...DEV_TEST_DOMAINS
]);

/**
 * RBI-mandated wildcard suffixes.
 * Any email ending in .bank.in or .fin.in is valid by default,
 * since only RBI-registered entities can obtain these domains.
 */
export const LENDER_WILDCARD_SUFFIXES: readonly string[] = ['.bank.in', '.fin.in'];

/**
 * Validates whether an email domain belongs to a known lender.
 * Checks both the explicit whitelist and wildcard RBI-mandated suffixes.
 */
export function isLenderDomain(email: string): boolean {
	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return false;

	if (LENDER_DOMAINS.has(domain)) return true;

	return LENDER_WILDCARD_SUFFIXES.some((suffix) => domain.endsWith(suffix));
}

/**
 * Complete domain → display name mapping for all LENDER_DOMAINS entries.
 * Hoisted to module scope (created once, not per-call).
 */
const DOMAIN_NAMES: Record<string, string> = {
	// ── Private Sector Banks ──────────────────────────────
	'hdfcbank.com': 'HDFC Bank',
	'hdfc.com': 'HDFC Bank',
	'icicibank.com': 'ICICI Bank',
	'axisbank.com': 'Axis Bank',
	'kotak.com': 'Kotak Mahindra Bank',
	'yesbank.in': 'Yes Bank',
	'indusind.com': 'IndusInd Bank',
	'federalbank.co.in': 'Federal Bank',
	'southindianbank.com': 'South Indian Bank',
	'sib.co.in': 'South Indian Bank',
	'kvbmail.com': 'Karur Vysya Bank',
	'kvb.co.in': 'Karur Vysya Bank',
	'cityunionbank.com': 'City Union Bank',
	'rblbank.com': 'RBL Bank',
	'bandhanbank.com': 'Bandhan Bank',
	'idfcfirstbank.com': 'IDFC First Bank',
	'idbi.co.in': 'IDBI Bank',
	'idbibank.com': 'IDBI Bank',
	'idbibank.in': 'IDBI Bank',

	// ── Public Sector Banks ──────────────────────────────
	'sbi.co.in': 'State Bank of India',
	'pnb.co.in': 'Punjab National Bank',
	'bankofbaroda.co.in': 'Bank of Baroda',
	'bankofbaroda.com': 'Bank of Baroda',
	'canarabank.com': 'Canara Bank',
	'canarabank.in': 'Canara Bank',
	'unionbankofindia.co.in': 'Union Bank of India',
	'indianbank.co.in': 'Indian Bank',
	'bankofindia.co.in': 'Bank of India',
	'centralbankofindia.co.in': 'Central Bank of India',
	'centralbank.co.in': 'Central Bank of India',
	'iob.co.in': 'Indian Overseas Bank',
	'ucobank.co.in': 'UCO Bank',
	'mahabank.co.in': 'Bank of Maharashtra',
	'psb.co.in': 'Punjab & Sind Bank',

	// ── Small Finance Banks ──────────────────────────────
	'aubank.in': 'AU Small Finance Bank',
	'ujjivansfb.in': 'Ujjivan Small Finance Bank',
	'equitas.in': 'Equitas Small Finance Bank',
	'janabank.in': 'Jana Small Finance Bank',

	// ── Small Finance Banks (new) ─────────────────────────
	'esafbank.com': 'ESAF Small Finance Bank',
	'suryodaybank.com': 'Suryoday Small Finance Bank',
	'shivalikbank.com': 'Shivalik Small Finance Bank',
	'fincarebank.com': 'Fincare Small Finance Bank',
	'capitalsfb.com': 'Capital Small Finance Bank',
	'nesfb.com': 'North East Small Finance Bank',

	// ── NBFCs (new) ─────────────────────────────────────
	'hdbfs.com': 'HDB Financial Services',
	'poonawallafincorp.com': 'Poonawala Fincorp',
	'smfgindia.com': 'SMFG India Credit',
	'godrejcapital.com': 'Godrej Capital',

	// ── RBI .bank.in domains ─────────────────────────────
	'hdfc.bank.in': 'HDFC Bank',
	'icici.bank.in': 'ICICI Bank',
	'axis.bank.in': 'Axis Bank',
	'kotak.bank.in': 'Kotak Mahindra Bank',
	'yes.bank.in': 'Yes Bank',
	'indusind.bank.in': 'IndusInd Bank',
	'federal.bank.in': 'Federal Bank',
	'southindianbank.bank.in': 'South Indian Bank',
	'kvb.bank.in': 'Karur Vysya Bank',
	'cityunionbank.bank.in': 'City Union Bank',
	'rbl.bank.in': 'RBL Bank',
	'bandhan.bank.in': 'Bandhan Bank',
	'idfcfirst.bank.in': 'IDFC First Bank',
	'idbi.bank.in': 'IDBI Bank',
	'sbi.bank.in': 'State Bank of India',
	'pnb.bank.in': 'Punjab National Bank',
	'bankofbaroda.bank.in': 'Bank of Baroda',
	'canarabank.bank.in': 'Canara Bank',
	'unionbankofindia.bank.in': 'Union Bank of India',
	'indianbank.bank.in': 'Indian Bank',
	'bankofindia.bank.in': 'Bank of India',
	'centralbank.bank.in': 'Central Bank of India',
	'iob.bank.in': 'Indian Overseas Bank',
	'ucobank.bank.in': 'UCO Bank',
	'bankofmaharashtra.bank.in': 'Bank of Maharashtra',
	'punjabandsindbank.bank.in': 'Punjab & Sind Bank',
	'aubank.bank.in': 'AU Small Finance Bank',
	'ujjivansfb.bank.in': 'Ujjivan Small Finance Bank',
	'equitas.bank.in': 'Equitas Small Finance Bank',
	'janabank.bank.in': 'Jana Small Finance Bank',
	'esafbank.bank.in': 'ESAF Small Finance Bank',
	'suryodaybank.bank.in': 'Suryoday Small Finance Bank',
	'shivalikbank.bank.in': 'Shivalik Small Finance Bank',
	'fincarebank.bank.in': 'Fincare Small Finance Bank',
	'capitalsfb.bank.in': 'Capital Small Finance Bank',
	'nesfb.bank.in': 'North East Small Finance Bank',

	// ── NBFCs ────────────────────────────────────────────
	'bajajfinserv.in': 'Bajaj Finserv',
	'tatacapital.com': 'Tata Capital',
	'ltfs.com': 'L&T Finance',
	'ltfinance.com': 'L&T Finance',
	'mahindrafinance.com': 'Mahindra Finance',
	'mahindra.com': 'Mahindra Finance',
	'muthoot.com': 'Muthoot Finance',
	'manappuram.com': 'Manappuram Finance',
	'iifl.com': 'IIFL Finance',
	'indiainfoline.com': 'IIFL Finance',
	'piramal.com': 'Piramal Capital',
	'pchf.in': 'Piramal Capital & Housing Finance',
	'shriramfinance.in': 'Shriram Finance',
	'stfc.in': 'Shriram Finance',
	'chola.murugappa.com': 'Cholamandalam Finance',
	'cholamandalam.com': 'Cholamandalam Finance',
	'sundaramfinance.in': 'Sundaram Finance',
	'adityabirlacapital.com': 'Aditya Birla Capital',
	'adityabirla.com': 'Aditya Birla Capital',
	'herofincorp.com': 'Hero FinCorp',
	'fullertonindia.com': 'Fullerton India',

	// ── Housing Finance Companies (HFCs) ─────────────────
	'lichousing.com': 'LIC Housing Finance',
	'pnbhousing.com': 'PNB Housing Finance',
	'canfinhomes.com': 'Can Fin Homes',
	'gichf.com': 'GIC Housing Finance',
	'sundaramhome.in': 'Sundaram Home Finance',
	'homefirstindia.com': 'Home First Finance',
	'aavas.in': 'Aavas Financiers',
	'aptusindia.com': 'Aptus Value Housing Finance',
	'sammaancapital.com': 'Sammaan Capital',
	'indiabulls.com': 'Indiabulls Housing Finance',
	'grihashakti.com': 'Grihashakti (Fullerton Grih)',
	'muthoothomefin.com': 'Muthoot Homefin',
	'herohousingfinance.com': 'Hero Housing Finance',
	'repcohome.com': 'Repco Home Finance',
	'icicicihfl.com': 'ICICI Home Finance',
	'godrejhousingfinance.com': 'Godrej Housing Finance',

	// ── Dev-Only Test Domain ──────────────────────────────
	...(import.meta.env.DEV ? { 'testbank.digitaldsa.com': 'Test Bank (Dev Only)' } : {})
};

/**
 * Extracts the bank/lender name from a whitelisted domain.
 * Falls back to deriving a readable name from .bank.in / .fin.in wildcard domains.
 * Returns undefined only for completely unknown domains.
 */
export function getLenderNameFromDomain(email: string): string | undefined {
	const domain = email.split('@')[1]?.toLowerCase();
	if (!domain) return undefined;

	// Exact match first
	if (DOMAIN_NAMES[domain]) return DOMAIN_NAMES[domain];

	// Fallback for RBI-mandated .bank.in / .fin.in wildcard domains
	for (const suffix of LENDER_WILDCARD_SUFFIXES) {
		if (domain.endsWith(suffix)) {
			const prefix = domain.slice(0, -suffix.length);
			// Capitalize first letter of each segment for a readable name
			return prefix
				.split('.')
				.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
				.join(' ');
		}
	}

	return undefined;
}
