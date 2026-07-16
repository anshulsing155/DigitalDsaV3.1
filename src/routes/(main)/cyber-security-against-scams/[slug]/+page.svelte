<script>
	let {
		data
	} = $props();


    import { page } from "$app/state";
  import ProtectYourselfFromScamCyberSecurity from '$lib/components/sections/ProtectYourselfFromScamCyberSecurity.svelte';
   import ScamTargetBusinesses from '$lib/components/sections/ScamTargetBusinesses.svelte';
  import WaysSafeguardCyberSecurity from '$lib/components/sections/WaysSafeguardCyberSecurity.svelte';
  

    let slug = page.params.slug;
  </script>
  
  {#if data.title === "scam-target-business"}
    <ScamTargetBusinesses {slug} />
  {:else if data.title === "ways-safeguard"}
  <WaysSafeguardCyberSecurity {slug} />
  {:else if data.title === "how-protect-from-scam"}
  <ProtectYourselfFromScamCyberSecurity {slug} />
  {/if}
  