<!-- src/lib/landing-v3/components/shared/Button.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'black' | 'text';
    href?: string;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = 'secondary',
    href = '',
    class: className = '',
    onclick,
    children
  }: Props = $props();

  const baseClasses = "inline-flex items-center justify-center font-sans font-bold tracking-wide text-xs sm:text-sm rounded-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none shrink-0 transition-all duration-180 ease-out hover:translate-y-[-2.5px] active:translate-y-0 active:scale-[0.98] cursor-pointer";
  
  const variantClasses = {
    primary: "bg-[#A3E635] text-black hover:bg-[#bef264] border border-transparent shadow-[0_4px_16px_rgba(163,230,53,0.18)] hover:shadow-[0_8px_24px_rgba(163,230,53,0.28)] px-6 sm:px-8 py-3 sm:py-3.5 focus-visible:ring-[#A3E635]",
    secondary: "border border-[#E5E3DC] hover:border-[#CCCCCC] bg-[#FFFFFF]/80 hover:bg-[#FFFFFF] text-[#111111] px-6 sm:px-8 py-3 sm:py-3.5 focus-visible:ring-[#111111]",
    black: "bg-[#111111] hover:bg-[#222222] text-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] px-6 sm:px-8 py-3 sm:py-3.5 focus-visible:ring-offset-black focus-visible:ring-white",
    text: "text-[#111111] dark:text-white hover:text-opacity-80 px-2 py-1 font-semibold flex gap-1 items-center hover:translate-y-0 hover:translate-x-0.5"
  };
</script>

{#if href}
  <a 
    {href} 
    class="{baseClasses} {variantClasses[variant]} {className}"
  >
    {#if children}
      {@render children()}
    {/if}
  </a>
{:else}
  <button 
    {onclick} 
    class="{baseClasses} {variantClasses[variant]} {className}"
  >
    {#if children}
      {@render children()}
    {/if}
  </button>
{/if}
