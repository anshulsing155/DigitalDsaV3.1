<script lang="ts">
	import { onMount } from 'svelte';

	// Svelte 5 Reactive States
	let isMobileMenuOpen = $state(false);
	let scrollY = $state(0);

	// Operating System Interactive Loan Journey states
	let currentStep = $state(0);
	let isPlaying = $state(true);

	// Progress states for Step 2 application form creation
	let profilePercent = $state(15);

	const activeLeads = $derived(24 + (currentStep >= 0 && currentStep < 12 ? 1 : 0));
	const walletBalance = $derived(143650 + (currentStep >= 11 ? 42350 : 0));
	const completedCases = $derived(125 + (currentStep >= 12 ? 1 : 0));
	const monthlyCommission = $derived(799650 + (currentStep >= 12 ? 42350 : 0));

	// 20 Indian Banks for the horizontal marquee
	const indianBanks = [
		{ name: 'State Bank of India', code: 'SBI', color: '#00a9e0' },
		{ name: 'HDFC Bank', code: 'HDFC', color: '#004b87' },
		{ name: 'ICICI Bank', code: 'ICICI', color: '#f58220' },
		{ name: 'Axis Bank', code: 'AXIS', color: '#861f41' },
		{ name: 'Kotak Bank', code: 'KOTAK', color: '#ed1c24' },
		{ name: 'Bank of Baroda', code: 'BOB', color: '#ff6600' },
		{ name: 'Punjab National Bank', code: 'PNB', color: '#a20f16' },
		{ name: 'Canara Bank', code: 'CANARA', color: '#0091ff' },
		{ name: 'Union Bank of India', code: 'UNION', color: '#d22630' },
		{ name: 'IDFC First Bank', code: 'IDFC', color: '#811429' },
		{ name: 'IndusInd Bank', code: 'INDUSIND', color: '#842224' },
		{ name: 'Federal Bank', code: 'FEDERAL', color: '#00457c' },
		{ name: 'Yes Bank', code: 'YES', color: '#0054a6' },
		{ name: 'Indian Bank', code: 'INDIAN', color: '#004b87' },
		{ name: 'Bank of India', code: 'BOI', color: '#0054a6' },
		{ name: 'UCO Bank', code: 'UCO', color: '#0072bc' },
		{ name: 'Central Bank of India', code: 'CBI', color: '#0054a6' },
		{ name: 'Indian Overseas Bank', code: 'IOB', color: '#0054a6' },
		{ name: 'RBL Bank', code: 'RBL', color: '#004b87' },
		{ name: 'Bandhan Bank', code: 'BANDHAN', color: '#1b365d' }
	];

	// Mega Menu Content
	const menuData = {
		Products: [
			{
				name: 'Home Loans',
				desc: 'Prime mortgage deals starting at 8.40% ROI',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`
			},
			{
				name: 'Business Loans',
				desc: 'Unsecured operational capital up to ₹50 Lakhs',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18.4v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.45.258-.717.258H5.625c-.266 0-.523-.093-.717-.258m16.5 0a2.18 2.18 0 01-.75 1.661v3.5a1.125 1.125 0 01-1.125 1.125H4.875a1.125 1.125 0 01-1.125-1.125v-3.5a2.18 2.18 0 01-.75-1.661M3.75 8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m10.125-3V5.25c0-.621-.504-1.125-1.125-1.125h-4.5c-.621 0-1.125.504-1.125 1.125v.75m6 0H8.25" /></svg>`
			},
			{
				name: 'Personal Loans',
				desc: 'Pre-approved high-ticket credit lines',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`
			},
			{
				name: 'Loan Against Property',
				desc: 'Maximize liquidity from property assets',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 21V9m-9 12V3m6.75 6.75h.008v.008h-.008V9.75zm.03 3h.008v.008h-.008v-.008zM2.25 21h19.5" /></svg>`
			},
			{
				name: 'Developer & Plot',
				desc: 'Milestone financing for land & constructions',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.89-2.445c.3-.15.487-.457.487-.792V5.251c0-.598-.602-1.026-1.168-.816l-5.337 1.977a1.978 1.978 0 01-1.378 0L7.868 4.435a1.978 1.978 0 00-1.378 0L1.603 6.412c-.566.21-1.168-.218-1.168-.816V18.75c0 .335.187.642.487.792l4.89 2.445c.298.149.646.149.944 0l5.854-2.927a1.978 1.978 0 011.378 0z" /></svg>`
			},
			{
				name: 'Balance Transfer',
				desc: 'Refinance high-cost debt to reduce EMIs',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`
			}
		],
		Lenders: [
			{
				name: 'Compare Lenders',
				desc: 'Assess 40+ major Indian banks side-by-side',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>`
			},
			{
				name: 'Live Interest Rates',
				desc: 'Real-time ROI, processing fees & slab tracking',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.286-4.286L21.75 16.5m-3-3h3v3" /></svg>`
			},
			{
				name: 'Lender Matrix',
				desc: 'Deep dive into underwriting guidelines',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12h-15M3 9.75h18M3 12.75h18" /></svg>`
			},
			{
				name: 'Eligibility Engine',
				desc: 'Pre-screen cases before bank file submission',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
			}
		],
		Partners: [
			{
				name: 'DSA Program',
				desc: 'Highest payout slabs with instant credit alerts',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>`
			},
			{
				name: 'Builder Channels',
				desc: 'Strategic projects and mortgage allocations',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 21V9m-9 12V3m6.75 6.75h.008v.008h-.008V9.75zm.03 3h.008v.008h-.008v-.008zM2.25 21h19.5" /></svg>`
			},
			{
				name: 'Referral Network',
				desc: 'Refer verified files & earn commission payouts',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`
			},
			{
				name: 'Payout Slabs',
				desc: 'Transparent monthly commissions with zero delay',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>`
			}
		],
		Resources: [
			{
				name: 'EMI Calculators',
				desc: 'EMI, eligibility, and Balance Transfer math tools',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 15.75h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm-2.25 4.5h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm-2.25 4.5h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm-2.25 4.5h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zm0-2.25h.008v.008h-.008v-.008zM18 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3z" /></svg>`
			},
			{
				name: 'Policy Handbook',
				desc: 'Step-by-step documentation guides per bank',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`
			},
			{
				name: 'Partner Success',
				desc: 'How local agents scaled to ₹10Cr+ monthly files',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75c-.621 0-1.125.504-1.125 1.125v3.375m9 0h-9m9 0a3 3 0 003-3V9.75a3 3 0 00-3-3h-9a3 3 0 00-3 3v6a3 3 0 003 3m9-9V4.5a3 3 0 10-6 0v2.25" /></svg>`
			},
			{
				name: 'Support Desk',
				desc: 'Direct escalation matrix to your assigned RM',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>`
			}
		],
		Company: [
			{
				name: 'Our Vision',
				desc: 'Building distribution channels for Bharat',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 0M12 11.25v.008h-.008V11.25H12zm2.25-3h.008v.008h-.008V8.25zm-4.5 0H9.75v.008H9.75V8.25zM12 18.75c-3.001 0-5.7-1.467-7.43-3.722a.75.75 0 01.12-1.042l1.666-1.333a.75.75 0 011.03.075A8.96 8.96 0 0012 15a8.96 8.96 0 004.614-2.272.75.75 0 011.03-.075l1.666 1.333a.75.75 0 01.12 1.042A11.207 11.207 0 0112 18.75zm9-6.75a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
			},
			{
				name: 'RM Network',
				desc: 'Our regional field operations in 25+ cities',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" /></svg>`
			},
			{
				name: 'Tech Specs',
				desc: 'Secure APIs connecting directly to lender grids',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0V10.5m-2.25 0h13.5c.621 0 1.125.504 1.125 1.125v7.4c0 .621-.504 1.125-1.125 1.125H5.25a1.125 1.125 0 01-1.125-1.125v-7.4c0-.621.504-1.125 1.125-1.125z" /></svg>`
			},
			{
				name: 'Contact Sales',
				desc: 'Locate our hubs in Mumbai, Delhi & Bangalore',
				icon: `<svg class="w-4 h-4 stroke-[#0BD28E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.802-5.122-4.1-6.924-6.924l1.293-.97a1.242 1.242 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>`
			}
		]
	};

	let activeMenu = $state<keyof typeof menuData | null>(null);
	let menuTimer: ReturnType<typeof setTimeout>;

	function showMenu(menu: keyof typeof menuData) {
		clearTimeout(menuTimer);
		activeMenu = menu;
	}

	function hideMenu() {
		menuTimer = setTimeout(() => {
			activeMenu = null;
		}, 150);
	}

	// Typewriter state
	let words = ['DSAs', 'Banks', 'NBFCs', 'Builders'];
	let currentWordIndex = $state(0);
	let displayText = $state('');
	let isDeleting = $state(false);
	let typingSpeed = $state(150);
	let typeTimer: ReturnType<typeof setTimeout>;

	// 13 Refined Real-world Ecosystem steps tracking the complete customer-to-disbursal lifecycle
	const ecosystemSteps = [
		{
			id: 0,
			title: '1. Customer Arrives',
			icon: '👤',
			tag: 'Rohan Sharma Lead',
			action: '📥 Lead Sourced'
		},
		{
			id: 1,
			title: '2. Application Workspace',
			icon: '📝',
			tag: 'Dynamic Data Workspace',
			action: '📝 App workspace filling'
		},
		{
			id: 2,
			title: '3. AI Processing',
			icon: '🤖',
			tag: 'Scanning criteria',
			action: '🤖 AI verify engine active'
		},
		{
			id: 3,
			title: '4. AI Report',
			icon: '📊',
			tag: 'Underwriting summary',
			action: '📊 AI Report generated'
		},
		{
			id: 4,
			title: '5. Policy Match',
			icon: '🛡️',
			tag: '6 Policies Checked',
			action: '🛡️ Policy rules passed'
		},
		{
			id: 5,
			title: '6. Offer Comparison',
			icon: '🏦',
			tag: 'Competition matrix',
			action: '🏦 LIC rises to top'
		},
		{
			id: 6,
			title: '7. Connect RM',
			icon: '👨‍💼',
			tag: 'Lender channel RM',
			action: '👨‍💼 RM channel connected'
		},
		{
			id: 7,
			title: '8. RM Ownership',
			icon: '⚙️',
			tag: 'Processing milestone',
			action: '⚙️ RM advancing file'
		},
		{
			id: 8,
			title: '9. Live Timeline',
			icon: '👁️',
			tag: 'Milestones roadmap',
			action: '👁️ Milestone nodes sync'
		},
		{
			id: 9,
			title: '10. Communication Alerts',
			icon: '💬',
			tag: 'WhatsApp & SMS notifications',
			action: '💬 Client notifications'
		},
		{
			id: 10,
			title: '11. Disbursement Complete',
			icon: '📈',
			tag: 'Capital release success',
			action: '📈 Loan disbursed'
		},
		{
			id: 11,
			title: '12. Commission Paid',
			icon: '💰',
			tag: 'DSA wallet credit',
			action: '💰 Net payout credited'
		},
		{
			id: 12,
			title: '13. Portfolio Growth',
			icon: '🔄',
			tag: 'cases synced',
			action: '🔄 Success loop active'
		}
	];

	// Detail narrative for left panel B2B context
	const stepDetails = [
		{
			title: 'Customer Arrives',
			desc: 'A borrower card lands in the digital workspace. Rohan Sharma requires a 55L Home Loan to buy property in Noida.',
			stat: 'Rohan Sharma • Lead Sourced',
			kpis: ['₹55,00,000 Requested', 'Noida Sector 62', 'Home Loan Category']
		},
		{
			title: 'Application Workspace',
			desc: 'The DSA fills sections progressively. Form data fields build dynamically, driving the profile completion rate to 100%.',
			stat: 'Profile: 100% Completed',
			kpis: ['✓ Employment & Income', '✓ Property Details', '✓ Existing EMI burdens']
		},
		{
			title: 'AI Processing Engine',
			desc: 'The workspace is submitted directly into the AI rules scanner. The engine verifies income stability, CIBIL, FOIR, and credit policies.',
			stat: 'Engine: Underwriting Check',
			kpis: ['CIBIL Verified: 785', 'FOIR Checked: 42%', 'Bank rules mapped']
		},
		{
			title: 'AI Recommendation Report',
			desc: 'Generates an automated decision summary with an estimated EMI, risk ratio score, and high-accuracy approval probability.',
			stat: 'AI Probability: 96% Pass',
			kpis: ['Eligible Amt: ₹56,80,000', 'Estimated EMI: ₹48,300/mo', 'Tenure: 20 Years']
		},
		{
			title: 'Verified Bank Policy Matching',
			desc: 'Automated underwriting matches customer criteria against HDFC, LIC, SBI, Axis, and ICICI policy models in real-time.',
			stat: '6 Policy parameters matched',
			kpis: ['3 Eligible Lenders', '1 Recommended', 'Verified Policy Badge']
		},
		{
			title: 'Offer Comparison',
			desc: 'Lenders compete side-by-side. The recommended offer automatically shuffles and glows at the top of the stack.',
			stat: 'Recommended: LIC Housing',
			kpis: ['LIC: 8.20% (3 days TAT)', 'SBI: 8.30% (5 days TAT)', 'HDFC: 8.40% (4 days TAT)']
		},
		{
			title: 'Connect Relationship Manager',
			desc: "Taps directly into the lender's regional channel. A dedicated senior Relationship Manager (RM) takes ownership instantly.",
			stat: 'RM: Rahul Mehta assigned',
			kpis: ['Senior LIC RM', '⭐ Live Online status', 'Response under 2 min']
		},
		{
			title: 'RM Takes Ownership',
			desc: 'The RM manages technical checks, legal vetting, and credit checks, moving milestones forward on the portal.',
			stat: 'Milestone: Technical Pass',
			kpis: ['Technical appraisal done', 'Legal vetting complete', 'Credit approval synced']
		},
		{
			title: 'Live Sourcing Timeline',
			desc: 'A horizontal roadmap visualizes file progress. Watch the case progress from Lead to Verification and Sanction.',
			stat: 'Timeline: Sanction Issued',
			kpis: ['Milestone track active', 'Sanction Letter Issued', 'Ready for disbursement']
		},
		{
			title: 'Automated Communication',
			desc: 'Automatic WhatsApp messages and SMS alerts keep your borrower informed at every milestone without manual checks.',
			stat: 'Alerts: 4 Dispatched',
			kpis: ['✓ Aadhaar Uploaded alert', '✓ Salary verified sync', '✓ Sanction Letter Ready']
		},
		{
			title: 'Loan Disbursed',
			desc: 'The loan file is finalized, funds are released to the seller, and the transaction wraps up successfully.',
			stat: 'Completed: ₹55,00,000',
			kpis: ['Capital released', 'Case status: Closed', 'Lending cycle success']
		},
		{
			title: 'Commission Settled',
			desc: 'DigitalDSA splits commission shares, deducts TDS, and transfers the net payout directly into your wallet instantly.',
			stat: 'Payout: +₹42,350',
			kpis: ['DSA share: 90% credited', 'TDS & GST accounted', 'Wallet Balance: ₹1,86,000']
		},
		{
			title: 'Portfolio Growth & Loop',
			desc: "The case slides into your agency's permanent portfolio metrics, showing monthly commission accumulation.",
			stat: 'Loop active: Next lead',
			kpis: ['126 Completed Cases', '94% Success Rate', 'Monthly: ₹8,42,000']
		}
	];

	// Scroll awareness & Typewriter loops
	onMount(() => {
		const handleScroll = () => {
			scrollY = window.scrollY;
		};
		window.addEventListener('scroll', handleScroll);

		// Typewriter loop
		function tickTypewriter() {
			const fullWord = words[currentWordIndex];
			if (isDeleting) {
				displayText = fullWord.substring(0, displayText.length - 1);
				typingSpeed = 75;
			} else {
				displayText = fullWord.substring(0, displayText.length + 1);
				typingSpeed = 150;
			}

			if (!isDeleting && displayText === fullWord) {
				isDeleting = true;
				typingSpeed = 2000;
			} else if (isDeleting && displayText === '') {
				isDeleting = false;
				currentWordIndex = (currentWordIndex + 1) % words.length;
				typingSpeed = 500;
			}

			typeTimer = setTimeout(tickTypewriter, typingSpeed);
		}
		tickTypewriter();

		// OS Journey Autoplay loop (13 states)
		const autoplayInterval = setInterval(() => {
			if (isPlaying) {
				currentStep = (currentStep + 1) % 13;
			}
		}, 5500);

		return () => {
			window.removeEventListener('scroll', handleScroll);
			clearTimeout(typeTimer);
			clearInterval(autoplayInterval);
		};
	});

	// Svelte 5 reactive effect for instant progress increment on Step 1 entry
	$effect(() => {
		if (currentStep === 1) {
			profilePercent = 15;
			const interval = setInterval(() => {
				if (profilePercent === 15) profilePercent = 42;
				else if (profilePercent === 42) profilePercent = 68;
				else if (profilePercent === 68) profilePercent = 100;
				else if (profilePercent === 100) profilePercent = 15;
			}, 950);
			return () => clearInterval(interval);
		} else {
			profilePercent = 15;
		}
	});

	// Payout Calculator State
	let disbursementVolume = $state(50000000); // Default ₹5 Crores
	let commissionRate = $state(0.0085); // Default 0.85%
	let estimatedEarnings = $derived(disbursementVolume * commissionRate);

	// Narrative Acts Svelte 5 States
	let activeAct = $state(1);
	let chaosSliderVal = $state(0);

	// RM Chat Simulator State
	let chatStep = $state(0);
	let chatLogs = $state([
		{
			sender: 'RM',
			text: 'Welcome, case assigned. Awaiting document validation.',
			time: '10:40 AM'
		}
	]);

	function advanceChat() {
		if (chatStep === 0) {
			chatLogs = [
				...chatLogs,
				{ sender: 'DSA', text: 'Uploaded PDF for Salary and KYC check.', time: '10:41 AM' }
			];
			chatStep = 1;
		} else if (chatStep === 1) {
			chatLogs = [
				...chatLogs,
				{ sender: 'RM', text: '✓ Salary OCR matching verified. FOIR is 42%.', time: '10:42 AM' }
			];
			chatStep = 2;
		} else if (chatStep === 2) {
			chatLogs = [
				...chatLogs,
				{
					sender: 'RM',
					text: '🛡️ Sanction letter issued for ₹55,00,000! Case approved.',
					time: '10:43 AM'
				}
			];
			chatStep = 3;
		} else {
			chatLogs = [
				{
					sender: 'RM',
					text: 'Welcome, case assigned. Awaiting document validation.',
					time: '10:40 AM'
				}
			];
			chatStep = 0;
		}
	}

	// Live Control Room feed state
	let liveTowerLogs = $state([
		'Axis Bank matched policy for Case #8812',
		'LIC RM Joined Chat Channel for Rohan S.',
		'Sanction Letter generated by HDFC Finance',
		'Commission payout processed for Case #4981'
	]);

	// Svelte 5 maturity states
	let maturityIndex = $state(0);
	const maturityLevels = [
		{
			label: 'Solo DSA',
			team: 'Solo Operator',
			files: '10-15 files/mo',
			earnings: '₹95,000/mo',
			desc: 'You manage all files, KYC vetting, and RM follow-ups yourself.'
		},
		{
			label: 'Team',
			team: '3-5 Agents',
			files: '30-50 files/mo',
			earnings: '₹3,40,000/mo',
			desc: 'Centralized AI validation lets agents focus entirely on client conversions.'
		},
		{
			label: 'Branch',
			team: '2 regional branches',
			files: '80-120 files/mo',
			earnings: '₹8,50,000/mo',
			desc: 'Consolidated reporting across offices using a single command cockpit.'
		},
		{
			label: 'Regional',
			team: '5 offices, 50+ agents',
			files: '250-400 files/mo',
			earnings: '₹28,00,000/mo',
			desc: 'Automated route matching and slab-split management across cities.'
		},
		{
			label: 'Enterprise',
			team: '100+ agents, white-label',
			files: '800+ files/mo',
			earnings: '₹75,00,000/mo',
			desc: 'Fully branded portal with APIs directly wired into bank APIs.'
		}
	];
