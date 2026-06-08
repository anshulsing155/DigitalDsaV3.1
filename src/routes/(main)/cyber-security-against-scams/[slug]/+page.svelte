<script>
	let {
		data
	} = $props();


    import { page } from "$app/state";
  import ProtectYourselfFromScamCyberSecurity from "$lib/components/website/ProtectYourselfFromScamCyberSecurity.svelte";
   import ScamTargetBusinesses from "$lib/components/website/ScamTargetBusinesses.svelte";
  import WaysSafeguardCyberSecurity from "$lib/components/website/WaysSafeguardCyberSecurity.svelte";
  

    let slug = page.params.slug;
  </script>
  
  {#if data.title === "scam-target-business"}
    <ScamTargetBusinesses {slug} />
  {:else if data.title === "ways-safeguard"}
  <WaysSafeguardCyberSecurity {slug} />
  {:else if data.title === "how-protect-from-scam"}
  <ProtectYourselfFromScamCyberSecurity {slug} />
  {/if}
  