<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import FloatingNav from '$lib/components/landing/FloatingNav.svelte';
	import ScrollToTop from '$lib/components/landing/ScrollToTop.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import JsonLd from '$lib/components/JsonLd.svelte';

	// Pain-first Components
	import PainHero from '$lib/components/landing-pain/PainHero.svelte';
	import FivePains from '$lib/components/landing-pain/FivePains.svelte';
	import CaseTimeline from '$lib/components/landing-pain/CaseTimeline.svelte';
	import TrustPledge from '$lib/components/landing-pain/TrustPledge.svelte';
	import SimpleStart from '$lib/components/landing-pain/SimpleStart.svelte';

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
	<title>DigitalDSA – The Operating System for India's Loan DSAs</title>
	<meta
		name="description"
		content="Only 18 of 100 cases get sanctioned without a policy intelligence tool. DigitalDSA helps retail loan DSAs match the right bank, calculate eligible income correctly, and protect their leads — before a single form is filed."
	/>
	<meta
		name="keywords"
		content="loan dsa platform, bank policy engine, dsa tool india, rm contact directory, income haircut calculator, direct selling agent, case rejection prevention"
	/>
	<!-- Outfit & handwritten font -->
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<JsonLd schema={organizationSchema} />

<div in:fade={{ duration: 350 }} class="scroll-smooth font-sans min-h-screen bg-[#F8F7F2] dark:bg-[#0C0C09] text-gray-900 dark:text-[#E8E8D8] transition-colors duration-300">
	<FloatingNav availableCoins={coinsState.available || 500} user={data?.user} />
	<ScrollToTop />

	<main>
		<PainHero />
		<FivePains />
		<CaseTimeline />
		<TrustPledge />
		<SimpleStart />
	</main>

	<Footer />
</div>

<style>
	:global(html) {
		background-color: #F8F7F2 !important;
		transition: background-color 0.3s ease;
	}
	:global(html.dark) {
		background-color: #0C0C09 !important;
	}
	:global(body) {
		font-family: 'Outfit', sans-serif !important;
	}
	:global(.handwritten) {
		font-family: 'Architects Daughter', cursive !important;
	}
</style>
