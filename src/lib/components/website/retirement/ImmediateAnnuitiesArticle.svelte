<script lang="ts">
	import RetirementArticle from './RetirementArticle.svelte';
	import { getRetirementArticleData } from '$lib/data/website/retirementData';

	const article = getRetirementArticleData('pension', 'immediate-annuities')!;
</script>

<RetirementArticle {article} />
