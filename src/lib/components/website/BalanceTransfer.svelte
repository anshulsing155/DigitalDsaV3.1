<script lang="ts">
	import Button from './Button.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import { onMount } from 'svelte';
	import StickyNavbar from './StickyNavbar.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import AboveTitleWithTopIconCard from './AboveTitleWithTopIconCard.svelte';
	import TwoColumnWithLeftHeading from './TwoColumnWithLeftHeading.svelte';
	import PaymentTable from './PaymentTable.svelte';
	import TwoColumnWithImage from './TwoColumnWithImage.svelte';
	import AboveTitleWithBlackCard from './AboveTitleWithBlackCard.svelte';
	import { applicationData } from '$lib/stores/stores';
	import ButtonBanner from './ButtonBanner.svelte';
	import ThreeColumWithLeftHeading from './ThreeColumWithLeftHeading.svelte';
	import FeedbackCheck from './FeedbackCheck.svelte';
	import Seo from './Seo.svelte';
	import HelpList from './HelpList.svelte';
	import content from '$lib/data/website/balanceTransfer.json';

	interface ButtonProps {
		btnName: string;
		btnLink: string;
		btnClass?: string;
		animation?: boolean;
	}

	interface PageDataProps {
		coverImage: string;
		coverAlt: string;
		sourceName?: string;
		originalSource?: string;
		heading: string;
		para: string;
		actionBtns: ButtonProps[];
	}

	let {
		pageData = content.pageData
	}: { pageData?: PageDataProps } = $props();

	// Inject store update callbacks dynamically for get-started actions
	const pageDataWithClicks = $derived({
		...pageData,
		actionBtns: pageData.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Check lowest rates' || btn.btnName === 'Compare rates') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const navListWithClicks = $derived({
		...content.navList,
		actionBtns: content.navList.actionBtns.map((btn) => {
			if (btn.btnLink === '/get-started/how-can-we-help' || btn.btnName === 'Check lowest rates' || btn.btnName === 'Compare rates') {
				return {
					...btn,
					btnClick: () => {
						applicationData.update((data) => {
							data.LoanName = 'Home Loan';
							return data;
						});
					}
				};
			}
			return btn;
		})
	});

	const toggleDropdown = (event: Event, index: number) => {
		event.preventDefault();
		const summaryElement = event.currentTarget as HTMLElement;
		const icon = summaryElement.querySelector('.faq-icon');
		const detailsElement = summaryElement.parentElement as HTMLDetailsElement;

		// Close all dropdowns except the clicked one
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon');
		// Close all dropdowns except the clicked one
		document.querySelectorAll('.dropdown').forEach((otherDetails, idx) => {
			const otherIcon = otherDetails.querySelector('.faq-icon');

			if (idx !== index) {
				otherDetails.removeAttribute('open');
				if (otherIcon) {
					otherIcon.classList.remove('fa-angle-up');
					otherIcon.classList.add('fa-angle-down');
				}
			}
		});
			if (idx !== index) {
				otherDetails.removeAttribute('open');
				if (otherIcon) {
					otherIcon.classList.remove('fa-angle-up');
					otherIcon.classList.add('fa-angle-down');
				}
			}
		});

		// Toggle current dropdown open/close state
		const isOpen = detailsElement.hasAttribute('open');
		if (isOpen) {
			detailsElement.removeAttribute('open');
			if (icon) {
				icon.classList.remove('fa-angle-up');
				icon.classList.add('fa-angle-down');
			}
		} else {
			detailsElement.setAttribute('open', 'true');
			if (icon) {
				icon.classList.remove('fa-angle-down');
				icon.classList.add('fa-angle-up');
			}
		}
		setTimeout(() => {
			if (detailsElement) {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
	};
		// Toggle current dropdown open/close state
		const isOpen = detailsElement.hasAttribute('open');
		if (isOpen) {
			detailsElement.removeAttribute('open');
			if (icon) {
				icon.classList.remove('fa-angle-up');
				icon.classList.add('fa-angle-down');
			}
		} else {
			detailsElement.setAttribute('open', 'true');
			if (icon) {
				icon.classList.remove('fa-angle-down');
				icon.classList.add('fa-angle-up');
			}
		}
		setTimeout(() => {
			if (detailsElement) {
				detailsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}, 100);
	};

	let activeSection = $state('');
	let activeSection = $state('');

	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};
	const initializeActiveSection = () => {
		const firstSection = document.querySelector('[data-section]');
		if (firstSection) {
			activeSection = firstSection.id;
		}
	};

	const handleScroll = () => {
		const sections = document.querySelectorAll('[data-section]');
		let currentSection = '';
	const handleScroll = () => {
		const sections = document.querySelectorAll('[data-section]');
		let currentSection = '';

		sections.forEach((section) => {
			const rect = section.getBoundingClientRect();
			if (rect.top <= 200 && rect.bottom >= 200) {
				currentSection = section.id;
			}
		});
		sections.forEach((section) => {
			const rect = section.getBoundingClientRect();
			if (rect.top <= 200 && rect.bottom >= 200) {
				currentSection = section.id;
			}
		});

		if (currentSection) {
			activeSection = currentSection;
		}
	};
		if (currentSection) {
			activeSection = currentSection;
		}
	};

	onMount(() => {
		initializeActiveSection();
		window.addEventListener('scroll', handleScroll);
	onMount(() => {
		initializeActiveSection();
		window.addEventListener('scroll', handleScroll);

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	// JSON-LD Structured Data Schema for Breadcrumbs and FAQ Rich Snippets
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		'itemListElement': [
			{
				'@type': 'ListItem',
				'position': 1,
				'name': 'Home',
				'item': 'https://www.digitaldsa.com'
			},
			{
				'@type': 'ListItem',
				'position': 2,
				'name': 'Home Loan',
				'item': 'https://www.digitaldsa.com/home-loan'
			},
			{
				'@type': 'ListItem',
				'position': 3,
				'name': 'Home Loan Balance Transfer',
				'item': 'https://www.digitaldsa.com/home-loan/balance-transfer'
			}
		]
	};

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		'mainEntity': [
			...content.whyRefinance.contents.list.map((c) => ({
				'@type': 'Question',
				'name': c.heading,
				'acceptedAnswer': {
					'@type': 'Answer',
					'text': c.topPara + (c.para || '')
				}
			})),
			...content.whenAvoid.contents.list.map((c) => ({
				'@type': 'Question',
				'name': c.heading,
				'acceptedAnswer': {
					'@type': 'Answer',
					'text': c.topPara + (c.para || '')
				}
			}))
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`}
</svelte:head>

<Seo
	type="WebPage"
	title="Home Loan Balance Transfer – Lower EMIs & Save More"
	image={pageData.coverImage}
	description="Switch your home loan to a lower interest rate & reduce EMIs. Compare balance transfer offers, calculate savings & apply hassle-free for the best deal today!"
	keywords="Home loan balance transfer, Transfer home loan to another bank, Lower home loan interest rate, Home loan EMI savings, Best home loan transfer offers, Home loan refinance, Reduce home loan EMI, Compare home loan rates, Home loan prepayment options, Home loan top-up loan, Home loan eligibility checker, Home loan transfer calculator, Home loan balance transfer process, Lowest home loan interest rates, Best home loan lenders"
/>

<section>
</section>
