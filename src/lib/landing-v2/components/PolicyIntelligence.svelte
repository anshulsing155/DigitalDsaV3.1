<!-- src/lib/landing-v2/components/PolicyIntelligence.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { tokens } from '../design/tokens';
  import { policyAssistantContent } from '../content/policyAssistant';
  import { sampleQueries, type QueryResponse } from '../data/demo/sampleQueries';
  import CommandCard from './ui/CommandCard.svelte';
  import TerminalWindow from './ui/TerminalWindow.svelte';
  import Section from './ui/Section.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let selectedQueryIndex = $state<number>(-1);
  let activeQuery = $state<QueryResponse | null>(null);
  let isReasoning = $state(false);

  // Terminal displayed logs
  let displayedLogs = $state<string[]>([]);
  let currentLogTyping = $state<number>(-1);
  let showCursor = $state(true);

  // Element refs
  let outcomeContainer = $state<HTMLElement | null>(null);
  let presetContainer = $state<HTMLElement | null>(null);

  const reasoningSteps = [
    'Verifying applicant income haircut caps...',
    'Validating CIBIL bureau tier ranges...',
    'Evaluating obligations (FOIR) margins...',
    'Calculating property LTV thresholds...',
    'Comparing guidelines across 50+ policies...'
  ];

  // Cursor blink effect
  $effect(() => {
    if (!isReasoning) return;
    const interval = setInterval(() => {
      showCursor = !showCursor;
    }, 450);
    return () => clearInterval(interval);
  });

  // Stagger entry presets on scroll
  $effect(() => {
    if (!presetContainer) return;
    gsap.registerPlugin(ScrollTrigger);

    const presetCards = presetContainer.querySelectorAll('.preset-card');
    const tween = gsap.from(presetCards, {
      scrollTrigger: {
        trigger: presetContainer,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 20,
      stagger: 0.08,
      duration: 0.5,
      ease: 'power2.out'
    });

    return () => {
      tween.kill();
    };
  });

  // Scale in outcomes when reasoning finishes
  $effect(() => {
    if (!isReasoning && activeQuery && outcomeContainer) {
      const cards = outcomeContainer.querySelectorAll('.outcome-card');
      if (cards.length > 0) {
        gsap.fromTo(cards,
          { opacity: 0, scale: 0.96, y: 12 },
          { opacity: 1, scale: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }
        );
      }
    }
  });

  async function typeText(text: string, arrayIndex: number): Promise<void> {
    return new Promise((resolve) => {
      const textLength = text.length;
      let charIdx = 0;
      displayedLogs[arrayIndex] = '';

      const interval = setInterval(() => {
        if (charIdx < textLength) {
          displayedLogs[arrayIndex] += text[charIdx];
          charIdx++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 15); // Snappy 15ms per character typing speed
    });
  }

  async function runQuery(idx: number) {
    if (isReasoning) return;
    selectedQueryIndex = idx;
    activeQuery = sampleQueries[idx];
    isReasoning = true;
    displayedLogs = [];
    currentLogTyping = -1;

    for (let stepIdx = 0; stepIdx < reasoningSteps.length; stepIdx++) {
      currentLogTyping = stepIdx;
      displayedLogs.push('');
      await typeText(reasoningSteps[stepIdx], stepIdx);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Short break
    }

    isReasoning = false;
    currentLogTyping = -1;
  }
</script>

<Section id="intelligence" {isDark} paddingClass="py-24 px-6">
  <SectionHeader 
    label={policyAssistantContent.label}
    title={policyAssistantContent.title}
    description={policyAssistantContent.description}
    {isDark}
  />

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start relative z-10 font-sans">
    
    <!-- Left side: Clickable preset policy questions using Solid Cards -->
    <div bind:this={presetContainer} class="lg:col-span-5 flex flex-col gap-4">
      <span class="text-xs font-mono uppercase tracking-wider text-[#4c5750] dark:text-[#899c90] font-bold block px-2">Select Sourcing Queries</span>
      {#each sampleQueries as query, idx}
        <button
          onclick={() => runQuery(idx)}
          class="preset-card text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f62fe] rounded-[28px] opacity-100"
          disabled={isReasoning}
        >
          <CommandCard 
            {isDark} 
            variant={selectedQueryIndex === idx ? 'glass' : 'solid'}
            className="p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-2 {selectedQueryIndex === idx ? 'border-[#0f62fe]/45 shadow-[0_8px_30px_rgba(15,98,254,0.03)]' : ''}"
          >
            <div class="flex items-center justify-between w-full">
              <span class="font-mono text-[9px] uppercase tracking-wider font-bold {idx === selectedQueryIndex ? 'text-[#0f62fe]' : 'text-slate-400'}">Preset Scenario {idx + 1}</span>
              {#if idx === selectedQueryIndex}
                <span class="h-1.5 w-1.5 rounded-full bg-[#0f62fe] animate-pulse"></span>
              {/if}
            </div>
            <p class="font-sans text-xs font-bold {idx === selectedQueryIndex ? (isDark ? 'text-[#f8fafc]' : 'text-[#111827]') : 'text-slate-400 dark:text-slate-500/80'}">{query.question}</p>
          </CommandCard>
        </button>
      {/each}
      <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Select a preset query on the left to verify policies</p>
    </div>

    <!-- Right Column: Interactive Terminal Output Emulator -->
    <div class="lg:col-span-8">
      <TerminalWindow {isDark} title="Policy Intelligence Shell" className="h-full min-h-[360px] p-6">
        {#if activeQuery === null}
          <div class="flex flex-col items-center justify-center text-center h-full min-h-[300px] text-zinc-500 dark:text-zinc-600 font-sans gap-2">
            <svg class="h-6 w-6 stroke-zinc-400 dark:stroke-zinc-700 animate-bounce" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-xs uppercase tracking-wider font-bold mt-1">Terminal Awaiting Sourcing Query Input</p>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Select a preset query on the left to verify policies</p>
          </div>
        {:else}
          <!-- Query input display -->
          <div class="flex items-start gap-2.5 text-xs text-slate-400 pb-4 border-b border-slate-800/60 font-sans">
            <span class="text-[#0f62fe] font-mono font-bold">&gt;</span>
            <p class="italic">{activeQuery.question}</p>
          </div>

          <!-- Reasoning Step-by-Step progress logs -->
          {#if isReasoning}
            <div class="py-6 space-y-3 font-mono text-[11px] tracking-wide text-slate-400">
              {#each displayedLogs as log, stepIdx}
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-[#00a76f]">
                    <span>$ {log}</span>
                    {#if stepIdx === currentLogTyping && showCursor}
                      <span class="h-3 w-1.5 bg-[#00a76f] origin-bottom"></span>
                    {/if}
                  </div>
                  {#if stepIdx < currentLogTyping || (stepIdx === currentLogTyping && log.length === reasoningSteps[stepIdx].length)}
                    <span class="text-[#00a76f] font-bold">✓</span>
                  {/if}
                </div>
              {/each}
              <div class="flex items-center gap-2 text-[#0f62fe] pt-2 text-[10px]">
                <span class="h-1.5 w-1.5 rounded-full bg-[#0f62fe] animate-ping"></span>
                <span>SYSTEM EVALUATING...</span>
              </div>
            </div>
          {:else}
            <!-- Match Output Results in Glass Cards -->
            <div bind:this={outcomeContainer} class="pt-5 space-y-4">
              <span class="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Eligible Bank Handovers</span>
              <div class="space-y-4">
                {#each activeQuery.answers as answer}
                  <div class="outcome-card opacity-100">
                    <CommandCard {isDark} variant="glass" className="p-4 flex flex-col gap-3 font-sans transition-all duration-300 hover:shadow-[0_8px_30px_rgba(15,98,254,0.03)]">
                      <div class="flex items-center justify-between border-b pb-2 transition-colors duration-300 {isDark ? 'border-slate-800/80' : 'border-slate-200/80'}">
                        <span class="text-xs font-sans font-bold {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'}">{answer.lender}</span>
                        <span class="text-[10px] font-mono font-bold {answer.status === 'Eligible' ? 'text-[#00a76f]' : 'text-rose-500'}">
                          {answer.status}
                        </span>
                      </div>
                      
                      {#if answer.status === 'Eligible'}
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono text-[10px]">
                          <div>
                            <span class="text-slate-500 dark:text-slate-400/80 uppercase block">Payout Yield</span>
                            <span class="text-[#00a76f] font-bold">{answer.payout}</span>
                          </div>
                          <div>
                            <span class="text-slate-500 dark:text-slate-400/80 uppercase block">Est. TAT</span>
                            <span class="text-[#0f62fe] font-bold">{answer.tat}</span>
                          </div>
                          <div class="col-span-2 md:col-span-1">
                            <span class="text-slate-500 dark:text-slate-400/80 uppercase block">Policy Check</span>
                            <span class="text-slate-700 dark:text-slate-300 font-sans text-xs leading-tight block mt-0.5">{answer.reason}</span>
                          </div>
                        </div>
                      {:else}
                        <p class="text-xs text-rose-500/80 leading-relaxed font-sans">{answer.reason}</p>
                      {/if}
                    </CommandCard>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </TerminalWindow>
    </div>

  </div>
</Section>
