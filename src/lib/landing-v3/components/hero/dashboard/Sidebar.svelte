<!-- src/lib/landing-v3/components/hero/dashboard/Sidebar.svelte -->
<script lang="ts">
  import { 
    Home, 
    Compass, 
    FileText, 
    TrendingUp, 
    DollarSign, 
    Sliders,
    Settings 
  } from 'lucide-svelte';

  let activeItem = $state('home');

  const navItems = [
    { id: 'home', icon: Home, label: 'Overview' },
    { id: 'matrix', icon: Compass, label: 'AI Matrix' },
    { id: 'applications', icon: FileText, label: 'Pipelines' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'payouts', icon: DollarSign, label: 'Payouts' },
    { id: 'settings', icon: Sliders, label: 'Controls' }
  ];
</script>

<div class="h-full w-14 sm:w-16 bg-[#FBFBF9] dark:bg-[#090d16] border-r border-[#E5E3DC]/40 dark:border-slate-800/40 flex flex-col items-center py-6 gap-6 justify-between select-none">
  <div class="flex flex-col items-center gap-6 w-full">
    <!-- Brand Icon -->
    <div class="relative">
      <div class="h-8 w-8 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-sm tracking-tighter">
        D
      </div>
      <!-- Pulse Notification badge -->
      <span class="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#FBFBF9] dark:border-[#090d16] bg-[#84CC16]">
        <span class="absolute inset-0 rounded-full bg-[#84CC16] animate-ping opacity-75"></span>
      </span>
    </div>


    <!-- Nav list -->
    <nav class="flex flex-col gap-2 w-full px-2 mt-4">
      {#each navItems as item}
        <button 
          class="p-2 sm:p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 relative group
                 {activeItem === item.id 
                   ? 'bg-[#A3E635]/15 text-[#65A30D] dark:text-[#A3E635]' 
                   : 'text-[#6B7280] hover:bg-black/5 dark:hover:bg-white/5'}"
          onclick={() => activeItem = item.id}
          aria-label={item.label}
        >
          <item.icon class="h-4.5 w-4.5" />
          
          <!-- Tooltip -->
          <span class="absolute left-full ml-3 px-2 py-1 rounded bg-black text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {item.label}
          </span>
        </button>
      {/each}
    </nav>
  </div>

  <button class="p-2 rounded-xl text-[#6B7280] hover:bg-black/5 dark:hover:bg-white/5" aria-label="Settings">
    <Settings class="h-4.5 w-4.5" />
  </button>
</div>
