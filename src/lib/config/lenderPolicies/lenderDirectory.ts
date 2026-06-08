/**
 * Lender Directory — Complete PAN India Lender Registry
 * ══════════════════════════════════════════════════════════════════
 * Geographic coverage, product mapping, and operational metadata
 * for all active lenders in the DigitalDSA platform.
 * Lender count changes as lenders are added or removed — always
 * derive it programmatically (LENDER_DIRECTORY.length), never hardcode.
 *
 * This is the SINGLE SOURCE OF TRUTH for lender intelligence.
 * When RM provides updated data, update this file and change
 * source to 'rm_confirmed'.
 *
 * Coverage research methodology:
 *   1. RBI branch statistics (quarterly reports)
 *   2. Lender annual reports (branch network section)
 *   3. Aggregator data (BankBazaar, PaisaBazaar branch locators)
 *   4. Cross-verified with at least 2 sources per lender
 *   5. Assumed data marked with source: 'assumed'
 *
 * Last updated: 2026-03-26
 * ══════════════════════════════════════════════════════════════════
 */

import type { LenderMasterEntry, IndianState, LoanProduct } from './types';
import { ALL_INDIA_STATES } from './types';
import { scoreLendersByGeo, type ScoredLender } from './geoFilter';

// ============================================================================
// HELPER: All states minus exclusions (for PAN India lenders)
// ============================================================================

function allStatesExcept(...excluded: IndianState[]): IndianState[] {
	const excludeSet = new Set(excluded);
	return ALL_INDIA_STATES.filter((s) => !excludeSet.has(s)) as IndianState[];
}

// ============================================================================
// GOVERNMENT SECTOR BANKS (PSBs) — 12 banks
// ============================================================================

