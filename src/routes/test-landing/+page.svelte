<!-- src/routes/test-landing/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  // Svelte 5 reactive states
  let isDarkMode = $state(true);
  let monthlyIncome = $state<number>(200000);
  let obligations = $state<number>(40000);
  let cibilScore = $state<number>(760);
  let loanRequested = $state<number>(5000000);
  let propertyValue = $state<number>(7500000);
  let profileType = $state<'salaried' | 'business'>('salaried');

  // Derived models
  let haircut = $derived(profileType === 'business' ? 0.30 : 0.0);
  let netIncome = $derived(monthlyIncome * (1 - haircut));
  let ltvRatio = $derived(propertyValue > 0 ? (loanRequested / propertyValue) : 0);

  // Bank checks
  let sbiPass = $derived(
    cibilScore >= 720 && 
    obligations <= (netIncome * (cibilScore >= 750 ? 0.60 : 0.50)) && 
    ltvRatio <= 0.80 &&
    profileType === 'salaried'
  );

  let hdfcPass = $derived(
    cibilScore >= 700 && 
    obligations <= (netIncome * 0.55) && 
    ltvRatio <= 0.75
  );

  let iciciPass = $derived(
    cibilScore >= 680 && 
    obligations <= (netIncome * 0.50) && 
    ltvRatio <= 0.80
  );

  let bajajPass = $derived(
    cibilScore >= 600 && 
    obligations <= (netIncome * 0.65) && 
    ltvRatio <= 0.85
  );

  function toggleTheme() {
    isDarkMode = !isDarkMode;
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

  onMount(() => {
    if (typeof window !== 'undefined') {
      import('gsap').then(({ gsap }) => {
        import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
          gsap.registerPlugin(ScrollTrigger);

          const ctx = gsap.context(() => {
            gsap.from(".reveal-item", {
              y: 50,
              opacity: 0,
              stagger: 0.15,
              duration: 1,
              ease: "power4.out",
              scrollTrigger: {
                trigger: "#flagship-landing",
                start: "top 80%"
              }
            });

            // Counters
            gsap.from(".counter-num", {
              textContent: "0",
              duration: 2,
              snap: { textContent: 1 },
              stagger: 0.15,
              scrollTrigger: {
                trigger: "#scale-and-trust",
                start: "top 85%"
              }
            });
          });

          return () => ctx.revert();
        });
      });
    }
  });
</script>

<svelte:head>
  <title>DigitalDSA | Intelligent Sourcing & Distribution OS</title>
  <meta name="description" content="India's leading intelligent loan operations platform built specifically for Direct Selling Agents (DSAs) and bank Relationship Managers." />
</svelte:head>

<main 
  id="flagship-landing" 
  class="w-full min-h-screen font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden relative transition-colors duration-500
         {isDarkMode ? 'bg-[#000000] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'}"
