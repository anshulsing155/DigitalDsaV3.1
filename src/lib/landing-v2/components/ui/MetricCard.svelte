<!-- src/lib/landing-v2/components/ui/MetricCard.svelte -->
<script lang="ts">
  import { tokens } from '../../design/tokens';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  interface Props {
    num: string;
    value?: number;
    prefix?: string;
    suffix?: string;
    label: string;
    isDark?: boolean;
  }
  
  let { num, value, prefix = '', suffix = '', label, isDark = true }: Props = $props();

  let elementRef = $state<HTMLElement | null>(null);
  let displayedVal = $state(0);

  $effect(() => {
    if (value === undefined || !elementRef) return;
    gsap.registerPlugin(ScrollTrigger);

    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: value,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: elementRef,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      onUpdate: () => {
        displayedVal = obj.val;
      }
    });

    return () => {
      tween.kill();
    };
  });
</script>

<div bind:this={elementRef} class="space-y-1 text-left metric-card-element">
  <span class="text-4xl sm:text-5xl font-sans font-bold block counter-num {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'}">
    {#if value !== undefined}
      {prefix}{Math.round(displayedVal)}{suffix}
    {:else}
      {num}
    {/if}
  </span>
  <span class="{tokens.typography.mono} block">
    {label}
  </span>
</div>
