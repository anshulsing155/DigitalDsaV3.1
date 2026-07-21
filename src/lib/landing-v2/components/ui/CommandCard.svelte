<!-- src/lib/landing-v2/components/ui/CommandCard.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  
  interface Props {
    isDark?: boolean;
    variant?: 'glass' | 'solid' | 'elevated' | 'outline';
    children?: import('svelte').Snippet;
    className?: string;
  }
  
  let { isDark = true, variant = 'elevated', children, className = '' }: Props = $props();

  let themeVariants = $derived(isDark ? tokens.variants.dark : tokens.variants.light);

  let variantClass = $derived(
    variant === 'glass' ? themeVariants.cardGlass :
    variant === 'solid' ? themeVariants.cardSolid :
    variant === 'outline' ? themeVariants.cardOutline :
    themeVariants.cardElevated
  );
</script>

<div 
  class="relative group overflow-hidden transition-all duration-300 {variantClass} {tokens.radius.card} {className}"
>
  {#if variant !== 'solid'}
    <!-- Soft background glow on hover -->
    <div class="absolute -inset-10 bg-[#0f62fe]/4 dark:bg-[#0f62fe]/2 rounded-[28px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"></div>
  {/if}
  
  <div class="relative z-10 w-full h-full">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .animate-spin-slow {
    animation: spin 6s linear infinite;
  }
</style>
