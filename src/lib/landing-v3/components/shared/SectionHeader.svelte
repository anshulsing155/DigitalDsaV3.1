<!-- src/lib/landing-v3/components/shared/SectionHeader.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    align?: 'left' | 'center';
    label?: string;
    title: string;
    description?: string;
    class?: string;
    actions?: Snippet;
  }

  let {
    align = 'left',
    label = '',
    title,
    description = '',
    class: className = '',
    actions
  }: Props = $props();
</script>

<div class="w-full flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 sm:mb-16 {className} {align === 'center' ? 'items-center text-center' : 'items-start text-left'}">
  <div class="max-w-2xl flex flex-col gap-3">
    {#if label}
      <span class="w-max px-3 py-1 text-[11px] font-mono tracking-wider text-[#A3E635] uppercase bg-[#A3E635]/10 border border-[#A3E635]/20 rounded-full">
        {label}
      </span>
    {/if}
    
    <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] dark:text-white leading-[1.1]">
      {title}
    </h2>
    
    {#if description}
      <p class="text-sm sm:text-base font-normal leading-relaxed text-[#6B7280] dark:text-[#94A3B8] mt-2">
        {description}
      </p>
    {/if}
  </div>

  {#if actions}
    <div class="flex items-center gap-4 shrink-0">
      {@render actions()}
    </div>
  {/if}
</div>
