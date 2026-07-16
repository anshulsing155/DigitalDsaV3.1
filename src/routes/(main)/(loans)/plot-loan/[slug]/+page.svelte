<script>
  import { page } from "$app/stores";
  import ConstructionLoan from '$lib/components/sections/ConstructionLoan.svelte';
  import PlotConstructionLoan from '$lib/components/sections/Plot&ConstructionLoan.svelte';
  import PlotEquityLoan from '$lib/components/sections/Plot&EquityLoan.svelte';
  import PlotLoanOnly from '$lib/components/sections/PlotLoanOnly.svelte';
  import PlotLoanOnlyChallenges from '$lib/components/sections/PlotLoanOnlyChallenges.svelte';
  import PlotLoanSupport from '$lib/components/sections/PlotLoanSupport.svelte';
  import AgriculturalToResidential from '$lib/components/sections/AgriculturalToResidential.svelte';
  import PageNotFound from '$lib/components/layout/PageNotFound.svelte';

  let slug = $derived($page.params.slug);

  const componentMap = {
    "plot-only-loan": PlotLoanOnly,
    "construction-loan": ConstructionLoan,
    "plot-and-construction-loan": PlotConstructionLoan,
    "plot-and-equity-loan": PlotEquityLoan,
    "plot-only-loan-challenges": PlotLoanOnlyChallenges,
    "plot-loan-support": PlotLoanSupport,
    "agricultural-to-residential": AgriculturalToResidential,
  };

  let Component = $derived(componentMap[slug] || PageNotFound);
</script>

<Component {slug} />
