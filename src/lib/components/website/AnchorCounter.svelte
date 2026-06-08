

<script>
  import { onMount } from "svelte";
  import { page } from "$app/state";

  let count = 0;
  let anchorNames = [];
  let slug = "";

  const countAnchors = () => {
    const anchors = document.querySelectorAll('a[href=""]');
    count = anchors.length;
    anchorNames = Array.from(anchors).map((anchor) =>
      anchor.textContent.trim()
    );
  };

  // Function to send an API request to notify the admin
  // const notifyAdmin = async () => {
  //   try {
  //     const response = await fetch("/api/notify-admin", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         anchorNames,
  //         slug,
  //       }),
  //     });

  //     const result = await response.json();
  //     //console.log("Admin notification response:", result);
  //   } catch (error) {
  //     console.error("Failed to notify admin:", error);
  //   }
  // };

  $effect(() => {
    slug = page.url.pathname;
  });

  onMount(() => {
    countAnchors();
    // notifyAdmin(); // Send notification on component mount
  });
</script>

<div>
  <p>Url: {slug}</p>
  <p>Number of anchor tags with empty href: {count}</p>
  {#if count > 0}
    <ul class="list-decimal pl-[2rem]">
      {#each anchorNames as name}
        <li>{name}</li>
      {/each}
    </ul>
  {:else}
    <p>No anchor tags with empty href found.</p>
  {/if}
</div>

