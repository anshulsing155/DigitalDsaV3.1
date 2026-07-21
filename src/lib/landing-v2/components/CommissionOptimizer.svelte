<!-- src/lib/landing-v2/components/CommissionOptimizer.svelte -->
<script lang="ts">
  import { tokens } from '../design/tokens';
  import { bankProfiles } from '../data/domain/banks';
  import CommandCard from './ui/CommandCard.svelte';
  import Section from './ui/Section.svelte';
  import SectionHeader from './ui/SectionHeader.svelte';
  import NumberTicker from './ui/NumberTicker.svelte';
  import gsap from 'gsap';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  let disbursedVolume = $state<number>(10000000); // 1 Crore default
  let productType = $state<'HL' | 'LAP'>('HL');
  let userCibil = $state<number>(710);
  let userProfile = $state<'salaried' | 'business'>('salaried');

  // Element ref
  let tableBodyEl = $state<HTMLElement | null>(null);

  // Dynamic eligibility rules
  function isBankEligible(name: string): boolean {
    if (name.includes('SBI')) {
      return userCibil >= 720 && userProfile === 'salaried';
    }
    if (name.includes('HDFC')) {
      return userCibil >= 700;
    }
    if (name.includes('ICICI')) {
      return userCibil >= 680;
    }
    if (name.includes('Bajaj')) {
      return userCibil >= 600;
    }
    return false;
  }

  // Dynamic Payout rate calculation
  function getPayoutRate(bank: typeof bankProfiles[0]): string {
    return productType === 'HL' ? bank.payoutHL : bank.payoutLAP;
  }

  // Expected payout raw number
  function getRawPayoutValue(bank: typeof bankProfiles[0]): number {
    if (!isBankEligible(bank.name)) return 0;
    const rateStr = getPayoutRate(bank);
    const rate = parseFloat(rateStr) / 100;
    return disbursedVolume * rate;
  }

  // Trigger recalculation flash effect
  $effect(() => {
    // track changes to state reactively
    const _vol = disbursedVolume;
    const _prod = productType;
    const _cibil = userCibil;
    const _prof = userProfile;

    if (tableBodyEl) {
      const rows = tableBodyEl.querySelectorAll('.eligible-row');
      if (rows.length > 0) {
        gsap.fromTo(rows,
          { backgroundColor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.08)' },
          { backgroundColor: 'transparent', duration: 0.7, ease: 'power2.out' }
        );
      }
    }
  });
</script>

