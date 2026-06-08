<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { coinsState } from '$lib/stores/coins/coins.svelte';
	import Footer from '$lib/components/landing/Footer.svelte';
	import FloatingNav from '$lib/components/landing/FloatingNav.svelte';
	import ScrollToTop from '$lib/components/landing/ScrollToTop.svelte';
	import LoadingScreen from '$lib/components/landing/LoadingScreen.svelte';
	import ErrorBoundary from '$lib/components/landing/ErrorBoundary.svelte';
	import NavigationChoiceModal from '$lib/components/landing/NavigationChoiceModal.svelte';
	import { fade } from 'svelte/transition';
	import JsonLd from '$lib/components/JsonLd.svelte';

	// Landing page sections (7-section structure)
	import HeroSection from '$lib/components/landing-revamp/HeroSection.svelte';
	import HowItWorksSection from '$lib/components/landing-revamp/HowItWorksSection.svelte';
	import ProductDemoSection from '$lib/components/landing-revamp/ProductDemoSection.svelte';
	import TestimonialsSection from '$lib/components/landing-revamp/TestimonialsSection.svelte';
	import PricingSection from '$lib/components/landing-revamp/PricingSection.svelte';
	import TrustPledgeSection from '$lib/components/landing-revamp/TrustPledgeSection.svelte';
	import FinalCTASection from '$lib/components/landing-revamp/FinalCTASection.svelte';

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
		],
		contactPoint: {
			'@type': 'ContactPoint',
			telephone: '+91-120-4994466',
			contactType: 'customer service',
			email: 'support@digitaldsa.com',
			areaServed: 'IN',
			availableLanguage: ['English', 'Hindi']
		}
	};

	const productSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'DigitalDSA Pro',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web, Android',
		description:
			'Real-time bank matches, highest payout slabs, verified RM contacts — built for independent DSAs and loan professionals.',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'INR',
			description: 'Free tier available'
		}
	};

	let isLoading = $state(true);
	let width = $state(0);

	const isAuthenticated = $derived(authState.isAuthenticated);
	const currentUser = $derived(authState.currentUser);
	const isMobile = $derived(width <= 768);
	const mobileNumber = $derived(data?.user?.mobileNumber);

	const getCoinsFromDB = async () => {
		const res = await secureFetch('/api/get-coins', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mobileNumber })
		});

		const data = await res.json();

		if (data.success) {
			coinsState.setAvailable(data.availableCoins);
			coinsState.setUsed(data.usedCoins);
		}
	};

	function handleLoadingComplete() {
		isLoading = false;
	}

	// Fetch coin balance for authenticated DSA users on page load.
	// Admin/RM accounts are NOT in the Applicant collection, so get-coins
	// would return 404 for them — skip the call entirely for non-DSA roles.
	onMount(() => {
		const userRole = data?.user?.activeRole || data?.user?.role;
		const isDsaAccount = userRole === 'dsa';
		if (isAuthenticated && isDsaAccount) getCoinsFromDB();
	});
</script>

<svelte:head>
	<title>DigitalDSA Pro – Intelligence for DSAs & Loan Agents</title>
	<link rel="canonical" href="https://digitaldsa.com/" />
	<meta
		name="description"
		content="Real-time bank matches, highest payout slabs, verified RM contacts – built for independent DSAs and loan professionals."
	/>
	<meta
		name="keywords"
		content="DSA platform, loan DSA, bank matching, corporate DSA, RM network, slab comparison, loan filing, digital dsa"
	/>
	<meta property="og:title" content="DigitalDSA — Hours of Research. Gone in Minutes." />
	<meta
		property="og:description"
		content="Know before you file. Which bank will approve, how much they'll sanction, which code pays most, and which RM to call."
	/>
	<meta property="og:url" content="https://digitaldsa.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="https://digitaldsa.com/og-image.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://digitaldsa.com/twitter-image.jpg" />
</svelte:head>

<JsonLd schema={organizationSchema} />
<JsonLd schema={productSchema} />

<svelte:window bind:innerWidth={width} />

<ErrorBoundary>
	{#if isLoading}
		<LoadingScreen onloaded={handleLoadingComplete} />
	{:else}
		<div in:fade={{ duration: 400 }} class="scroll-smooth">
			<FloatingNav availableCoins={coinsState.available} user={data?.user} />
			<ScrollToTop />

			<!-- 7-section structure: Hero → How It Works → Product Demo → Testimonials → Pricing → Trust → CTA -->
			<HeroSection />
			<HowItWorksSection />
			<ProductDemoSection />
			<TestimonialsSection />
			<PricingSection />
			<TrustPledgeSection />
			<FinalCTASection />

			<Footer />
		</div>
	{/if}
	<NavigationChoiceModal />
</ErrorBoundary>
