// Sample dashboard data for DSA role
// Uses realistic Indian names, INR amounts, and loan types

export interface Activity {
	icon: string;
	title: string;
	description: string;
	time: string;
	type: 'success' | 'info' | 'warning' | 'error' | 'neutral';
}

export interface Application {
	id: string;
	clientName?: string;
	loanType: string;
	amount: number;
	status: 'Pending' | 'Approved' | 'Rejected' | 'In Review' | 'Sanctioned' | 'Disbursed';
	bank?: string;
	date: string;
	commission?: number;
}

export interface PipelineItem {
	label: string;
	value: number;
	color: string;
}

export interface CoinHistoryItem {
	action: string;
	amount: number;
	date: string;
	type: 'earned' | 'spent';
}

// ─── DSA SAMPLE DATA ───

export const sampleDsaData = {
	name: 'Amit Sharma',
	dsaCode: 'DSA-MH-2024-0847',
	businessType: 'Individual',
	stats: {
		totalReferrals: 48,
		activeCases: 12,
		monthlyEarnings: 185000,
		conversionRate: 68
	},
	pipeline: [
		{ label: 'Lead', value: 15, color: '#64748b' },
		{ label: 'Applied', value: 12, color: '#0ea5e9' },
		{ label: 'Sanctioned', value: 8, color: '#ffcc00' },
		{ label: 'Disbursed', value: 5, color: '#22c55e' }
	] as PipelineItem[],
	applications: [
		{
			id: 'REF-001',
			clientName: 'Priya Patel',
			loanType: 'Home Loan',
			amount: 5500000,
			status: 'Sanctioned' as const,
			bank: 'SBI',
			date: '2026-01-28',
			commission: 27500
		},
		{
			id: 'REF-002',
			clientName: 'Vikram Singh',
			loanType: 'Business Loan',
			amount: 2000000,
			status: 'In Review' as const,
			bank: 'HDFC Bank',
			date: '2026-01-26',
			commission: 20000
		},
		{
			id: 'REF-003',
			clientName: 'Neha Gupta',
			loanType: 'Home Loan',
			amount: 3500000,
			status: 'Disbursed' as const,
			bank: 'ICICI Bank',
			date: '2026-01-22',
			commission: 17500
		},
		{
			id: 'REF-004',
			clientName: 'Rahul Verma',
			loanType: 'Personal Loan',
			amount: 500000,
			status: 'Pending' as const,
			bank: 'Axis Bank',
			date: '2026-01-25',
			commission: 5000
		},
		{
			id: 'REF-005',
			clientName: 'Sunita Devi',
			loanType: 'Car Loan',
			amount: 1200000,
			status: 'Approved' as const,
			bank: 'Kotak Mahindra',
			date: '2026-01-20',
			commission: 12000
		},
		{
			id: 'REF-006',
			clientName: 'Manoj Tiwari',
			loanType: 'Home Loan',
			amount: 7000000,
			status: 'In Review' as const,
			bank: 'SBI',
			date: '2026-01-18',
			commission: 35000
		},
		{
			id: 'REF-007',
			clientName: 'Anita Joshi',
			loanType: 'Personal Loan',
			amount: 400000,
			status: 'Rejected' as const,
			bank: 'HDFC Bank',
			date: '2026-01-12',
			commission: 0
		},
		{
			id: 'REF-008',
			clientName: 'Deepak Mishra',
			loanType: 'Business Loan',
			amount: 3000000,
			status: 'Pending' as const,
			bank: 'ICICI Bank',
			date: '2026-01-27',
			commission: 30000
		}
	] as Application[],
	rmDetails: {
		name: 'Suresh Menon',
		bank: 'SBI',
		branch: 'Andheri West',
		phone: '+91 98765 43210',
		email: 'suresh.menon@sbi.co.in'
	},
	earningsBreakdown: [
		{ label: 'Aug', value: 120000, color: '#ffcc00' },
		{ label: 'Sep', value: 145000, color: '#ffcc00' },
		{ label: 'Oct', value: 98000, color: '#ffcc00' },
		{ label: 'Nov', value: 167000, color: '#ffcc00' },
		{ label: 'Dec', value: 210000, color: '#ffcc00' },
		{ label: 'Jan', value: 185000, color: '#e4b2f8' }
	] as PipelineItem[],
	activities: [
		{
			icon: 'check-circle',
			title: 'Loan Sanctioned',
			description: "Priya Patel's home loan sanctioned by SBI",
			time: '3 hours ago',
			type: 'success' as const
		},
		{
			icon: 'banknote',
			title: 'Commission Credited',
			description: "₹17,500 credited for Neha Gupta's disbursement",
			time: '1 day ago',
			type: 'success' as const
		},
		{
			icon: 'file-text',
			title: 'New Referral',
			description: 'Deepak Mishra referred for business loan',
			time: '1 day ago',
			type: 'info' as const
		},
		{
			icon: 'clock',
			title: 'Under Review',
			description: "Vikram Singh's application under bank review",
			time: '2 days ago',
			type: 'warning' as const
		},
		{
			icon: 'x-circle',
			title: 'Application Rejected',
			description: "Anita Joshi's personal loan rejected",
			time: '5 days ago',
			type: 'error' as const
		}
	] as Activity[]
};
