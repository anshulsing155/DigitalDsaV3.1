<!-- src/lib/landing-v2/components/ui/TimelineStep.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  
  interface Props {
    step: string;
    title: string;
    description: string;
    isActive?: boolean;
    isDark?: boolean;
  }
  
  let { step, title, description, isActive = false, isDark = true }: Props = $props();
</script>

<div 
  class="flex gap-4 p-4 rounded-xl border transition-all duration-300
         {isActive ? 'border-cyan-500/30 bg-cyan-950/5' : (isDark ? 'border-zinc-900 bg-transparent' : 'border-zinc-200 bg-white')}"
>
  <span class="text-2xl font-bold font-mono {isActive ? 'text-cyan-500' : 'text-zinc-600'}">
    {step}
  </span>
  <div class="space-y-1">
    <h4 class="text-sm font-bold {isDark ? 'text-white' : 'text-zinc-900'}">
      {title}
    </h4>
    <p class="text-xs {isDark ? 'text-zinc-400' : 'text-zinc-500'} leading-relaxed font-sans">
      {description}
    </p>
  </div>
</div>
