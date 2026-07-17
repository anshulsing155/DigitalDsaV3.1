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
    class="w-full flex items-center justify-between p-4 bg-[var(--landing-bg-card)] border border-[var(--form-border)] rounded-2xl shadow-sm hover:opacity-90 transition-all duration-200 text-left cursor-pointer"
  >
    <div class="flex items-center gap-3">
      <!-- Icon badge -->
      {#if icon}
        <div class="w-10 h-10 flex items-center justify-center rounded-xl {iconBg} shrink-0">
          <img src={icon} alt="icon" class="w-5 h-5 invert brightness-0" />
        </div>
      {/if}
      <div>
        <span class="text-sm font-semibold text-[var(--landing-text-muted)] block uppercase tracking-wider text-[10px]">
          {innerPlaceHolder}
        </span>
        <span class="text-base font-semibold text-[var(--landing-text)]">
          {options.find((o) => o.link === selectedValue)?.label || "Choose a Question..."}
        </span>
      </div>
    </div>
    
    <!-- Chevron -->
    <div class="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--landing-bg-alt)] text-[var(--landing-text-muted)] transition-transform duration-200" style="transform: rotate({isOpen ? 180 : 0}deg)">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </button>

  <!-- Options list -->
  {#if isOpen}
    <div
      transition:slide={{ duration: 250 }}
      class="w-full bg-[var(--landing-bg-card)] border border-[var(--form-border)] rounded-2xl shadow-xl overflow-hidden z-40 max-h-[60vh] overflow-y-auto"
    >
      <div class="p-2 flex flex-col gap-1">
        {#each options as option (option.id)}
          <button
            type="button"
            onclick={() => selectOption(option)}
            class="w-full p-4 text-left rounded-xl transition-all duration-200 flex items-center gap-3 hover:bg-[var(--landing-bg-alt)] cursor-pointer {selectedValue === option.link ? 'bg-[var(--landing-accent-subtle)] border-l-4 border-btnBg font-semibold text-[var(--landing-text)]' : 'text-[var(--landing-text-secondary)] font-medium'}"
          >
            <span class="text-sm">{option.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
