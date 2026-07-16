<script lang="ts">
  import { goto } from "$app/navigation";
  import { slide } from "svelte/transition";

  let {
    innerPlaceHolder = "Select your question",
    selectedValue = $bindable(""),
    options = [] as { id: number; label: string; link: string }[],
    icon = "",
    iconBg = "bg-black"
  } = $props();

  let isOpen = $state(false);

  function selectOption(option: { id: number; label: string; link: string }) {
    selectedValue = option.link;
    isOpen = false;
    goto(option.link);
  }
</script>

<div class="w-full px-6 py-4 flex flex-col gap-4 relative">
  <!-- Selector trigger box -->
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-gray-300 transition-all duration-200 text-left"
  >
    <div class="flex items-center gap-3">
      <!-- Icon badge -->
      {#if icon}
        <div class="w-10 h-10 flex items-center justify-center rounded-xl {iconBg} shrink-0">
          <img src={icon} alt="icon" class="w-5 h-5 invert brightness-0" />
        </div>
      {/if}
      <div>
        <span class="text-sm font-semibold text-gray-400 block uppercase tracking-wider text-[10px]">
          {innerPlaceHolder}
        </span>
        <span class="text-base font-semibold text-gray-800">
          {options.find((o) => o.link === selectedValue)?.label || "Choose a Question..."}
        </span>
      </div>
    </div>
    
    <!-- Chevron -->
    <div class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-transform duration-200" style="transform: rotate({isOpen ? 180 : 0}deg)">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </button>

  <!-- Options list -->
  {#if isOpen}
    <div
      transition:slide={{ duration: 250 }}
      class="w-full bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-40 max-h-[60vh] overflow-y-auto"
    >
      <div class="p-2 flex flex-col gap-1">
        {#each options as option (option.id)}
          <button
            type="button"
            onclick={() => selectOption(option)}
            class="w-full p-4 text-left rounded-xl transition-all duration-200 flex items-center gap-3 hover:bg-gray-50 {selectedValue === option.link ? 'bg-yellow-50/50 border-l-4 border-yellow-500 font-semibold text-yellow-800' : 'text-gray-700 font-medium'}"
          >
            <span class="text-sm">{option.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