<Section id="optimizer" {isDark} paddingClass="py-28 px-6">
  <SectionHeader 
    label="PAYOUT & COMMISSION OPTIMIZER"
    title="Which lender gives the best outcome?"
    description="Calculate payouts and evaluate turnaround times (TAT) dynamically based on candidate parameters and sourcing volumes."
    {isDark}
  />

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start relative z-10 font-sans">
    
    <!-- Left panel: Volume & Profile Inputs in Solid Card -->
    <div class="lg:col-span-4 flex flex-col gap-6">
      <span class="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94a3b8] font-bold block px-2">Configure Sourcing Volume</span>
      <CommandCard {isDark} variant="solid" className="p-8 md:p-10 space-y-6">
        <div class="space-y-2">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-slate-500 dark:text-[#94a3b8]">Loan Volume</span>
            <span class="text-[#0f62fe] font-bold">₹{disbursedVolume.toLocaleString('en-IN')}</span>
          </div>
          <input type="range" min="1000000" max="50000000" step="1000000" bind:value={disbursedVolume} class="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f62fe] focus:outline-none" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-mono text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Loan Product</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button onclick={() => productType = 'HL'} class="py-2 rounded-[16px] border transition-colors cursor-pointer {productType === 'HL' ? 'bg-[#0f62fe]/5 text-[#0f62fe] border-[#0f62fe]/30 font-semibold' : (isDark ? 'bg-transparent border-slate-800 text-[#94a3b8]' : 'bg-transparent border-slate-200 text-slate-550')}">Home Loan</button>
            <button onclick={() => productType = 'LAP'} class="py-2 rounded-[16px] border transition-colors cursor-pointer {productType === 'LAP' ? 'bg-[#0f62fe]/5 text-[#0f62fe] border-[#0f62fe]/30 font-semibold' : (isDark ? 'bg-transparent border-slate-800 text-[#94a3b8]' : 'bg-transparent border-slate-200 text-slate-550')}">LAP Transfer</button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-slate-500 dark:text-[#94a3b8]">Applicant CIBIL</span>
            <span class="text-[#0f62fe] font-bold">{userCibil}</span>
          </div>
          <input type="range" min="500" max="900" step="10" bind:value={userCibil} class="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0f62fe] focus:outline-none" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-mono text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Employment Type</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button onclick={() => userProfile = 'salaried'} class="py-2 rounded-[16px] border transition-colors cursor-pointer {userProfile === 'salaried' ? 'bg-[#0f62fe]/5 text-[#0f62fe] border-[#0f62fe]/30 font-semibold' : (isDark ? 'bg-transparent border-slate-800 text-[#94a3b8]' : 'bg-transparent border-slate-200 text-slate-550')}">Salaried</button>
            <button onclick={() => userProfile = 'business'} class="py-2 rounded-[16px] border transition-colors cursor-pointer {userProfile === 'business' ? 'bg-[#0f62fe]/5 text-[#0f62fe] border-[#0f62fe]/30 font-semibold' : (isDark ? 'bg-transparent border-slate-800 text-[#94a3b8]' : 'bg-transparent border-slate-200 text-slate-550')}">Self-Employed</button>
          </div>
        </div>
      </CommandCard>
    </div>

    <!-- Right panel: Comparison matrix in Elevated Glass Card -->
    <div class="lg:col-span-8 flex flex-col gap-6">
      <span class="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94a3b8] font-bold block px-2">Payout Comparison Matrix</span>
      <CommandCard {isDark} variant="glass" className="overflow-hidden">
        <table class="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr class="border-b transition-colors duration-300 {isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200/80 text-slate-500'}">
              <th class="p-4 font-bold uppercase tracking-wider text-[10px]">Bank / Lender</th>
              <th class="p-4 font-bold uppercase tracking-wider text-[10px]">Policy Check</th>
              <th class="p-4 font-bold uppercase tracking-wider text-[10px]">Est. Payout Yield</th>
              <th class="p-4 font-bold uppercase tracking-wider text-[10px]">Est. TAT</th>
            </tr>
          </thead>
          <tbody bind:this={tableBodyEl}>
            {#each bankProfiles as bank}
              {@const eligible = isBankEligible(bank.name)}
              <tr class="border-b transition-all duration-300 
                         {eligible ? 'eligible-row opacity-100' : 'opacity-25 filter grayscale contrast-75'}
                         {isDark ? 'border-slate-800/60 hover:bg-slate-900/30' : 'border-slate-200 hover:bg-slate-50'}">
                <td class="p-4 font-sans font-bold text-sm {isDark && eligible ? 'text-[#f8fafc]' : (eligible ? 'text-[#111827]' : 'text-slate-400')}">{bank.name}</td>
                <td class="p-4">
                  {#if eligible}
                    <span class="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-[#00a76f]/10 border-[#00a76f]/20 text-[#00a76f] uppercase tracking-wider">Eligible</span>
                  {:else}
                    <span class="px-2 py-0.5 text-[9px] font-bold rounded-full border border-slate-200 text-slate-400 uppercase tracking-wider">Filtered</span>
                  {/if}
                </td>
                <td class="p-4 font-bold {eligible ? 'text-[#00a76f]' : 'text-slate-400'}">
                  {#if eligible}
                    <span class="font-sans">₹<NumberTicker value={getRawPayoutValue(bank)} /></span>
                    <span class="text-[9px] text-[#0f62fe] font-bold ml-1">({getPayoutRate(bank)})</span>
                  {:else}
                    —
                  {/if}
                </td>
                <td class="p-4 {eligible ? (isDark ? 'text-[#f8fafc]' : 'text-[#111827]') : 'text-slate-400'}">
                  {eligible ? bank.tat : '—'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </CommandCard>
    </div>

  </div>
</Section>
