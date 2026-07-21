<!-- src/lib/landing-v3/components/Hero.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Container from './shared/Container.svelte';
  import Button from './shared/Button.svelte';
  import GradientBlob from './shared/GradientBlob.svelte';
  
  // Dashboard Sub-components
  import Sidebar from './hero/dashboard/Sidebar.svelte';
  import AnalyticsCard from './hero/dashboard/AnalyticsCard.svelte';
  import LoanCard from './hero/dashboard/LoanCard.svelte';
  import RecommendationCard from './hero/dashboard/RecommendationCard.svelte';
  
  // Data & Motion Helpers
  import { heroData } from '../data/hero';
  import { partnersData } from '../data/partners';
  import { setupTilt, floatEffect, fadeUp } from '../animations/motion';

  import { Sparkles, Check, FileText } from 'lucide-svelte';

  let heroSectionEl = $state<HTMLElement | null>(null);
  let titleEl = $state<HTMLElement | null>(null);
  let subtitleEl = $state<HTMLElement | null>(null);
  let ctaEl = $state<HTMLElement | null>(null);
  let dashboardMockEl = $state<HTMLElement | null>(null);

  // Mouse coords for interactive glow
  let glowX = $state(0);
  let glowY = $state(0);

  function handleMouseMoveGlow(e: MouseEvent) {
    if (!heroSectionEl) return;
    const rect = heroSectionEl.getBoundingClientRect();
    glowX = e.clientX - rect.left;
    glowY = e.clientY - rect.top;
  }

  onMount(() => {
    // Reveal text elements on mount
    fadeUp(titleEl, 0.1, 0.7);
    fadeUp(subtitleEl, 0.25, 0.7);
    fadeUp(ctaEl, 0.4, 0.7);
    
    if (dashboardMockEl) {
      fadeUp(dashboardMockEl, 0.5, 0.8);
      // Floating sub-cards and external status tags effect
      const floaters = heroSectionEl?.querySelectorAll('.floating-card');
      floaters?.forEach((el, index) => {
        // Stagger floating directions and speeds (e.g. 5s, 6s, 7s duration)
        floatEffect(el as HTMLElement, 6 + index * 3, 4 + index * 1, index * 0.35);
      });

      // 3D tilt setup for dashboard mockup
      const cleanupTilt = setupTilt(dashboardMockEl, 5);
      return () => {
        if (cleanupTilt) cleanupTilt();
      };
    }
  });
</script>

<section 
  bind:this={heroSectionEl} 
  onmousemove={handleMouseMoveGlow}
  class="relative w-full min-h-[95vh] flex flex-col justify-center pt-28 pb-20 overflow-hidden bg-[#FAF9F5] select-none"
  role="region"
  aria-label="SaaS Sourcing Platform Hero Banner"
