<!-- src/lib/landing-v3/components/LoanProducts.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import Button from './shared/Button.svelte';
  import Card from './shared/Card.svelte';
  
  import { productsHeader, productsData } from '../data/products';
  import { scrollReveal } from '../animations/motion';
  
  import { Check, ShieldCheck, UserCheck, ArrowRight } from 'lucide-svelte';

  let containerEl = $state<HTMLElement | null>(null);
  let activeProductId = $state('home-loan');

  onMount(() => {
    if (containerEl) {
      scrollReveal(containerEl);
    }
  });

  const activeProduct = $derived(
    productsData.find(p => p.id === activeProductId) || productsData[0]
  );
</script>

<Section id="products" class="bg-[#FAF9F5] border-t border-[#E5E3DC]/30">
  <Container>
    <div 
      bind:this={containerEl}
      class="flex flex-col lg:flex-row items-stretch justify-between gap-16 opacity-0"
    >
      
      <!-- Left side: Vertical Tabs Nav List -->
      <div class="w-full lg:w-[450px] flex flex-col justify-between gap-12 text-left">
        <div class="flex flex-col gap-6">
          <span class="w-max px-3 py-1 text-[11px] font-mono tracking-wider text-[#A3E635] uppercase bg-[#A3E635]/10 border border-[#A3E635]/20 rounded-full">
            Product Catalog
          </span>
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] leading-[1.12]">
            {productsHeader.title}
          </h2>
          <p class="text-sm sm:text-base leading-relaxed text-[#6B7280]">
            {productsHeader.description}
          </p>
        </div>

        <!-- Vertical selection list -->
        <nav class="flex flex-col gap-3.5 mt-4">
          {#each productsData as item}
            <button 
              class="w-full text-left py-4 px-6 rounded-2xl flex items-center justify-between border transition-all duration-300 group cursor-pointer
                     {activeProductId === item.id 
                       ? 'bg-white border-[#A3E635] shadow-[0_8px_24px_rgba(163,230,53,0.06)]' 
                       : 'border-transparent hover:bg-white/40 hover:border-[#E5E3DC]/60'}"
              onclick={() => activeProductId = item.id}
            >
              <div class="flex flex-col">
                <span class="text-sm sm:text-base font-bold text-[#111111]">{item.name}</span>
                <span class="text-[10px] sm:text-xs text-[#6B7280] font-normal group-hover:text-black transition-colors">{item.tagline}</span>
              </div>
              <ArrowRight class="h-4 w-4 text-[#6B7280] group-hover:text-[#A3E635] group-hover:translate-x-1 transition-all" />
            </button>
          {/each}
        </nav>
      </div>

      <!-- Right side: Clean Card with animated approval flow -->
      <div class="flex-1 flex flex-col justify-between relative min-h-[420px]">
        <Card padding="none" class="h-full flex flex-col justify-between border border-[#E5E3DC] bg-white p-8 sm:p-12 relative overflow-hidden">
          
          {#key activeProductId}
            <div in:fade={{ duration: 180 }} class="flex flex-col justify-between h-full flex-1">
              
              <!-- Tab Details Content -->
              <div class="text-left mb-6">
                <span class="text-[10px] font-mono tracking-widest text-[#6B7280] uppercase block mb-1">Selected Segment</span>
                <h3 class="text-xl sm:text-2xl font-bold text-black mb-2">{activeProduct.name} Processing</h3>
                <p class="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-lg">{activeProduct.description}</p>
              </div>

              <!-- Sourcing Pipeline Visual Graph -->
              <div class="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 relative py-6 min-h-[200px]">
                
                <!-- Connection Line Visuals with running dash effect -->
                <div class="hidden sm:block absolute inset-x-12 top-[38%] h-[2px] bg-[#E5E3DC]/55 z-0">
                  <div class="h-full bg-gradient-to-r from-emerald-400 via-[#A3E635] to-emerald-400 w-[60%] rounded-full animate-marquee-dash"></div>
                </div>

                <!-- Node 1: User Profile -->
                <div class="relative z-10 flex flex-col items-center gap-1.5">
                  <div class="h-12 w-12 rounded-full bg-[#FAF9F5] border border-[#E5E3DC] flex items-center justify-center text-zinc-650 shadow-md">
                    <UserCheck class="h-5.5 w-5.5" />
                  </div>
                  <span class="text-[9px] font-mono uppercase text-[#6B7280]">Applicant</span>
                </div>

                <!-- Node 2: Matrix engine -->
                <div class="relative z-10 flex flex-col items-center gap-1.5">
                  <div class="h-14 w-14 rounded-full bg-[#84CC16]/10 border border-[#84CC16]/40 flex items-center justify-center text-[#65A30D] shadow-lg animate-pulse" style="animation-duration: 3s;">
                    <ShieldCheck class="h-6.5 w-6.5" />
                  </div>
                  <span class="text-[9px] font-mono uppercase text-[#65A30D] font-bold">AI Matcher</span>
                </div>

                <!-- Node 3: Approved Lender -->
                <div class="relative z-10 flex flex-col items-center gap-1.5">
                  <div class="h-12 w-12 rounded-full bg-[#FAF9F5] border border-[#E5E3DC] flex items-center justify-center text-emerald-600 shadow-md">
                    <Check class="h-5.5 w-5.5" />
                  </div>
                  <span class="text-[9px] font-mono uppercase text-[#6B7280]">SBI Cleared</span>
                </div>

              </div>

              <div class="border-t border-[#E5E3DC]/30 pt-4 mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs font-mono text-[#6B7280] leading-none">
                <span>PIPELINE TAT STATUS</span>
                <div class="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>1.2 Hours TAT Clear</span>
                </div>
              </div>

            </div>
          {/key}

        </Card>
      </div>

    </div>
  </Container>
</Section>

<style>
  /* Animated connector line keyframes for dashboard */
  @keyframes marquee-dash {
    0% {
      transform: translate3d(-100%, 0, 0);
    }
    100% {
      transform: translate3d(180%, 0, 0);
    }
  }

  .animate-marquee-dash {
    animation: marquee-dash 3s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-marquee-dash {
      animation: none !important;
    }
  }
</style>
