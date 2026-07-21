<!-- src/lib/landing-v3/components/hero/dashboard/LoanCard.svelte -->
<script lang="ts">
  import { ShieldCheck, ArrowUpRight } from 'lucide-svelte';
</script>

<div class="bg-white dark:bg-[#111726]/60 border border-[#E5E3DC]/40 dark:border-slate-800/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.01)] hover:border-black/10 dark:hover:border-white/10 transition-colors select-none">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="h-6 w-6 rounded bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
        <ShieldCheck class="h-4 w-4" />
      </div>
      <span class="text-[10px] font-mono tracking-wider text-[#6B7280] dark:text-[#94A3B8] uppercase">Secure Payout</span>
    </div>
    <!-- Synced status pill -->
    <div class="flex items-center gap-1">
      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">Synced</span>
    </div>
  </div>


  <div class="my-4">
    <span class="text-xl font-bold tracking-tight text-[#111111] dark:text-white">₹1,45,000</span>
    <span class="block text-[10px] text-[#6B7280] dark:text-[#94A3B8] mt-1">Expected Agent Commission</span>
  </div>

  <!-- Progress / Bank Details -->
  <div class="border-t border-[#E5E3DC]/30 dark:border-slate-800/30 pt-3 flex items-center justify-between text-[10px]">
    <div class="flex items-center gap-1.5">
      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
      <span class="font-bold text-[#111111] dark:text-white">Lender Cleared</span>
    </div>
    <span class="text-[#6B7280] dark:text-[#94A3B8]">SBI Home Loan</span>
  </div>
</div>