>
  <!-- Interactive Background Grid Pattern -->
  <div class="absolute inset-0 grid-bg opacity-[0.06] z-0 pointer-events-none"></div>
  
  <!-- Subtle Noise Texture Layer -->
  <div class="absolute inset-0 bg-noise opacity-[0.015] z-0 pointer-events-none"></div>

  <!-- Cursor-reactive glowing spotlight -->
  <div 
    class="absolute pointer-events-none rounded-full w-[500px] h-[500px] bg-gradient-to-br from-[#A3E635]/12 to-transparent blur-[100px] z-0 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 opacity-60 hidden sm:block"
    style="left: {glowX}px; top: {glowY}px;"
  ></div>

  <!-- Interactive Background Glow Blobs -->
  <GradientBlob color="mix" position="top-right" scale="lg" />
  <GradientBlob color="green" position="bottom-left" scale="md" class="opacity-20" />

  <Container class="px-6 flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
    
    <!-- Left Column: Typography & CTAs -->
    <div class="flex flex-col gap-6 w-full lg:max-w-[55%] text-left">
      <span class="w-max px-3 py-1 rounded-[12px] border border-[#84CC16]/20 bg-[#84CC16]/5 font-mono text-[11px] tracking-wider text-[#65A30D] uppercase font-bold">
        {heroData.label}
      </span>
      
      <h1 
        bind:this={titleEl} 
        class="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-[#111111] leading-[1.05] opacity-0"
      >
        {heroData.titleLine1} <br class="hidden sm:inline" />
        <span class="text-[#84CC16]">{heroData.titleLine2}</span> <br />
        {heroData.titleLine3}
      </h1>

      <p 
        bind:this={subtitleEl} 
        class="text-sm sm:text-base leading-relaxed text-[#6B7280] font-medium max-w-xl opacity-0"
      >
        {heroData.subtitle}
      </p>

      <div 
        bind:this={ctaEl} 
        class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-2 opacity-0"
      >
        <Button variant="primary" href="#cta" class="shadow-lg">
          {heroData.ctaPrimary} &rarr;
        </Button>
        <Button variant="secondary" href="#api-docs">
          {heroData.ctaSecondary} &rarr;
        </Button>
      </div>
    </div>

    <!-- Right Column: Interactive Dashboard Mockup with layered depth floating tags -->
    <div class="w-full lg:w-[45%] lg:max-w-[540px] shrink-0 relative flex items-center justify-center py-10 lg:py-4">
      
      <!-- Card A: Floating Top-Left Status tag -->
      <div class="floating-card absolute -left-4 top-16 z-20 bg-white border border-[#E5E3DC]/60 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
        <div class="h-6 w-6 rounded-full bg-[#A3E635]/15 text-[#65A30D] flex items-center justify-center">
          <Sparkles class="h-3.5 w-3.5" />
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[8px] font-mono text-[#6B7280] uppercase">AI Match</span>
          <span class="text-[10px] font-extrabold text-[#111111]">98% Approval</span>
        </div>
      </div>

      <!-- Card B: Floating Bottom-Right Status tag -->
      <div class="floating-card absolute -right-4 bottom-12 z-20 bg-white border border-[#E5E3DC]/60 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
        <div class="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
          <Check class="h-3.5 w-3.5" />
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[8px] font-mono text-[#6B7280] uppercase">Lender Pipeline</span>
          <span class="text-[10px] font-extrabold text-[#111111]">File Approved</span>
        </div>
      </div>

      <!-- Card C: Floating Top-Right Status tag -->
      <div class="floating-card absolute right-6 -top-2 z-20 bg-[#111111] border border-zinc-800 px-3.5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-white">
        <div class="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
          <FileText class="h-3.5 w-3.5" />
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[8px] font-mono text-zinc-500 uppercase">Analysis Metric</span>
          <span class="text-[10px] font-extrabold text-[#FAF9F5]">FOIR: 42% Clear</span>
        </div>
      </div>

      <!-- Main Mockup Frame -->
      <div 
        bind:this={dashboardMockEl}
        class="w-full h-[400px] border border-[#E5E3DC] bg-[#FFFFFF] rounded-[28px] shadow-2xl relative flex overflow-hidden opacity-0 select-none cursor-default z-10"
      >
        <!-- Sidebar Mockup -->
        <Sidebar />

        <!-- Main Panel Content Mockup -->
        <div class="flex-1 bg-[#FAF9F5]/30 p-6 flex flex-col gap-6 relative overflow-hidden">
          
          <!-- Top Telemetry row -->
          <div class="flex items-center justify-between border-b border-[#E5E3DC]/30 pb-3">
            <span class="text-[9px] font-mono tracking-widest text-[#6B7280] uppercase">DigitalDSA Console</span>
            <div class="flex items-center gap-1.5 text-[8px] font-bold text-[#65A30D] bg-[#A3E635]/15 px-2 py-0.5 rounded border border-[#A3E635]/30">
              <span class="h-1.5 w-1.5 rounded-full bg-[#A3E635] animate-pulse"></span>
              <span>API SYNCED</span>
            </div>
          </div>

          <!-- Layout of cards inside dashboard -->
          <div class="grid grid-cols-1 gap-4 relative z-10 flex-1 justify-center">
            
            <div class="floating-card">
              <RecommendationCard />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="floating-card">
                <LoanCard />
              </div>
              
              <div class="floating-card">
                <AnalyticsCard />
              </div>
            </div>

          </div>

          <!-- Mesh visual overlay background decoration -->
          <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.05),transparent_70%)] pointer-events-none z-0"></div>
        </div>
      </div>
    </div>
  </Container>

  <!-- Bank Partners monochrome bar -->
  <div class="w-full border-t border-[#E5E3DC]/30 mt-24 pt-8 bg-[#FAF9F5]/40 backdrop-blur-sm relative z-10">
    <Container class="px-6 flex flex-wrap items-center justify-center sm:justify-between gap-8 md:gap-12 opacity-50 grayscale hover:opacity-80 transition-opacity duration-300">
      {#each partnersData as partner}
        <div class="flex items-center gap-1.5 font-sans font-extrabold text-[12px] sm:text-sm tracking-wider text-[#6B7280]">
          <svg class="h-4.5 w-4.5 text-[#6B7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect width="18" height="18" x="3" y="3" rx="4" />
            <path d="M7 10h4m-4 4h10" />
          </svg>
          <span>{partner.name}</span>
        </div>
      {/each}
    </Container>
  </div>
</section>

<style>
  /* Background pattern styling for modern aesthetic */
  .grid-bg {
    background-image: linear-gradient(#11111105 1px, transparent 1px),
                      linear-gradient(90deg, #11111105 1px, transparent 1px);
    background-size: 32px 32px;
  }

  .bg-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  /* Support reduced motion settings */
  @media (prefers-reduced-motion: reduce) {
    .floating-card {
      animation: none !important;
      transform: none !important;
    }
  }
</style>
