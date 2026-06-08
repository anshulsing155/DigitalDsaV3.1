<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		keywords?: string;
		url?: string;
		image?: string;
		author?: string;
		twitterHandle?: string;
		type?: string;
		siteName?: string;
		locale?: string;
		themeColor?: string;
		canonical?: string;
		breadcrumb?: { name: string; url: string }[];
	}

	let {
		title = 'DigitalDSA Pro – Intelligence for DSAs & Loan Agents',
		description = 'Real-time bank matches, highest payout slabs, verified RM contacts – built for independent DSAs and loan professionals.',
		keywords = 'DSA platform, loan DSA, bank matching, corporate DSA, RM network, slab comparison, loan filing, digital dsa',
		url = 'https://digitaldsa.com',
		image = 'https://digitaldsa.com/og-image.jpg',
		author = 'Digital DSA Team',
		twitterHandle = '@DigitalDSA001',
		type = 'website',
		siteName = 'Digital DSA',
		locale = 'en_IN',
		themeColor = '#ffffff',
		canonical,
		breadcrumb = []
	}: Props = $props();

	let origin = $state('https://digitaldsa.com');

	onMount(() => {
		if (typeof window !== 'undefined') {
			origin = window.location.origin;
		}
	});

	let fullImageUrl = $derived(image?.startsWith('http') ? image : `${origin}${image || '/logo.png'}`);
	let breadcrumbJson = $derived(
		Array.isArray(breadcrumb) && breadcrumb.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'BreadcrumbList',
					itemListElement: breadcrumb.map((item, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						name: item?.name || `Step ${index + 1}`,
						item: item?.url || url
					}))
				}
			: null
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="keywords" content={keywords} />
	<meta name="author" content={author} />
	<meta name="robots" content="index, follow" />
	<meta name="theme-color" content={themeColor} />
	<meta http-equiv={"content-language" as any} content={locale} />

	<!-- Open Graph -->
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={fullImageUrl} />
	<meta property="og:url" content={url} />
	<meta property="og:type" content={type} />
	<meta property="og:locale" content={locale} />
	<meta property="og:site_name" content={siteName} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={fullImageUrl} />
	<meta name="twitter:site" content={twitterHandle} />

	<link rel="canonical" href={canonical || url} />

	<!-- JSON-LD: Main Schema -->
	{@html `<script type="application/ld+json">
		${JSON.stringify({
			'@context': 'http://schema.org',
			'@type': type === 'website' ? 'WebSite' : 'WebPage',
			name: title,
			description: description,
			url: url,
			image: fullImageUrl,
			publisher: {
				'@type': 'Organization',
				name: siteName,
				url: origin,
				logo: {
					'@type': 'ImageObject',
					url: `${origin}/logo/logoBlack.png`
				}
			}
		})}
	</script>`}

	<!-- JSON-LD: Breadcrumb Schema -->
	{#if breadcrumbJson}
		{@html `<script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>`}
	{/if}
</svelte:head>
