<!-- src/lib/landing-v3/components/shared/Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    padding = 'md',
    interactive = false,
    class: className = '',
    children
  }: Props = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-5 sm:p-6',
    md: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-12'
  };

  const interactiveClasses = interactive 
    ? 'hover:translate-y-[-5px] hover:shadow-[0_16px_36px_rgba(132,204,22,0.05)] cursor-pointer hover:border-[#84CC16]/40'
    : '';
</script>

<div 
  class="bg-[#FFFFFF]/95 dark:bg-[#111726]/90 border border-[#E5E3DC]/70 dark:border-slate-800/70 rounded-[28px] shadow-[0_8px_32px_rgba(17,17,17,0.01)] transition-all duration-240 ease-[cubic-bezier(0.22,1,0.36,1)] relative overflow-hidden group
         {paddingClasses[padding]} {interactiveClasses} {className}"
>
  {#if children}
    {@render children()}
  {/if}
</div>
