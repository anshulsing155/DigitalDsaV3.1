<!-- src/routes/test-landing-v2/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { tokens } from '$lib/landing-v2/design/tokens';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  // Feature components imports
  import HeroOperatingSystem from '$lib/landing-v2/components/HeroOperatingSystem.svelte';
  import ProblemComparison from '$lib/landing-v2/components/ProblemComparison.svelte';
  import PolicyIntelligence from '$lib/landing-v2/components/PolicyIntelligence.svelte';
  import LoanLifecycleShowcase from '$lib/landing-v2/components/LoanLifecycleShowcase.svelte';
  import CommissionOptimizer from '$lib/landing-v2/components/CommissionOptimizer.svelte';
  import InteractiveCalculator from '$lib/landing-v2/components/InteractiveCalculator.svelte';
  import TrustMetrics from '$lib/landing-v2/components/TrustMetrics.svelte';
  import FinalCTA from '$lib/landing-v2/components/FinalCTA.svelte';
  import InteractiveBackground from '$lib/landing-v2/components/ui/InteractiveBackground.svelte';

  // Svelte 5 reactive theme states
  let isDarkMode = $state(false);
  let progressBarEl = $state<HTMLElement | null>(null);

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    updateThemeClass();
  }

  function updateThemeClass() {
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (isDarkMode) {
        html.classList.add('dark');
        html.classList.remove('light');
        html.style.colorScheme = 'dark';
      } else {
        html.classList.add('light');
        html.classList.remove('dark');
        html.style.colorScheme = 'light';
      }
    }
  }

  $effect(() => {
    if (!progressBarEl) return;
    gsap.registerPlugin(ScrollTrigger);

    const tween = gsap.fromTo(progressBarEl, 
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3
        }
      }
    );

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  });

  onMount(() => {
    // Initial sync
    updateThemeClass();
  });
</script>

<svelte:head>
  <title>DigitalDSA | Sourcing Ledger & Payout Console</title>
  <meta name="description" content="Turn complex loan sourcing into predictable growth. Run your entire loan sourcing business from one platform." />
</svelte:head>

<main 
  class="w-full min-h-screen font-sans selection:bg-[#0f62fe]/20 selection:text-[#0f62fe] overflow-x-hidden relative transition-colors duration-500
         {isDarkMode ? 'bg-[#090d16] text-[#f8fafc]' : 'bg-[#f8fafc] text-[#111827]'}"
