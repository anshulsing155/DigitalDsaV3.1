<script>
	let {
		data
	} = $props();


  import { page } from "$app/state";
  import AdjustYourBudget from "$lib/components/website/AdjustYourBudget.svelte";
  import BehavioralScienceBehindBudgeting from "$lib/components/website/BehavioralScienceBehindBudgeting.svelte";
  import BudgetingTips from "$lib/components/website/BudgetingTips.svelte";
  import CostOfLiving from "$lib/components/website/CostOfLiving.svelte";
  import FinancialHardship from "$lib/components/website/FinancialHardship.svelte";
  import MakeBudget from "$lib/components/website/MakeBudget.svelte";


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
