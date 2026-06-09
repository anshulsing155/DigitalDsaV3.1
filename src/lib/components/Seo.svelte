<script lang="ts">
	import { onMount } from 'svelte';

	type BreadcrumbItem = {
		name: string;
		url: string;
	};

	const {
		title = "Digital DSA - India's Leading Loan Comparison Platform",
		description = "Compare loan offers from top Indian banks and get expert advice. Use our loan calculators to find the best rates and apply online with Digital DSA.",
		keywords = '',
		url = 'https://digitaldsa.com/',
		image = 'https://digitaldsa.com/logo/newLogo.png',
		author = 'Digital DSA Team',
		twitterHandle = '@DigitalDSA001',
		type = 'Website',
		siteName = 'Digital DSA',
		locale = 'en_IN',
		themeColor = '#ffffff',
		breadcrumb = []
	}: {
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
		breadcrumb?: BreadcrumbItem[];
	} = $props();

	let origin = $state('https://digitaldsa.com');

	onMount(() => {
		origin = window.location.origin;
	});

	const fullImageUrl = $derived(
		image?.startsWith('http')
			? image
			: `${origin}${image || '/logo.png'}`
	);

	const breadcrumbJson = $derived(
		Array.isArray(breadcrumb) && breadcrumb.length
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

	<meta charset="UTF-8" />
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1"
	/>
	<meta
		name="description"
		content={description}
	/>
	<meta
		name="keywords"
		content={keywords}
	/>
	<meta
		name="author"
		content={author}
	/>
	<meta
		name="robots"
		content="index, follow"
	/>
	<meta
		name="theme-color"
		content={themeColor}
	/>
	<meta
		http-equiv={"content-language" as any}
		content={locale}
	/>

	<!-- Open Graph -->
	<meta
		property="og:title"
		content={title}
	/>
	<meta
		property="og:description"
		content={description}
	/>
	<meta
		property="og:image"
		content={fullImageUrl}
	/>
	<meta
		property="og:url"
		content={url}
	/>
	<meta
		property="og:type"
		content={type}
	/>
	<meta
		property="og:locale"
		content={locale}
	/>
	<meta
		property="og:site_name"
		content={siteName}
	/>

	<!-- Twitter -->
	<meta
		name="twitter:card"
		content="summary_large_image"
	/>
	<meta
		name="twitter:title"
		content={title}
	/>
	<meta
		name="twitter:description"
		content={description}
	/>
	<meta
		name="twitter:image"
		content={fullImageUrl}
	/>
	<meta
		name="twitter:site"
		content={twitterHandle}
	/>

	<link
		rel="canonical"
		href={url}
	/>

	<link
		rel="icon"
		href="/favicon.png"
	/>

	<link
		rel="apple-touch-icon"
		sizes="180x180"
		href="/apple-touch-icon.png"
	/>

	<link
		rel="icon"
		type="image/png"
		sizes="32x32"
		href="/favicon-32x32.png"
	/>

	<link
		rel="icon"
		type="image/png"
		sizes="16x16"
		href="/favicon-16x16.png"
	/>

	{@html `<script type="application/ld+json">
	${JSON.stringify({
		'@context': 'http://schema.org',
		'@type': type,
		name: title,
		description,
		url,
		image: fullImageUrl,
		publisher: {
			'@type': 'Organization',
			name: siteName,
			url: origin,
			logo: {
				'@type': 'ImageObject',
				url: `${origin}/logo.png`
			}
		}
	})}
	</script>`}

	{#if breadcrumbJson}
		{@html `<script type="application/ld+json">
		${JSON.stringify(breadcrumbJson)}
		</script>`}
	{/if}
</svelte:head>