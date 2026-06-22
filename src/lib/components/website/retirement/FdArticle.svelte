<script lang="ts">
	import RetirementArticle from './RetirementArticle.svelte';
	import { getRetirementArticleData } from '$lib/data/website/retirementData';

	const article = getRetirementArticleData('fixDeposit', 'fd')!;
</script>

<RetirementArticle {article} />
