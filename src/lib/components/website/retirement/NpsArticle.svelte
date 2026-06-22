<script lang="ts">
	import RetirementArticle from './RetirementArticle.svelte';
	import { getRetirementArticleData } from '$lib/data/website/retirementData';

	const article = getRetirementArticleData('govSchemes', 'nps')!;
</script>

<RetirementArticle {article} />
