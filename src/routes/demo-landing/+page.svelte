<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import FloatingNav from '$lib/components/landing/FloatingNav.svelte';
	import ScrollToTop from '$lib/components/landing/ScrollToTop.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';

	// Award-Winning Infographic Components
	import HeroSection from '$lib/components/landing-infographic/HeroSection.svelte';
	import CostOfGuesswork from '$lib/components/landing-infographic/CostOfGuesswork.svelte';
	import IncomeProfiler from '$lib/components/landing-infographic/IncomeProfiler.svelte';
	import GeoPolicy from '$lib/components/landing-infographic/GeoPolicy.svelte';
	import RmEcosystem from '$lib/components/landing-infographic/RmEcosystem.svelte';
	import PrivacyFileBuilder from '$lib/components/landing-infographic/PrivacyFileBuilder.svelte';
	import LoanJourney from '$lib/components/landing-infographic/LoanJourney.svelte';
	import WhySwitch from '$lib/components/landing-infographic/WhySwitch.svelte';
	import PricingCta from '$lib/components/landing-infographic/PricingCta.svelte';

	let { data } = $props();

	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'DigitalDSA',
		url: 'https://digitaldsa.com',
		logo: 'https://digitaldsa.com/logo/whiteLogo.svg',
		description:
			"India's B2B intelligence platform for Direct Selling Agents, loan brokers, and Corporate DSAs.",
		sameAs: [
			'https://www.facebook.com/profile.php?id=61561179107296',
			'https://x.com/DigitalDSA001',
			'https://www.linkedin.com/company/digitaldsa',
			'https://www.instagram.com/digitaldsa1/',
			'https://www.youtube.com/@DigitalDSA'
		]
	};

	onMount(() => {
		if (coinsState.available === 0) {
			coinsState.setAvailable(500);
		}
	});
</script>

<svelte:head>
	<title>DigitalDSA Pro – Interactive DSA Cockpit & Loan intelligence</title>
	<meta
		name="description"
		content="Stop guessing which bank will approve your client. See real-time bank matching, dynamic income haircuts, and verified RMs instantly."
	/>
	<meta
		name="keywords"
		content="dsa platform, credit policy engine, direct selling agent, loan broker, rm contacts, income haircut"
	/>
	<!-- Load premium Outfit and human hand-drawn Architects Daughter fonts -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<JsonLd schema={organizationSchema} />

<div in:fade={{ duration: 400 }} class="scroll-smooth font-sans min-h-screen bg-[#F9FAFB] dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] transition-colors duration-300">
	<FloatingNav availableCoins={coinsState.available || 500} user={data?.user} />
	<ScrollToTop />

	<div class="main-landing-flow relative z-10">
		<HeroSection />
		
		<div class="relative">
			<!-- Visual atmospheric elements that adapt to theme state -->
			<div class="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-radial from-blue-500/5 dark:from-[#ffcc00]/2 to-transparent rounded-full blur-[120px] pointer-events-none z-0"></div>
			<div class="absolute bottom-[15%] right-[2%] w-[45vw] h-[45vw] bg-radial from-indigo-500/5 dark:from-[#00E5FF]/2 to-transparent rounded-full blur-[130px] pointer-events-none z-0"></div>
			
			<CostOfGuesswork />
			<IncomeProfiler />
			<GeoPolicy />
			<RmEcosystem />
			<PrivacyFileBuilder />
			<LoanJourney />
			<WhySwitch />
			<PricingCta />
		</div>
	</div>

	<Footer />
</div>

<style>
	:global(html) {
		background-color: #F9FAFB !important;
		transition: background-color 0.3s ease;
	}
	:global(html.dark) {
		background-color: #050505 !important;
	}

	:global(body) {
		font-family: 'Outfit', sans-serif !important;
	}

	:global(.handwritten) {
		font-family: 'Architects Daughter', cursive !important;
	}

	.main-landing-flow {
		overflow-x: hidden;
	}
</style>
