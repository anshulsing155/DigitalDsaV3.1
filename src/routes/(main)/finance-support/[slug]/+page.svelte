<script>
	let {
		data
	} = $props();


  import { page } from "$app/state";
  import AdjustYourBudget from '$lib/components/sections/AdjustYourBudget.svelte';
  import BehavioralScienceBehindBudgeting from '$lib/components/sections/BehavioralScienceBehindBudgeting.svelte';
  import BudgetingTips from '$lib/components/sections/BudgetingTips.svelte';
  import CostOfLiving from '$lib/components/sections/CostOfLiving.svelte';
  import FinancialHardship from '$lib/components/sections/FinancialHardship.svelte';
  import MakeBudget from '$lib/components/sections/MakeBudget.svelte';


  let slug = page.params.slug;
</script>

{#if data.title === "cost-of-living"}
  <CostOfLiving {slug} />
{:else if data.title === "financial-hardship"}
  <FinancialHardship {slug} />
{:else if data.title === "how-to-make-budget"}
  <MakeBudget {slug} />
{:else if data.title === "budgeting-tips"}
  <BudgetingTips {slug} />
  {:else if data.title === "behavioral-science-behind-budgeting"}
  <BehavioralScienceBehindBudgeting {slug}/>
  {:else if data.title === "adjust-your-budget"}
  <AdjustYourBudget {slug} />
{/if}
