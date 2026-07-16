<script lang="ts">
  import { onMount } from "svelte";

  export let title = "Digital DSA - India's Leading Loan Comparison Platform";
  export let description =
    "Compare loan offers from top Indian banks and get expert advice. Use our loan calculators to find the best rates and apply online with Digital DSA.";
  export let keywords = "";
  export let url = "https://digitaldsa.com/";
  export let image = "https://digitaldsa.com/logo/newLogo.png";
  export let author = "Digital DSA Team";
  export let twitterHandle = "@DigitalDSA001";
  export let type = "Website"; // Or 'Article', 'Product', etc.
  export let siteName = "Digital DSA";
  export let locale = "en_IN";
  export let themeColor = "#ffffff";
  export let breadcrumb: { name: string; url: string }[] = [];

  let origin = "https://digitaldsa.com";

  onMount(() => {
    if (typeof window !== "undefined") {
      origin = window.location.origin;
    }
  });

  $: fullImageUrl = image?.startsWith("http") ? image : `${origin}${image || "/logo.png"}`;
  $: breadcrumbJson = Array.isArray(breadcrumb) && breadcrumb.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumb.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item?.name || `Step ${index + 1}`,
          item: item?.url || url,
        })),
      }
    : null;
</script>


<svelte:head>
  <title>{title}</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content={description} />
  <meta name="keywords" content={keywords} />
  <meta name="author" content={author} />
  <meta name="robots" content="index, follow" />
  <meta name="theme-color" content={themeColor} />
  <meta http-equiv="content-language" content={locale} />

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={fullImageUrl} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content={type} />
  <meta property="og:locale" content={locale} />
  <meta property="og:site_name" content={siteName} />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={fullImageUrl} />
  <meta name="twitter:site" content={twitterHandle} />

  <link rel="canonical" href={url} />
  <link rel="icon" href="/favicon.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

  <!-- JSON-LD: Main Schema -->
  {@html `<script type="application/ld+json">
    ${JSON.stringify({
      "@context": "http://schema.org",
      "@type": type,
      name: title,
      description,
      url,
      image: fullImageUrl,
      publisher: {
        "@type": "Organization",
        name: siteName,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/logo.png`,
        },
      },
    })}
  </script>`}

  <!-- JSON-LD: Breadcrumb Schema (if any) -->
  {#if breadcrumbJson}
    {@html `<script type="application/ld+json">${JSON.stringify(breadcrumbJson)}</script>`}
  {/if}
</svelte:head>
