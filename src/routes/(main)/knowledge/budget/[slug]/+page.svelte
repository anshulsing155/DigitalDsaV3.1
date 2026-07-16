<script>
	import { page } from '$app/stores';
	import PageNotFound from '$lib/components/website/PageNotFound.svelte';
	import Budget101 from '$lib/components/website/Budget101.svelte';
	import MakeBudget from '$lib/components/website/MakeBudget.svelte';
	import WhyHaveBudgetArticle from '$lib/components/website/WhyHaveBudgetArticle.svelte';

	const ComponentMapping = {
		'budgeting-101': Budget101,
		'make-budget': MakeBudget,
		'why-have-budget': WhyHaveBudgetArticle
	};

	let slug = $derived($page.params.slug);
	let Component = $derived(ComponentMapping[slug] || PageNotFound);
</script>

<Component {slug} />
