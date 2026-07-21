<!-- src/lib/landing-v3/components/shared/Container.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children?: Snippet;
  }

  let {
    class: className = '',
    children
  }: Props = $props();
</script>

<div class="max-w-7xl mx-auto w-full relative z-10 {className}">
  {#if children}
    {@render children()}
  {/if}
</div>
