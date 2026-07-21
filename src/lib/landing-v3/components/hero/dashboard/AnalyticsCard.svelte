<!-- src/lib/landing-v3/components/hero/dashboard/AnalyticsCard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { TrendingUp } from 'lucide-svelte';

  let isLoading = $state(true);

  onMount(() => {
    const timer = setTimeout(() => {
      isLoading = false;
    }, 1200);
    return () => clearTimeout(timer);
  });
</script>

<div class="bg-white dark:bg-[#111726]/60 border border-[#E5E3DC]/40 dark:border-slate-800/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.01)] hover:border-[#84CC16]/30 dark:hover:border-slate-700/50 hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-200 select-none min-h-[170px] overflow-hidden relative">
  
  {#if isLoading}
    <!-- Shimmer Skeleton Loading State -->
    <div class="flex-1 flex flex-col justify-between animate-pulse">
      <div class="flex items-center justify-between">
        <div class="h-3 w-16 bg-[#E5E3DC]/50 dark:bg-slate-800 rounded"></div>
        <div class="h-4 w-12 bg-[#E5E3DC]/50 dark:bg-slate-800 rounded-full"></div>
      </div>
      <div class="my-3 space-y-2">
        <div class="h-7 w-20 bg-[#E5E3DC]/60 dark:bg-slate-750 rounded"></div>
        <div class="h-3 w-28 bg-[#E5E3DC]/40 dark:bg-slate-800 rounded"></div>
      </div>
      <div class="h-10 bg-[#E5E3DC]/30 dark:bg-slate-800/50 rounded-lg w-full"></div>
    </div>
  {:else}
    <!-- Loaded State -->
    <div class="flex flex-col justify-between h-full">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono tracking-wider text-[#6B7280] dark:text-[#94A3B8] uppercase">Sourcing Velocity</span>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#A3E635]/15 text-[#65A30D] text-[10px] font-bold">
          <TrendingUp class="h-3 w-3" />
          <span>+14.8%</span>
        </div>
      </div>
      
      <div class="my-2">
        <span class="text-2xl font-bold tracking-tight text-[#111111] dark:text-white">₹4.89 Cr</span>
        <span class="block text-[9px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">Disbursed Volume (MTD)</span>
      </div>

      <!-- SVG Mini Graph -->
      <div class="w-full h-12 mt-1 relative">
        <svg class="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#A3E635" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#A3E635" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <!-- Gradient Fill -->
          <path 
            d="M0 60 Q 25 35, 50 45 T 100 25 T 150 15 T 200 5 L 200 60 L 0 60 Z" 
            fill="url(#chartGlow)"
          />
          <!-- Line -->
          <path 
            d="M0 60 Q 25 35, 50 45 T 100 25 T 150 15 T 200 5" 
            fill="none" 
            stroke="#A3E635" 
            stroke-width="2.5" 
            stroke-linecap="round"
          />
          <!-- Active point -->
          <circle cx="200" cy="5" r="4.5" fill="#A3E635" />
          <circle cx="200" cy="5" r="9" fill="#A3E635" fill-opacity="0.3" class="animate-ping" />
        </svg>
      </div>
    </div>
  {/if}
</div>
