<script>
  import { page } from "$app/stores";
  import PageNotFound from "$lib/components/website/PageNotFound.svelte";
 import PoliceLawyersLoanArticle from "$lib/components/website/PoliceLawyersLoanArticle.svelte";

  let slug = $derived($page.params.slug);

  // Mapping of slugs to components
  const componentMap = {
    "why-banks-avoid-loans-to-police-lawyers-politicians": PoliceLawyersLoanArticle,
   
  };

  let Component = $derived(componentMap[slug] || PageNotFound);
</script>

<Component {slug} />
