<script lang="ts">
  import { goto } from "$app/navigation";

  let {
    calculators = [] as { id: number; label: string; link: string }[],
    activeId = $bindable(1),
    mdGridCols = "md:grid-cols-5",
    closeNavPosition = "",
    moneyMapBool = false
  } = $props();

  function selectTab(calc: { id: number; label: string; link: string }) {
    activeId = calc.id;
    goto(calc.link);
  }
</script>

<!-- Desktop Navigation Tabs -->
<div class="hidden md:flex w-full border-b border-gray-200 mb-6 bg-white sticky top-[3.5rem] z-20">
  <div class="w-full max-w-7xl mx-auto px-4 flex gap-8">
    {#each calculators as calc (calc.id)}
      <button
        type="button"
        onclick={() => selectTab(calc)}
        class="py-4 px-2 border-b-2 font-semibold text-sm transition-all duration-200 outline-none shrink-0
          {activeId === calc.id
            ? 'border-black text-black font-bold scale-[1.02]'
            : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'}"
      >
        {calc.label}
      </button>
    {/each}
  </div>
</div>
