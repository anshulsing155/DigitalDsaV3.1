<!-- src/lib/landing-v2/components/TrustMetrics.svelte -->
<script lang="ts">
  import { tokens } from '../design/tokens';
  import { trustContent } from '../content/trust';
  import MetricCard from './ui/MetricCard.svelte';
  import Section from './ui/Section.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let gridContainer = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!gridContainer) return;
    gsap.registerPlugin(ScrollTrigger);

    const cards = gridContainer.querySelectorAll('.metric-card-element');
    const tween = gsap.from(cards, {
      scrollTrigger: {
        trigger: gridContainer,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 20,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power3.out'
    });

    return () => {
      tween.kill();
    };
  });
</script>

<Section id="scale-and-trust" {isDark}>
  <SectionHeader 
    label="Benchmarks"
    title="Scale Sourcing Efficiency"
    description="DigitalDSA accelerates manual processes into automated validations, delivering standard banking SLAs."
    {isDark}
  />

  <div class="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10 font-sans">
    
    <!-- Narrative Outcome columns -->
    <div class="space-y-6 text-sm leading-relaxed {isDark ? 'text-[#94a3b8]' : 'text-[#6b7280]'}">
      <h3 class="text-xl font-bold font-sans {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'}">
        Proven operational benchmarks.
      </h3>
      <p>
        DSAs and banking credit partners reduce manual policy checks and eligibility guesswork, leading to lower dropoffs and reliable payouts.
      </p>
      
      <div class="space-y-3 font-mono text-xs">
        <p>● Policy updates synchronized automatically within target SLA.</p>
        <p>● Multi-product support across Home Loan, LAP, and Business loans.</p>
        <p>● Automated pre-underwriting evaluations matching 50+ bank matrices.</p>
      </div>
    </div>

    <!-- Counters Grid using MetricCard UI primitive -->
    <div bind:this={gridContainer} class="grid grid-cols-2 gap-8 border p-8 rounded-[32px] shadow-sm transition-colors duration-300
                {isDark ? 'bg-[#111726]/60 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-[0_8px_30px_rgba(15,98,254,0.015)]'}">
      <MetricCard num="< 2 hrs" value={2} prefix="< " suffix=" hrs" label="Policy SLA Update" {isDark} />
      <MetricCard num="98%" value={98} suffix="%" label="Eligibility Accuracy" {isDark} />
      <MetricCard num="4x" value={4} suffix="x" label="TAT Sourcing Velocity" {isDark} />
      <MetricCard num="50+" value={50} suffix="+" label="Active Lender policies" {isDark} />
    </div>

  </div>
</Section>
