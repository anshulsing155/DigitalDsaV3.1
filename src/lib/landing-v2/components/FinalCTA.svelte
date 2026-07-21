<!-- src/lib/landing-v2/components/FinalCTA.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  interface Props {
    isDark?: boolean;
  }

  let { isDark = true }: Props = $props();

  let spotlightEl = $state<HTMLElement | null>(null);
  let sectionEl = $state<HTMLElement | null>(null);

  function handleMouseMove(e: MouseEvent) {
    if (!spotlightEl || !sectionEl) return;
    const rect = sectionEl.getBoundingClientRect();
    const x = e.clientX - rect.left - 200; // Offset by half width
    const y = e.clientY - rect.top - 200; // Offset by half height
    
    gsap.to(spotlightEl, {
      left: x,
      top: y,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  function handleMouseEnter() {
    if (!spotlightEl) return;
    gsap.to(spotlightEl, { opacity: 1, duration: 0.3 });
  }

  function handleMouseLeave() {
    if (!spotlightEl) return;
    gsap.to(spotlightEl, { opacity: 0, duration: 0.5 });
  }
</script>

<section 
  id="cta" 
  bind:this={sectionEl}
  onmousemove={handleMouseMove}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  class="py-44 px-6 relative overflow-hidden transition-colors duration-500 {isDark ? 'bg-[#090d16]' : 'bg-[#f8fafc]'}"
  role="presentation"
>
  <!-- Dynamic cursor spotlight overlay -->
  <div 
    bind:this={spotlightEl}
    class="absolute pointer-events-none rounded-full blur-[120px] sm:blur-[180px] transition-all duration-300 ease-out opacity-0 z-0
           {isDark ? 'bg-[#0f62fe]/10' : 'bg-[#0f62fe]/5'}"
    style="width: 400px; height: 400px; left: 0px; top: 0px;"
  ></div>

  <div class="max-w-2xl mx-auto text-center space-y-8 relative z-10">
    <span class="text-xs font-mono uppercase tracking-widest text-[#0f62fe] font-bold block">
      Instant Onboarding
    </span>
    <h2 class="text-3xl sm:text-5xl font-bold font-sans {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'} tracking-tight leading-tight">
      Ready to run your entire loan sourcing business?
    </h2>
    <p class="text-sm sm:text-base text-[#6b7280] dark:text-[#94a3b8] leading-relaxed max-w-xl mx-auto">
      Access instant policy matchings, commission lead ledgers, automated bank eligibility checks, and verified payout workflows today.
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
      <a 
        href="#cta"
        class="bg-[#0f62fe] hover:bg-[#0052e0] text-white shadow-[0_4px_20px_rgba(15,98,254,0.15)] font-bold px-8 py-3.5 rounded-[18px] transition-all duration-200 text-sm tracking-wide hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto text-center focus-visible:ring-2 focus-visible:ring-[#0f62fe]"
      >
        Create Free Account
      </a>
      <a 
        href="#scale-and-trust"
        class="border {isDark ? 'border-slate-800 bg-slate-900/30 text-[#f8fafc] hover:bg-slate-800/40' : 'border-slate-200/80 bg-transparent text-[#111827] hover:bg-slate-100'} font-bold px-8 py-3.5 rounded-[18px] transition-all duration-200 text-sm tracking-wide hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto text-center"
      >
        Talk to Credit Desk
      </a>
    </div>
  </div>
</section>
