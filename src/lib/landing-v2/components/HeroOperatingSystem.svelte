<!-- src/lib/landing-v2/components/HeroOperatingSystem.svelte -->
<script lang="ts">
  import { tokens } from '../design/tokens';
  import { heroContent } from '../content/hero';
  import CommandCard from './ui/CommandCard.svelte';
  import gsap from 'gsap';

  interface Props {
    isDark?: boolean;
  }
  let { isDark = true }: Props = $props();

  // Animation element references
  let headerLabel = $state<HTMLElement | null>(null);
  let headerTitle = $state<HTMLElement | null>(null);
  let headerLine2Container = $state<HTMLElement | null>(null);
  let headerLine3 = $state<HTMLElement | null>(null);
  let emotionalHookEl = $state<HTMLElement | null>(null);
  let ctaEl = $state<HTMLElement | null>(null);

  // Dashboard Mock Tilt & Float Refs
  let dashboardMockEl = $state<HTMLElement | null>(null);
  let tiltX = $state(0);
  let tiltY = $state(0);
  let isHovered = $state(false);

  function handleMouseMove(e: MouseEvent) {
    if (!dashboardMockEl) return;
    const rect = dashboardMockEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    tiltX = (-(y - yc) / (rect.height / 2)) * 6; // Max 6 deg rotation
    tiltY = ((x - xc) / (rect.width / 2)) * 6;
  }

  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
    tiltX = 0;
    tiltY = 0;
  }

  // Text & Mock Reveal Effect on Mount
  $effect(() => {
    const textTargets = [
      headerLabel,
      headerTitle,
      headerLine2Container,
      headerLine3,
      emotionalHookEl,
      ctaEl
    ].filter((el): el is HTMLElement => el !== null);

    if (textTargets.length === 0) return;

    const tl = gsap.timeline();
    tl.fromTo(
      textTargets,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.04,
        duration: 0.5,
        ease: 'power2.out'
      }
    );

    if (dashboardMockEl) {
      tl.fromTo(
        dashboardMockEl,
        { opacity: 0, scale: 0.96, y: 25 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out'
        },
        '-=0.3'
      );
    }

    return () => {
      tl.kill();
    };
  });

  // Tilt Interpolation Effect
  $effect(() => {
    if (!dashboardMockEl) return;
    gsap.to(dashboardMockEl, {
      rotateX: tiltX,
      rotateY: tiltY,
      transformPerspective: 1000,
      ease: 'power2.out',
      duration: 0.35
    });
  });

  // Ambient Float Effect
  $effect(() => {
    if (!dashboardMockEl) return;
    if (isHovered) {
      gsap.to(dashboardMockEl, { y: 0, duration: 0.3, ease: 'power2.out' });
    } else {
      const floatTween = gsap.to(dashboardMockEl, {
        y: -10,
        duration: 2.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
      return () => {
        floatTween.kill();
      };
    }
  });
</script>

<section class="relative mx-auto min-h-[95vh] max-w-4xl flex flex-col items-center justify-center text-center px-6 pt-44 pb-56 overflow-hidden select-none">
  
  <!-- Backdrop ambient pulsing glow blur blob -->
  <div 
    class="absolute top-[25%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full pointer-events-none z-0 opacity-25 blur-[80px] sm:blur-[130px] transition-colors duration-500
           {isDark ? 'bg-[#0f62fe]/10' : 'bg-[#0f62fe]/5'}"
  ></div>
  <div 
    class="absolute top-[60%] left-[30%] w-[250px] h-[250px] rounded-full pointer-events-none z-0 opacity-20 blur-[90px] transition-colors duration-500
           {isDark ? 'bg-[#00a76f]/5' : 'bg-[#00a76f]/3'}"
  ></div>

  <!-- Left Column: Center typography flow -->
  <div class="z-10 flex flex-col items-center gap-8 text-center max-w-3xl">
    <span
      bind:this={headerLabel}
      class="w-max rounded-[12px] border border-[#0f62fe]/20 bg-[#0f62fe]/5 px-3 py-1 font-mono text-xs tracking-widest text-[#0f62fe] uppercase opacity-0"
    >
      {heroContent.label}
    </span>

    <div class="flex flex-col gap-4 items-center">
      <h1
        bind:this={headerTitle}
        class="{tokens.typography.display} {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'} opacity-0"
      >
        {heroContent.titleLine1}
      </h1>
      <div
        bind:this={headerLine2Container}
        class="flex flex-wrap justify-center items-center gap-x-3 leading-none opacity-0"
      >
        <span
          class="rounded-[8px] border border-[#0f62fe]/25 bg-[#0f62fe]/5 px-2.5 py-0.5 align-middle font-mono text-[9px] tracking-widest text-[#0f62fe] uppercase font-bold"
        >
          {heroContent.titleMatch}
        </span>
        <h1 class="text-3xl font-sans font-bold tracking-tight text-[#0f62fe] sm:text-4xl lg:text-5xl">
          {heroContent.titleLine2}
        </h1>
      </div>
      <h1
        bind:this={headerLine3}
        class="bg-gradient-to-b {isDark ? 'from-[#f8fafc] via-slate-300 to-slate-500' : 'from-[#111827] via-slate-700 to-slate-500'} bg-clip-text text-4xl font-sans font-bold tracking-tight text-transparent opacity-0 sm:text-5xl lg:text-6xl"
      >
        {heroContent.titleLine3}
      </h1>
    </div>

    <!-- Emotional hook & benefit subtitle -->
    <div
      bind:this={emotionalHookEl}
      class="max-w-xl space-y-4 border-l-2 border-[#0f62fe]/40 py-1 pl-4 opacity-0 text-left"
    >
      <p class="font-mono text-[10px] font-bold tracking-wider text-[#0f62fe] uppercase italic">
        "{heroContent.emotionalHook}"
      </p>
      <p class="text-xs sm:text-sm font-normal leading-relaxed {isDark ? 'text-[#94a3b8]' : 'text-[#6b7280]'}">
        {heroContent.subtitle}
      </p>
    </div>

    <!-- Actions pills -->
    <div
      bind:this={ctaEl}
      class="mt-2 flex flex-col items-center gap-4 font-sans opacity-0 sm:flex-row"
    >
      <a
        href="#cta"
        class="rounded-[18px] bg-[#0f62fe] hover:bg-[#0052e0] px-8 py-3.5 text-center text-sm font-bold tracking-wide text-white shadow-[0_4px_20px_rgba(15,98,254,0.15)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(15,98,254,0.25)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#0f62fe]"
      >
        {heroContent.ctaPrimary}
      </a>
      <a
        href="#engine"
        class="rounded-[18px] border {isDark ? 'border-slate-800 bg-slate-900/30 text-[#f8fafc] hover:bg-slate-800/40' : 'border-slate-200/80 bg-transparent text-[#111827] hover:bg-slate-100'} px-8 py-3.5 text-center text-sm font-bold tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        {heroContent.ctaSecondary}
      </a>
    </div>
  </div>

  <!-- Perspective Mock Dashboard Widget -->
  <div 
    bind:this={dashboardMockEl} 
    onmousemove={handleMouseMove}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    class="mt-20 w-full max-w-4xl border rounded-[40px] p-8 shadow-2xl relative overflow-hidden transition-all duration-300 opacity-0 cursor-default select-none z-10
           {isDark ? 'border-slate-800 bg-[#111726]/60 hover:border-[#0f62fe]/30 hover:shadow-[0_0_50px_rgba(15,98,254,0.06)]' : 'border-slate-200 bg-white hover:border-[#0f62fe]/30 hover:shadow-[0_16px_50px_rgba(15,98,254,0.03)]'}"
    role="presentation"
  >
    <!-- Spotlight grid mesh backdrop overlay -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,98,254,0.04),transparent_60%)] pointer-events-none z-0"></div>
    <div class="absolute top-[20%] left-[10%] w-[120px] h-[120px] bg-[#0f62fe]/5 rounded-full blur-[40px] pointer-events-none z-0 animate-pulse"></div>
    <div class="absolute bottom-[20%] right-[10%] w-[150px] h-[150px] bg-[#00a76f]/3 rounded-full blur-[50px] pointer-events-none z-0 animate-pulse" style="animation-delay: 1.5s;"></div>

    <!-- macOS style Window Header -->
    <div class="flex items-center justify-between border-b pb-3 mb-5 font-mono text-[9px] text-[#6b7280] dark:text-[#94a3b8] uppercase tracking-widest relative z-10
                {isDark ? 'border-slate-800/60' : 'border-slate-200/60'}">
      <div class="flex items-center gap-1.5">
        <span class="h-2 w-2 rounded-full bg-rose-500/50"></span>
        <span class="h-2 w-2 rounded-full bg-amber-500/50"></span>
        <span class="h-2 w-2 rounded-full bg-[#00a76f]/50"></span>
      </div>
      <span>DigitalDSA Sourcing telemetry Dashboard</span>
      <span class="text-[#00a76f] font-bold flex items-center gap-1">
        <span class="h-1.5 w-1.5 rounded-full bg-[#00a76f] animate-ping"></span>
        Console Online
      </span>
    </div>
    
    <!-- Sourcing Ledger details Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-[10px] text-left relative z-10">
      <div class="p-4 rounded-2xl border transition-colors duration-300
                  {isDark ? 'border-slate-800 bg-[#090d16]/60' : 'border-slate-200/80 bg-[#f8fafc]' }">
        <span class="text-[#6b7280] dark:text-[#94a3b8] block uppercase tracking-wider text-[8px]">Active Sourcing Volumes</span>
        <span class="text-lg font-bold font-sans block mt-1 {isDark ? 'text-[#f8fafc]' : 'text-[#111827]'}">₹4,89,50,000</span>
        <span class="text-[#00a76f] block text-[9px] mt-0.5">↑ 12.4% vs prev week</span>
      </div>
      <div class="p-4 rounded-2xl border transition-colors duration-300
                  {isDark ? 'border-slate-800 bg-[#090d16]/60' : 'border-slate-200/80 bg-[#f8fafc]' }">
        <span class="text-[#6b7280] dark:text-[#94a3b8] block uppercase tracking-wider text-[8px]">Matched Eligibility Yield</span>
        <span class="text-lg font-bold font-sans block mt-1 text-[#0f62fe]">98.2% Accuracy</span>
        <span class="text-[#6b7280] dark:text-[#94a3b8] block text-[9px] mt-0.5">50+ Bank policies synced</span>
      </div>
      <div class="p-4 rounded-2xl border transition-colors duration-300
                  {isDark ? 'border-slate-800 bg-[#090d16]/60' : 'border-slate-200/80 bg-[#f8fafc]' }">
        <span class="text-[#6b7280] dark:text-[#94a3b8] block uppercase tracking-wider text-[8px]">Avg Sourcing Velocity</span>
        <span class="text-lg font-bold font-sans block mt-1 text-[#00a76f]">&lt; 1.5 Hours TAT</span>
        <span class="text-[#00a76f] block text-[9px] mt-0.5">Sourcing SLA guaranteed</span>
      </div>
    </div>
  </div>

</section>