</script>

<svelte:head>
	<title>DigitalDSA - The B2B Loan Sourcing Operating System</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@400;500;600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- Global Floating Vertical Progress Bar (Right Side of Screen - Active in Hero) -->
<div
	class="flex flex-col items-center gap-1.5 select-none"
	style="position: fixed !important; right: 16px !important; top: 50% !important; transform: translateY(-50%) !important; z-index: 9999 !important; transition: opacity 0.3s ease, transform 0.3s ease; opacity: {scrollY <
	800
		? 1
		: 0}; pointer-events: {scrollY < 800 ? 'auto' : 'none'};"
>
	{#each Array(13) as _, idx}
		{@const stepVal = 12 - idx}
		<button
			onclick={() => {
				currentStep = stepVal;
				isPlaying = false;
			}}
			class="h-1 w-5 cursor-pointer rounded-[1px] border-none p-0 transition-all duration-300 focus:outline-none sm:w-6.5
				{stepVal <= currentStep
				? 'scale-x-110 bg-[#0BD28E] shadow-[0_0_10px_#0BD28E]'
				: 'bg-slate-500/25 hover:bg-slate-500/40'}"
			title={ecosystemSteps[stepVal].title}
		></button>
	{/each}
	<span
		class="mt-3.5 translate-y-3.5 rotate-90 text-[7px] font-black tracking-widest whitespace-nowrap text-slate-500 uppercase"
		>Step {currentStep + 1}/13</span
	>
</div>

<!-- Global Floating Left-Side Act Progress Rail (Active during Acts 1-4) -->
<div
	class="hidden flex-col items-start gap-5 font-sans select-none xl:flex"
	style="position: fixed !important; left: 24px !important; top: 50% !important; transform: translateY(-50%) !important; z-index: 9999 !important; transition: opacity 0.3s ease; opacity: {scrollY >=
	800
		? 1
		: 0}; pointer-events: {scrollY >= 800 ? 'auto' : 'none'};"
