<!-- src/lib/landing-v2/components/ui/SectionHeader.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  
  interface Props {
    label: string;
    title: string;
    description?: string;
    isDark?: boolean;
  }
  
  let { label, title, description = '', isDark = true }: Props = $props();
</script>

<div class="max-w-2xl mx-auto text-center space-y-5 mb-20 reveal-item">
  <span class="text-[10px] font-bold uppercase tracking-wider text-[#0f62fe] font-mono">
    {label}
  </span>
  <h2 class="{tokens.typography.heading} {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'}">
    {title}
  </h2>
  {#if description}
    <p class="{tokens.typography.body} {isDark ? 'text-[#94a3b8]' : 'text-[#6b7280]'}">
      {description}
    </p>
  {/if}
</div>
