<script>
	import { page } from '$app/stores';
	import PageNotFound from '$lib/components/layout/PageNotFound.svelte';
	import BusinessCantAffordCyberSecurityArticle from '$lib/components/sections/BusinessCantAffordCyberSecurityArticle.svelte';
	import CompanyCultureCyberSecurityArticle from '$lib/components/sections/CompanyCultureCyberSecurityArticle.svelte';
	import HowCyberSecurityIntegralBusinessCyberSecurityArticle from '$lib/components/sections/HowCyberSecurityIntegralBusinessCyberSecurityArticle.svelte';
	import ProtectYourBusinessCyberSecurityArticle from '$lib/components/sections/ProtectYourBusinessCyberSecurityArticle.svelte';

	const ComponentMapping = {
		'business-cant-afford-cyber-security-article': BusinessCantAffordCyberSecurityArticle,
		'company-culture-cyber-security-article': CompanyCultureCyberSecurityArticle,
		'integral-business-cyber-security-article': HowCyberSecurityIntegralBusinessCyberSecurityArticle,
		'protect-your-business': ProtectYourBusinessCyberSecurityArticle
	};

	let slug = $derived($page.params.slug);
	let Component = $derived(ComponentMapping[slug] || PageNotFound);
</script>

<Component {slug} />