>
	<div class="flex flex-col gap-3">
		<span class="text-[8px] font-black tracking-wider text-slate-400 uppercase">Act Progress</span>
		{#each [{ act: 1, label: '01 Discover', min: 0, max: 1300 }, { act: 2, label: '02 Transform', min: 1300, max: 2900 }, { act: 3, label: '03 Operate', min: 2900, max: 4300 }, { act: 4, label: '04 Grow', min: 4300, max: 999999 }] as actItem}
			{@const isActive = scrollY >= actItem.min && scrollY < actItem.max}
			<div class="flex items-center gap-2">
				<span
					class="h-1.5 w-1.5 rounded-full transition-all duration-300
					{isActive ? 'scale-125 bg-[#0BD28E] shadow-[0_0_8px_#0BD28E]' : 'bg-slate-300/40'}"
				></span>
				<span
					class="text-[9px] font-bold tracking-wider transition-colors duration-300
					{isActive ? 'text-[#161616]' : 'text-slate-400/55'}"
				>
					{actItem.label}
				</span>
			</div>
		{/each}
	</div>
</div>

<main
	class="premium-layout relative min-h-screen font-['Inter',sans-serif] text-[#161616] selection:bg-[#5FF7A6]/30 selection:text-emerald-950"
>
	<!-- Top Navigation Bar -->
	<header
		class="sticky top-0 z-50 h-20 w-full py-5 transition-all duration-300 {scrollY > 20 ||
		activeMenu
			? 'border-b border-slate-200/80 bg-white shadow-[0_4px_30px_rgba(0,0,0,0.015)]'
			: 'border-b border-transparent bg-transparent'}"
	>
		<div class="relative mx-auto flex h-full max-w-7xl items-center justify-between px-[18px]">
			<!-- Left Side: Brand Logo -->
			<div class="flex items-center gap-12">
				<a href="#" class="group flex items-center gap-3 focus-visible:outline-none">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-full bg-[#0BD28E] shadow-[0_4px_12px_rgba(11,210,142,0.15)] transition-transform duration-300 group-hover:scale-105"
					>
						<svg
							class="h-4.5 w-4.5 stroke-[2.5] text-[#161616]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
						>
							<line x1="7" y1="7" x2="7" y2="17"></line>
							<line x1="17" y1="7" x2="17" y2="17"></line>
							<line x1="7" y1="17" x2="17" y2="7"></line>
							<circle cx="7" cy="7" r="2.2" fill="currentColor"></circle>
							<circle cx="7" cy="17" r="2.2" fill="currentColor"></circle>
							<circle cx="17" cy="7" r="2.2" fill="currentColor"></circle>
							<circle cx="17" cy="17" r="2.2" fill="currentColor"></circle>
						</svg>
					</div>
					<span class="font-['Outfit'] text-xl font-bold tracking-tight text-[#161616]"
						>DigitalDSA</span
					>
				</a>

				<!-- Main Navigation -->
				<nav class="hidden lg:block">
					<ul class="flex items-center gap-8 text-[15px] font-medium text-[#161616]">
						{#each Object.keys(menuData) as menuKey}
							<li
								onmouseenter={() => showMenu(menuKey as keyof typeof menuData)}
								onmouseleave={hideMenu}
								class="relative cursor-pointer py-2"
							>
								<a
									href="#"
									class="flex items-center gap-1 transition-colors duration-150 hover:text-[#161616]/70"
								>
									<span>{menuKey}</span>
									<svg
										class="h-3.5 w-3.5 stroke-[2] transition-transform duration-200 {activeMenu ===
										menuKey
											? 'rotate-180 transform text-[#0BD28E]'
											: 'text-slate-400'}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19.5 8.25l-7.5 7.5-7.5-7.5"
										/>
									</svg>
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			</div>

			<!-- Right Side Buttons -->
			<div class="flex items-center gap-4 text-[15px] font-medium text-[#161616] sm:gap-8">
				<ul class="hidden items-center gap-8 md:flex">
					<li>
						<a
							href="#"
							class="text-[#161616]/60 transition-colors duration-150 hover:text-[#161616]"
							>Partner Login</a
						>
					</li>
				</ul>
				<a
					href="#"
					class="btn-premium hidden items-center gap-2 rounded-full border border-[#161616]/70 bg-transparent px-6 py-2.5 font-medium text-[#161616] shadow-none hover:bg-[#161616]/5 active:scale-95 sm:inline-flex"
				>
					Become a Partner →
				</a>

				<!-- Mobile menu hamburger -->
				<button
					onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
					class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/40 p-2 text-[#161616] hover:bg-[#161616]/5 focus-visible:outline-none lg:hidden"
					aria-label="Toggle menu"
				>
					{#if isMobileMenuOpen}
						<svg
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<svg
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>

			<!-- Mega Menu Dropdown -->
			{#if activeMenu}
				<div
					onmouseenter={() => showMenu(activeMenu!)}
					onmouseleave={hideMenu}
					class="absolute top-[70px] left-1/2 z-50 grid w-full max-w-[680px] origin-top -translate-x-[65%] grid-cols-2 gap-4 rounded-[24px] border border-t-2 border-slate-200/80 border-t-[#0BD28E] bg-white p-6 shadow-[0_40px_90px_rgba(15,23,42,0.12)] transition-all duration-300"
				>
					{#each menuData[activeMenu] as item}
						<a
							href="#"
							class="group flex items-start gap-4.5 rounded-2xl border border-transparent p-3.5 transition-all duration-150 hover:bg-slate-50"
						>
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0BD28E]/20 bg-[#0BD28E]/10 transition-transform group-hover:scale-105"
							>
								{@html item.icon}
							</div>
							<div class="flex flex-col">
								<span
									class="text-[14px] font-semibold text-[#161616] transition-colors group-hover:text-[#0BD28E]"
									>{item.name}</span
								>
								<span class="mt-1 text-[11px] leading-relaxed font-medium text-slate-600"
									>{item.desc}</span
								>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</header>

	<!-- Mobile Menu Drawer -->
	{#if isMobileMenuOpen}
		<div
			class="fixed inset-0 top-20 z-40 overflow-y-auto border-t border-slate-200 bg-[#FAFAF7] pb-12 transition-all duration-300 lg:hidden"
		>
			<nav class="mx-auto flex max-w-xl flex-col gap-8 px-6 py-8">
				{#each Object.keys(menuData) as menuKey}
					<div class="flex flex-col gap-3">
						<h4
							class="border-b border-slate-200/60 pb-1.5 text-xs font-bold tracking-widest text-slate-400 uppercase"
						>
							{menuKey}
						</h4>
						<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
							{#each menuData[menuKey as keyof typeof menuData] as item}
								<a
									href="#"
									onclick={() => (isMobileMenuOpen = false)}
									class="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-all duration-150 hover:bg-slate-50 active:scale-98"
								>
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0BD28E]/10"
									>
										{@html item.icon}
									</div>
									<div class="flex flex-col">
										<span
											class="text-xs font-bold text-[#161616] transition-colors group-hover:text-[#0BD28E]"
											>{item.name}</span
										>
										<span class="line-clamp-1 text-[10px] leading-normal text-slate-600"
											>{item.desc}</span
										>
									</div>
								</a>
							{/each}
						</div>
					</div>
				{/each}

				<div class="my-2 h-px bg-slate-200/60"></div>

				<div class="flex flex-col gap-4">
					<a
						href="#"
						onclick={() => (isMobileMenuOpen = false)}
						class="flex items-center justify-center rounded-full border border-slate-300 bg-white py-3.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						Partner Login
					</a>
					<a
						href="#"
						onclick={() => (isMobileMenuOpen = false)}
						class="hero-cta-button flex items-center justify-center rounded-full py-3.5 font-semibold text-[#161616] transition-colors active:scale-98"
					>
						Become a Partner →
					</a>
				</div>
			</nav>
		</div>
	{/if}

	<!-- Main Content Section -->
	<div class="relative z-0 min-h-[calc(100vh-80px)] w-full overflow-hidden bg-[#FAFAF7]">
		<!-- Background Art Gradients - Scoped strictly to the Hero section -->
		<div class="absolute inset-x-0 top-0 -z-10 h-[1420px] overflow-hidden bg-transparent">
			<div
				class="animate-orb-mint pointer-events-none absolute top-[-15%] left-[25%] h-[85vw] max-h-[900px] w-[85vw] max-w-[900px] rounded-full bg-gradient-to-br from-[#2effa2]/75 to-transparent blur-[110px]"
			></div>
			<div
				class="animate-orb-yellow pointer-events-none absolute top-[-20%] right-[-15%] h-[75vw] max-h-[800px] w-[75vw] max-w-[800px] rounded-full bg-gradient-to-br from-[#e2ff3b]/80 to-transparent blur-[115px]"
			></div>
			<div
				class="pointer-events-none absolute inset-0 opacity-75 mix-blend-multiply"
				style="background: radial-gradient(circle at 45% 22%, #2effa2 0%, transparent 50%), radial-gradient(circle at 85% 15%, #e2ff3b 0%, transparent 45%);"
			></div>
			<div class="noise-overlay"></div>
		</div>

		<!-- Hero Section Container -->
		<section class="mx-auto max-w-7xl px-[18px] pt-16 pb-16 md:pb-24">
			<div class="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-8">
				<!-- Left Hero Content Column -->
				<div class="flex flex-col justify-center lg:col-span-7">
					<h1
						class="font-['Inter',sans-serif] text-5xl leading-[0.95] font-medium tracking-[-0.05em] text-[#161616] sm:text-7xl xl:text-[88px]"
					>
						The Smartest Loan <br />
						Platform for <br class="lg:hidden" />
						<span class="relative inline-block min-w-[20px] pr-1 whitespace-nowrap text-[#0BD28E]">
							{displayText}
							<span class="cursor-blink absolute top-1 right-0 bottom-1 w-[3px] bg-[#161616]"
							></span>
						</span>
					</h1>

					<p
						class="mt-12 max-w-[620px] text-lg leading-relaxed font-normal text-[#161616]/70 sm:text-[20px]"
					>
						Manage leads, compare 150+ lenders, check eligibility instantly, submit loan
						applications, track every case, and grow your loan business—all from one AI-powered
						platform.
					</p>

					<!-- Action CTAs -->
					<div class="mt-14 flex flex-wrap items-center gap-6">
						<a
							href="#"
							class="hero-cta-button inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[16px] font-medium shadow-none active:scale-98"
						>
							Become a Partner →
						</a>
						<a
							href="#"
							class="group inline-flex items-center gap-1.5 py-2 text-[16px] font-medium text-[#161616] transition-colors hover:text-[#161616]/80"
						>
							Book a Demo
							<svg
								class="h-4.5 w-4.5 transform stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
								/>
							</svg>
						</a>
					</div>

					<!-- Marquee Bank Logos -->
					<div class="relative mt-20 max-w-xl overflow-hidden select-none">
						<div
							class="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-12 bg-gradient-to-r from-[#FAFAF7] to-transparent"
						></div>
						<div
							class="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#FAFAF7] to-transparent"
						></div>

						<div class="marquee-track w-full">
							<div class="marquee-content items-center font-medium opacity-45">
								<div class="flex shrink-0 items-center gap-12 pr-12">
									{#each indianBanks as bank}
										<div
											class="flex items-center gap-2 font-['Outfit'] text-[18px] font-medium tracking-[0.02em] text-[#161616]"
										>
											{#if bank.code === 'SBI'}
												<svg
													class="h-5 w-5 shrink-0 text-[#00a9e0]"
													viewBox="0 0 24 24"
													fill="currentColor"
												>
													<circle
														cx="12"
														cy="12"
														r="9"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
													/>
													<line
														x1="12"
														y1="5.5"
														x2="12"
														y2="18.5"
														stroke="currentColor"
														stroke-width="2.5"
													/>
													<circle cx="12" cy="12" r="3" fill="currentColor" />
												</svg>
											{:else}
												<div
													class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-bold text-white shadow-sm"
													style="background-color: {bank.color}"
												>
													{bank.code.substring(0, 2)}
												</div>
											{/if}
											<span>{bank.name}</span>
										</div>
									{/each}
								</div>
								<!-- Duplicate For Loop -->
								<div class="flex shrink-0 items-center gap-12 pr-12">
									{#each indianBanks as bank}
										<div
											class="flex items-center gap-2 font-['Outfit'] text-[18px] font-medium tracking-[0.02em] text-[#161616]"
										>
											{#if bank.code === 'SBI'}
												<svg
													class="h-5 w-5 shrink-0 text-[#00a9e0]"
													viewBox="0 0 24 24"
													fill="currentColor"
												>
													<circle
														cx="12"
														cy="12"
														r="9"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
													/>
													<line
														x1="12"
														y1="5.5"
														x2="12"
														y2="18.5"
														stroke="currentColor"
														stroke-width="2.5"
													/>
													<circle cx="12" cy="12" r="3" fill="currentColor" />
												</svg>
											{:else}
												<div
													class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-bold text-white shadow-sm"
													style="background-color: {bank.color}"
												>
													{bank.code.substring(0, 2)}
												</div>
											{/if}
											<span>{bank.name}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Right Side: DigitalDSA OS (Uninterrupted 13-Phase Sourcing Journey) -->
				<div class="relative flex flex-col items-center py-8 lg:col-span-5">
					<!-- DigitalDSA OS Wrapper (Overflow-hidden removed for boundary-less 3D floats) -->
					<div
						onmouseenter={() => (isPlaying = false)}
						onmouseleave={() => (isPlaying = true)}
						class="relative flex w-full max-w-[540px] flex-col gap-6 rounded-[28px] border border-white/30 bg-white/20 p-6 shadow-[0_50px_100px_rgba(15,23,42,0.03)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_60px_110px_rgba(15,23,42,0.06)]"
					>
						<!-- OS Window Header -->
						<div class="flex items-center justify-between border-b border-white/20 pb-3">
							<div class="flex items-center gap-1.5">
								<span class="h-3 w-3 rounded-full bg-rose-400"></span>
								<span class="h-3 w-3 rounded-full bg-amber-400"></span>
								<span class="h-3 w-3 rounded-full bg-emerald-400"></span>
								<span class="ml-2 text-[11px] font-semibold tracking-tight text-slate-400"
									>DigitalDSA OS — Case #{4982 + currentStep}</span
								>
							</div>
							<div
								class="flex animate-pulse items-center gap-1.5 rounded-full border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-2.5 py-1 text-[9px] font-bold tracking-wide text-[#0BD28E] uppercase"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-[#0BD28E]"></span>
								{ecosystemSteps[currentStep].tag}
							</div>
						</div>

						<!-- Two-Column Internal Layout (Stacked on mobile, side-by-side on desktop) -->
						<div class="relative grid min-h-[360px] grid-cols-1 gap-5 lg:grid-cols-12">
							<!-- KPI Widgets Sidebar (4 Cols) -->
							<div
								class="scrollbar-none col-span-1 flex flex-row gap-3.5 overflow-x-auto border-b border-white/20 pb-4 text-left lg:col-span-4 lg:flex-col lg:overflow-visible lg:border-r lg:border-b-0 lg:pr-4 lg:pb-0"
							>
								<div
									class="shrink-0 text-[10px] font-bold tracking-wider text-slate-500 uppercase lg:shrink"
								>
									Business Cockpit
								</div>
								<div
									class="shrink-0 animate-pulse rounded-lg border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600 lg:shrink"
								>
									{ecosystemSteps[currentStep].action}
								</div>

								<div class="my-1 h-px bg-white/20"></div>

								<!-- Active cases tracking -->
								<div
									class="flex min-w-[120px] shrink-0 flex-col rounded-xl border border-white/20 bg-white/30 p-2.5 shadow-sm backdrop-blur-md transition-all duration-300 lg:min-w-0"
								>
									<span class="text-[9px] font-bold tracking-widest text-slate-500 uppercase"
										>Active Files</span
									>
									<span class="mt-0.5 text-base font-bold tracking-tight text-[#161616]"
										>{activeLeads}</span
									>
								</div>

								<!-- Commission Wallet Balance -->
								<div
									class="flex min-w-[120px] shrink-0 flex-col rounded-xl border border-white/20 bg-white/30 p-2.5 shadow-sm backdrop-blur-md transition-all duration-300 lg:min-w-0"
								>
									<span class="text-[9px] font-bold tracking-widest text-slate-500 uppercase"
										>Commission Wallet</span
									>
									<span class="mt-0.5 font-mono text-sm font-bold tracking-tight text-[#161616]"
										>₹{walletBalance.toLocaleString('en-IN')}</span
									>
								</div>

								<!-- Completed cases database metrics -->
								<div
									class="flex min-w-[120px] shrink-0 flex-col rounded-xl border border-white/20 bg-white/30 p-2.5 font-['Outfit'] shadow-sm backdrop-blur-md transition-all duration-300 lg:min-w-0"
								>
									<span class="text-[9px] font-bold tracking-widest text-slate-500 uppercase"
										>Disbursed Cases</span
									>
									<span class="mt-0.5 text-base font-bold tracking-tight text-[#161616]"
										>{completedCases}</span
									>
								</div>
							</div>

							<!-- Continuous DOM 3D Viewport Stage Canvas Area (8 Cols) -->
							<div
								class="motion-stage relative col-span-1 min-h-[360px] rounded-2xl border border-white/20 bg-transparent p-4 lg:col-span-8"
								style="perspective: 1500px; transform-style: preserve-3d;"
							>
								<!-- BACKGROUND: Continuous Connection Pipelines -->
								<div class="pointer-events-none absolute inset-0 opacity-25">
									<div
										class="absolute top-4 bottom-4 left-1/2 w-0.5 border-l-2 border-dashed border-white/40"
									></div>
								</div>

								<!-- ============================================== -->
								<!-- 1. Customer Card (Rohan Sharma Lead Card) -->
								<!-- ============================================== -->
								<div
									class="absolute w-[190px] rounded-2xl border border-white/40 bg-white/45 p-3.5 text-left shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										z-index: {currentStep === 0 ? 40 : 10};
										opacity: {currentStep === 0 ? 1 : 0};
										visibility: {currentStep === 0 ? 'visible' : 'hidden'};
										pointer-events: {currentStep === 0 ? 'auto' : 'none'};
										transform: {currentStep === 0
										? 'translate(-50%, -50%) translate3d(0, 0, 50px) scale(1) rotateX(0deg) rotateY(0deg)'
										: 'translate(-50%, -50%) translate3d(0, -45px, -150px) scale(0.5) rotateX(75deg) rotateY(-30deg)'};
										filter: {currentStep === 0 ? 'none' : 'blur(4px)'};
									"
								>
									<div class="flex items-center gap-2">
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0BD28E]/10 text-sm"
										>
											👤
										</div>
										<div class="flex flex-col">
											<span class="text-[10px] leading-none font-bold text-[#161616]"
												>Rohan Sharma</span
											>
											<span class="mt-0.5 text-[8px] font-semibold text-slate-400"
												>Home Loan Sourcing</span
											>
										</div>
									</div>
									<div class="my-2.5 h-px bg-white/20"></div>
									<div class="flex flex-col gap-1 text-[8.5px] font-bold text-slate-600">
										<div class="flex justify-between">
											<span>Needs:</span><span class="text-[#0BD28E]">Home Loan</span>
										</div>
										<div class="flex justify-between">
											<span>Amount:</span><span class="text-[#161616]">₹55,00,000</span>
										</div>
										<div class="flex justify-between">
											<span>City:</span><span class="text-slate-500">Noida</span>
										</div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 2. Application Workspace (Form Progress Fields) -->
								<!-- ============================================== -->
								<div
									class="absolute w-[190px] rounded-2xl border border-white/40 bg-white/45 p-3.5 text-left shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										z-index: {currentStep === 1 ? 40 : 10};
										opacity: {currentStep === 1 ? 1 : 0};
										visibility: {currentStep === 1 ? 'visible' : 'hidden'};
										pointer-events: {currentStep === 1 ? 'auto' : 'none'};
										transform: {currentStep < 1
										? 'translate(-50%, -50%) translate3d(0, 80px, -150px) scale(0.8) rotateX(-45deg)'
										: currentStep === 1
											? 'translate(-50%, -50%) translate3d(0, 0, 50px) scale(1) rotateX(0deg) rotateY(0deg)'
											: 'translate(-50%, -50%) translate3d(0, -45px, -150px) scale(0.5) rotateX(75deg) rotateY(30deg)'};
										filter: {currentStep === 1 ? 'none' : 'blur(4px)'};
									"
								>
									<div class="mb-2.5 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
										Application workspace
									</div>
									<div class="flex flex-col gap-1.5">
										<div class="flex justify-between text-[8px] font-bold text-slate-600">
											<span>Personal Details</span>
											<span class="text-[#0BD28E]">{profilePercent >= 42 ? '✓' : '...'}</span>
										</div>
										<div class="flex justify-between text-[8px] font-bold text-slate-600">
											<span>Employment Info</span>
											<span class="text-[#0BD28E]">{profilePercent >= 68 ? '✓' : '...'}</span>
										</div>
										<div class="flex justify-between text-[8px] font-bold text-slate-600">
											<span>Co-applicant details</span>
											<span class="text-[#0BD28E]">{profilePercent >= 100 ? '✓' : '...'}</span>
										</div>
									</div>
									<div
										class="mt-3.5 flex items-center justify-between border-t border-white/20 pt-2"
									>
										<span class="text-[8px] font-bold text-slate-400">Profile Progress:</span>
										<span class="text-[9px] font-extrabold text-[#0BD28E]">{profilePercent}%</span>
									</div>
									<div class="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
										<div
											class="h-full bg-[#0BD28E] transition-all duration-300"
											style="width: {profilePercent}%"
										></div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 3. AI Processing Card (Glow Sphere & Scan lines) -->
								<!-- ============================================== -->
								<div
									class="absolute w-[190px] rounded-2xl border border-white/40 bg-white/45 p-3.5 text-center shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										z-index: {currentStep === 2 ? 40 : 10};
										opacity: {currentStep === 2 ? 1 : 0};
										visibility: {currentStep === 2 ? 'visible' : 'hidden'};
										pointer-events: {currentStep === 2 ? 'auto' : 'none'};
										transform: {currentStep < 2
										? 'translate(-50%, -50%) translate3d(0, 80px, -150px) scale(0.8) rotateX(-45deg)'
										: currentStep === 2
											? 'translate(-50%, -50%) translate3d(0, 0, 50px) scale(1) rotateX(0deg) rotateY(0deg)'
											: 'translate(-50%, -50%) translate3d(0, -45px, -150px) scale(0.5) rotateX(75deg) rotateY(-30deg)'};
										filter: {currentStep === 2 ? 'none' : 'blur(4px)'};
									"
								>
									<!-- Laser Scan Beam -->
									<div
										class="animate-scan-line absolute left-0 z-30 h-[2px] w-full bg-gradient-to-r from-transparent via-[#0BD28E] to-transparent shadow-[0_0_8px_#0BD28E]"
										style="opacity: {currentStep === 2 ? 1 : 0};"
									></div>
									<!-- Glowing Rotating Orb -->
									<div
										class="ai-core-sphere relative mx-auto my-1 flex items-center justify-center"
									>
										<div
											class="absolute h-16 w-16 animate-spin rounded-full border border-dashed border-[#0BD28E]"
										></div>
										<div
											class="z-10 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-[#0BD28E]/10 text-[#0BD28E] shadow-[0_0_20px_rgba(11,210,142,0.2)]"
										>
											<span class="text-[7.5px] font-black uppercase">AI</span>
										</div>
									</div>
									<div
										class="mt-2 flex flex-col gap-1 text-left font-sans text-[8px] font-bold text-slate-600"
									>
										<div class="flex justify-between">
											<span>CIBIL:</span><span class="text-[#0BD28E]">✓ 785</span>
										</div>
										<div class="flex justify-between">
											<span>FOIR:</span><span class="text-[#0BD28E]">✓ 42%</span>
										</div>
										<div class="flex justify-between">
											<span>LTV:</span><span class="text-slate-800">✓ Assessed</span>
										</div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 4. AI Recommendation Report Card -->
								<!-- ============================================== -->
								<div
									class="absolute w-[190px] rounded-2xl border border-white/40 bg-white/45 p-3.5 text-left shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										z-index: {currentStep === 3 ? 40 : 10};
										opacity: {currentStep === 3 ? 1 : 0};
										visibility: {currentStep === 3 ? 'visible' : 'hidden'};
										pointer-events: {currentStep === 3 ? 'auto' : 'none'};
										transform: {currentStep < 3
										? 'translate(-50%, -50%) translate3d(0, 80px, -150px) scale(0.8) rotateX(-45deg)'
										: currentStep === 3
											? 'translate(-50%, -50%) translate3d(0, 0, 50px) scale(1) rotateX(0deg) rotateY(0deg)'
											: 'translate(-50%, -50%) translate3d(0, -45px, -150px) scale(0.5) rotateX(75deg) rotateY(30deg)'};
										filter: {currentStep === 3 ? 'none' : 'blur(4px)'};
									"
								>
									<div class="mb-2.5 text-[9px] font-bold tracking-wider text-[#0BD28E] uppercase">
										AI Underwriting report
									</div>
									<div
										class="mb-2.5 flex items-center justify-between rounded-lg border border-white/20 bg-white/30 p-2 backdrop-blur-sm"
									>
										<span class="text-[8px] font-bold text-slate-500">Approval probability</span>
										<span class="animate-pulse text-xs font-black text-[#161616]">96%</span>
									</div>
									<div class="flex flex-col gap-1.5 text-[8px] font-bold text-slate-600">
										<div class="flex justify-between">
											<span>Max Eligible:</span><span class="text-[#161616]">₹56,80,000</span>
										</div>
										<div class="flex justify-between">
											<span>Recommended:</span><span class="text-slate-700">20 Yrs Tenure</span>
										</div>
										<div class="flex justify-between">
											<span>Estimated EMI:</span><span class="text-slate-700">₹48,300/mo</span>
										</div>
										<div class="flex justify-between">
											<span>Risk Rating:</span><span
												class="rounded bg-emerald-50/50 px-1.5 py-0.5 text-emerald-600"
												>LOW RISK</span
											>
										</div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 5. Verified Bank Policy Matching Status -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute inset-0 flex flex-col justify-center p-3 text-left transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 4 ? 1 : currentStep === 5 ? 0.35 : 0};
										visibility: {currentStep === 4 || currentStep === 5 ? 'visible' : 'hidden'};
										transform: {currentStep === 4
										? 'translate3d(0, 0, 50px) scale(1)'
										: currentStep === 5
											? 'translate3d(-20px, 0, -50px) scale(0.95)'
											: 'translate3d(240px, 0, 0)'};
									"
								>
									<div
										class="mb-3 flex items-center gap-2 self-start rounded-xl border border-white/40 bg-white/45 p-2 shadow-md backdrop-blur-md"
									>
										<div
											class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0BD28E]/10 text-xs"
										>
											🛡️
										</div>
										<div class="flex flex-col">
											<span class="text-[9px] leading-none font-black text-[#161616]"
												>Verified Policy Match</span
											>
											<span class="mt-0.5 text-[7.5px] font-bold text-slate-400"
												>Policy models checked</span
											>
										</div>
									</div>
									<div class="grid grid-cols-2 gap-1.5 text-[8.5px] font-bold text-slate-600">
										<div class="rounded border border-white/20 bg-white/35 p-1.5 backdrop-blur-sm">
											✓ SBI policy match
										</div>
										<div class="rounded border border-white/20 bg-white/35 p-1.5 backdrop-blur-sm">
											✓ HDFC rules matched
										</div>
										<div
											class="rounded border border-[#0BD28E]/25 bg-[#0BD28E]/15 p-1.5 text-emerald-900"
										>
											✓ LIC Housing criteria
										</div>
										<div class="rounded border border-white/20 bg-white/35 p-1.5 backdrop-blur-sm">
											✓ Axis parameter sync
										</div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 6. Lender Offer Cards Deck (LIC / SBI / HDFC) -->
								<!-- ============================================== -->

								<!-- SBI Card (Exits on Step 6) -->
								<div
									class="absolute z-10 w-[180px] rounded-xl border border-white/10 bg-white/20 p-2.5 text-left shadow-sm backdrop-blur-md transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										opacity: {currentStep === 5 ? 0.6 : 0};
										visibility: {currentStep === 5 ? 'visible' : 'hidden'};
										pointer-events: {currentStep === 5 ? 'auto' : 'none'};
										transform: {currentStep < 5
										? 'translate(-50%, 25%) translate3d(280px, 0, -50px)'
										: currentStep === 5
											? 'translate(-50%, 25%) translate3d(0, 0, -50px)'
											: 'translate(-50%, 25%) translate3d(280px, 0, 0)'};
									"
								>
									<div class="flex items-center gap-2">
										<div
											class="flex h-6 w-6 items-center justify-center rounded bg-[#00a9e0] text-[8px] font-bold text-white"
										>
											SBI
										</div>
										<span class="text-[10px] font-bold text-[#161616]">State Bank of India</span>
									</div>
									<div class="mt-2 flex items-center justify-between text-[9px] font-semibold">
										<span class="text-slate-400">ROI</span>
										<span class="text-slate-700">8.30% ROI • 5D TAT</span>
									</div>
								</div>

								<!-- LIC Recommended Card (Moves center stage / recedes / disburses) -->
								<div
									class="absolute w-[180px] rounded-2xl border border-[#0BD28E]/40 bg-[#0BD28E]/10 p-3.5 text-left shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										opacity: {currentStep < 5 ? 0 : currentStep >= 12 ? 0 : 1};
										visibility: {currentStep >= 5 && currentStep <= 11 ? 'visible' : 'hidden'};
										pointer-events: {currentStep >= 5 && currentStep <= 11 ? 'auto' : 'none'};
										transform: {currentStep === 5
										? 'translate(-50%, -75%) translate3d(0, 0, 0px) rotateY(0deg)'
										: currentStep === 6
											? 'translate(-50%, -85%) translate3d(-40px, 0, 40px) rotateY(-5deg)'
											: currentStep === 7
												? 'translate(-50%, -85%) translate3d(-40px, 0, 40px) rotateY(-5deg)'
												: currentStep === 8
													? 'translate(-50%, -85%) translate3d(-40px, 0, 0px)'
													: currentStep === 9
														? 'translate(-50%, -85%) translate3d(-40px, 0, -40px)'
														: currentStep === 10
															? 'translate(-50%, -85%) translate3d(-40px, 0, 100px)'
															: currentStep === 11
																? 'translate(-50%, -85%) translate3d(-40px, 0, -60px)'
																: 'translate(-50%, -85%) translate3d(0, -340px, 100px)'};
										z-index: {currentStep === 5 ? 30 : currentStep === 10 ? 45 : 40};
									"
								>
									<div
										class="absolute top-0 right-0 rounded-bl bg-[#0BD28E] px-1.5 py-0.5 text-[7px] font-bold text-white"
									>
										RECOMMENDED
									</div>
									<div class="flex items-center gap-2">
										<div
											class="flex h-6 w-6 items-center justify-center rounded bg-amber-500 text-[8px] font-bold text-white"
										>
											LIC
										</div>
										<div class="flex flex-col">
											<span class="text-[10px] leading-none font-bold text-[#161616]"
												>LIC Housing</span
											>
											<span class="mt-0.5 text-[8px] text-slate-400">96% Approval Rate</span>
										</div>
									</div>
									<div class="my-2.5 h-px bg-white/20"></div>
									<div class="flex items-center justify-between text-[10px] font-bold">
										<span class="text-slate-400">ROI (EMI)</span>
										<span class="text-[#0BD28E]">8.20% ROI • 3D TAT</span>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 7. Relationship Manager Card (Rahul Mehta) -->
								<!-- Slides out from DIRECTLY BEHIND the LIC card! -->
								<!-- ============================================== -->
								<div
									class="absolute w-[180px] rounded-2xl border border-white/30 bg-white/50 p-3.5 text-left shadow-xl backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										top: 50%;
										opacity: {currentStep === 6 ? 1 : currentStep === 7 ? 1 : currentStep === 8 ? 0.8 : 0};
										visibility: {currentStep >= 6 && currentStep <= 8 ? 'visible' : 'hidden'};
										pointer-events: {currentStep >= 6 && currentStep <= 8 ? 'auto' : 'none'};
										transform: {currentStep === 6
										? 'translate(-50%, 15%) translate3d(-10px, 0, 40px) rotate(4deg)'
										: currentStep === 7
											? 'translate(-50%, 25%) translate3d(-10px, 0, 90px) rotate(0deg)'
											: currentStep === 8
												? 'translate(-50%, 25%) translate3d(-10px, 0, 0px)'
												: 'translate(-50%, 25%) translate3d(0, 45px, -80px) scale(0.7)'};
										z-index: {currentStep === 7 ? 45 : 35};
									"
								>
									<div class="flex items-center gap-2.5">
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/30 text-base backdrop-blur-sm"
										>
											👨‍💼
										</div>
										<div class="flex flex-col">
											<span class="text-[10px] leading-none font-bold text-[#161616]"
												>Rahul Mehta</span
											>
											<span class="mt-1 font-['Outfit'] text-[8px] font-bold text-[#0BD28E]"
												>⭐ Senior LIC RM • Online</span
											>
										</div>
									</div>
									<div class="my-2 h-px bg-white/20"></div>
									<div
										class="mb-2 flex items-center justify-between text-[8.5px] font-bold text-slate-500"
									>
										<span>Response Time</span>
										<span class="text-[#161616]">&lt; 2 Minutes</span>
									</div>
									<div class="grid grid-cols-2 gap-1 text-center text-[8px] font-bold">
										<span
											class="cursor-pointer rounded bg-[#25D366]/80 p-1 text-white backdrop-blur-sm"
											>WhatsApp</span
										>
										<span
											class="cursor-pointer rounded bg-[#161616]/80 p-1 text-white backdrop-blur-sm"
											>Call</span
										>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 8. RM Assisted Check Verification Milestones -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute inset-0 flex flex-col justify-center gap-1.5 p-3 text-left transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 7 ? 1 : 0};
										visibility: {currentStep === 7 ? 'visible' : 'hidden'};
										transform: {currentStep === 7 ? 'translateY(0) translateZ(30px)' : 'translateY(-120px) scale(0.7)'};
									"
								>
									<span class="mb-1 text-[9px] font-bold tracking-wider text-slate-400 uppercase"
										>Assisted File Vetting</span
									>
									{#each [{ name: 'Documents Vetted', active: true }, { name: 'Technical Appraisal', active: true }, { name: 'Legal Vetting Report', active: true }, { name: 'Credit Sanction Queue', active: false }] as ms}
										<div
											class="flex items-center justify-between rounded border border-white/20 bg-white/35 p-1.5 text-[8px] font-bold shadow-sm backdrop-blur-sm"
										>
											<span class={ms.active ? 'text-slate-800' : 'text-slate-400'}>{ms.name}</span>
											<span class={ms.active ? 'text-[#0BD28E]' : 'text-slate-300'}>✓</span>
										</div>
									{/each}
								</div>

								<!-- ============================================== -->
								<!-- 9. Live Timeline (Milestones roadmap) -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute inset-x-4 bottom-4 flex flex-col justify-center text-left transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										left: 50%;
										bottom: 16px;
										opacity: {currentStep === 8 ? 1 : 0};
										visibility: {currentStep === 8 ? 'visible' : 'hidden'};
										transform: {currentStep === 8
										? 'translate(-50%, 0) translate3d(0, 0, 40px)'
										: 'translate(-50%, 0) translate3d(0, 120px, 0)'};
										width: calc(100% - 32px);
									"
								>
									<span class="mb-3.5 text-[9px] font-bold tracking-wider text-slate-400 uppercase"
										>Direct API Milestone roadmap</span
									>
									<div class="relative flex items-center justify-between">
										<div class="absolute top-3 right-0 left-0 -z-10 h-0.5 bg-[#0BD28E]"></div>
										{#each [{ label: 'Lead', active: true }, { label: 'App Created', active: true }, { label: 'RM Sync', active: true }, { label: 'Valuation', active: true }, { label: 'Approved', active: false }] as node}
											<div class="flex flex-col items-center gap-1 bg-transparent px-1">
												<div
													class="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-black backdrop-blur-sm
													{node.active ? 'bg-[#0BD28E] text-white' : 'border border-white/20 bg-white/20 text-slate-400'}"
												>
													✓
												</div>
												<span class="text-[7.5px] font-bold">{node.label}</span>
											</div>
										{/each}
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 10. Automated Communication Alerts -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2.5 p-3 text-left transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 9 ? 1 : 0};
										visibility: {currentStep === 9 ? 'visible' : 'hidden'};
										transform: {currentStep === 9
										? 'translate3d(0, 0, 40px) scale(1)'
										: 'translate3d(-240px, 40px, 0) scale(0.8)'};
									"
								>
									<div
										class="flex items-center gap-2.5 rounded-xl border border-white/40 bg-white/45 p-2.5 shadow-md backdrop-blur-lg"
									>
										<span class="text-sm">📱</span>
										<div class="flex flex-col">
											<span class="text-[9px] leading-none font-extrabold text-slate-700"
												>Valuation link sent to client</span
											>
											<span class="mt-1 text-[8px] font-semibold text-slate-400"
												>Automatic WhatsApp notification dispatched</span
											>
										</div>
									</div>
									<div
										class="flex items-center gap-2.5 rounded-xl border border-white/40 bg-white/45 p-2.5 shadow-md backdrop-blur-lg"
									>
										<span class="text-sm">📩</span>
										<div class="flex flex-col">
											<span class="text-[9px] leading-none font-extrabold text-slate-700"
												>Salary slips OCR verified</span
											>
											<span class="mt-1 text-[8px] font-semibold text-slate-400"
												>TDS and tax returns matched with income</span
											>
										</div>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 11. Disbursement Complete Screen -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 10 ? 1 : 0};
										visibility: {currentStep === 10 ? 'visible' : 'hidden'};
										transform: {currentStep === 10
										? 'translate(-50%, -50%) scale(1.1) translateZ(150px)'
										: 'translate(-50%, -50%) scale(0.2) translateZ(-300px)'};
										z-index: 50;
									"
								>
									<div
										class="absolute flex h-24 w-24 animate-ping flex-col items-center justify-center rounded-full bg-[#0BD28E]/10"
									></div>
									<div
										class="relative z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border border-[#0BD28E]/40 bg-white/45 shadow-2xl backdrop-blur-lg"
									>
										<span class="text-[8px] font-bold tracking-wider text-[#0BD28E] uppercase"
											>DISBURSED</span
										>
										<span class="mt-0.5 text-lg font-black text-[#161616]">₹55,00,000</span>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 12. Commission Paid Credited Card -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 11 ? 1 : 0};
										visibility: {currentStep === 11 ? 'visible' : 'hidden'};
										transform: {currentStep === 11
										? 'translate(-50%, -50%) scale(1.1) translateZ(150px)'
										: 'translate(-50%, -50%) scale(0.2) translateZ(-300px)'};
										z-index: 50;
									"
								>
									<div
										class="relative rounded-2xl border border-[#0BD28E]/40 bg-[#161616]/75 p-4 text-center font-black text-[#FAFAF7] shadow-2xl backdrop-blur-lg"
									>
										<span class="mb-1 block text-[9px] tracking-widest text-[#0BD28E] uppercase"
											>Commission payout</span
										>
										<span class="block text-xl font-extrabold text-white">+₹42,350</span>
										<span class="mt-1 block text-[8px] text-slate-400"
											>Transferred Successfully</span
										>
									</div>
								</div>

								<!-- ============================================== -->
								<!-- 13. Portfolio Growth & Loop Summary -->
								<!-- ============================================== -->
								<div
									class="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col justify-center gap-2 rounded-2xl border border-white/40 bg-white/45 p-4 text-left backdrop-blur-lg transition-all duration-850 ease-[cubic-bezier(0.16,1,0.3,1)]"
									style="
										opacity: {currentStep === 12 ? 1 : 0};
										visibility: {currentStep === 12 ? 'visible' : 'hidden'};
										transform: {currentStep === 12
										? 'translate(-50%, -50%) scale(1) translateZ(50px)'
										: 'translate(-50%, -50%) scale(0.2) translateZ(-300px)'};
										width: 210px;
										z-index: 50;
									"
								>
									<span
										class="font-['Outfit'] text-[10px] font-extrabold tracking-wider text-[#0BD28E] uppercase"
										>DSA Agency Portfolio</span
									>
									<div class="flex flex-col gap-2 text-[9px] font-bold text-slate-700">
										<div
											class="flex justify-between rounded border border-white/20 bg-white/35 p-2"
										>
											<span>Completed Cases</span>
											<span class="text-[#161616]">{completedCases} Cases</span>
										</div>
										<div
											class="flex justify-between rounded border border-white/20 bg-white/35 p-2"
										>
											<span>Conversion Success</span>
											<span class="text-emerald-600">94% Rate</span>
										</div>
										<div
											class="flex justify-between rounded border border-white/10 bg-[#161616]/75 p-2 text-[#0BD28E]"
										>
											<span>Monthly Commission</span>
											<span class="font-mono font-bold"
												>₹{monthlyCommission.toLocaleString('en-IN')}</span
											>
										</div>
									</div>
								</div>
							</div>

							<!-- FOREGROUND PAYOUT LAYER: 3D Coins flying dynamically across columns in step 12 -->
							{#if currentStep === 11}
								{#each Array(8) as _, i}
									<div class="coin-particle-3d" style="--delay: {i * 150}ms;">🪙</div>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Copywriter details matching the active phase under the operating system visual block -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div
				class="grid grid-cols-1 items-center gap-8 border-t border-slate-200/60 pt-16 lg:grid-cols-12"
			>
				<!-- Text description columns -->
				<div class="flex flex-col gap-4 text-left lg:col-span-5">
					<span class="text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
						>Ecosystem Journey Track</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
					>
						{stepDetails[currentStep].title}
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[20px] leading-relaxed font-normal text-[#161616]/70"
					>
						{stepDetails[currentStep].desc}
					</p>
				</div>
				<!-- Action targets KPIs matrix -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
					{#each stepDetails[currentStep].kpis as kpi}
						<div
							class="flex flex-col gap-1.5 rounded-2xl border border-white/40 bg-white/35 p-4 text-left shadow-sm backdrop-blur-md"
						>
							<span class="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
								>Verified criteria</span
							>
							<span class="text-xs font-bold text-[#161616]">{kpi}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
		<!-- ========================================================================= -->
		<!-- ACT 1 — DISCOVER (THE CHAOS OF TRADITIONAL SOURCING) -->
		<!-- ========================================================================= -->
		<section class="mx-auto max-w-7xl border-t border-slate-200/60 px-[18px] pt-20 pb-24">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
				<!-- Left Text: The Chaos Pain Points -->
				<div class="flex flex-col gap-5 text-left lg:col-span-5">
					<span
						class="self-start rounded-full bg-rose-50 px-3 py-1 text-xs font-extrabold tracking-widest text-rose-500 uppercase"
						>Act 1 — Discover</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616] md:text-4xl"
					>
						Managing loans shouldn't be this complicated.
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[15px] leading-relaxed font-normal text-[#161616]/70"
					>
						Before DigitalDSA, your loan operations are scattered. Chasing bank relationship
						managers, logging into dozens of portals, updating Excel sheets, and hunting down client
						documents takes up your entire day.
					</p>

					<!-- Interactive Slide to Resolve Chaos -->
					<div
						class="mt-4 flex flex-col gap-3 rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-md"
					>
						<span class="text-[10px] font-bold tracking-wider text-slate-500 uppercase"
							>Drag to resolve chaos:</span
						>
						<input
							type="range"
							min="0"
							max="100"
							bind:value={chaosSliderVal}
							class="range-input-glass"
						/>
						<div class="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
							<span>Disconnected Tools (0)</span>
							<span>Centralized Workspace (100)</span>
						</div>
					</div>
				</div>

				<!-- Right Visual: The Chaos Desk vs Single Workflow Portal -->
				<div
					class="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-[32px] border border-slate-200/60 bg-slate-50/50 p-6 shadow-sm lg:col-span-7"
				>
					{#if chaosSliderVal < 80}
						<!-- Scattered Chaos View -->
						<div
							class="relative flex h-full min-h-[300px] w-full items-center justify-center transition-all duration-300"
						>
							<!-- 17 Browser Tabs floating -->
							<div
								class="absolute flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200 p-2.5 text-[8.5px] font-bold text-slate-500 shadow-sm transition-transform duration-300"
								style="transform: translate({-120 + chaosSliderVal}px, {-90 +
									chaosSliderVal * 0.5}px) rotate(-6deg);"
							>
								🌐 12 Active Bank Portals
							</div>
							<!-- Excel sheets -->
							<div
								class="absolute flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-200 p-2.5 text-[8.5px] font-bold text-slate-500 shadow-sm transition-transform duration-300"
								style="transform: translate({130 - chaosSliderVal}px, {-60 +
									chaosSliderVal * 0.3}px) rotate(4deg);"
							>
								📊 Sourcing_Tracker_2026.xlsx
							</div>
							<!-- WhatsApp alert -->
							<div
								class="absolute flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-100 p-2.5 text-[8.5px] font-bold text-rose-700 shadow-sm transition-transform duration-300"
								style="transform: translate({-70 + chaosSliderVal * 0.4}px, {70 -
									chaosSliderVal * 0.6}px) rotate(-12deg);"
							>
								💬 WhatsApp: "Is the sanction letter ready?"
							</div>
							<!-- Ringing phone icon -->
							<div
								class="absolute flex h-12 w-12 animate-bounce items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-xl shadow-md"
								style="transform: translate({80 - chaosSliderVal * 0.5}px, {60 -
									chaosSliderVal * 0.3}px);"
							>
								📞
							</div>
							<!-- Main central stress indicator -->
							<div
								class="max-w-[220px] rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-lg"
							>
								<span class="text-2xl">😓</span>
								<h3 class="mt-2 text-xs font-bold text-slate-800">Manual Sourcing Setup</h3>
								<p class="mt-1 text-[9px] text-slate-400">
									Processing delays • Bank follow-ups • Excel updates
								</p>
							</div>
						</div>
					{:else}
						<!-- Unified Workspace Card -->
						<div
							class="animate-scale-in w-full max-w-[400px] rounded-[28px] border border-white/40 bg-white/45 p-6 text-left shadow-xl backdrop-blur-lg transition-all duration-300"
						>
							<div class="mb-4 flex items-center justify-between border-b border-white/20 pb-3">
								<div class="flex items-center gap-1.5">
									<span class="h-2 w-2 animate-pulse rounded-full bg-[#0BD28E]"></span>
									<span class="text-[9px] font-bold tracking-wider text-[#0BD28E] uppercase"
										>Active Workspace</span
									>
								</div>
								<span
									class="rounded bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-600 uppercase"
									>Connected</span
								>
							</div>
							<div
								class="mb-3 flex items-center gap-3 rounded-xl border border-white/20 bg-white/30 p-3 shadow-sm backdrop-blur-md"
							>
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-[#0BD28E]/10 text-sm"
								>
									✓
								</div>
								<div class="flex flex-col">
									<span class="text-[10px] font-bold text-[#161616]">Your Sourcing Center</span>
									<span class="mt-0.5 text-[8px] text-slate-500"
										>All leads synced • Direct bank API gateways live</span
									>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-2 text-[8.5px] font-bold text-slate-600">
								<div
									class="flex items-center gap-1.5 rounded border border-emerald-100 bg-emerald-50/50 p-2 text-emerald-800"
								>
									<span>✓</span> Verified Policies Check
								</div>
								<div
									class="flex items-center gap-1.5 rounded border border-emerald-100 bg-emerald-50/50 p-2 text-emerald-800"
								>
									<span>✓</span> Assigned RM Sync
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- ========================================================================= -->
		<!-- ACT 2 — TRANSFORM (ONE UNIFIED PLATFORM & AI VERIFICATION) -->
		<!-- ========================================================================= -->

		<!-- Section 4: One Platform Circular Loop -->
		<section class="mx-auto max-w-7xl border-t border-slate-200/60 px-[18px] pt-20 pb-24">
			<div class="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-3 text-center">
				<span
					class="rounded-full border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-3 py-1 text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
					>Act 2 — Transform</span
				>
				<h2
					class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616] md:text-4xl"
				>
					Everything you need in one workspace
				</h2>
				<p class="font-['Inter',sans-serif] font-normal text-[#161616]/70">
					DigitalDSA connects every stage of the loan lifecycle into one continuous, automated
					sourcing pipeline.
				</p>
			</div>

			<!-- Circular Pipeline Diagram -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				{#each [{ step: '01', title: 'Create Case', desc: 'Open a single loan form. Applicant information, income, obligations, and KYC compile in minutes.' }, { step: '02', title: 'AI Screen', desc: 'Automated verification maps credit reports, salary structures, and profiles against lender terms.' }, { step: '03', title: 'Bank Match', desc: 'Filter through verified policy parameters across 150+ lenders to find eligible offers.' }, { step: '04', title: 'RM Handover', desc: 'Submit files digitally. Cases flow directly to assigned bank Relationship Managers.' }, { step: '05', title: 'Disbursal', desc: 'Real-time updates track legal and sanction updates, triggering automated commission payouts.' }] as card}
					<div
						class="flex flex-col gap-3.5 rounded-2xl border border-white/30 bg-white/20 p-5 text-left backdrop-blur-md transition-all duration-300 hover:border-[#0BD28E]/30"
					>
						<span class="font-mono text-xs font-extrabold text-[#0BD28E]">{card.step}</span>
						<h3 class="text-sm font-black text-[#161616]">{card.title}</h3>
						<p class="text-[11px] leading-relaxed font-medium text-slate-500">{card.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Section 5: AI Eligibility & Policy Matching (Bank passes & rejections) -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
				<!-- Left Text -->
				<div class="flex flex-col gap-4 text-left lg:col-span-5">
					<span class="text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
						>AI Screening</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
					>
						Find the Best Bank Automatically
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[15px] leading-relaxed font-normal text-[#161616]/70"
					>
						Stop guessing which lender will approve your case. Our policy validation engine analyzes
						salary rules, CIBIL scores, FOIR ratios, and property details in real-time, showing why
						banks pass or fail.
					</p>
					<div class="flex flex-col gap-2 text-xs font-bold text-slate-600">
						<div class="flex items-center gap-2">✓ Verified bank policies updated hourly</div>
						<div class="flex items-center gap-2">
							✓ Check 150+ bank criteria matrices in 3 seconds
						</div>
						<div class="flex items-center gap-2">
							✓ Spot hidden policy rejections before submission
						</div>
					</div>
				</div>

				<!-- Right Visual: The Validation Terminal -->
				<div
					class="rounded-[32px] border border-white/40 bg-white/35 p-6 text-left shadow-xl backdrop-blur-md lg:col-span-7"
				>
					<div class="mb-4 flex items-center justify-between border-b border-white/20 pb-3">
						<span class="text-[10px] font-extrabold text-slate-400 uppercase"
							>AI Verification Log — Case #4982</span
						>
						<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-[#0BD28E]"></span>
					</div>

					<div class="flex flex-col gap-3 font-sans">
						<!-- Target checks -->
						<div
							class="flex items-center justify-between rounded-lg border border-rose-100/50 bg-rose-50/50 p-2.5 text-[10px] font-bold text-slate-600"
						>
							<span class="flex items-center gap-2">🏦 SBI Policy check:</span>
							<span class="font-extrabold text-rose-600"
								>❌ FOIR Limit Exceeded (FOIR: 65% vs max 50%)</span
							>
						</div>
						<div
							class="flex items-center justify-between rounded-lg border border-rose-100/50 bg-rose-50/50 p-2.5 text-[10px] font-bold text-slate-600"
						>
							<span class="flex items-center gap-2">🏦 Axis Bank check:</span>
							<span class="font-extrabold text-rose-600"
								>❌ Property Category mismatch (Unapproved zone)</span
							>
						</div>
						<div
							class="flex items-center justify-between rounded-lg border border-emerald-100/50 bg-emerald-50/50 p-2.5 text-[10px] font-bold text-slate-600"
						>
							<span class="flex items-center gap-2">🛡️ LIC Housing check:</span>
							<span class="font-extrabold text-emerald-600"
								>✅ Best Match (96% Approval Chance)</span
							>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 6: Compare Verified Bank Offers -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div class="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-3 text-center">
				<h2
					class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
				>
					Compare Bank Offers
				</h2>
				<p class="font-['Inter',sans-serif] font-normal text-[#161616]/70">
					Compare eligible lenders on interest rates, processing fees, EMIs, and turnaround times.
				</p>
			</div>

			<!-- Offers Comparison Matrix Table -->
			<div
				class="overflow-x-auto rounded-3xl border border-white/30 bg-white/20 shadow-sm backdrop-blur-md"
			>
				<table class="w-full min-w-[600px] border-collapse text-left text-xs">
					<thead>
						<tr
							class="border-b border-white/20 bg-white/10 font-bold tracking-wider text-slate-500 uppercase"
						>
							<th class="p-4">Bank</th>
							<th class="p-4">ROI (Interest)</th>
							<th class="p-4">Estimated EMI</th>
							<th class="p-4">Approval Chance</th>
							<th class="p-4">Expected TAT</th>
							<th class="p-4">Recommended</th>
							<th class="p-4">Action</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/10 font-bold text-slate-700">
						<!-- Row 1: LIC Recommended -->
						<tr class="border-l-4 border-l-[#0BD28E] bg-[#0BD28E]/5">
							<td class="flex items-center gap-2 p-4">
								<span class="h-2.5 w-2.5 rounded-full bg-[#0BD28E]"></span>
								<span>LIC Housing Finance</span>
							</td>
							<td class="p-4 font-mono text-[#0BD28E]">8.20%</td>
							<td class="p-4">₹46,680 /mo</td>
							<td class="p-4 text-emerald-600">96% Chance</td>
							<td class="p-4">3 Days</td>
							<td class="p-4">
								<span
									class="rounded bg-[#0BD28E] px-1.5 py-0.5 text-[7.5px] font-bold text-white uppercase"
									>Recommended</span
								>
							</td>
							<td class="p-4">
								<button
									class="cursor-pointer rounded-full border-none bg-[#161616] px-3.5 py-1.5 text-[10px] font-black text-[#0BD28E] transition-transform hover:scale-102"
									>Proceed</button
								>
							</td>
						</tr>
						<!-- Row 2: SBI -->
						<tr>
							<td class="p-4 pl-6">State Bank of India</td>
							<td class="p-4 font-mono">8.30%</td>
							<td class="p-4">₹47,025 /mo</td>
							<td class="p-4 text-slate-600">92% Chance</td>
							<td class="p-4">5 Days</td>
							<td class="p-4"><span class="text-slate-400">—</span></td>
							<td class="p-4">
								<button
									class="cursor-pointer rounded-full border border-slate-300 bg-slate-500/10 px-3.5 py-1.5 text-[10px] font-black text-slate-700"
									>Proceed</button
								>
							</td>
						</tr>
						<!-- Row 3: HDFC -->
						<tr>
							<td class="p-4 pl-6">HDFC Bank</td>
							<td class="p-4 font-mono">8.35%</td>
							<td class="p-4">₹47,198 /mo</td>
							<td class="p-4 text-slate-600">89% Chance</td>
							<td class="p-4">4 Days</td>
							<td class="p-4"><span class="text-slate-400">—</span></td>
							<td class="p-4">
								<button
									class="cursor-pointer rounded-full border border-slate-300 bg-slate-500/10 px-3.5 py-1.5 text-[10px] font-black text-slate-700"
									>Proceed</button
								>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Section 7: RM Collaboration (Live message simulator) -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
				<!-- Left Text: Vetting Collaboration -->
				<div class="flex flex-col gap-4 text-left lg:col-span-5">
					<span class="text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
						>RM Partnership</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
					>
						Work Directly with the Bank RM
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[15px] leading-relaxed font-normal text-[#161616]/70"
					>
						We link cases directly with assigned bank Relationship Managers. The RM guides your file
						through every stage—from document collection to valuation checks, credit approvals, and
						disbursals.
					</p>

					<!-- RM Responsibilities indicators -->
					<div class="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 uppercase">
						<span class="rounded border border-slate-200 bg-slate-100 px-2.5 py-1"
							>Collects Documents</span
						>
						<span class="rounded border border-slate-200 bg-slate-100 px-2.5 py-1"
							>Coordinates Valuation</span
						>
						<span class="rounded border border-slate-200 bg-slate-100 px-2.5 py-1"
							>Tracks Credit Approval</span
						>
						<span class="rounded border border-slate-200 bg-slate-100 px-2.5 py-1"
							>Issues Sanction Letter</span
						>
					</div>

					<!-- Trigger Case Vetting Simulation -->
					<button
						onclick={advanceChat}
						class="mt-4 cursor-pointer self-start rounded-full border-none bg-[#0BD28E] px-5 py-3 text-xs font-bold text-[#161616] shadow-sm transition-all hover:bg-[#5FF7A6]"
					>
						{chatStep === 0
							? 'Start Document Vetting'
							: chatStep < 3
								? 'Process Next Check'
								: 'Reset Chat Logs'}
					</button>
				</div>

				<!-- Right Chat Frame -->
				<div
					class="rounded-[32px] border border-white/40 bg-white/45 p-6 text-left shadow-xl backdrop-blur-lg lg:col-span-7"
				>
					<div class="mb-4 flex items-center gap-3 border-b border-white/20 pb-3.5">
						<div class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg">
							👨‍💼
						</div>
						<div class="flex flex-col">
							<span class="text-xs leading-none font-bold text-[#161616]"
								>Rahul Mehta (Assigned RM)</span
							>
							<span
								class="mt-1 animate-pulse text-[8px] font-bold tracking-wider text-[#0BD28E] uppercase"
								>● LIC Housing Finance • Online</span
							>
						</div>
					</div>

					<!-- Simulated Chat Log Items -->
					<div class="flex max-h-[220px] min-h-[160px] flex-col gap-3 overflow-y-auto pr-1">
						{#each chatLogs as log}
							<div
								class="flex max-w-[85%] flex-col rounded-xl p-2.5 text-[9.5px] leading-normal font-bold
								{log.sender === 'RM'
									? 'self-start border border-[#0BD28E]/25 bg-[#0BD28E]/10 text-emerald-950'
									: 'self-end border border-slate-200 bg-slate-100 text-slate-800'}"
							>
								<span>{log.text}</span>
								<span class="mt-1 self-end text-[7.5px] font-semibold text-slate-400"
									>{log.time}</span
								>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- ========================================================================= -->
		<!-- ACT 3 — OPERATE (COMMAND CENTER & REAL-TIME CONTROL TOWER) -->
		<!-- ========================================================================= -->

		<!-- Section 8: Sourcing Workspace Dashboard command center -->
		<section class="mx-auto max-w-7xl border-t border-slate-200/60 px-[18px] pt-20 pb-24">
			<div class="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-3 text-center">
				<span
					class="rounded-full border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-3 py-1 text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
					>Act 3 — Operate</span
				>
				<h2
					class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616] md:text-4xl"
				>
					Manage Every Loan from One Dashboard
				</h2>
				<p class="font-['Inter',sans-serif] font-normal text-[#161616]/70">
					An active, real-time command cockpit tracking files, pending approvals, and commissions.
				</p>
			</div>

			<!-- Realistic Sourcing Command Center Grid -->
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Box 1: Cases Summary -->
				<div
					class="flex flex-col justify-between gap-4 rounded-[24px] border border-white/30 bg-white/20 p-5 text-left shadow-sm backdrop-blur-md"
				>
					<div class="flex flex-col gap-1">
						<span class="text-[9px] font-bold tracking-widest text-slate-400 uppercase"
							>Workspace</span
						>
						<h3 class="text-sm font-black text-[#161616]">Today's Cases</h3>
					</div>
					<div class="text-2xl font-black text-[#161616]">12 Active</div>
					<span
						class="self-start rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600"
						>4 Pending documents</span
					>
				</div>

				<!-- Box 2: Offers -->
				<div
					class="flex flex-col justify-between gap-4 rounded-[24px] border border-white/30 bg-white/20 p-5 text-left shadow-sm backdrop-blur-md"
				>
					<div class="flex flex-col gap-1">
						<span class="text-[9px] font-bold tracking-widest text-slate-400 uppercase"
							>Vetting</span
						>
						<h3 class="text-sm font-black text-[#161616]">Active Offers</h3>
					</div>
					<div class="text-2xl font-black text-[#161616]">3 Verified</div>
					<span
						class="self-start rounded border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-2 py-0.5 text-[9px] font-bold text-[#0BD28E]"
						>LIC match at 8.20%</span
					>
				</div>

				<!-- Box 3: RM Chat status -->
				<div
					class="flex flex-col justify-between gap-4 rounded-[24px] border border-white/30 bg-white/20 p-5 text-left shadow-sm backdrop-blur-md"
				>
					<div class="flex flex-col gap-1">
						<span class="text-[9px] font-bold tracking-widest text-slate-400 uppercase"
							>Support</span
						>
						<h3 class="text-sm font-black text-[#161616]">RM Chats</h3>
					</div>
					<div class="text-2xl font-black text-[#161616]">2 Channels</div>
					<span
						class="self-start rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600"
						>Rahul online</span
					>
				</div>

				<!-- Box 4: Commissions -->
				<div
					class="flex flex-col justify-between gap-4 rounded-[24px] border border-[#0BD28E]/20 bg-[#0BD28E]/5 p-5 text-left shadow-sm backdrop-blur-md"
				>
					<div class="flex flex-col gap-1">
						<span class="text-[9px] font-bold tracking-widest text-[#0BD28E] uppercase"
							>Earnings Ledger</span
						>
						<h3 class="text-sm font-black text-[#161616]">Total Commissions</h3>
					</div>
					<div class="text-2xl font-black text-[#161616]">₹2,84,500</div>
					<span
						class="self-start rounded bg-[#0BD28E]/20 px-2 py-0.5 text-[9px] font-bold text-emerald-800"
						>₹42,350 Sourced today</span
					>
				</div>
			</div>
		</section>

		<!-- Section 9: Live Control Tower Feed ("Real-Time Loan Operations") -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
				<!-- Left Text -->
				<div class="flex flex-col gap-4 text-left lg:col-span-5">
					<span class="text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
						>Operations</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
					>
						Real-Time Loan Operations
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[15px] leading-relaxed font-normal text-[#161616]/70"
					>
						Monitor bank connection states, API availability indicators, and live pipeline
						activities scrolling across the dashboard feed.
					</p>
				</div>

				<!-- Right Visual: The Control Tower Terminal HUD -->
				<div
					class="relative rounded-[32px] border border-[#161616] bg-[#161616]/90 p-6 font-mono text-xs text-[#FAFAF7] shadow-2xl lg:col-span-7"
				>
					<div
						class="mb-4 flex items-center justify-between border-b border-white/10 pb-3 text-[10px] text-slate-400"
					>
						<span>──────────────────────────</span>
						<span class="animate-pulse text-[#0BD28E]">● LIVE TOWER OPERATIONS</span>
						<span>──────────────────────────</span>
					</div>

					<div class="mb-4 grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
						<div class="flex flex-col gap-1">
							<span class="text-[8px] tracking-wider text-slate-500 uppercase"
								>AI Platform Health</span
							>
							<span class="text-[10px] font-bold text-[#0BD28E]">██████████ 99.98%</span>
						</div>
						<div class="flex flex-col gap-1">
							<span class="text-[8px] tracking-wider text-slate-500 uppercase">Active Bank RMs</span
							>
							<span class="text-xs font-bold text-slate-200">42 Online</span>
						</div>
						<div class="flex flex-col gap-1">
							<span class="text-[8px] tracking-wider text-slate-500 uppercase"
								>Verified Lender Slabs</span
							>
							<span class="text-xs font-bold text-slate-200">146 / 150 Active</span>
						</div>
						<div class="flex flex-col gap-1">
							<span class="text-[8px] tracking-wider text-slate-500 uppercase"
								>Daily Sourced Cases</span
							>
							<span class="text-xs font-bold text-emerald-400">1,284 Cases</span>
						</div>
					</div>

					<div class="flex flex-col gap-2 text-left text-[9px] text-[#0BD28E]">
						<span class="mb-1 text-[8px] tracking-widest text-slate-500 uppercase"
							>Live Activity Logs</span
						>
						{#each liveTowerLogs as log}
							<div class="flex gap-2.5">
								<span class="font-semibold text-slate-500">10:45 AM</span>
								<span>✓ {log}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Section 11: Traditional Process vs With DigitalDSA Comparison -->
		<section class="mx-auto max-w-7xl border-t border-slate-200/60 px-[18px] pt-20 pb-24">
			<div class="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-3 text-center">
				<span
					class="rounded-full border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-3 py-1 text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
					>Why Switch?</span
				>
				<h2
					class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
				>
					Why Sourcing Partners Choose DigitalDSA
				</h2>
				<p class="font-['Inter',sans-serif] font-normal text-[#161616]/70">
					Reconciling manual files with automated matching systems.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 text-left md:grid-cols-2">
				<!-- Left: Traditional Process -->
				<div class="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
					<h3 class="text-base font-bold tracking-wider text-slate-500 uppercase">
						Traditional Process
					</h3>
					<div class="flex flex-col gap-3.5 text-xs font-bold text-slate-600">
						<div class="flex items-start gap-3">
							<span class="text-rose-500">✕</span>
							<span>Apply to banks one by one, filling separate documents.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-rose-500">✕</span>
							<span>Manually check candidate criteria files against policies.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-rose-500">✕</span>
							<span>Call bank relationship managers repeatedly for case updates.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-rose-500">✕</span>
							<span>Manual commission tracking with spreadsheet reconciliations.</span>
						</div>
					</div>
				</div>

				<!-- Right: With DigitalDSA -->
				<div
					class="flex flex-col gap-4 rounded-[28px] border border-emerald-500/20 bg-emerald-50/20 p-6"
				>
					<h3 class="text-base font-bold tracking-wider text-[#0BD28E] uppercase">
						With DigitalDSA
					</h3>
					<div class="flex flex-col gap-3.5 text-xs font-bold text-emerald-950">
						<div class="flex items-start gap-3">
							<span class="text-[#0BD28E]">✓</span>
							<span>Create a single loan application once, submit to any lender.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-[#0BD28E]">✓</span>
							<span>AI policy verification handles eligibility scanning in seconds.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-[#0BD28E]">✓</span>
							<span>Direct RM connections and live milestones update automatically.</span>
						</div>
						<div class="flex items-start gap-3">
							<span class="text-[#0BD28E]">✓</span>
							<span>Automated commission dashboard triggers payouts upon disbursals.</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ========================================================================= -->
		<!-- ACT 4 — GROW (EVOLUTION MATURITY & FINAL CTA) -->
		<!-- ========================================================================= -->

		<!-- Section 10: Business Evolution Map -->
		<section class="mx-auto max-w-7xl border-t border-slate-200/60 px-[18px] pt-20 pb-24">
			<div class="mx-auto mb-16 flex max-w-3xl flex-col items-center gap-3 text-center">
				<span
					class="rounded-full border border-[#0BD28E]/20 bg-[#0BD28E]/10 px-3 py-1 text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
					>Act 4 — Grow</span
				>
				<h2
					class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616] md:text-4xl"
				>
					Grow Without Changing Your Workflow
				</h2>
				<p class="font-['Inter',sans-serif] font-normal text-[#161616]/70">
					DigitalDSA scales with your organization size, whether you are an independent advisor or
					an enterprise builder network.
				</p>
			</div>

			<!-- Evolution slider interactive control -->
			<div
				class="grid grid-cols-1 items-center gap-10 rounded-[32px] border border-white/30 bg-white/20 p-8 shadow-sm backdrop-blur-md lg:grid-cols-12"
			>
				<!-- Left Slider details -->
				<div class="flex flex-col gap-6 text-left lg:col-span-6">
					<div class="flex flex-col gap-1.5">
						<span class="text-[10px] font-black tracking-wider text-slate-500 uppercase"
							>Business Evolution Map</span
						>
						<h3
							class="font-['Inter',sans-serif] text-2xl font-semibold tracking-[-0.04em] text-[#161616]"
						>
							{#if maturityIndex === 0}Independent DSA
							{:else}
								{maturityLevels[
									maturityIndex === 1 ? 1 : maturityIndex === 2 ? 2 : maturityIndex === 3 ? 3 : 4
								].label}
							{/if}
						</h3>
						<p class="mt-2 text-xs leading-relaxed font-medium text-slate-500">
							{#if maturityIndex === 0}Manage cases independently. Filter policies and connect with
								bank RMs through a single workspace.
							{:else if maturityIndex === 1}Add 3-5 agents. Track leads, documents, and individual
								targets in a unified dashboard.
							{:else if maturityIndex === 2}Set up regional branch offices. Consolidate file reports
								and commission splits centrally.
							{:else if maturityIndex === 3}Manage builder site sales teams, pipeline allocations,
								and client project payouts.
							{:else if maturityIndex === 4}Operate regional distribution franchises with custom CRM
								APIs and direct RM routing pathways.
							{/if}
						</p>
					</div>

					<input
						type="range"
						min="0"
						max="4"
						step="1"
						bind:value={maturityIndex}
						class="range-input-glass"
					/>
					<div class="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
						<span>Independent</span>
						<span>Small Team</span>
						<span>Branch Office</span>
						<span>Builder Team</span>
						<span>Enterprise</span>
					</div>
				</div>

				<!-- Right Metrics projection card -->
				<div
					class="rounded-2xl border border-white/40 bg-white/45 p-6 text-left shadow-md backdrop-blur-md lg:col-span-6"
				>
					<div class="mb-3 flex items-center justify-between border-b border-slate-200/50 pb-2">
						<span class="text-[9px] font-bold text-slate-500 uppercase">Operating Volume</span>
						<span class="rounded bg-emerald-50 px-2 py-0.5 text-[8px] font-bold text-emerald-600"
							>Active projection</span
						>
					</div>
					<div class="flex flex-col gap-2.5 text-xs font-bold text-slate-700">
						<div class="flex justify-between">
							<span>Workspace scale:</span>
							<span class="text-[#161616]">
								{#if maturityIndex === 0}Solo Advisor
								{:else if maturityIndex === 1}3-5 Agents
								{:else if maturityIndex === 2}2 Regional Branches
								{:else if maturityIndex === 3}Builder Sales Group
								{:else}Enterprise Network
								{/if}
							</span>
						</div>
						<div class="flex justify-between">
							<span>Monthly files processed:</span>
							<span class="text-[#161616]">
								{#if maturityIndex === 0}10-15 Cases/mo
								{:else if maturityIndex === 1}30-50 Cases/mo
								{:else if maturityIndex === 2}80-120 Cases/mo
								{:else if maturityIndex === 3}200-300 Cases/mo
								{:else}800+ Cases/mo
								{/if}
							</span>
						</div>
						<div
							class="mt-2 flex justify-between border-t border-slate-100 pt-2 font-['Inter',sans-serif] text-base font-semibold text-[#0BD28E]"
						>
							<span>Average commission splits:</span>
							<span class="font-mono">
								{#if maturityIndex === 0}₹95,000/mo
								{:else if maturityIndex === 1}₹3,40,000/mo
								{:else if maturityIndex === 2}₹8,50,000/mo
								{:else if maturityIndex === 3}₹18,00,000/mo
								{:else}₹75,00,000/mo
								{/if}
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 11: Security Vault & compliance info -->
		<section class="mx-auto max-w-7xl px-[18px] pb-24">
			<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
				<!-- Left text -->
				<div class="flex flex-col gap-4 text-left lg:col-span-5">
					<span class="text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
						>Bank-grade Security</span
					>
					<h2
						class="font-['Inter',sans-serif] text-3xl font-semibold tracking-[-0.04em] text-[#161616]"
					>
						Verified Data Vault
					</h2>
					<p
						class="font-['Inter',sans-serif] text-[15px] leading-relaxed font-normal text-[#161616]/70"
					>
						We implement strict data isolation protocols. Customer documents pass through encrypted
						tunnels directly to bank vaults with detailed access controls.
					</p>
				</div>

				<!-- Right visual tunnel shield graphic -->
				<div
					class="flex items-center justify-between gap-6 rounded-[32px] border border-white/40 bg-white/35 p-6 shadow-sm backdrop-blur-md lg:col-span-7"
				>
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-2xl"
					>
						🔑
					</div>
					<div class="flex flex-1 flex-col gap-1.5 text-left">
						<span class="text-[10px] font-black tracking-wide text-emerald-800 uppercase"
							>Encrypted Transit Tunnel</span
						>
						<span class="text-[8px] font-bold text-slate-500"
							>RBI-aligned compliance controls • Immutable audit database entries</span
						>
					</div>
					<div
						class="h-12 w-12 animate-spin rounded-full border-2 border-dashed border-emerald-400"
					></div>
				</div>
			</div>
		</section>

		<!-- Section 12: final Call To Action -->
		<section class="mx-auto max-w-7xl px-[18px] pb-32">
			<div
				class="relative flex flex-col items-center gap-6 overflow-hidden rounded-[36px] bg-gradient-to-br from-[#161616] to-[#20221B] p-8 text-center text-[#FAFAF7] shadow-2xl md:p-14"
			>
				<!-- Background connection nodes grid -->
				<div class="pointer-events-none absolute inset-0 opacity-15">
					<div
						class="absolute top-10 left-10 h-24 w-24 animate-pulse rounded-full border border-white/20"
					></div>
					<div
						class="absolute right-10 bottom-10 h-32 w-32 animate-pulse rounded-full border border-white/20"
					></div>
				</div>

				<span
					class="relative z-10 rounded-full border border-[#0BD28E]/25 bg-[#0BD28E]/10 px-3.5 py-1 text-xs font-extrabold tracking-widest text-[#0BD28E] uppercase"
					>Get Started Today</span
				>
				<h2
					class="relative z-10 max-w-3xl font-['Inter',sans-serif] text-3xl leading-tight font-semibold tracking-[-0.04em] md:text-5xl"
				>
					Start sourcing smarter with DigitalDSA.
				</h2>
				<p
					class="relative z-10 max-w-xl font-['Inter',sans-serif] text-xs leading-relaxed font-normal text-slate-400 md:text-sm"
				>
					Create better loan offers. Work directly with lenders. Close more cases.
				</p>

				<div class="relative z-10 mt-4 flex flex-col gap-4 sm:flex-row">
					<button
						class="cursor-pointer rounded-full border-none bg-[#0BD28E] px-8 py-3.5 font-bold text-[#161616] transition-all duration-200 hover:scale-103 hover:bg-[#5FF7A6]"
						>Become a Partner</button
					>
					<button
						class="cursor-pointer rounded-full border border-white/30 bg-transparent px-8 py-3.5 font-bold text-white transition-all duration-200 hover:scale-103 hover:bg-white/10"
						>Book a Demo</button
					>
				</div>
			</div>
		</section>
	</div>
</main>

<style>
	/* Clean scrollbars */
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	/* Faint noise overlay */
	.noise-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0.016;
		pointer-events: none;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
		z-index: 10;
	}

	.btn-premium {
		transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1) !important;
	}

	/* Floating background gradient orbs */
	@keyframes floatOrbMint {
		0%,
		100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		33% {
			transform: translate(40px, -60px) scale(1.1) rotate(45deg);
		}
		66% {
			transform: translate(-30px, 30px) scale(0.95) rotate(-30deg);
		}
	}
	.animate-orb-mint {
		animation: floatOrbMint 15s ease-in-out infinite;
	}

	@keyframes floatOrbYellow {
		0%,
		100% {
			transform: translate(0, 0) scale(1) rotate(0deg);
		}
		50% {
			transform: translate(-50px, 50px) scale(1.05) rotate(-45deg);
		}
	}
	.animate-orb-yellow {
		animation: floatOrbYellow 12s ease-in-out infinite;
	}

	/* Logo scrolling marquee animation */
	.marquee-track {
		display: flex;
		overflow: hidden;
		width: 100%;
	}
	.marquee-content {
		display: flex;
		width: max-content;
		animation: scroll-logos-horizontal 50s linear infinite;
	}
	@keyframes scroll-logos-horizontal {
		0% {
			transform: translate3d(0, 0, 0);
		}
		100% {
			transform: translate3d(-50%, 0, 0);
		}
	}

	/* Premium button gradients */
	.hero-cta-button {
		background: linear-gradient(90deg, #0bd28e, #5ff7a6) !important;
		border: 1px solid #0bd28e !important;
		color: #161616 !important;
		transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1) !important;
	}
	.hero-cta-button:hover {
		background: linear-gradient(90deg, #5ff7a6, #0bd28e) !important;
		border-color: #5ff7a6 !important;
	}

	/* Core Canvas 3D Staging Transition */
	.motion-stage div {
		transition: all 850ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* Phase 3: AI Rotation */
	.ai-core-sphere {
		perspective: 800px;
		transform-style: preserve-3d;
	}

	/* Phase 4: OCR Scanner line */
	@keyframes scanLine {
		0%,
		100% {
			top: 5%;
		}
		50% {
			top: 95%;
		}
	}
	.animate-scan-line {
		animation: scanLine 2.2s ease-in-out infinite;
	}

	/* Phase 7: Winner Glow */
	@keyframes winnerPulse {
		0%,
		100% {
			box-shadow: 0 0 15px rgba(11, 210, 142, 0.2);
			transform: translateX(-70px) translateY(45px) scale(1.15) translateZ(80px) rotateY(-5deg);
		}
		50% {
			box-shadow: 0 0 35px rgba(11, 210, 142, 0.55);
			transform: translateX(-70px) translateY(45px) scale(1.18) translateZ(95px) rotateY(-5deg);
		}
	}
	.animate-winner-glow {
		animation: winnerPulse 2.5s ease-in-out infinite;
	}

	/* Phase 14: Coins fly across columns */
	@keyframes flyToWallet {
		0% {
			left: 360px;
			top: 80px;
			transform: scale(0.6) rotate(0deg);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		85% {
			opacity: 1;
		}
		100% {
			left: 40px;
			top: 230px;
			transform: scale(1.2) rotate(360deg);
			opacity: 0;
		}
	}
	.coin-particle-3d {
		position: absolute;
		font-size: 24px;
		z-index: 50;
		animation: flyToWallet 1.5s cubic-bezier(0.25, 1, 0.5, 1) var(--delay) infinite;
	}

	/* Utility animations */
	@keyframes scaleIn {
		0% {
			transform: scale(0.7);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.animate-scale-in {
		animation: scaleIn 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
	}

	@keyframes slideUp {
		0% {
			transform: translateY(20px);
			opacity: 0;
		}
		100% {
			transform: translateY(0);
			opacity: 1;
		}
	}
	.animate-slide-up {
		animation: slideUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
	}

	@keyframes fadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
	.animate-fade-in {
		animation: fadeIn 0.6s ease-out forwards;
	}

	/* Interactive Payout Calculator Styles */
	.range-input-glass {
		-webkit-appearance: none;
		width: 100%;
		height: 6px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.1);
		outline: none;
	}
	.range-input-glass::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #0bd28e;
		box-shadow: 0 0 10px #0bd28e;
		cursor: pointer;
		border: 2px solid white;
		transition: transform 0.15s cubic-bezier(0.25, 1, 0.5, 1);
	}
	.range-input-glass::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}
</style>
