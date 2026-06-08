<script>
  import { page } from "$app/state";
  import LapBt from "$lib/components/website/LapBT.svelte";
  import LapBtWithTopUp from "$lib/components/website/LapBTWithTopUp.svelte";
  import LapNewLoan from "$lib/components/website/LapNewLoan.svelte";
  import TopUpPlot from "$lib/components/website/TopUpPlot.svelte";
  import UnlockingPowerCollateralArticle from "$lib/components/website/UnlockingPowerCollateralArticle.svelte";
  import BusinessFinancialHealth from "$lib/components/website/BusinessFinancialHealth.svelte";
  import LapvsDOD from "$lib/components/website/LapvsDOD.svelte";
  import DodArticle from "$lib/components/website/DodArticle.svelte";
  import DataConsolidation from "$lib/components/website/DataConsolidation.svelte";
  import PageNotFound from "$lib/components/website/PageNotFound.svelte";

  let slug = $derived(page.params.slug);
  const componentMap = {
    "new-loan": LapNewLoan,
    "balance-transfer": LapBt,
    "top-up": TopUpPlot,
    "balance-transfer-with-top-up": LapBtWithTopUp,
    "business-financial-health": BusinessFinancialHealth,
    "unlocking-power-of-collateral": UnlockingPowerCollateralArticle,
    "LAPvsDOD": LapvsDOD,
    "dropline-overdraft": DodArticle,
    "what-is-debt-consolidation": DataConsolidation,
  };

  let Component = $derived(componentMap[slug] || PageNotFound);
</script>

<Component {slug} />
