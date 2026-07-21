<!-- src/lib/landing-v2/components/ui/Section.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  
  interface Props {
    id?: string;
    isDark?: boolean;
    paddingClass?: string;
    children?: import('svelte').Snippet;
  }
  
  let { id = '', isDark = true, paddingClass = tokens.spacing.sectionPadding, children }: Props = $props();
</script>

<section 
  {id} 
  class="w-full transition-colors duration-500 {paddingClass}
         {isDark ? 'bg-[#000000] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'}"
>
  <div class="max-w-5xl mx-auto w-full">
    {#if children}
      {@render children()}
    {/if}
  </div>
</section>
