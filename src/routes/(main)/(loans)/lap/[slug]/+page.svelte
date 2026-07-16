<script>
  import { page } from "$app/state";
  import LapBt from '$lib/components/sections/LapBT.svelte';
  import LapBtWithTopUp from '$lib/components/sections/LapBTWithTopUp.svelte';
  import LapNewLoan from '$lib/components/sections/LapNewLoan.svelte';
  import TopUpPlot from '$lib/components/sections/TopUpPlot.svelte';
  import UnlockingPowerCollateralArticle from '$lib/components/sections/UnlockingPowerCollateralArticle.svelte';
  import BusinessFinancialHealth from '$lib/components/sections/BusinessFinancialHealth.svelte';
  import LapvsDOD from '$lib/components/sections/LapvsDOD.svelte';
  import DodArticle from '$lib/components/sections/DodArticle.svelte';
  import DataConsolidation from '$lib/components/sections/DataConsolidation.svelte';
  import PageNotFound from '$lib/components/layout/PageNotFound.svelte';

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
