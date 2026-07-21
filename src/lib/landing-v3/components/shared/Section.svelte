<!-- src/lib/landing-v3/components/shared/Section.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id?: string;
    class?: string;
    children?: Snippet;
  }

  let { 
    id = '', 
    class: className = '', 
    children 
  }: Props = $props();
</script>

<section 
  {id} 
  class="w-full relative overflow-hidden py-24 sm:py-32 px-6 sm:px-8 {className}"
>
  {#if children}
    {@render children()}
  {/if}
</section>
