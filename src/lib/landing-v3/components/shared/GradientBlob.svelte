<!-- src/lib/landing-v3/components/shared/GradientBlob.svelte -->
<script lang="ts">
  interface Props {
    color?: 'green' | 'yellow' | 'mix';
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
    scale?: 'sm' | 'md' | 'lg';
    class?: string;
  }

  let {
    color = 'mix',
    position = 'top-right',
    scale = 'md',
    class: className = ''
  }: Props = $props();

  const colorClasses = {
    green: 'from-[#A3E635]/20 to-emerald-500/5',
    yellow: 'from-[#FACC15]/20 to-[#A3E635]/5',
    mix: 'from-[#A3E635]/25 via-[#FACC15]/15 to-[#A3E635]/5'
  };

  const positionClasses = {
    'top-right': 'top-0 right-0 translate-x-1/3 -translate-y-1/3',
    'top-left': 'top-0 left-0 -translate-x-1/3 -translate-y-1/3',
    'bottom-right': 'bottom-0 right-0 translate-x-1/3 translate-y-1/3',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/3 translate-y-1/3',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  const scaleClasses = {
    sm: 'w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] blur-[80px]',
    md: 'w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] blur-[120px]',
    lg: 'w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] blur-[160px]'
  };
</script>

<div 
  class="absolute rounded-full bg-gradient-to-br pointer-events-none z-0 opacity-40 select-none animate-pulse
         {colorClasses[color]} {positionClasses[position]} {scaleClasses[scale]} {className}"
  style="animation-duration: 8s;"
></div>
