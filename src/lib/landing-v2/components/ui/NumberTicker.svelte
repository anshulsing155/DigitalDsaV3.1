<!-- src/lib/landing-v2/components/ui/NumberTicker.svelte -->
<script lang="ts">
  import { untrack } from 'svelte';
  import gsap from 'gsap';

  interface Props {
    value: number;
    duration?: number;
    formatter?: (val: number) => string;
    className?: string;
  }

  let {
    value,
    duration = 0.6,
    formatter = (val: number) => Math.round(val).toLocaleString('en-IN'),
    className = ''
  }: Props = $props();

  let displayedValue = $state(value);

  $effect(() => {
    const targetValue = value;
    const startValue = untrack(() => displayedValue);
    const obj = { val: startValue };
    const tween = gsap.to(obj, {
      val: targetValue,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        displayedValue = obj.val;
      }
    });

    return () => {
      tween.kill();
    };
  });
</script>

<span class={className}>
  {formatter(displayedValue)}
</span>
