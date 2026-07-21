<!-- src/lib/landing-v2/components/ProblemComparison.svelte -->
<script lang="ts">
  import { tokens } from '../design/tokens';
  import { problemContent } from '../content/problem';
  import CommandCard from './ui/CommandCard.svelte';
  import Section from './ui/Section.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let legacyContainer = $state<HTMLElement | null>(null);
  let digitalContainer = $state<HTMLElement | null>(null);

  $effect(() => {
    if (!legacyContainer || !digitalContainer) return;
    gsap.registerPlugin(ScrollTrigger);

    const legacyCards = legacyContainer.querySelectorAll('.comparison-card');
    const legacyTween = gsap.from(legacyCards, {
      scrollTrigger: {
        trigger: legacyContainer,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      x: -40,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power3.out'
    });

    const digitalCards = digitalContainer.querySelectorAll('.comparison-card');
    const digitalTween = gsap.from(digitalCards, {
      scrollTrigger: {
        trigger: digitalContainer,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      x: 40,
      stagger: 0.1,
      duration: 0.6,
      ease: 'power3.out'
    });

    return () => {
      legacyTween.kill();
      digitalTween.kill();
    };
  });

  const manualPoints = [
    { label: 'Policy Verification', desc: 'Manual PDF policy lookup (Takes 24–48 hours). High guidelines rejection rate.', warning: 'Rejection TAT Leak' },
    { label: 'RM Allocation', desc: 'Manual cold-calling or RM sheet search. High coordinator matching delay.', warning: 'Allocation delay' },
    { label: 'Query Tracking', desc: 'Fragmented WhatsApp & email loops. Lost documents and case rejection.', warning: 'Query TAT leak' }
  ];

  const digitalPoints = [
    { label: 'Policy Verification', desc: 'Instant check matrix (< 1 second). Synchronized bank SLAs.', profit: 'Sourcing SLA Guaranteed' },
    { label: 'RM Allocation', desc: 'Direct automated RM allocation logs matching location and branch.', profit: 'Instant pick handoff' },
    { label: 'Query Tracking', desc: 'Centralized live query tracker console inside a single workspace.', profit: 'Sourced files secured' }
  ];
</script>
 
<Section id="complexity" {isDark}>
  <SectionHeader 
    label={problemContent.label}
    title={problemContent.title}
    description={problemContent.description}
    {isDark}
  />

  <div class="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10 font-sans mt-8">
    
    <!-- Left Column: Manual Sourcing (Muted/Outline Variant) -->
    <div bind:this={legacyContainer} class="space-y-6">
      <span class="text-xs font-mono uppercase tracking-wider text-rose-500/80 font-bold block px-2">● Legacy Sourcing Friction</span>
      {#each manualPoints as item}
        <div class="comparison-card opacity-100">
          <CommandCard {isDark} variant="outline" className="p-8 border-l-2 border-l-slate-300 dark:border-l-slate-800 flex flex-col gap-3 transition-all duration-300 hover:border-l-rose-500/40">
            <span class="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{item.label}</span>
            <p class="text-xs {isDark ? 'text-[#94a3b8]' : 'text-[#6b7280]'} leading-relaxed font-sans">{item.desc}</p>
            <span class="text-[9px] font-mono text-rose-500/80 uppercase font-semibold block mt-1">↳ {item.warning}</span>
          </CommandCard>
        </div>
      {/each}
    </div>

    <!-- Right Column: DigitalDSA Sourcing (Premium/Glass Variant with SaaS Blue edge) -->
    <div bind:this={digitalContainer} class="space-y-6">
      <span class="text-xs font-mono uppercase tracking-wider text-[#0f62fe] font-bold block px-2">● DigitalDSA Sourcing S1</span>
      {#each digitalPoints as item}
        <div class="comparison-card opacity-100">
          <CommandCard {isDark} variant="glass" className="p-8 border-l-2 border-l-[#0f62fe] flex flex-col gap-3 transition-all duration-300 hover:border-l-[#0f62fe] hover:shadow-[0_8px_30px_rgba(15,98,254,0.03)]">
            <span class="text-[9px] font-mono text-[#0f62fe] uppercase tracking-widest block">{item.label}</span>
            <p class="text-sm font-sans font-bold {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'} leading-relaxed">{item.desc}</p>
            <span class="text-[9px] font-mono text-[#00a76f] uppercase font-bold block mt-1">↳ {item.profit}</span>
          </CommandCard>
        </div>
      {/each}
    </div>

  </div>
</Section>