const GOV_BANKS: LenderMasterEntry[] = [
	{
		lenderId: 'sbi',
		lenderName: 'State Bank of India',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Maharashtra',
				'Delhi',
				'Uttar Pradesh',
				'West Bengal',
				'Madhya Pradesh',
				'Rajasthan',
				'Tamil Nadu',
				'Karnataka'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 22400,
			source: 'website',
			notes: 'Largest bank in India. Ubiquitous presence in every state including remote areas.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.sbi.co.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'sbi.co.in'
	},
	{
		lenderId: 'pnb',
		lenderName: 'Punjab National Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Delhi',
				'Punjab',
				'Haryana',
				'Uttar Pradesh',
				'Rajasthan',
				'Bihar',
				'Uttarakhand'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 10100,
			source: 'website',
			notes: 'Strong in North India. Merged with Oriental Bank of Commerce and United Bank.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.pnbindia.in',
		headquarters: 'New Delhi',
		officialEmailDomain: 'pnb.co.in'
	},
	{
		lenderId: 'bob',
		lenderName: 'Bank of Baroda',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Maharashtra', 'Madhya Pradesh'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 8200,
			source: 'website',
			notes: 'Dominant in Gujarat. Merged with Dena Bank and Vijaya Bank.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.bankofbaroda.in',
		headquarters: 'Vadodara',
		officialEmailDomain: 'bankofbaroda.co.in'
	},
	{
		lenderId: 'canara',
		lenderName: 'Canara Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 9500,
			source: 'website',
			notes: 'Dominant in South India, especially Karnataka. Merged with Syndicate Bank.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.canarabank.com',
		headquarters: 'Bengaluru',
		officialEmailDomain: 'canarabank.com'
	},
	{
		lenderId: 'union',
		lenderName: 'Union Bank of India',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'Madhya Pradesh'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 8700,
			source: 'website',
			notes: 'Merged with Andhra Bank and Corporation Bank. Strong in West/Central India.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.unionbankofindia.co.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'unionbank.co.in'
	},
	{
		lenderId: 'indian-bank',
		lenderName: 'Indian Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Karnataka'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 5800,
			source: 'website',
			notes: 'Dominant in Tamil Nadu. Merged with Allahabad Bank.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.indianbank.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'indianbank.in'
	},
	{
		lenderId: 'boi',
		lenderName: 'Bank of India',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Madhya Pradesh', 'Uttar Pradesh'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 5100,
			source: 'website',
			notes: 'Strong in Maharashtra and Central India.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.bankofindia.co.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'bankofindia.co.in'
	},
	{
		lenderId: 'bom',
		lenderName: 'Bank of Maharashtra',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Goa'],
			activeStates: [
				'Maharashtra',
				'Goa',
				'Karnataka',
				'Gujarat',
				'Madhya Pradesh',
				'Delhi',
				'Telangana',
				'Andhra Pradesh',
				'Tamil Nadu',
				'Rajasthan',
				'Uttar Pradesh',
				'West Bengal',
				'Chhattisgarh',
				'Kerala',
				'Punjab',
				'Haryana',
				'Chandigarh',
				'Uttarakhand',
				'Jharkhand',
				'Bihar',
				'Odisha'
			],
			strongholdCities: ['Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 2100,
			source: 'aggregator',
			notes:
				'Dominant in Maharashtra tier-2/3 cities. Very strong in Pune, Nagpur, Nashik belt. Limited presence outside Maharashtra.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.bankofmaharashtra.in',
		headquarters: 'Pune',
		officialEmailDomain: 'mahabank.co.in'
	},
	{
		lenderId: 'central-bank',
		lenderName: 'Central Bank of India',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Bihar'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 4500,
			source: 'website',
			notes: 'Strong in Central India (MP, CG, MH). Wide rural reach.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.centralbankofindia.co.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'centralbank.co.in'
	},
	{
		lenderId: 'iob',
		lenderName: 'Indian Overseas Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Puducherry'],
			activeStates: [
				'Tamil Nadu',
				'Kerala',
				'Andhra Pradesh',
				'Telangana',
				'Karnataka',
				'Maharashtra',
				'Delhi',
				'Uttar Pradesh',
				'West Bengal',
				'Gujarat',
				'Madhya Pradesh',
				'Rajasthan',
				'Punjab',
				'Haryana',
				'Bihar',
				'Odisha',
				'Puducherry',
				'Chandigarh',
				'Goa'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 3300,
			source: 'aggregator',
			notes: 'Dominant in Tamil Nadu. Moderate presence in other South/North states.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.iob.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'iob.in'
	},
	{
		lenderId: 'uco',
		lenderName: 'UCO Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['West Bengal', 'Bihar', 'Jharkhand', 'Odisha', 'Assam'],
			activeStates: [
				'West Bengal',
				'Bihar',
				'Jharkhand',
				'Odisha',
				'Assam',
				'Delhi',
				'Uttar Pradesh',
				'Maharashtra',
				'Rajasthan',
				'Madhya Pradesh',
				'Gujarat',
				'Punjab',
				'Haryana',
				'Chhattisgarh',
				'Tamil Nadu',
				'Karnataka',
				'Tripura',
				'Meghalaya',
				'Chandigarh',
				'Uttarakhand'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 3200,
			source: 'aggregator',
			notes: 'Dominant in Eastern India (WB, Bihar, Jharkhand, Odisha). Limited in South/West.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.ucobank.com',
		headquarters: 'Kolkata',
		officialEmailDomain: 'ucobank.com'
	},
	{
		lenderId: 'punjab-sind',
		lenderName: 'Punjab & Sind Bank',
		classification: 'GOV',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Punjab', 'Haryana', 'Delhi', 'Chandigarh'],
			activeStates: [
				'Punjab',
				'Haryana',
				'Delhi',
				'Chandigarh',
				'Rajasthan',
				'Uttar Pradesh',
				'Himachal Pradesh',
				'Uttarakhand',
				'Jammu & Kashmir',
				'Maharashtra',
				'Gujarat'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 1550,
			source: 'aggregator',
			notes:
				'Smallest PSB. Concentrated in Punjab/Haryana/Delhi NCR. Expanding slowly to other states.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.psb.co.in',
		headquarters: 'New Delhi',
		officialEmailDomain: 'psbindia.com'
	}
];

// ============================================================================
// PRIVATE SECTOR BANKS — 24 banks
// ============================================================================

const PVT_BANKS: LenderMasterEntry[] = [
	{
		lenderId: 'hdfc-bank',
		lenderName: 'HDFC Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Maharashtra',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'Gujarat',
				'Uttar Pradesh',
				'Telangana',
				'Rajasthan'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 8700,
			source: 'website',
			notes: 'Largest private bank. After HDFC Ltd merger, massive home loan book.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.hdfcbank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'hdfcbank.com'
	},
	{
		lenderId: 'icici-bank',
		lenderName: 'ICICI Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Tamil Nadu',
				'Karnataka',
				'Rajasthan',
				'Telangana'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 6500,
			source: 'website',
			notes: 'Second largest private bank. Strong across all tiers.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.icicibank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'icicibank.com'
	},
	{
		lenderId: 'axis-bank',
		lenderName: 'Axis Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Uttar Pradesh',
				'Rajasthan',
				'Karnataka'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 5000,
			source: 'website',
			notes: 'Third largest private bank. Strong urban/semi-urban focus.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Plot and Construction Loan',
			'Personal Loan',
			'Business Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.axisbank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'axisbank.com'
	},
	{
		lenderId: 'kotak',
		lenderName: 'Kotak Mahindra Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Rajasthan', 'Tamil Nadu'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 1900,
			source: 'website',
			notes: 'Premium banking. Strong in metros and tier-1. Expanding tier-2.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.kotak.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'kotak.com'
	},
	{
		lenderId: 'yes-bank',
		lenderName: 'Yes Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Karnataka'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 1150,
			source: 'aggregator',
			notes: 'Post-restructuring. Metro/tier-1 focused. Limited rural.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.yesbank.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'yesbank.in'
	},
	{
		lenderId: 'indusind',
		lenderName: 'IndusInd Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Tamil Nadu', 'Rajasthan'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 2600,
			source: 'website',
			notes: 'Strong in vehicle/consumer finance. Doctor loans specialty.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.indusind.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'indusind.com'
	},
	{
		lenderId: 'idfc-first',
		lenderName: 'IDFC First Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Tamil Nadu', 'Karnataka', 'Gujarat'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 900,
			source: 'website',
			notes: 'Growing network. Strong digital banking. Professional loans for doctors/CAs.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.idfcfirstbank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'idfcfirstbank.com'
	},
	{
		lenderId: 'federal',
		lenderName: 'Federal Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Kerala', 'Karnataka', 'Tamil Nadu'],
			activeStates: [
				'Kerala',
				'Karnataka',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Goa',
				'Rajasthan',
				'West Bengal',
				'Madhya Pradesh',
				'Uttar Pradesh',
				'Punjab',
				'Haryana',
				'Chandigarh',
				'Puducherry',
				'Uttarakhand',
				'Jharkhand',
				'Bihar'
			],
			strongholdCities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 1350,
			source: 'website',
			notes: 'Dominant in Kerala. Strong NRI banking. Expanding into North India.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.federalbank.co.in',
		headquarters: 'Aluva, Kerala',
		officialEmailDomain: 'federalbank.co.in'
	},
	{
		lenderId: 'south-indian',
		lenderName: 'South Indian Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Kerala', 'Tamil Nadu', 'Karnataka'],
			activeStates: [
				'Kerala',
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Rajasthan',
				'Puducherry',
				'Goa'
			],
			strongholdCities: ['Thrissur', 'Kochi', 'Thiruvananthapuram'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 940,
			source: 'aggregator',
			notes: 'Kerala-centric. NRI remittance strength. Limited North India presence.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.southindianbank.com',
		headquarters: 'Thrissur, Kerala',
		officialEmailDomain: 'sib.co.in'
	},
	{
		lenderId: 'bandhan',
		lenderName: 'Bandhan Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['West Bengal', 'Assam', 'Bihar', 'Tripura'],
			activeStates: [
				'West Bengal',
				'Assam',
				'Bihar',
				'Tripura',
				'Jharkhand',
				'Odisha',
				'Maharashtra',
				'Delhi',
				'Uttar Pradesh',
				'Madhya Pradesh',
				'Rajasthan',
				'Gujarat',
				'Karnataka',
				'Tamil Nadu',
				'Meghalaya',
				'Manipur',
				'Nagaland',
				'Chhattisgarh',
				'Punjab',
				'Haryana',
				'Kerala',
				'Uttarakhand'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 5700,
			source: 'website',
			notes: 'Microfinance origins. Dominant in East/Northeast. Deep rural penetration.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.bandhanbank.com',
		headquarters: 'Kolkata',
		officialEmailDomain: 'bandhanbank.com'
	},
	{
		lenderId: 'rbl',
		lenderName: 'RBL Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Karnataka', 'Gujarat'],
			activeStates: [
				'Maharashtra',
				'Karnataka',
				'Gujarat',
				'Delhi',
				'Rajasthan',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Madhya Pradesh',
				'West Bengal',
				'Uttar Pradesh',
				'Punjab',
				'Haryana',
				'Kerala',
				'Goa',
				'Chandigarh'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 500,
			source: 'aggregator',
			notes: 'Urban-focused. Strong credit card/microfinance business.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.rblbank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'rblbank.com'
	},
	{
		lenderId: 'karnataka-bank',
		lenderName: 'Karnataka Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Karnataka'],
			activeStates: [
				'Karnataka',
				'Maharashtra',
				'Goa',
				'Kerala',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Delhi',
				'Gujarat'
			],
			strongholdCities: ['Mangaluru', 'Bengaluru', 'Hubli', 'Dharwad', 'Mysuru'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 890,
			source: 'aggregator',
			notes: 'Coastal Karnataka stronghold. Deep in Mangaluru/Udupi belt.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.karnatakabank.com',
		headquarters: 'Mangaluru',
		officialEmailDomain: 'karnatakabank.com'
	},
	{
		lenderId: 'kvb',
		lenderName: 'Karur Vysya Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Karnataka'],
			activeStates: [
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Karnataka',
				'Kerala',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Rajasthan',
				'Madhya Pradesh',
				'Puducherry'
			],
			strongholdCities: ['Karur', 'Madurai', 'Coimbatore', 'Chennai', 'Hyderabad'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 800,
			source: 'aggregator',
			notes: 'South India focused. Very strong in Tamil Nadu interior.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.kvb.co.in',
		headquarters: 'Karur, Tamil Nadu',
		officialEmailDomain: 'kvb.co.in'
	},
	{
		lenderId: 'city-union',
		lenderName: 'City Union Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu'],
			activeStates: [
				'Tamil Nadu',
				'Karnataka',
				'Kerala',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Puducherry'
			],
			strongholdCities: ['Kumbakonam', 'Thanjavur', 'Madurai', 'Coimbatore', 'Chennai'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 730,
			source: 'aggregator',
			notes: 'Tamil Nadu interior stronghold. MSME banking strength.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.cityunionbank.com',
		headquarters: 'Kumbakonam, Tamil Nadu',
		officialEmailDomain: 'cityunionbank.com'
	},
	{
		lenderId: 'tmb',
		lenderName: 'Tamilnad Mercantile Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu'],
			activeStates: [
				'Tamil Nadu',
				'Karnataka',
				'Kerala',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Puducherry'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 550,
			source: 'aggregator',
			notes: 'Tamil Nadu focused. Strong MSME lending in Thoothukudi/Tirunelveli belt.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.tmb.in',
		headquarters: 'Thoothukudi, Tamil Nadu',
		officialEmailDomain: 'tmb.in'
	},
	{
		lenderId: 'csb',
		lenderName: 'CSB Bank (Catholic Syrian Bank)',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Kerala'],
			activeStates: [
				'Kerala',
				'Tamil Nadu',
				'Karnataka',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Andhra Pradesh',
				'Telangana'
			],
			strongholdCities: ['Thrissur', 'Kochi', 'Kozhikode'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 450,
			source: 'aggregator',
			notes: 'Kerala-centric. Fairfax India backed. Gold loan specialty.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.csb.co.in',
		headquarters: 'Thrissur, Kerala',
		officialEmailDomain: 'csb.co.in'
	},
	{
		lenderId: 'dcb',
		lenderName: 'DCB Bank (Development Credit Bank)',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Maharashtra', 'Gujarat'],
			activeStates: [
				'Maharashtra',
				'Gujarat',
				'Delhi',
				'Rajasthan',
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Kerala',
				'Madhya Pradesh',
				'Goa',
				'Haryana'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 400,
			source: 'aggregator',
			notes: 'Urban focused. Affordable housing and MSME lending niche.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.dcbbank.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'dcbbank.com'
	},
	{
		lenderId: 'dhanlaxmi',
		lenderName: 'Dhanlaxmi Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Kerala'],
			activeStates: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Puducherry'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 250,
			source: 'aggregator',
			notes: 'Primarily Kerala. Very limited outside South India.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.dfrgroup.co.in',
		headquarters: 'Thrissur, Kerala',
		officialEmailDomain: 'dhanbank.com'
	},
	{
		lenderId: 'jk-bank',
		lenderName: 'Jammu & Kashmir Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Jammu & Kashmir', 'Ladakh'],
			activeStates: ['Jammu & Kashmir', 'Ladakh', 'Delhi', 'Punjab', 'Haryana', 'Chandigarh'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 950,
			source: 'website',
			notes: 'Dominant in J&K/Ladakh. Functions as de-facto state bank of J&K.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Plot and Construction Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.jkbank.com',
		headquarters: 'Srinagar',
		officialEmailDomain: 'jkbank.com'
	},
	{
		lenderId: 'nainital',
		lenderName: 'Nainital Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Uttarakhand'],
			activeStates: ['Uttarakhand', 'Delhi', 'Uttar Pradesh', 'Haryana'],
			strongholdCities: ['Nainital', 'Haldwani', 'Dehradun', 'Haridwar', 'Rudrapur'],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 170,
			source: 'aggregator',
			notes:
				'Uttarakhand focused. BOB subsidiary. Very strong in Kumaon/Garhwal regions. Not present in South/East India.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.nainitalbank.co.in',
		headquarters: 'Nainital, Uttarakhand',
		officialEmailDomain: 'nainitalbank.co.in'
	},
	{
		lenderId: 'idbi',
		lenderName: 'IDBI Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Karnataka', 'Tamil Nadu'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 1900,
			source: 'website',
			notes: 'LIC-owned. Broad urban presence. Limited rural.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Plot and Construction Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.idbibank.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'idbi.co.in'
	},
	{
		lenderId: 'hsbc',
		lenderName: 'HSBC',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'metro_only',
			strongholdStates: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu'],
			activeStates: [
				'Maharashtra',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'Telangana',
				'West Bengal',
				'Gujarat',
				'Kerala',
				'Chandigarh',
				'Punjab'
			],
			activeCities: [
				'Mumbai',
				'Delhi',
				'Bangalore',
				'Chennai',
				'Hyderabad',
				'Kolkata',
				'Pune',
				'Ahmedabad',
				'Kochi',
				'Chandigarh',
				'Noida',
				'Gurgaon'
			],
			cityTierPresence: ['metro'],
			branchCount: 26,
			source: 'website',
			notes: 'Foreign bank. Metro-only. NRI/HNI focus. Very selective DSA partnerships.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.hsbc.co.in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'hsbc.co.in'
	},
	{
		lenderId: 'standard-chartered',
		lenderName: 'Standard Chartered Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'metro_only',
			strongholdStates: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu'],
			activeStates: [
				'Maharashtra',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'West Bengal',
				'Gujarat',
				'Telangana',
				'Kerala'
			],
			activeCities: [
				'Mumbai',
				'Delhi',
				'Bangalore',
				'Chennai',
				'Kolkata',
				'Hyderabad',
				'Pune',
				'Ahmedabad',
				'Kochi'
			],
			cityTierPresence: ['metro'],
			branchCount: 100,
			source: 'website',
			notes: 'Foreign bank. Metro/HNI focus. NRI home loans.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.sc.com/in',
		headquarters: 'Mumbai',
		officialEmailDomain: 'sc.com'
	},
	{
		lenderId: 'shinhan',
		lenderName: 'Shinhan Bank',
		classification: 'PVT',
		geoCoverage: {
			coverage: 'metro_only',
			strongholdStates: ['Delhi', 'Maharashtra'],
			activeStates: ['Delhi', 'Maharashtra', 'Tamil Nadu', 'Karnataka'],
			activeCities: ['Delhi', 'Mumbai', 'Chennai', 'Bangalore'],
			cityTierPresence: ['metro'],
			branchCount: 4,
			source: 'assumed',
			notes: 'Korean foreign bank. Extremely limited presence. Corporate/Korean expat focus.'
		},
		loanProducts: ['Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.shinhan.com',
		headquarters: 'New Delhi',
		officialEmailDomain: 'shinhan.com'
	}
];

// ============================================================================
// HOUSING FINANCE COMPANIES (HFCs) — 16 entries
// ============================================================================

const HFC_LENDERS: LenderMasterEntry[] = [
	{
		lenderId: 'lic-housing',
		lenderName: 'LIC Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'Delhi'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 300,
			source: 'website',
			notes: 'Government-linked HFC. Wide presence through LIC agent network.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.lichousing.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'lichousing.com'
	},
	{
		lenderId: 'pnb-housing',
		lenderName: 'PNB Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Delhi', 'Haryana', 'Punjab', 'Rajasthan', 'Maharashtra'],
			activeStates: [
				'Delhi',
				'Haryana',
				'Punjab',
				'Rajasthan',
				'Maharashtra',
				'Gujarat',
				'Uttar Pradesh',
				'Madhya Pradesh',
				'Karnataka',
				'Tamil Nadu',
				'Telangana',
				'Andhra Pradesh',
				'West Bengal',
				'Chandigarh',
				'Uttarakhand',
				'Chhattisgarh',
				'Kerala',
				'Bihar'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 110,
			source: 'website',
			notes: 'Strong in North India. Affordable + premium segments.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.pnbhousing.com',
		headquarters: 'New Delhi',
		officialEmailDomain: 'pnbhousing.com'
	},
	{
		lenderId: 'icici-home',
		lenderName: 'ICICI Home Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Tamil Nadu'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands',
				'Tripura'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 250,
			source: 'aggregator',
			notes: 'Affordable housing focus. Deeper tier-2/3 reach than parent ICICI Bank.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.icicihfc.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'icicihfc.com'
	},
	{
		lenderId: 'aadhar-housing',
		lenderName: 'Aadhar Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Rajasthan', 'Gujarat', 'Maharashtra', 'Madhya Pradesh'],
			activeStates: [
				'Rajasthan',
				'Gujarat',
				'Maharashtra',
				'Madhya Pradesh',
				'Delhi',
				'Haryana',
				'Uttar Pradesh',
				'Karnataka',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Chhattisgarh',
				'Punjab',
				'Bihar',
				'West Bengal',
				'Odisha',
				'Jharkhand',
				'Uttarakhand'
			],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 500,
			source: 'website',
			notes: 'BCP TopCo (Blackstone) backed. Affordable housing specialist. Semi-urban/rural focus.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.aadharhousing.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'aadharhousing.com'
	},
	{
		lenderId: 'godrej-housing',
		lenderName: 'Godrej Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu'],
			activeStates: [
				'Maharashtra',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'Telangana',
				'Gujarat',
				'Rajasthan',
				'Haryana',
				'Uttar Pradesh',
				'West Bengal',
				'Kerala',
				'Andhra Pradesh',
				'Madhya Pradesh',
				'Chandigarh',
				'Punjab'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 70,
			source: 'aggregator',
			notes: 'Premium segment. Godrej group brand strength. Expanding rapidly.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.godrejhousingfinance.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'godrejhousingfinance.com'
	},
	{
		lenderId: 'iifl-home',
		lenderName: 'IIFL Home Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands',
				'Meghalaya',
				'Tripura'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 350,
			source: 'website',
			notes: 'Affordable housing focus. Deep semi-urban penetration.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.iiflhomeloans.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'iifl.com'
	},
	{
		lenderId: 'indiabulls-housing',
		lenderName: 'Indiabulls Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Delhi', 'Maharashtra', 'Gujarat', 'Haryana'],
			activeStates: [
				'Delhi',
				'Maharashtra',
				'Gujarat',
				'Haryana',
				'Rajasthan',
				'Punjab',
				'Uttar Pradesh',
				'Karnataka',
				'Tamil Nadu',
				'Telangana',
				'Andhra Pradesh',
				'Madhya Pradesh',
				'West Bengal',
				'Chandigarh',
				'Uttarakhand',
				'Goa'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 180,
			source: 'aggregator',
			notes: 'Now Sammaan Capital. LAP focus shifting to home loans.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.indiabullshomeloans.com',
		headquarters: 'Gurugram',
		officialEmailDomain: 'sammaancapital.com'
	},
	{
		lenderId: 'hero-housing',
		lenderName: 'Hero Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Haryana', 'Delhi', 'Punjab', 'Rajasthan'],
			activeStates: [
				'Haryana',
				'Delhi',
				'Punjab',
				'Rajasthan',
				'Uttar Pradesh',
				'Uttarakhand',
				'Madhya Pradesh',
				'Gujarat',
				'Maharashtra',
				'Chandigarh'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 80,
			source: 'aggregator',
			notes: 'Hero Group backed. North India affordable housing focus.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.herohousingfinance.com',
		headquarters: 'Gurugram',
		officialEmailDomain: 'herohousingfinance.com'
	},
	{
		lenderId: 'muthoot-home',
		lenderName: 'Muthoot Home Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Kerala', 'Tamil Nadu', 'Karnataka'],
			activeStates: [
				'Kerala',
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 120,
			source: 'aggregator',
			notes: 'Muthoot Group. South India focused. Affordable housing segment.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.muthoothomefin.com',
		headquarters: 'Kochi',
		officialEmailDomain: 'muthoothomefin.com'
	},
	{
		lenderId: 'gic-housing',
		lenderName: 'GIC Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Delhi'],
			activeStates: [
				'Maharashtra',
				'Gujarat',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'Rajasthan',
				'Andhra Pradesh',
				'Telangana',
				'Uttar Pradesh',
				'West Bengal',
				'Madhya Pradesh',
				'Kerala',
				'Haryana',
				'Punjab',
				'Goa',
				'Chandigarh'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 90,
			source: 'aggregator',
			notes: 'GIC Re subsidiary. Mid-market home loans.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.gichf.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'gichf.com'
	},
	{
		lenderId: 'piramal-capital',
		lenderName: 'Piramal Capital & Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh'],
			activeStates: [
				'Maharashtra',
				'Gujarat',
				'Rajasthan',
				'Madhya Pradesh',
				'Delhi',
				'Haryana',
				'Karnataka',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Uttar Pradesh',
				'Chhattisgarh',
				'Punjab',
				'West Bengal',
				'Chandigarh'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 400,
			source: 'aggregator',
			notes: 'Wholesale + retail lending. Acquired DHFL. Affordable housing focus.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.piramal.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'piramal.com'
	},
	{
		lenderId: 'tata-capital-housing',
		lenderName: 'Tata Capital Housing Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Tamil Nadu', 'Karnataka'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands',
				'Meghalaya',
				'Tripura'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 130,
			source: 'website',
			notes: 'Tata group brand. Mid-to-premium segment housing loans.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.tatacapital.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'tatacapital.com'
	},
	{
		lenderId: 'can-fin-homes',
		lenderName: 'Can Fin Homes',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Karnataka', 'Kerala', 'Tamil Nadu', 'Andhra Pradesh'],
			activeStates: [
				'Karnataka',
				'Kerala',
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Gujarat',
				'Delhi',
				'Rajasthan',
				'Goa',
				'Madhya Pradesh',
				'West Bengal',
				'Odisha',
				'Haryana',
				'Puducherry',
				'Chandigarh'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 210,
			source: 'website',
			notes: 'Canara Bank subsidiary. Strong South India presence. Growing nationally.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Plot and Construction Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.canfinhomes.com',
		headquarters: 'Bengaluru',
		officialEmailDomain: 'canfinhomes.com'
	},
	{
		lenderId: 'repco-home',
		lenderName: 'Repco Home Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala'],
			activeStates: [
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Kerala',
				'Karnataka',
				'Maharashtra',
				'Odisha',
				'Puducherry',
				'Gujarat',
				'West Bengal'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 180,
			source: 'website',
			notes: 'South India focused. Self-employed/informal income customer base.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.repcohome.com',
		headquarters: 'Chennai',
		officialEmailDomain: 'repcohome.com'
	},
	{
		lenderId: 'home-first',
		lenderName: 'Home First Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Gujarat', 'Maharashtra', 'Tamil Nadu', 'Karnataka'],
			activeStates: [
				'Gujarat',
				'Maharashtra',
				'Tamil Nadu',
				'Karnataka',
				'Rajasthan',
				'Madhya Pradesh',
				'Andhra Pradesh',
				'Telangana',
				'Uttar Pradesh',
				'Chhattisgarh',
				'Haryana',
				'Delhi',
				'Jharkhand',
				'West Bengal',
				'Odisha',
				'Bihar'
			],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 260,
			source: 'website',
			notes: 'Affordable housing specialist. Self-employed focus. Tier-2/3 deep.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.homefirstindia.com',
		headquarters: 'Ahmedabad',
		officialEmailDomain: 'homefirstindia.com'
	},
	{
		lenderId: 'sundaram-home',
		lenderName: 'Sundaram Home Finance',
		classification: 'HFC',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Karnataka'],
			activeStates: [
				'Tamil Nadu',
				'Andhra Pradesh',
				'Telangana',
				'Karnataka',
				'Kerala',
				'Maharashtra',
				'Delhi',
				'Puducherry'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 80,
			source: 'aggregator',
			notes: 'Sundaram Finance group. Conservative underwriting. South India focused.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.sundaramhome.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'sundaramhome.in'
	}
];

// ============================================================================
// NBFCs — 15 entries
// ============================================================================

const NBFC_LENDERS: LenderMasterEntry[] = [
	{
		lenderId: 'bajaj-finserv',
		lenderName: 'Bajaj Finserv',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Tamil Nadu', 'Karnataka', 'Gujarat', 'Rajasthan'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 3600,
			source: 'website',
			notes: 'Largest NBFC. 50M+ customers. Extensive DSA network. All products.'
		},
		loanProducts: [
			'Home Loan',
			'Loan Against Property',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		],
		dsaChannelAvailable: true,
		website: 'https://www.bajajfinserv.in',
		headquarters: 'Pune',
		officialEmailDomain: 'bajajfinserv.in'
	},
	{
		lenderId: 'aditya-birla',
		lenderName: 'Aditya Birla Capital',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Rajasthan', 'Tamil Nadu'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 400,
			source: 'website',
			notes: 'Birla group. Personal + LAP + Business loans. Growing housing book.'
		},
		loanProducts: ['Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.adityabirlacapital.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'adityabirlacapital.com'
	},
	{
		lenderId: 'hdb-financial',
		lenderName: 'HDB Financial Services',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Tamil Nadu', 'Gujarat', 'Karnataka', 'Delhi'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 1700,
			source: 'website',
			notes:
				'HDFC Bank subsidiary. Serves segments bank cannot (informal income). Wide rural reach.'
		},
		loanProducts: ['Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.hdbfs.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'hdbfs.com'
	},
	{
		lenderId: 'lt-finance',
		lenderName: 'L&T Finance Limited',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands',
				'Meghalaya',
				'Tripura'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 250,
			source: 'website',
			notes: 'L&T group. Infra + home + MSME lending.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.ltfs.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'ltfs.com'
	},
	{
		lenderId: 'poonawala',
		lenderName: 'Poonawala Fincorp',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Tamil Nadu'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands',
				'Meghalaya',
				'Tripura'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 130,
			source: 'website',
			notes: 'Poonawalla group (Serum Institute). Fast-growing. Personal + business loans.'
		},
		loanProducts: ['Personal Loan', 'Business Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.poonawallafincorp.com',
		headquarters: 'Pune',
		officialEmailDomain: 'poonawallafincorp.com'
	},
	{
		lenderId: 'tata-capital',
		lenderName: 'Tata Capital',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Maharashtra', 'Delhi', 'Gujarat', 'Tamil Nadu', 'Karnataka'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 200,
			source: 'website',
			notes: 'Tata group. Consumer + business loans. Tata Capital Housing for HFC arm.'
		},
		loanProducts: ['Personal Loan', 'Business Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.tatacapital.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'tatacapital.com'
	},
	{
		lenderId: 'chola',
		lenderName: 'Cholamandalam Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Karnataka', 'Maharashtra'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 1300,
			source: 'website',
			notes: 'Murugappa group. Vehicle + home + LAP. Deep South India penetration.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.cholamandalam.com',
		headquarters: 'Chennai',
		officialEmailDomain: 'cholamandalam.com'
	},
	{
		lenderId: 'shriram-finance',
		lenderName: 'Shriram Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Tamil Nadu', 'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Rajasthan'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 3000,
			source: 'website',
			notes: 'Largest vehicle financer. Merged Shriram Transport + City Union. Deep rural.'
		},
		loanProducts: ['Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.shriramfinance.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'shriramfinance.in'
	},
	{
		lenderId: 'mahindra-finance',
		lenderName: 'Mahindra Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: [
				'Maharashtra',
				'Rajasthan',
				'Tamil Nadu',
				'Uttar Pradesh',
				'Madhya Pradesh'
			],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 1400,
			source: 'website',
			notes: 'Mahindra group. Vehicle + SME + housing. Deep rural network (90% semi-urban/rural).'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.mahindrafinance.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'mahindrafinance.com'
	},
	{
		lenderId: 'smfg-india',
		lenderName: 'SMFG India Credit',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Tamil Nadu', 'Gujarat'],
			activeStates: [
				'Maharashtra',
				'Delhi',
				'Tamil Nadu',
				'Gujarat',
				'Karnataka',
				'Telangana',
				'Rajasthan',
				'Uttar Pradesh',
				'West Bengal',
				'Madhya Pradesh',
				'Haryana',
				'Punjab',
				'Kerala',
				'Andhra Pradesh',
				'Chandigarh',
				'Goa'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 130,
			source: 'aggregator',
			notes: 'Japanese SMFG group (ex-Fullerton India). Salaried personal loans + LAP.'
		},
		loanProducts: ['Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.smfgindia.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'smfgindia.com'
	},
	{
		lenderId: 'manappuram',
		lenderName: 'Manappuram Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh'],
			activeStates: [
				'Kerala',
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Rajasthan',
				'West Bengal',
				'Odisha',
				'Bihar',
				'Uttar Pradesh',
				'Madhya Pradesh',
				'Punjab',
				'Haryana'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 4500,
			source: 'website',
			notes: 'Gold loan major. Also personal + vehicle loans. Massive South India branch network.'
		},
		loanProducts: ['Personal Loan', 'Business Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.manappuram.com',
		headquarters: 'Thrissur, Kerala',
		officialEmailDomain: 'manappuram.com'
	},
	{
		lenderId: 'iifl-finance',
		lenderName: 'IIFL Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Tamil Nadu'],
			activeStates: allStatesExcept(
				'Manipur',
				'Mizoram',
				'Nagaland',
				'Sikkim',
				'Arunachal Pradesh',
				'Ladakh',
				'Lakshadweep',
				'Andaman & Nicobar Islands'
			),
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 3800,
			source: 'website',
			notes: 'Gold + business + personal loans. Massive branch network.'
		},
		loanProducts: ['Personal Loan', 'Business Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.iifl.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'iifl.com'
	},
	{
		lenderId: 'godrej-capital',
		lenderName: 'Godrej Capital',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Maharashtra', 'Delhi', 'Karnataka'],
			activeStates: [
				'Maharashtra',
				'Delhi',
				'Karnataka',
				'Tamil Nadu',
				'Telangana',
				'Gujarat',
				'Rajasthan',
				'Uttar Pradesh',
				'Haryana',
				'Chandigarh',
				'West Bengal',
				'Punjab'
			],
			cityTierPresence: ['metro', 'tier1'],
			branchCount: 40,
			source: 'aggregator',
			notes:
				'Godrej group NBFC arm (separate from Godrej Housing HFC). Business + professional loans.'
		},
		loanProducts: ['Business Loan', 'Professional Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.godrejcapital.com',
		headquarters: 'Mumbai',
		officialEmailDomain: 'godrejcapital.com'
	},
	{
		lenderId: 'muthoot-finance',
		lenderName: 'Muthoot Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'pan_india',
			strongholdStates: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana'],
			activeStates: [...ALL_INDIA_STATES] as IndianState[],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 5900,
			source: 'website',
			notes: 'Largest gold loan NBFC. 5900+ branches. Also personal/business/home loans.'
		},
		loanProducts: ['Personal Loan', 'Business Loan', 'Home Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.muthootfinance.com',
		headquarters: 'Kochi',
		officialEmailDomain: 'muthootfinance.com'
	},
	{
		lenderId: 'sundaram-finance',
		lenderName: 'Sundaram Finance',
		classification: 'NBFC',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana'],
			activeStates: [
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Kerala',
				'Maharashtra',
				'Delhi',
				'Gujarat',
				'Rajasthan',
				'West Bengal',
				'Uttar Pradesh',
				'Madhya Pradesh',
				'Puducherry'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2'],
			branchCount: 600,
			source: 'website',
			notes: 'Conservative underwriting. Vehicle + business loans. South India dominant.'
		},
		loanProducts: ['Business Loan', 'Loan Against Property'],
		dsaChannelAvailable: true,
		website: 'https://www.sundaramfinance.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'sundaramfinance.in'
	}
];

// ============================================================================
// SMALL FINANCE BANKS (SFBs) — 10 entries
// ============================================================================

const SFB_LENDERS: LenderMasterEntry[] = [
	{
		lenderId: 'au-sfb',
		lenderName: 'AU Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Rajasthan', 'Gujarat', 'Maharashtra', 'Madhya Pradesh'],
			activeStates: [
				'Rajasthan',
				'Gujarat',
				'Maharashtra',
				'Madhya Pradesh',
				'Delhi',
				'Haryana',
				'Punjab',
				'Uttar Pradesh',
				'Chhattisgarh',
				'Karnataka',
				'Tamil Nadu',
				'Chandigarh',
				'Uttarakhand',
				'Goa',
				'Himachal Pradesh'
			],
			strongholdCities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Ahmedabad', 'Surat'],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 1050,
			source: 'website',
			notes:
				'Largest SFB. Rajasthan roots. Vehicle + MSME + housing. Expanding to South India. Fincare merger in progress.'
		},
		loanProducts: ['Home Loan', 'Loan Against Property', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.aubank.in',
		headquarters: 'Jaipur',
		officialEmailDomain: 'aubank.in'
	},
	{
		lenderId: 'jana-sfb',
		lenderName: 'Jana Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Karnataka', 'Tamil Nadu', 'Maharashtra'],
			activeStates: [
				'Karnataka',
				'Tamil Nadu',
				'Maharashtra',
				'Kerala',
				'Andhra Pradesh',
				'Delhi',
				'Bihar',
				'Madhya Pradesh',
				'Gujarat',
				'Rajasthan',
				'West Bengal',
				'Jharkhand',
				'Odisha',
				'Uttar Pradesh',
				'Haryana',
				'Chhattisgarh',
				'Telangana',
				'Assam',
				'Punjab'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 770,
			source: 'website',
			notes: 'Microfinance origins. Affordable housing loans. Deep semi-urban/rural.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.janabank.com',
		headquarters: 'Bengaluru',
		officialEmailDomain: 'janabank.com'
	},
	{
		lenderId: 'equitas-sfb',
		lenderName: 'Equitas Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh'],
			activeStates: [
				'Tamil Nadu',
				'Karnataka',
				'Andhra Pradesh',
				'Telangana',
				'Kerala',
				'Maharashtra',
				'Gujarat',
				'Delhi',
				'Madhya Pradesh',
				'Rajasthan',
				'Puducherry'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 900,
			source: 'website',
			notes: 'Tamil Nadu dominant. Vehicle + microenterprise + housing. MSME focus.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.equitas.in',
		headquarters: 'Chennai',
		officialEmailDomain: 'equitasbank.com'
	},
	{
		lenderId: 'ujjivan-sfb',
		lenderName: 'Ujjivan Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'multi_state',
			strongholdStates: ['Karnataka', 'Tamil Nadu', 'West Bengal', 'Bihar'],
			activeStates: [
				'Karnataka',
				'Tamil Nadu',
				'West Bengal',
				'Bihar',
				'Maharashtra',
				'Delhi',
				'Kerala',
				'Rajasthan',
				'Madhya Pradesh',
				'Gujarat',
				'Jharkhand',
				'Odisha',
				'Assam',
				'Uttar Pradesh',
				'Haryana',
				'Chhattisgarh',
				'Andhra Pradesh',
				'Telangana',
				'Punjab',
				'Tripura'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 700,
			source: 'website',
			notes:
				'Microfinance transition. Affordable housing + micro-loans. Deep rural in South + East.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.ujjivansfb.in',
		headquarters: 'Bengaluru',
		officialEmailDomain: 'ujjivansfb.in'
	},
	{
		lenderId: 'esaf-sfb',
		lenderName: 'ESAF Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Kerala', 'Tamil Nadu'],
			activeStates: [
				'Kerala',
				'Tamil Nadu',
				'Karnataka',
				'Maharashtra',
				'Madhya Pradesh',
				'Chhattisgarh',
				'Delhi',
				'Rajasthan',
				'Gujarat',
				'Jharkhand',
				'West Bengal'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 700,
			source: 'website',
			notes: 'Kerala microfinance origins. Affordable housing. NRI deposits.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.esafbank.com',
		headquarters: 'Thrissur, Kerala',
		officialEmailDomain: 'esafbank.com'
	},
	{
		lenderId: 'suryoday-sfb',
		lenderName: 'Suryoday Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Maharashtra', 'Tamil Nadu', 'Odisha'],
			activeStates: [
				'Maharashtra',
				'Tamil Nadu',
				'Odisha',
				'Gujarat',
				'Karnataka',
				'Delhi',
				'Madhya Pradesh',
				'Rajasthan',
				'Jharkhand',
				'West Bengal',
				'Puducherry'
			],
			cityTierPresence: ['metro', 'tier1', 'tier2', 'tier3_rural'],
			branchCount: 570,
			source: 'website',
			notes: 'Microfinance + MSME + affordable housing. Maharashtra/TN concentrated.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.suryodaybank.com',
		headquarters: 'Navi Mumbai',
		officialEmailDomain: 'suryodaybank.com'
	},
	{
		lenderId: 'shivalik-sfb',
		lenderName: 'Shivalik Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Uttarakhand', 'Uttar Pradesh'],
			activeStates: ['Uttarakhand', 'Uttar Pradesh', 'Delhi', 'Haryana', 'Madhya Pradesh'],
			strongholdCities: ['Dehradun', 'Haridwar', 'Saharanpur', 'Muzaffarnagar'],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 35,
			source: 'aggregator',
			notes: 'First cooperative bank to convert to SFB. Uttarakhand/Western UP focus.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.shivalikbank.com',
		headquarters: 'Saharanpur, UP',
		officialEmailDomain: 'shivalikbank.com'
	},
	{
		lenderId: 'fincare-sfb',
		lenderName: 'Fincare Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'regional',
			strongholdStates: ['Gujarat', 'Rajasthan', 'Tamil Nadu', 'Karnataka'],
			activeStates: [
				'Gujarat',
				'Rajasthan',
				'Tamil Nadu',
				'Karnataka',
				'Maharashtra',
				'Madhya Pradesh',
				'Andhra Pradesh',
				'Telangana',
				'Uttar Pradesh'
			],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 1100,
			source: 'website',
			notes:
				'Merged with AU SFB (2024). Branches absorbed into AU network. Kept as separate entry for legacy cases.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: true,
		website: 'https://www.fincarebank.com',
		headquarters: 'Bengaluru',
		officialEmailDomain: 'fincarebank.com'
	},
	{
		lenderId: 'capital-sfb',
		lenderName: 'Capital Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Punjab'],
			activeStates: ['Punjab', 'Haryana', 'Delhi', 'Rajasthan', 'Chandigarh', 'Himachal Pradesh'],
			strongholdCities: ['Jalandhar', 'Ludhiana', 'Amritsar', 'Chandigarh'],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 170,
			source: 'website',
			notes: 'Punjab focused. Oldest SFB (converted from urban cooperative). NRI deposits.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.capitalsfb.com',
		headquarters: 'Jalandhar, Punjab',
		officialEmailDomain: 'capitalsfb.com'
	},
	{
		lenderId: 'northeast-sfb',
		lenderName: 'North East Small Finance Bank',
		classification: 'SFB',
		geoCoverage: {
			coverage: 'state_focused',
			strongholdStates: ['Assam', 'Meghalaya', 'Tripura'],
			activeStates: [
				'Assam',
				'Meghalaya',
				'Tripura',
				'Arunachal Pradesh',
				'Nagaland',
				'Manipur',
				'Mizoram'
			],
			cityTierPresence: ['tier1', 'tier2', 'tier3_rural'],
			branchCount: 100,
			source: 'aggregator',
			notes: 'Only SFB focused on Northeast India. Deep presence in Assam/Meghalaya.'
		},
		loanProducts: ['Home Loan', 'Personal Loan', 'Business Loan'],
		dsaChannelAvailable: false,
		website: 'https://www.nesfb.com',
		headquarters: 'Guwahati',
		officialEmailDomain: 'nesfb.com'
	}
];

