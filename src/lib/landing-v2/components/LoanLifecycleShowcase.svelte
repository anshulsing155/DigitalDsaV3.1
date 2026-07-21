<!-- src/lib/landing-v2/components/LoanLifecycleShowcase.svelte -->
<script lang="ts">
  import { tokens } from '../design/tokens';
  import { lifecycleStages } from '../data/domain/lifecycle';
  import CommandCard from './ui/CommandCard.svelte';
  import Section from './ui/Section.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import { untrack } from 'svelte';
  import gsap from 'gsap';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let activeStageIndex = $state(0);

  // Active track indicators
  let activeIndicator = $state<HTMLElement | null>(null);
  let buttonsContainer = $state<HTMLElement | null>(null);

  // Programmatic logs buffer
  let consoleLogs = $state<{ label: string; detail: string; id: number }[]>([]);
  let logsContainer = $state<HTMLElement | null>(null);
  let logId = 0;

  // Horizontal active tab indicator animation
  $effect(() => {
    if (!buttonsContainer || !activeIndicator) return;
    const buttons = buttonsContainer.querySelectorAll('button');
    const activeBtn = buttons[activeStageIndex];
    if (activeBtn) {
      const parentRect = buttonsContainer.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      
      const leftOffset = btnRect.left - parentRect.left;
      const topOffset = btnRect.top - parentRect.top;
      
      gsap.to(activeIndicator, {
        x: leftOffset,
        y: topOffset,
        width: btnRect.width,
        height: btnRect.height,
        duration: 0.45,
        ease: 'back.out(1.4)'
      });
    }
  });

  // Push new active log to buffer
  $effect(() => {
    const stage = lifecycleStages[activeStageIndex];
    untrack(() => {
      const newLog = {
        label: stage.dashboardLabel,
        detail: stage.dashboardDetail,
        id: logId++
      };
      // Keep last 3 logs
      consoleLogs = [...consoleLogs, newLog].slice(-3);
    });
  });

  // Slide and fade in the latest log entry
  $effect(() => {
    if (consoleLogs.length > 0 && logsContainer) {
      setTimeout(() => {
        const items = logsContainer?.querySelectorAll('.log-card');
        if (items && items.length > 0) {
          const lastItem = items[items.length - 1];
          if (lastItem) {
            gsap.fromTo(lastItem,
              { opacity: 0, y: 15, scale: 0.98 },
              { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
            );
          }
        }
      }, 20);
    }
  });
  const stageStats = [
    { tat: 'Instant check', status: 'Automated KYC' },
    { tat: '< 1 second', status: 'Policy Engine' },
    { tat: '< 2 minutes', status: 'OCR Parser' },
    { tat: '< 1 second', status: 'Match Runes' },
    { tat: '< 5 minutes', status: 'Direct Routing' },
    { tat: '12 - 24 hours', status: 'Lender SLA' },
    { tat: 'Instant sync', status: 'Digital Print' },
    { tat: '24 - 48 hours', status: 'Bank Portal' },
    { tat: 'Weekly cycle', status: 'Ledger Post' }
  ];
</script>

<Section id="engine" {isDark}>
  <SectionHeader 
    label="OPERATIONAL LIFECYCLE"
    title="The Sourcing Lifecycle."
    description="Track files from registration, through algorithmic rules matching, up to bank RM handover and payout ledger schedules."
    {isDark}
  />

  <div class="flex flex-col gap-8 relative z-10 font-sans">
    
    <!-- Desktop Horizontal Track / Mobile Grid Buttons -->
    <div bind:this={buttonsContainer} class="grid grid-cols-3 md:grid-cols-9 gap-3 w-full relative">
      <!-- Smooth sliding background highlight -->
      <div 
        bind:this={activeIndicator} 
        class="absolute rounded-[14px] border border-[#0f62fe]/30 bg-[#0f62fe]/5 pointer-events-none z-0"
        style="width: 0px; height: 0px; left: 0; top: 0;"
      ></div>

      {#each lifecycleStages as stage, idx}
        <button 
          onmouseenter={() => activeStageIndex = idx}
          onclick={() => activeStageIndex = idx}
          class="flex flex-col items-center gap-1.5 p-3 rounded-[16px] border text-center transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0f62fe] z-10
                 {idx === activeStageIndex 
                   ? 'border-transparent text-[#0f62fe] font-bold bg-[#0f62fe]/5' 
                   : (isDark ? 'border-slate-800/60 bg-transparent text-[#94a3b8] hover:border-slate-700 hover:text-[#f8fafc]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350 hover:text-[#111827]')}"
        >
          <span class="text-xs font-mono font-black">{stage.step}</span>
          <span class="text-[9px] font-semibold hidden md:inline truncate w-full tracking-tighter uppercase">{stage.title}</span>
        </button>
      {/each}
    </div>

    <!-- Details View Panel below Horizontal Timeline -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-4">
      
      <!-- Left side detail pane -->
      <div class="lg:col-span-5 flex flex-col justify-between p-8 rounded-[28px] border transition-colors duration-300
                  {isDark ? 'bg-[#111726]/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-[0_8px_30px_rgba(15,98,254,0.015)]'}">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <span class="text-3xl font-bold font-sans text-[#0f62fe]">{lifecycleStages[activeStageIndex].step}</span>
            <h3 class="text-base font-sans font-bold {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'} uppercase">
              {lifecycleStages[activeStageIndex].title}
            </h3>
          </div>
          <p class="text-xs sm:text-sm leading-relaxed {isDark ? 'text-[#94a3b8]' : 'text-[#6b7280]'}">
            {lifecycleStages[activeStageIndex].description}
          </p>
        </div>
        
        <div class="pt-6 border-t mt-6 grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-mono transition-colors duration-300 {isDark ? 'border-slate-800/80' : 'border-slate-200/80'}">
          <div>
            <span class="dark:text-[#94a3b8]">Target TAT Impact</span>
            <span class="block text-[#00a76f] font-bold font-mono mt-0.5">{stageStats[activeStageIndex].tat}</span>
          </div>
          <div>
            <span class="dark:text-[#94a3b8]">Verification Status</span>
            <span class="block text-[#0f62fe] font-bold font-mono mt-0.5">{stageStats[activeStageIndex].status}</span>
          </div>
        </div>
      </div>

      <!-- Right side live dashboard panel -->
      <div class="lg:col-span-7">
        <CommandCard {isDark} variant="glass" className="p-8 h-full flex flex-col justify-between min-h-[300px]">
          <div class="flex justify-between items-start border-b pb-4 transition-colors duration-300 {isDark ? 'border-slate-800/60' : 'border-slate-200/60'}">
            <div>
              <span class="text-[9px] font-mono text-zinc-500 dark:text-[#94a3b8] uppercase block">Active Sourcing Case</span>
              <h4 class="text-sm font-sans font-bold {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'} mt-0.5">₹75,00,000 Home Loan Case</h4>
            </div>
            <span class="text-[10px] font-mono font-bold text-[#0f62fe] bg-[#0f62fe]/5 border border-[#0f62fe]/20 px-2.5 py-0.5 rounded-full">
              CASE-9081
            </span>
          </div>

          <div bind:this={logsContainer} class="py-4 flex flex-col gap-2 overflow-hidden max-h-[170px] justify-end">
            <span class="text-zinc-500 dark:text-[#94a3b8] text-[9px] font-mono uppercase tracking-wider block mb-1">Console Log Buffer</span>
            <div class="flex flex-col gap-2">
              {#each consoleLogs as log (log.id)}
                <div class="log-card p-3 rounded-xl border border-[#0f62fe]/15 dark:border-slate-800/80 bg-[#0f62fe]/2 dark:bg-[#090d16]/40 flex flex-col gap-1 opacity-100 transform translate-y-0">
                  <span class="text-[#0f62fe] font-bold text-[9px] font-mono">{log.label}</span>
                  <p class="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">{log.detail}</p>
                </div>
              {/each}
            </div>
          </div>

          <div class="pt-4 border-t flex items-center justify-between font-mono text-[9px] text-[#6b7280] dark:text-[#94a3b8] transition-colors duration-300 {isDark ? 'border-slate-800/60' : 'border-slate-200/60'}">
            <span>DSA: Channel Partner Node S1</span>
            <span class="text-[#00a76f] font-bold">Commission Ledger Tracked</span>
          </div>
        </CommandCard>
      </div>

    </div>

  </div>
</Section>
