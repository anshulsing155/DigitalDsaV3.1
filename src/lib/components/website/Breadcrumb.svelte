<script>
	let {
		assigned = ""
	} = $props();


  import { page } from "$app/state"; // Import page store to access URL

  let pathname = $derived(assigned !== "" ? assigned : page.url.pathname);

  let links = $derived.by(() => {
    try {
      const segments = pathname.split("/"); // ["", "home-loan", "new-loan"]

      if (segments.length < 2) {
        return [];
      }

      const formattedSegments = segments.map(
        (segment) =>
          segment
            .replace(/-/g, "") // Remove hyphens
            .charAt(0)
            .toUpperCase() + segment.slice(1).toLowerCase() // Capitalize first letter
      );

      // Generate the links
      return segments.map((segment, index) => {
        let path = `/${segments.slice(0, index + 1).join("/")}`; // Generate the full path up to this segment
        return {
          name: formattedSegments[index],
          path: path,
        };
      });
    } catch (error) {
      console.error("Error generating breadcrumb:", error);
      return [];
    }
  });
</script>

<nav aria-label="breadcrumb" class="font-SubPara text-minParaFont">
  {#if links.length > 1}
    {#each links as { name, path }, index (path)}
      <span>
        {#if index > 0}
          /
        {/if}
        <a href={path} class={index === 0 ? "underline text-black" : ""}
          >{name}</a
        >
      </span>
    {/each}
  {/if}
</nav>

<style>
  nav {
    margin: 1rem 0;
  }

  a.underline {
    text-decoration: underline;
  }
  /* a:hover {
    text-decoration: underline;
  } */
  span {
    margin-right: 5px;
  }
</style>
