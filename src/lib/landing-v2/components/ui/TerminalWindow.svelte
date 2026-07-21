<!-- src/lib/landing-v2/components/ui/TerminalWindow.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  
  interface Props {
    title: string;
    isDark?: boolean;
    children?: import('svelte').Snippet;
    className?: string;
  }
  
  let { title, isDark = true, children, className = '' }: Props = $props();
</script>

<div 
  class="relative w-full border font-mono text-xs overflow-hidden transition-all duration-300 {tokens.radius.card} {className}
         {isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-400' : 'bg-white border-slate-200/80 text-slate-850 shadow-sm'}"
>
  <!-- Top bar -->
  <div class="px-4 py-3 border-b flex justify-between items-center transition-colors duration-300
              {isDark ? 'bg-[#0E131F]/90 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}">
    <div class="flex items-center gap-1.5">
      <span class="h-2 w-2 rounded-full bg-rose-500/80"></span>
      <span class="h-2 w-2 rounded-full bg-amber-500/80"></span>
      <span class="h-2 w-2 rounded-full bg-[#00a76f]/80"></span>
    </div>
    <span class="text-[10px] tracking-wider uppercase font-bold text-slate-500">
      {title}
    </span>
    <span class="text-[9px] text-[#0f62fe] uppercase tracking-widest font-bold">Live telemetry</span>
  </div>
  
  <!-- Content -->
  <div class="p-5">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