>
  
  <!-- Interactive Background Canvas -->
  <InteractiveBackground isDark={isDarkMode} />
  
  <!-- Scroll Progress Bar -->
  <div 
    bind:this={progressBarEl} 
    class="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0f62fe] via-[#00a76f] to-[#0f62fe] z-[100] origin-left pointer-events-none"
  ></div>
  
  <!-- Header Navigation -->
  <header class="w-full border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-300
                 {isDarkMode ? 'border-slate-800/80 bg-[#090d16]/80' : 'border-slate-200/80 bg-[#f8fafc]/80'}">
    <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2 focus-visible:outline-none">
        <svg class="h-5 w-5 text-[#0f62fe]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/>
          <path d="m12 6-4 4h8l-4 4v2"/>
        </svg>
        <span class="font-bold tracking-tight text-base {isDarkMode ? 'text-white' : 'text-[#111827]'}">
          Digital<span class="text-[#0f62fe]">DSA</span>
        </span>
      </a>

      <!-- Navigation links with slide hover lines -->
      <nav class="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-wider {isDarkMode ? 'text-[#94a3b8]' : 'text-[#6b7280]'}">
        <a href="#complexity" class="hover:text-[#0f62fe] transition-colors">Matrix</a>
        <a href="#intelligence" class="hover:text-[#0f62fe] transition-colors">AI Sourcing</a>
        <a href="#engine" class="hover:text-[#0f62fe] transition-colors">Lifecycle</a>
        <a href="#optimizer" class="hover:text-[#0f62fe] transition-colors">Payouts</a>
        <a href="#eligibility-calculator" class="hover:text-[#0f62fe] transition-colors">Calculator</a>
      </nav>
      
      <div class="flex items-center gap-4">
        <!-- Sun/Moon selector -->
        <button 
          onclick={toggleTheme}
          class="p-2.5 rounded-full border cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f62fe]
                 {isDarkMode ? 'border-slate-800 hover:bg-slate-800/40 text-slate-400' : 'border-slate-200/80 hover:bg-slate-100 text-slate-500'}"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {#if isDarkMode}
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          {:else}
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          {/if}
        </button>

        <a href="#cta" class="bg-[#0f62fe] hover:bg-[#0052e0] text-white dark:bg-[#f8fafc] dark:hover:bg-slate-200 dark:text-[#090d16] font-bold px-6 py-2.5 rounded-full transition-all duration-200 text-xs tracking-wide hover:scale-[1.02] active:scale-[0.98] shadow-sm">
          Request Access
        </a>
      </div>
    </div>
  </header>

  <!-- Feature Sections Loader -->
  <HeroOperatingSystem isDark={isDarkMode} />
  <ProblemComparison isDark={isDarkMode} />
  <PolicyIntelligence isDark={isDarkMode} />
  <LoanLifecycleShowcase isDark={isDarkMode} />
  <CommissionOptimizer isDark={isDarkMode} />
  <InteractiveCalculator isDark={isDarkMode} />
  <TrustMetrics isDark={isDarkMode} />
  <FinalCTA isDark={isDarkMode} />

  <!-- Global Footer Sitemap -->
  <footer class="w-full border-t py-16 text-xs font-mono relative z-10 transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900 bg-[#000000] text-zinc-500' : 'border-zinc-200 bg-[#f5f5f7] text-zinc-400'}">
    <div class="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 border-b pb-12 transition-colors duration-300 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}">
      
      <!-- Brand Ident column -->
      <div class="flex flex-col gap-4 font-sans">
        <div class="flex items-center gap-2">
          <svg class="h-5 w-5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/>
            <path d="m12 6-4 4h8l-4 4v2"/>
          </svg>
          <span class="font-bold tracking-tight text-base {isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}">
            Digital<span class="text-cyan-500">DSA</span>
          </span>
        </div>
        <p class="text-[11px] leading-relaxed">
          Intelligent B2B Loan Distribution infrastructure built for India's Direct Selling Agents (DSAs) and bank Relationship Managers.
        </p>
      </div>

      <!-- Col 2: Platform -->
      <div class="flex flex-col gap-3.5">
        <span class="text-[10px] font-bold uppercase tracking-widest {isDarkMode ? 'text-zinc-400' : 'text-zinc-900'}">Platform</span>
        <ul class="space-y-2 text-[11px] font-sans">
          <li><a href="#complexity" class="hover:text-cyan-500 transition-colors">Guideline Matrix</a></li>
          <li><a href="#intelligence" class="hover:text-cyan-500 transition-colors">Sourcing Flow</a></li>
          <li><a href="#engine" class="hover:text-cyan-500 transition-colors">Lifecycle Control</a></li>
        </ul>
      </div>

      <!-- Col 3: Partners -->
      <div class="flex flex-col gap-3.5">
        <span class="text-[10px] font-bold uppercase tracking-widest {isDarkMode ? 'text-zinc-400' : 'text-zinc-900'}">Lenders</span>
        <ul class="space-y-2 text-[11px] font-sans text-zinc-500">
          <li>State Bank of India</li>
          <li>HDFC Private Bank</li>
          <li>Bajaj Finance NBFC</li>
        </ul>
      </div>

      <!-- Col 4: Status -->
      <div class="flex flex-col gap-3.5">
        <span class="text-[10px] font-bold uppercase tracking-widest {isDarkMode ? 'text-zinc-400' : 'text-zinc-900'}">Telemetry</span>
        <div class="flex items-center gap-2 font-mono text-[9px] text-emerald-400 bg-emerald-950/40 w-max px-2.5 py-1 rounded border border-emerald-800/40">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ALL SOURCING CHANNELS ONLINE</span>
        </div>
      </div>

    </div>

    <!-- Sub Footer copyrights & social icons -->
    <div class="max-w-5xl mx-auto px-6 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 font-sans text-[11px]">
      <p>© 2026 DigitalDSA Operations Ltd. All rights reserved.</p>
      
      <!-- Social icons -->
      <div class="flex gap-4">
        <a href="https://twitter.com" class="hover:text-cyan-500 transition-colors" aria-label="Twitter">
          <svg class="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://github.com" class="hover:text-cyan-500 transition-colors" aria-label="GitHub">
          <svg class="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
        </a>
      </div>
    </div>
  </footer>

</main>
