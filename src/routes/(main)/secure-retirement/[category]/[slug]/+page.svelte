<script lang="ts">
	import { page } from '$app/state';
	import FdArticle from '$lib/components/website/retirement/FdArticle.svelte';
	import FdLadderingArticle from '$lib/components/website/retirement/FdLadderingArticle.svelte';
	import FixIncomeArticle from '$lib/components/website/retirement/FixIncomeArticle.svelte';
	import NpsArticle from '$lib/components/website/retirement/NpsArticle.svelte';
	import PomisArticle from '$lib/components/website/retirement/PomisArticle.svelte';
	import RbiFloatingArticle from '$lib/components/website/retirement/RbiFloatingArticle.svelte';
	import ScssArticle from '$lib/components/website/retirement/ScssArticle.svelte';
	import IndexFundsArticle from '$lib/components/website/retirement/IndexFundsArticle.svelte';
	import StocksArticle from '$lib/components/website/retirement/StocksArticle.svelte';
	import SwpArticle from '$lib/components/website/retirement/SwpArticle.svelte';
	import AnnuityPlansArticle from '$lib/components/website/retirement/AnnuityPlansArticle.svelte';
	import ImmediateAnnuitiesArticle from '$lib/components/website/retirement/ImmediateAnnuitiesArticle.svelte';

	const category = $derived(page.params.category);
	const slug = $derived(page.params.slug);
</script>

{#if category === 'fixDeposit' && slug === 'fd'}
	<FdArticle />
{:else if category === 'fixDeposit' && (slug === 'fd-laddering' || slug === 'fd-ladering')}
	<FdLadderingArticle />
{:else if category === 'fixDeposit' && slug === 'fix-income'}
	<FixIncomeArticle />
{:else if category === 'govSchemes' && slug === 'nps'}
	<NpsArticle />
{:else if category === 'govSchemes' && slug === 'pomis'}
	<PomisArticle />
{:else if category === 'govSchemes' && slug === 'rbi-floating'}
	<RbiFloatingArticle />
{:else if category === 'govSchemes' && slug === 'scss'}
	<ScssArticle />
{:else if category === 'lowRisk' && slug === 'index-funds'}
	<IndexFundsArticle />
{:else if category === 'lowRisk' && slug === 'stocks'}
	<StocksArticle />
{:else if category === 'lowRisk' && slug === 'swp'}
	<SwpArticle />
{:else if category === 'pension' && slug === 'annuity-plans'}
	<AnnuityPlansArticle />
{:else if category === 'pension' && slug === 'immediate-annuities'}
	<ImmediateAnnuitiesArticle />
{:else}
	<div class="py-20 text-center">
		<h1 class="text-2xl font-bold text-red-600">Article Not Found</h1>
		<p class="text-gray-500 mt-2">The requested retirement article does not exist or has been moved.</p>
		<a href="/secure-retirement" class="inline-block mt-4 px-6 py-2 bg-yellow-400 text-black font-semibold rounded hover:bg-yellow-500 transition-colors">
			Go back to Secure Retirement
		</a>
	</div>
{/if}
