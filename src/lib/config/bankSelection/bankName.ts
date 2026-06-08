import type { LenderClassification } from '$lib/types/policyEngine';

interface BankEntry {
	Classification: LenderClassification;
	label: string;
	value: string;
}

export const bankData: BankEntry[] = [
	// ════════════════════════════════════════════════════════════════
	// GOVERNMENT SECTOR BANKS (PSBs) — 12 banks
	// ════════════════════════════════════════════════════════════════
	{ Classification: 'GOV', label: 'State Bank of India', value: 'State Bank of India' },
	{ Classification: 'GOV', label: 'Punjab National Bank', value: 'Punjab National Bank' },
	{ Classification: 'GOV', label: 'Bank of Baroda', value: 'Bank of Baroda' },
	{ Classification: 'GOV', label: 'Canara Bank', value: 'Canara Bank' },
	{ Classification: 'GOV', label: 'Union Bank of India', value: 'Union Bank of India' },
	{ Classification: 'GOV', label: 'Indian Bank', value: 'Indian Bank' },
	{ Classification: 'GOV', label: 'Bank of India', value: 'Bank of India' },
	{ Classification: 'GOV', label: 'Bank of Maharashtra', value: 'Bank of Maharashtra' },
	{ Classification: 'GOV', label: 'Central Bank of India', value: 'Central Bank of India' },
	{ Classification: 'GOV', label: 'Indian Overseas Bank', value: 'Indian Overseas Bank' },
	{ Classification: 'GOV', label: 'UCO Bank', value: 'UCO Bank' },
	{ Classification: 'GOV', label: 'Punjab & Sind Bank', value: 'Punjab & Sind Bank' },

	// ════════════════════════════════════════════════════════════════
	// PRIVATE SECTOR BANKS — 22 banks
	// ════════════════════════════════════════════════════════════════
	{ Classification: 'PVT', label: 'HDFC Bank', value: 'HDFC Bank' },
	{ Classification: 'PVT', label: 'ICICI Bank', value: 'ICICI Bank' },
	{ Classification: 'PVT', label: 'Axis Bank', value: 'Axis Bank' },
	{ Classification: 'PVT', label: 'Kotak Mahindra Bank', value: 'Kotak Mahindra Bank' },
	{ Classification: 'PVT', label: 'Yes Bank', value: 'Yes Bank' },
	{ Classification: 'PVT', label: 'IndusInd Bank', value: 'IndusInd Bank' },
	{ Classification: 'PVT', label: 'IDFC First Bank', value: 'IDFC First Bank' },
	{ Classification: 'PVT', label: 'Federal Bank', value: 'Federal Bank' },
	{ Classification: 'PVT', label: 'South Indian Bank', value: 'South Indian Bank' },
	{ Classification: 'PVT', label: 'Bandhan Bank', value: 'Bandhan Bank' },
	{ Classification: 'PVT', label: 'RBL Bank', value: 'RBL Bank' },
	{ Classification: 'PVT', label: 'Karnataka Bank', value: 'Karnataka Bank' },
	{ Classification: 'PVT', label: 'Karur Vysya Bank', value: 'Karur Vysya Bank' },
	{ Classification: 'PVT', label: 'City Union Bank', value: 'City Union Bank' },
	{ Classification: 'PVT', label: 'Tamilnad Mercantile Bank', value: 'Tamilnad Mercantile Bank' },
	{
		Classification: 'PVT',
		label: 'CSB Bank (Catholic Syrian Bank)',
		value: 'CSB Bank (Catholic Syrian Bank)'
	},
	{
		Classification: 'PVT',
		label: 'DCB Bank (Development Credit Bank)',
		value: 'DCB Bank (Development Credit Bank)'
	},
	{ Classification: 'PVT', label: 'Dhanlaxmi Bank', value: 'Dhanlaxmi Bank' },
	{ Classification: 'PVT', label: 'Jammu & Kashmir Bank', value: 'Jammu & Kashmir Bank' },
	{ Classification: 'PVT', label: 'Nainital Bank', value: 'Nainital Bank' },
	{ Classification: 'PVT', label: 'IDBI Bank', value: 'IDBI Bank' },
	{ Classification: 'PVT', label: 'HSBC', value: 'HSBC' },
	{ Classification: 'PVT', label: 'Standard Chartered Bank', value: 'Standard Chartered Bank' },
	{ Classification: 'PVT', label: 'Shinhan Bank', value: 'Shinhan Bank' },

	// ════════════════════════════════════════════════════════════════
	// HOUSING FINANCE COMPANIES (HFCs) — NHB Registered — 16 entries
	// ════════════════════════════════════════════════════════════════
	{ Classification: 'HFC', label: 'LIC Housing Finance', value: 'LIC Housing Finance' },
	{ Classification: 'HFC', label: 'PNB Housing Finance', value: 'PNB Housing Finance' },
	{ Classification: 'HFC', label: 'ICICI Home Finance', value: 'ICICI Home Finance' },
	{ Classification: 'HFC', label: 'Aadhar Housing Finance', value: 'Aadhar Housing Finance' },
	{ Classification: 'HFC', label: 'Godrej Housing Finance', value: 'Godrej Housing Finance' },
	{ Classification: 'HFC', label: 'IIFL Home Finance', value: 'IIFL Home Finance' },
	{
		Classification: 'HFC',
		label: 'Indiabulls Housing Finance',
		value: 'Indiabulls Housing Finance'
	},
	{ Classification: 'HFC', label: 'Hero Housing Finance', value: 'Hero Housing Finance' },
	{ Classification: 'HFC', label: 'Muthoot Home Finance', value: 'Muthoot Home Finance' },
	{ Classification: 'HFC', label: 'GIC Housing Finance', value: 'GIC Housing Finance' },
	{
		Classification: 'HFC',
		label: 'Piramal Capital & Housing Finance',
		value: 'Piramal Capital & Housing Finance'
	},
	{
		Classification: 'HFC',
		label: 'Tata Capital Housing Finance',
		value: 'Tata Capital Housing Finance'
	},
	{ Classification: 'HFC', label: 'Can Fin Homes', value: 'Can Fin Homes' },
	{ Classification: 'HFC', label: 'Repco Home Finance', value: 'Repco Home Finance' },
	{ Classification: 'HFC', label: 'Home First Finance', value: 'Home First Finance' },
	{ Classification: 'HFC', label: 'Sundaram Home Finance', value: 'Sundaram Home Finance' },

	// ════════════════════════════════════════════════════════════════
	// NON-BANKING FINANCIAL COMPANIES (NBFCs) — 15 entries
	// ════════════════════════════════════════════════════════════════
	{ Classification: 'NBFC', label: 'Bajaj Finserv', value: 'Bajaj Finserv' },
	{ Classification: 'NBFC', label: 'Aditya Birla Capital', value: 'Aditya Birla Capital' },
	{ Classification: 'NBFC', label: 'HDB Financial Services', value: 'HDB Financial Services' },
	{ Classification: 'NBFC', label: 'L&T Finance Limited', value: 'L&T Finance Limited' },
	{ Classification: 'NBFC', label: 'Poonawala Fincorp', value: 'Poonawala Fincorp' },
	{ Classification: 'NBFC', label: 'Tata Capital', value: 'Tata Capital' },
	{ Classification: 'NBFC', label: 'Cholamandalam Finance', value: 'Cholamandalam Finance' },
	{ Classification: 'NBFC', label: 'Shriram Finance', value: 'Shriram Finance' },
	{ Classification: 'NBFC', label: 'Mahindra Finance', value: 'Mahindra Finance' },
	{ Classification: 'NBFC', label: 'SMFG India Credit', value: 'SMFG India Credit' },
	{ Classification: 'NBFC', label: 'Manappuram Finance', value: 'Manappuram Finance' },
	{ Classification: 'NBFC', label: 'IIFL Finance', value: 'IIFL Finance' },
	{ Classification: 'NBFC', label: 'Godrej Capital', value: 'Godrej Capital' },
	{ Classification: 'NBFC', label: 'Muthoot Finance', value: 'Muthoot Finance' },
	{ Classification: 'NBFC', label: 'Sundaram Finance', value: 'Sundaram Finance' },

	// ════════════════════════════════════════════════════════════════
	// SMALL FINANCE BANKS (SFBs) — 10 entries
	// ════════════════════════════════════════════════════════════════
	{
		Classification: 'SFB',
		label: 'AU Small Finance Bank',
		value: 'AU Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Jana Small Finance Bank',
		value: 'Jana Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Equitas Small Finance Bank',
		value: 'Equitas Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Ujjivan Small Finance Bank',
		value: 'Ujjivan Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'ESAF Small Finance Bank',
		value: 'ESAF Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Suryoday Small Finance Bank',
		value: 'Suryoday Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Shivalik Small Finance Bank',
		value: 'Shivalik Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Fincare Small Finance Bank',
		value: 'Fincare Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'Capital Small Finance Bank',
		value: 'Capital Small Finance Bank'
	},
	{
		Classification: 'SFB',
		label: 'North East Small Finance Bank',
		value: 'North East Small Finance Bank'
	}
];
