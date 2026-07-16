<script lang="ts">
  import { onMount } from "svelte";

  let banks = $state<any[]>([]);
  let selected = $state("");
  let loader = $state(true);

  onMount(async () => {
    const res = await fetch("/api/website/bankdata-collection");
    if (res.ok) loader = false;
    banks = await res.json();
  });

  function goToBank() {
    if (selected) {
      window.location.href = `/banksData/${encodeURIComponent(selected)}`;
    }
  }
</script>

<section class="relative w-full">
  <div class="relative w-full mx-auto overflow-hidden ml-2">
    {#if loader}
      <div class="animate-pulse space-y-4">
        <div class="h-6 bg-gray-300 rounded w-32"></div>
        <div class="flex gap-5">
          <div class="w-64 h-10 bg-gray-300 rounded"></div>
          <div class="w-32 h-10 bg-gray-300 rounded"></div>
        </div>
      </div>
    {:else}
      <h1>Select a Bank</h1>

      <select bind:value={selected} class="border p-2">
        <option value="" disabled>Select bank</option>
        {#each banks as bank}
          <option value={bank.BankName}>{bank.BankName}</option>
        {/each}
      </select>

      <button
        onclick={goToBank}
        class="ml-4 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer"
      >
        View Details
      </button>
    {/if}
  </div>
</section>
