<script>
	let {
		data,
		userData
	} = $props();


  import { page } from "$app/state";
  import ApplicationProcess from '$lib/components/sections/ApplicationProcess.svelte';
  import CareerFaq from '$lib/components/sections/CareerFAQ.svelte';
  import WorkingWithUs from '$lib/components/sections/WorkingWithUs.svelte';




  let slug = page.params.slug;

  // //console.log(slug)
</script>

{#if data.title === "application-process"}
  <ApplicationProcess {slug} />
{:else if data.title === "working-with-us"}
  <WorkingWithUs {slug} />
{:else if data.title === "career-FAQ"}
  <CareerFaq {slug} />
{/if}
