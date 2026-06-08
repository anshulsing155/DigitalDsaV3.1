<script>
  import { page } from "$app/stores"; // ✅ Correct import
  import { derived } from "svelte/store";

  // Custom mapping for slug names
  const slugMappings = {
    dashboard: "Dashboard",
    settings: "Settings & Preferences",
    profile: "User Profile",
    orders: "My Orders",
    "order-details": "Order Details",
  };

  // Function to format segment names
  function formatSegment(segment) {
    return (
      slugMappings[segment] ||
      segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }

  // Compute breadcrumbs dynamically from pathname
  const breadcrumbs = derived(page, ($page) => {
    const pathSegments = $page.url.pathname.split("/").filter(Boolean);

    // If there's only one segment, hide breadcrumbs
    if (pathSegments.length <= 1) return [];

    return pathSegments.map((segment, index) => ({
      name: formatSegment(segment),
      path: "/" + pathSegments.slice(0, index + 1).join("/"),
    }));
  });
</script>

{#if $breadcrumbs.length > 0}
  <nav class="breadcrumb">
    <ul class="flex items-center gap-2 text-gray-600 text-sm">
      {#each $breadcrumbs as crumb, i}
        <li class="flex items-center">
          {#if i > 0}
            <span class="mx-1 text-gray-400">/</span>
          {/if}
          {#if i === $breadcrumbs.length - 1}
            <!-- Last breadcrumb (active page) -->
            <span class="font-Paragraph text-minParaFont">{crumb.name}</span>
          {:else}
            <!-- Previous breadcrumbs (links) -->
            <a
              href={crumb.path}
              class="text-black underline hover:no-underline underline-offset-4 font-Paragraph text-minParaFont"
            >
              {crumb.name}
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .breadcrumb ul {
    font-size: 14px;
  }
</style>