>
  
  <!-- Subtle top ambient light (only in Dark Mode) -->
  {#if isDarkMode}
    <div transition:fade class="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>
  {/if}

  <!-- Header Navigation -->
  <header class="w-full border-b backdrop-blur-md sticky top-0 z-50 transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900 bg-[#000000]/70' : 'border-zinc-200 bg-[#f5f5f7]/70'}">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2 focus-visible:outline-none">
        <svg class="h-5 w-5 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/>
          <path d="m12 6-4 4h8l-4 4v2"/>
        </svg>
        <span class="font-bold tracking-tight text-base {isDarkMode ? 'text-white' : 'text-[#1d1d1f]'}">
          Digital<span class="text-cyan-500">DSA</span>
        </span>
      </a>

      <!-- Navigation links -->
      <nav class="hidden md:flex items-center gap-8 text-[11px] font-medium tracking-wider {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
        <a href="#complexity" class="hover:text-cyan-500 transition-colors">Matrix</a>
        <a href="#engine" class="hover:text-cyan-500 transition-colors">Sourcing</a>
        <a href="#dashboard" class="hover:text-cyan-500 transition-colors">Console</a>
        <a href="#scale-and-trust" class="hover:text-cyan-500 transition-colors">Scale</a>
      </nav>
      
      <div class="flex items-center gap-4">
        <!-- Sun/Moon selector -->
        <button 
          onclick={toggleTheme}
          class="p-2 rounded-full border cursor-pointer transition-colors duration-200 focus-visible:outline-none
                 {isDarkMode ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'}"
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

        <a href="#cta" class="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-5 py-2 rounded-full transition-all duration-200 text-xs tracking-wide">
          Request Access
        </a>
      </div>
    </div>
  </header>

  <!-- Section 1: Hero Experience (Apple-style spacious copy) -->
  <section class="max-w-4xl mx-auto px-6 pt-32 pb-40 text-center flex flex-col items-center justify-center min-h-[80vh]">
    <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500 mb-4">DigitalDSA OS</span>
    <h1 class="text-6xl sm:text-8xl font-bold tracking-tight leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400">
      Intelligent. Power. Sourcing.
    </h1>
    <p class="text-lg sm:text-xl font-normal leading-relaxed mt-6 max-w-xl {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
      Instantly match files against 50+ bank policies, route cases to active bank Relationship Managers, and track payouts in real-time.
    </p>
    
    <div class="flex items-center gap-6 mt-10">
      <a href="#cta" class="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-8 py-3 rounded-full transition-all duration-200 text-sm">
        Request Access
      </a>
      <a href="#dashboard" class="group flex items-center gap-1.5 font-semibold text-cyan-500 hover:underline text-sm">
        Explore console <span class="transition-transform group-hover:translate-x-1">➔</span>
      </a>
    </div>
  </section>

  <!-- Section 2: Why Sourcing Fails (The Policy Matrix) -->
  <section class="max-w-5xl mx-auto px-6 py-36 border-t transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}" id="complexity">
    <div class="max-w-xl mx-auto text-center space-y-4 mb-20">
      <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500">THE SOURCING CHALLENGE</span>
      <h2 class="text-4xl sm:text-5xl font-bold tracking-tight {isDarkMode ? 'text-white' : 'text-zinc-900'}">
        Different lenders. <br />One solution.
      </h2>
      <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
        Instead of logging cases blindly, evaluate approvals in real-time against changing FOIR limits and haircuts.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
      
      <!-- Interactive Inputs -->
      <div class="md:col-span-5 border p-6 rounded-2xl space-y-6 transition-colors duration-300
                  {isDarkMode ? 'bg-[#0c0c0e] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}">
        <div class="space-y-2">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-zinc-500">Gross Monthly Income</span>
            <span class="text-cyan-500 font-bold">₹{monthlyIncome.toLocaleString('en-IN')}</span>
          </div>
          <input type="range" min="50000" max="500000" step="10000" bind:value={monthlyIncome} class="w-full accent-cyan-500 cursor-pointer" />
        </div>

        <div class="space-y-2">
          <div class="flex justify-between text-xs font-mono">
            <span class="text-zinc-500">CIBIL Bureau Score</span>
            <span class="text-cyan-500 font-bold">{cibilScore}</span>
          </div>
          <input type="range" min="500" max="900" step="10" bind:value={cibilScore} class="w-full accent-cyan-500 cursor-pointer" />
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Profile Classification</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button onclick={() => profileType = 'salaried'} class="py-2 rounded transition-colors border {profileType === 'salaried' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 font-semibold' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'} font-sans">Salaried</button>
            <button onclick={() => profileType = 'business'} class="py-2 rounded transition-colors border {profileType === 'business' ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/60 font-semibold' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300'} font-sans">Self-Employed</button>
          </div>
        </div>
      </div>

      <!-- Outlining outcome check lists -->
      <div class="md:col-span-7 space-y-4">
        
        <!-- SBI Card -->
        <div class="flex justify-between items-center p-5 rounded-2xl border transition-colors duration-300
                    {isDarkMode ? 'bg-[#0c0c0e] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}">
          <span class="text-sm font-semibold {isDarkMode ? 'text-white' : 'text-zinc-900'}">State Bank of India</span>
          <span class="text-xs font-mono font-bold {sbiPass ? 'text-emerald-400' : 'text-rose-500'}">
            {sbiPass ? 'MATCHED' : 'BLOCKED'}
          </span>
        </div>

        <!-- HDFC Card -->
        <div class="flex justify-between items-center p-5 rounded-2xl border transition-colors duration-300
                    {isDarkMode ? 'bg-[#0c0c0e] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}">
          <span class="text-sm font-semibold {isDarkMode ? 'text-white' : 'text-zinc-900'}">HDFC Private Bank</span>
          <span class="text-xs font-mono font-bold {hdfcPass ? 'text-emerald-400' : 'text-rose-500'}">
            {hdfcPass ? 'MATCHED' : 'BLOCKED'}
          </span>
        </div>

        <!-- ICICI Card -->
        <div class="flex justify-between items-center p-5 rounded-2xl border transition-colors duration-300
                    {isDarkMode ? 'bg-[#0c0c0e] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}">
          <span class="text-sm font-semibold {isDarkMode ? 'text-white' : 'text-zinc-900'}">ICICI Private Bank</span>
          <span class="text-xs font-mono font-bold {iciciPass ? 'text-emerald-400' : 'text-rose-500'}">
            {iciciPass ? 'MATCHED' : 'BLOCKED'}
          </span>
        </div>

      </div>

    </div>
  </section>

  <!-- Section 3: Sourcing Workflow (Submit. Match. Handover.) -->
  <section class="max-w-5xl mx-auto px-6 py-36 border-t transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}" id="engine">
    <div class="max-w-xl mx-auto text-center space-y-4 mb-24">
      <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500">OPERATIONAL SIMPLICITY</span>
      <h2 class="text-4xl sm:text-5xl font-bold tracking-tight {isDarkMode ? 'text-white' : 'text-zinc-900'}">
        Submit. Match. Handover.
      </h2>
    </div>

    <!-- Spacious 3-column workflow metrics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-16 text-left">
      <div class="space-y-4">
        <span class="text-5xl font-bold {isDarkMode ? 'text-zinc-800' : 'text-zinc-300'} font-mono">01</span>
        <h4 class="text-lg font-bold {isDarkMode ? 'text-white' : 'text-zinc-900'}">Upload case files</h4>
        <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">Input applicant profile parameters and obligations with a secure, verification-checked interface.</p>
      </div>

      <div class="space-y-4">
        <span class="text-5xl font-bold {isDarkMode ? 'text-zinc-800' : 'text-zinc-300'} font-mono">02</span>
        <h4 class="text-lg font-bold {isDarkMode ? 'text-white' : 'text-zinc-900'}">Instantly match rules</h4>
        <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">Evaluate guidelines against FOIR criteria and classification caps dynamically across 50+ banking policies.</p>
      </div>

      <div class="space-y-4">
        <span class="text-5xl font-bold {isDarkMode ? 'text-zinc-800' : 'text-zinc-300'} font-mono">03</span>
        <h4 class="text-lg font-bold {isDarkMode ? 'text-white' : 'text-zinc-900'}">RM Handover</h4>
        <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">Directly route approved matches to localized banking relationship managers with active, real-time routing trackers.</p>
      </div>
    </div>
  </section>

  <!-- Section 4: Product Reveal (Unified Clean Console Showcase) -->
  <section class="max-w-5xl mx-auto px-6 py-36 border-t transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}" id="dashboard">
    <div class="max-w-xl mx-auto text-center space-y-4 mb-24">
      <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500">PARTNER PLATFORM</span>
      <h2 class="text-4xl sm:text-5xl font-bold tracking-tight {isDarkMode ? 'text-white' : 'text-zinc-900'} font-sans">
        Unified control.
      </h2>
      <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
        One workspace built for tracking file pipelines and commission checks.
      </p>
    </div>

    <!-- Sleek, Apple-style single focal dashboard preview card -->
    <div class="border rounded-3xl p-8 max-w-4xl mx-auto overflow-hidden transition-colors duration-300
                {isDarkMode ? 'bg-[#0c0c0e] border-zinc-900' : 'bg-white border-zinc-200 shadow-lg'}">
      
      <div class="flex flex-col gap-6">
        <div class="border-b pb-4 flex justify-between items-center transition-colors duration-300 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}">
          <div>
            <h4 class="text-sm font-bold {isDarkMode ? 'text-white' : 'text-zinc-900'}">Sourcing Pipeline</h4>
            <span class="text-[10px] font-mono text-zinc-500">CONSOLE LEDGER CONFLICT CHECKS</span>
          </div>
          <span class="text-[10px] font-mono text-cyan-500">AUTO-REFRESHING ACTIVE</span>
        </div>

        <div class="space-y-4 text-xs font-mono">
          <div class="flex justify-between items-center p-3 rounded bg-zinc-950/40 border transition-colors duration-300
                      {isDarkMode ? 'border-zinc-900' : 'border-zinc-200 bg-[#f5f5f7]'}">
            <span>CASE-9081 · ₹75,00,000 Home Loan</span>
            <span class="text-emerald-400 font-bold">Sanctioned</span>
          </div>
          
          <div class="flex justify-between items-center p-3 rounded bg-zinc-950/40 border transition-colors duration-300
                      {isDarkMode ? 'border-zinc-900' : 'border-zinc-200 bg-[#f5f5f7]'}">
            <span>CASE-8843 · ₹1,20,00,000 LAP Transfer</span>
            <span class="text-cyan-500 font-bold">Matched</span>
          </div>

          <div class="flex justify-between items-center p-3 rounded bg-zinc-950/40 border transition-colors duration-300
                      {isDarkMode ? 'border-zinc-900' : 'border-zinc-200 bg-[#f5f5f7]'}">
            <span>CASE-7622 · ₹25,00,000 Business Loan</span>
            <span class="text-zinc-500 font-bold">Under Review</span>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- Section 5: Scale & Trust -->
  <section class="max-w-5xl mx-auto px-6 py-36 border-t transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}" id="scale-and-trust">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
      
      <div class="space-y-6">
        <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500">SCALE & COMPLIANCE</span>
        <h2 class="text-4xl sm:text-5xl font-bold tracking-tight leading-tight {isDarkMode ? 'text-white' : 'text-zinc-900'}">
          Engineered for <br />distributors.
        </h2>
        <p class="text-sm leading-relaxed {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
          From checking guidelines to coordinating bank RMs and verifying payout values—DigitalDSA streamlines scale while securing PII rules.
        </p>
      </div>

      <!-- Telemetry Counters -->
      <div class="grid grid-cols-2 gap-12 text-left">
        <div class="space-y-1">
          <span class="text-4xl sm:text-5xl font-extrabold block counter-num">50</span>
          <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Lender Integrations</span>
        </div>
        <div class="space-y-1">
          <span class="text-4xl sm:text-5xl font-extrabold block counter-num">95</span>
          <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Match accuracy %</span>
        </div>
        <div class="space-y-1">
          <span class="text-4xl sm:text-5xl font-extrabold block counter-num">20000</span>
          <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Files Sourced</span>
        </div>
        <div class="space-y-1">
          <span class="text-4xl sm:text-5xl font-extrabold block counter-num">4</span>
          <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500">x Sourcing velocity</span>
        </div>
      </div>

    </div>
  </section>

  <!-- Section 6: Action CTA -->
  <section class="max-w-5xl mx-auto px-6 py-28 border-t transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}" id="cta">
    <div class="text-center flex flex-col gap-6 items-center justify-center max-w-2xl mx-auto">
      <span class="text-xs font-semibold uppercase tracking-wider text-cyan-500">DSA REGISTRATION</span>
      <h2 class="text-4xl sm:text-6xl font-bold tracking-tight {isDarkMode ? 'text-white' : 'text-zinc-900'} leading-tight">
        Elevate your operations.
      </h2>
      <p class="text-sm leading-relaxed max-w-md {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
        Request access today to join India's intelligent loan distribution network.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-4">
        <input 
          type="email" 
          placeholder="Business email..." 
          class="border text-xs px-4 py-3 rounded-full outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 w-full transition-colors duration-300
                 {isDarkMode ? 'bg-[#0c0c0e] border-zinc-800 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-900'}" 
        />
        <button class="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-6 py-3 rounded-full text-xs shrink-0 cursor-pointer">
          Request Access
        </button>
      </div>
    </div>
  </section>

  <!-- Global Footer (Modern Sitemap Column layout) -->
  <footer class="w-full border-t py-16 text-xs font-mono transition-colors duration-300
                 {isDarkMode ? 'border-zinc-900 bg-[#000000] text-zinc-500' : 'border-zinc-200 bg-[#f5f5f7] text-zinc-400'}">
    <div class="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 border-b pb-12 transition-colors duration-300 {isDarkMode ? 'border-zinc-900' : 'border-zinc-200'}">
      
      <!-- Brand Ident column -->
      <div class="flex flex-col gap-4 font-sans">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
          <li><a href="#engine" class="hover:text-cyan-500 transition-colors">Sourcing Flow</a></li>
          <li><a href="#dashboard" class="hover:text-cyan-500 transition-colors">Agent Console</a></li>
        </ul>
      </div>

      <!-- Col 3: Partners -->
      <div class="flex flex-col gap-3.5">
        <span class="text-[10px] font-bold uppercase tracking-widest {isDarkMode ? 'text-zinc-400' : 'text-zinc-900'}">Lenders</span>
        <ul class="space-y-2 text-[11px] font-sans text-zinc-500">
          <li>State Bank of India</li>
          <li>HDFC Private Bank</li>
          <li>Bajaj NBFC</li>
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
