<script>
  import { page } from "$app/stores";
  import ConstructionLoan from "$lib/components/website/ConstructionLoan.svelte";
  import PlotConstructionLoan from "$lib/components/website/Plot&ConstructionLoan.svelte";
  import PlotEquityLoan from "$lib/components/website/Plot&EquityLoan.svelte";
  import PlotLoanOnly from "$lib/components/website/PlotLoanOnly.svelte";
  import PlotLoanOnlyChallenges from "$lib/components/website/PlotLoanOnlyChallenges.svelte";
  import PlotLoanSupport from "$lib/components/website/PlotLoanSupport.svelte";
  import AgriculturalToResidential from "$lib/components/website/AgriculturalToResidential.svelte";
  import PageNotFound from "$lib/components/website/PageNotFound.svelte";

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