// ============================================================================
// COMPLETE LENDER DIRECTORY — All active lenders (count derived from LENDER_DIRECTORY.length)
// ============================================================================

export const LENDER_DIRECTORY: LenderMasterEntry[] = [
	...GOV_BANKS,
	...PVT_BANKS,
	...HFC_LENDERS,
	...NBFC_LENDERS,
	...SFB_LENDERS
];

/** Quick lookup by lenderId */
export const LENDER_BY_ID: ReadonlyMap<string, LenderMasterEntry> = new Map(
	LENDER_DIRECTORY.map((l) => [l.lenderId, l])
);

/** Quick lookup by lenderName (display name from bankData) */
export const LENDER_BY_NAME: ReadonlyMap<string, LenderMasterEntry> = new Map(
	LENDER_DIRECTORY.map((l) => [l.lenderName, l])
);

/**
 * Get all lenders that offer a specific loan product.
 */
export function getLendersForProduct(product: LoanProduct | string): LenderMasterEntry[] {
	return LENDER_DIRECTORY.filter((l) => l.loanProducts.includes(product as LoanProduct));
}

/**
 * Get all lenders scored by geo presence for a specific state.
 * NEVER filters — returns all lenders ranked by relevance with presence chips.
 * Optionally filtered by loan product.
 */
export function getLendersInState(state: string, product?: string, city?: string): ScoredLender[] {
	const candidates = product ? getLendersForProduct(product) : LENDER_DIRECTORY;
	return scoreLendersByGeo(candidates, state, city);
}
