import type { LandingPageConfig } from '$lib/types/landing';
import { howCanWeHelpRoute } from '$lib/config/routes.js';

export const landingPageConfig: LandingPageConfig = {
	hero: {
		headline: 'Stop guessing. Start comparing.',
		subheadline:
			'DigitalDSA matches your exact financial profile against 100+ lenders to find you the lowest rate — without sharing your phone number.',
		ctaText: 'Find Your Best Rate',
		trustIndicators: [
			{ label: 'Lender Partners', value: '100+', icon: 'bank' },
			{ label: 'Loans Matched', value: '2,940+', icon: 'check' },
			{ label: 'Cities Covered', value: '80+', icon: 'map' },
			{ label: 'Avg. Savings', value: '₹1.2L', icon: 'savings' }
		]
	},
	loanProducts: [
		{
			id: 'home-loan',
			name: 'Home Loan',
			category: 'secured',
			description:
				'Compare rates across 40+ banks. We calculate your exact eligibility — not a generic range.',
			features: [
				'Exact eligibility calculation based on your income profile',
				'Side-by-side comparison of 40+ lenders',
				'Balance transfer analysis if you have an existing loan',
				'Zero-cost pre-approval from top banks'
			],
			interestRate: '8.25%',
			maxAmount: '₹5 Cr',
			maxTenure: '30 years',
			icon: 'home',
			route: howCanWeHelpRoute('Home Loan')
		},
		{
			id: 'plot-loan',
			name: 'Plot Loan',
			category: 'secured',
			description:
				'Finance your land purchase with rates optimized for plot-specific lending criteria.',
			features: [
				'Plot-specific eligibility criteria from 25+ lenders',
				'Construction-linked disbursement options',
				'Combo offers: Plot + Home construction',
				'Rural and urban plot financing'
			],
			interestRate: '8.75%',
			maxAmount: '₹2 Cr',
			maxTenure: '20 years',
			icon: 'plot',
			route: howCanWeHelpRoute('Plot Loan')
		},
		{
			id: 'lap',
			name: 'Loan Against Property',
			category: 'secured',
			description:
				"Unlock your property's value. We find the highest LTV ratio across lenders for maximum funding.",
			features: [
				'Highest LTV ratio discovery across lenders',
				'Residential & commercial property accepted',
				'Overdraft facility options available',
				'Flexible end-use: business, education, medical'
			],
			interestRate: '9.0%',
			maxAmount: '₹10 Cr',
			maxTenure: '20 years',
			icon: 'building',
			route: howCanWeHelpRoute('Loan Against Property')
		},
		{
			id: 'business-loan',
			name: 'Business Loan',
			category: 'unsecured',
			description:
				'Collateral-free business funding. We match your business vintage and turnover to the right lender.',
			features: [
				'No collateral required',
				'Matched to your business vintage & turnover',
				'MSME and startup-friendly options',
				'Working capital and term loan variants'
			],
			interestRate: '11%',
			maxAmount: '₹50 Lakh',
			maxTenure: '5 years',
			icon: 'briefcase',
			route: howCanWeHelpRoute('Business Loan')
		},
		{
			id: 'professional-loan',
			name: 'Professional Loan',
			category: 'unsecured',
			description:
				'Specialized rates for doctors, CAs, architects and licensed professionals. Your qualification is your collateral.',
			features: [
				'Preferential rates for licensed professionals',
				'Higher eligibility based on professional income',
				'Practice setup and equipment financing',
				'Minimal documentation with professional proof'
			],
			interestRate: '10.5%',
			maxAmount: '₹40 Lakh',
			maxTenure: '5 years',
			icon: 'user',
			route: howCanWeHelpRoute('Professional Loan')
		},
		{
			id: 'personal-loan',
			name: 'Personal Loan',
			category: 'unsecured',
			description:
				'Instant comparison across banks. See your exact EMI and total cost before you apply anywhere.',
			features: [
				'Instant rate comparison across 50+ lenders',
				'Pre-qualified offers without credit score impact',
				'Transparent total cost breakdown',
				'Disbursal as fast as 4 hours'
			],
			interestRate: '10.25%',
			maxAmount: '₹25 Lakh',
			maxTenure: '5 years',
			icon: 'wallet',
			route: howCanWeHelpRoute('Personal Loan')
		}
	],
	processSteps: [
		{
			step: 1,
			title: 'Tell us what you need',
			description:
				'Answer a few smart questions. Our adaptive form adjusts based on your profile — salaried, self-employed, or professional.',
			duration: '3 min',
			icon: 'form'
		},
		{
			step: 2,
			title: 'We crunch the numbers',
			description:
				'Your profile is matched against real-time rates and eligibility criteria from 100+ lenders. No guesswork.',
			duration: 'Instant',
			icon: 'compute'
		},
		{
			step: 3,
			title: 'Compare & choose',
			description:
				'See exact EMI, total interest, and processing fees side by side. Pick the offer that actually fits you.',
			duration: 'Your pace',
			icon: 'compare'
		},
		{
			step: 4,
			title: 'Apply with confidence',
			description:
				'Submit your application to the chosen lender directly through our platform. Track status in real-time.',
			duration: '24 hrs to approval',
			icon: 'approve'
		}
	],
	testimonials: [
		{
			name: 'Rajesh Kumar',
			loanType: 'Home Loan',
			amount: '₹45 Lakh',
			review:
				'I was about to take a home loan at 9.1% from my salary bank. DigitalDSA showed me I qualified for 8.35% at another bank. That 0.75% difference saves me ₹4.2 lakh over the tenure.',
			rating: 5,
			location: 'Mumbai',
			saved: '₹4.2 Lakh'
		},
		{
			name: 'Dr. Priya Sharma',
			loanType: 'Professional Loan',
			amount: '₹18 Lakh',
			review:
				"As a doctor setting up my clinic, I didn't know professional loans existed with better terms. DigitalDSA found me a rate 2% lower than the personal loan I was considering.",
			rating: 5,
			location: 'Delhi',
			saved: '₹1.8 Lakh'
		},
		{
			name: 'Amit Patel',
			loanType: 'Business Loan',
			amount: '₹30 Lakh',
			review:
				"What I appreciated most: no one called me 50 times. I compared offers quietly, made my decision, and applied. That's how it should work.",
			rating: 5,
			location: 'Bangalore',
			saved: '₹2.1 Lakh'
		},
		{
			name: 'Sunita Reddy',
			loanType: 'Loan Against Property',
			amount: '₹1.2 Cr',
			review:
				"My bank offered 65% LTV on my property. DigitalDSA found a lender offering 75% LTV at a similar rate. That extra 10% meant I didn't need a second loan.",
			rating: 5,
			location: 'Hyderabad',
			saved: '₹3.5 Lakh'
		}
	],
	trustMetrics: [
		{
			label: 'Loans Matched',
			value: '2,940+',
			description: 'Precise matches, not generic leads'
		},
		{
			label: 'Lender Partners',
			value: '100+',
			description: 'Banks, NBFCs, and HFCs'
		},
		{
			label: 'Cities',
			value: '80+',
			description: 'Across India'
		},
		{
			label: 'Avg. Interest Saved',
			value: '0.5–1.2%',
			description: 'Compared to walk-in rates'
		}
	],
	comparisonPoints: [
		{
			feature: 'How matching works',
			us: 'Exact eligibility calculated from your full financial profile',
			others: 'Generic offers based on income range'
		},
		{
			feature: 'Your privacy',
			us: 'Explore freely without sharing your phone number',
			others: 'Phone number required upfront, then 20+ calls'
		},
		{
			feature: 'What you see',
			us: 'Real rates, exact EMI, total cost breakdown',
			others: '"Starting from" rates that rarely apply to you'
		},
		{
			feature: 'After you apply',
			us: 'Direct application to chosen lender, real-time tracking',
			others: 'Your details sold to multiple agents'
		}
	],
	faqs: [
		{
			question: 'Is DigitalDSA a bank or lender?',
			answer:
				"No. We're a loan comparison platform. We don't lend money — we help you find the best loan offer from 100+ partner lenders including major banks like SBI, HDFC, ICICI, Axis, and leading NBFCs. Think of us as your loan research assistant.",
			category: 'About Us'
		},
		{
			question: 'Will comparing loans affect my credit score?',
			answer:
				'No. Browsing and comparing offers on DigitalDSA does not trigger any credit inquiry. A hard inquiry only happens when you choose to formally apply with a specific lender. You can explore freely without any impact.',
			category: 'Credit'
		},
		{
			question: "Why don't you ask for my phone number upfront?",
			answer:
				'Because we believe you should be able to research loan options without being bombarded with sales calls. Most comparison sites sell your number to multiple agents the moment you enter it. We let you explore first, decide later.',
			category: 'Privacy'
		},
		{
			question: 'How do you make money if the service is free for borrowers?',
			answer:
				'When you choose a lender and successfully get a loan through our platform, the lender pays us a referral fee. This means our incentive is aligned with yours — we want you to find the best deal and actually close it.',
			category: 'About Us'
		},
		{
			question: 'How accurate are the rates and eligibility shown?',
			answer:
				'Very accurate. Unlike sites that show generic "starting from" rates, we calculate your specific eligibility based on your income, obligations, employment type, credit profile, and each lender\'s actual criteria. The rates you see are what you\'ll actually be offered.',
			category: 'Process'
		},
		{
			question: 'What documents do I need to apply?',
			answer:
				"It depends on the loan type and your employment. Salaried applicants typically need: PAN, Aadhaar, salary slips (3 months), bank statements (6 months), and Form 16. Self-employed applicants need: ITR (2 years), business proof, and bank statements. Our platform tells you exactly what's needed based on your profile.",
			category: 'Documentation'
		},
		{
			question: 'Can I transfer my existing loan to a better rate?',
			answer:
				"Yes. Our balance transfer analysis compares your current loan terms against what's available today. Many borrowers save ₹50,000–₹5,00,000 by switching to a lower rate, especially if they took their loan more than 2 years ago when rates were higher.",
			category: 'Process'
		},
		{
			question: 'How long does approval take?',
			answer:
				'Once you formally apply through our platform, most personal and business loans get approved within 24–48 hours. Home loans and LAP typically take 5–7 working days due to property verification. We provide real-time status tracking throughout.',
			category: 'Process'
		}
	]
};
