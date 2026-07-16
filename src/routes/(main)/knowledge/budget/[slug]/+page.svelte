<script>
	import { page } from '$app/stores';
	import PageNotFound from '$lib/components/layout/PageNotFound.svelte';
	import Budget101 from '$lib/components/sections/Budget101.svelte';
	import MakeBudget from '$lib/components/sections/MakeBudget.svelte';
	import WhyHaveBudgetArticle from '$lib/components/sections/WhyHaveBudgetArticle.svelte';

	const ComponentMapping = {
		'budgeting-101': Budget101,
		'make-budget': MakeBudget,
		'why-have-budget': WhyHaveBudgetArticle
	};

	let slug = $derived($page.params.slug);
	let Component = $derived(ComponentMapping[slug] || PageNotFound);
</script>

<Component {slug} />
