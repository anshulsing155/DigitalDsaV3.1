<!-- src/lib/landing-v3/components/shared/Grid.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    cols?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
    class?: string;
    children?: Snippet;
  }

  let {
    cols = 3,
    gap = 'md',
    class: className = '',
    children
  }: Props = $props();

  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  };

  const gapClasses = {
    sm: 'gap-4 sm:gap-6',
    md: 'gap-6 sm:gap-8',
    lg: 'gap-8 sm:gap-12'
  };
</script>

<div class="grid {colsClasses[cols]} {gapClasses[gap]} {className}">
  {#if children}
    {@render children()}
  {/if}
</div>
