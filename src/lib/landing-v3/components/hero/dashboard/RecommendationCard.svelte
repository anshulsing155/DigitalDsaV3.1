<!-- src/lib/landing-v3/components/hero/dashboard/RecommendationCard.svelte -->
<script lang="ts">
  import { Sparkles, Check } from 'lucide-svelte';
</script>

<div class="bg-white dark:bg-[#111726]/80 border border-[#E5E3DC]/40 dark:border-slate-800/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:border-black/10 dark:hover:border-white/10 transition-colors select-none">
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#65A30D] text-[10px] font-bold">
      <Sparkles class="h-3 w-3" />
      <span>AI Policy Matcher</span>
    </div>
    <span class="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">Aarav Sharma</span>
  </div>

  <div class="my-4 space-y-2">
    <!-- Row 1 -->
    <div class="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] dark:bg-[#090d16] border border-[#E5E3DC]/20 dark:border-slate-800/20">
      <div class="flex items-center gap-2">
        <div class="h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[8px] font-bold">
          H
        </div>
        <span class="text-[10px] font-bold text-[#111111] dark:text-white">HDFC Bank</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] text-[#65A30D] font-bold">98% Match</span>
        <Check class="h-3.5 w-3.5 text-emerald-500" />
      </div>
    </div>

    <!-- Row 2 -->
    <div class="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] dark:bg-[#090d16] border border-[#E5E3DC]/20 dark:border-slate-800/20">
      <div class="flex items-center gap-2">
        <div class="h-5 w-5 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-[8px] font-bold">
          A
        </div>
        <span class="text-[10px] font-bold text-[#111111] dark:text-white">Axis Bank</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-bold">92% Match</span>
        <Check class="h-3.5 w-3.5 text-emerald-500" />
      </div>
    </div>
  </div>

  <div class="text-[9px] text-[#6B7280] dark:text-[#94A3B8] text-center italic">
    *Calculated using FOIR ratios & income inputs
  </div>
</div>
