/**
 * DATA-4 — Employer-name → industry-category lookup.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 + open-question Q5.
 *
 * The raw employer / company name is PII-adjacent (it narrows identity) and is
 * explicitly forbidden in the analytics store (§5 "Fields that NEVER appear").
 * What IS useful for analytics is the broad INDUSTRY the borrower works in.
 * This helper maps a free-text employer name to one of a fixed set of
 * industry categories via keyword matching.
 *
 * v1 is a static keyword map (Q5 recommendation). When/if it needs to be
 * editable without a deploy, promote it to an admin-managed Mongo collection —
 * the call sites won't change, only the source of the table.
 *
 * Matching is deliberately conservative: a known keyword → its category; any
 * non-empty name with no keyword hit → 'other' (we know they're employed,
 * just not where); empty/missing → null.
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Keyword → industry category. Order matters: the FIRST matching keyword wins,
 * so list more-specific keywords before generic ones. Keywords are matched
 * case-insensitively as substrings of the normalized employer name.
 */
const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: string }> = [
	{ keywords: ['infosys', 'tcs', 'tata consultancy', 'wipro', 'hcl', 'tech mahindra', 'cognizant', 'accenture', 'capgemini', 'software', 'technologies', 'technology', 'infotech', 'systems', 'it services', 'solutions'], category: 'IT_Services' },
	{ keywords: ['google', 'microsoft', 'amazon', 'meta', 'facebook', 'flipkart', 'paytm', 'zomato', 'swiggy', 'startup'], category: 'Internet_Product' },
	{ keywords: ['bank', 'hdfc', 'icici', 'axis', 'kotak', 'sbi', 'nbfc', 'finance', 'financial', 'capital', 'lending', 'mutual fund', 'securities', 'insurance', 'life insurance', 'general insurance'], category: 'Banking_Finance' },
	{ keywords: ['hospital', 'clinic', 'healthcare', 'pharma', 'pharmaceutical', 'medical', 'diagnostics', 'apollo', 'fortis'], category: 'Healthcare_Pharma' },
	{ keywords: ['school', 'college', 'university', 'institute', 'education', 'academy', 'vidyalaya', 'coaching'], category: 'Education' },
	{ keywords: ['construction', 'builders', 'infrastructure', 'realty', 'real estate', 'developers', 'estates', 'housing'], category: 'Construction_RealEstate' },
	{ keywords: ['manufacturing', 'industries', 'factory', 'steel', 'cement', 'textiles', 'mills', 'automobile', 'motors', 'auto', 'engineering'], category: 'Manufacturing' },
	{ keywords: ['retail', 'stores', 'mart', 'supermarket', 'trading', 'traders', 'enterprises', 'distributors', 'wholesale'], category: 'Retail_Trading' },
	{ keywords: ['logistics', 'transport', 'courier', 'cargo', 'freight', 'shipping', 'roadways'], category: 'Logistics_Transport' },
	{ keywords: ['hotel', 'restaurant', 'hospitality', 'resorts', 'cafe', 'foods', 'catering'], category: 'Hospitality_Food' },
	{ keywords: ['telecom', 'airtel', 'jio', 'vodafone', 'communications', 'networks'], category: 'Telecom' },
	{ keywords: ['power', 'energy', 'electricity', 'solar', 'oil', 'gas', 'petroleum', 'refinery'], category: 'Energy_Utilities' },
	{ keywords: ['agro', 'agriculture', 'farms', 'dairy', 'seeds', 'fertilizer', 'crop'], category: 'Agriculture' },
	{ keywords: ['media', 'entertainment', 'films', 'production', 'broadcasting', 'publishing', 'advertising', 'marketing'], category: 'Media_Entertainment' },
	{ keywords: ['consulting', 'consultancy', 'consultants', 'advisory', 'associates'], category: 'Professional_Services' },
	{ keywords: ['law', 'legal', 'advocate', 'chartered accountant', ' ca ', 'audit', 'taxation'], category: 'Legal_Accounting' },
	{ keywords: ['government', 'govt', 'municipal', 'ministry', 'department of', 'public sector', 'psu', 'railway', 'defence', 'police', 'panchayat'], category: 'Government_PSU' }
];

/**
 * Map a free-text employer name to an industry category.
 *
 * @example
 *   industryLookup('Infosys Limited')        → 'IT_Services'
 *   industryLookup('HDFC Bank')              → 'Banking_Finance'
 *   industryLookup('Sharma Kirana Store')    → 'Retail_Trading'
 *   industryLookup('Self employed plumber')  → 'other'
 *   industryLookup('')                       → null
 */
export function industryLookup(employerName: string | null | undefined): string | null {
	if (employerName === null || employerName === undefined) return null;
	const normalized = String(employerName).trim().toLowerCase();
	if (normalized.length === 0) return null;

	for (const entry of KEYWORD_CATEGORIES) {
		if (entry.keywords.some((kw) => normalized.includes(kw))) {
			return entry.category;
		}
	}
	// Employed, but we couldn't classify the industry — still a useful signal
	// ("has an employer") distinct from null ("no employer data").
	return 'other';
}
