<!-- src/lib/landing-v3/components/Header.svelte -->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import Container from './shared/Container.svelte';
  
  import { ChevronDown, Shield, FileText, Sliders, CheckCircle2 } from 'lucide-svelte';

  // Navigation hover dropdown states
  let activeDropdown = $state<'platform' | 'products' | ''>('');

  const platformSubItems = [
    { title: "AI Eligibility Matrix", desc: "Instantly check borrower criteria against 50+ bank policies.", href: "#features", icon: Shield },
    { title: "Commission Ledger", desc: "Automate payouts for sub-agents and referrals.", href: "#features", icon: Sliders },
    { title: "Developer APIs", desc: "Embed high-speed loan sourcing endpoints.", href: "#modern-stack", icon: FileText }
  ];

  const productsSubItems = [
    { name: "Home Loans", desc: "Appraisal tools and housing finance options.", href: "#products" },
    { name: "Personal Loans", desc: "Unsecured lines with fast CIBIL pulls.", href: "#products" },
    { name: "Business Loans", desc: "SME working capital evaluations.", href: "#products" }
  ];
</script>

<header class="w-full border-b border-[#E5E3DC]/30 bg-[#FAF9F5]/30 backdrop-blur-md sticky top-0 z-[100] transition-colors duration-300 font-['Inter']">
  <Container class="px-8 h-18 flex items-center justify-between">
    
    <!-- Left Group: Logo & Nav items -->
    <div class="flex items-center gap-10">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-2.5 group focus-visible:outline-none">
        <div class="h-[28px] w-[28px] rounded-full bg-[#13E28A] flex items-center justify-center relative shadow-sm shrink-0">
          <svg class="h-[14px] w-[14px] text-black" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="12" x2="12" y2="4" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="4" r="1.5" fill="currentColor" />
            <line x1="12" y1="12" x2="4" y2="4" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="4" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span class="font-sans font-extrabold tracking-tight text-[18px] text-[#111111]">
          Highnote
        </span>
      </a>

      <!-- Primary links with dropdown hover states -->
      <nav class="hidden lg:flex items-center gap-6 text-[13.5px] font-medium text-[#111111]">
        
        <!-- Platform Dropdown item -->
        <div 
          class="relative py-4 cursor-pointer"
          onmouseenter={() => activeDropdown = 'platform'}
          onmouseleave={() => activeDropdown = ''}
          role="none"
        >
          <button class="hover:text-[#111111]/70 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none" aria-expanded={activeDropdown === 'platform'}>
            <span>Platform</span>
            <ChevronDown class="h-3 w-3 transition-transform duration-200 {activeDropdown === 'platform' ? 'rotate-180' : ''}" />
          </button>

          {#if activeDropdown === 'platform'}
            <div 
              transition:fade={{ duration: 150 }}
              class="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[320px] bg-white border border-[#E5E3DC]/60 rounded-2xl shadow-xl p-5 z-50 text-left flex flex-col gap-4"
            >
              {#each platformSubItems as sub}
                <a href={sub.href} class="flex items-start gap-3 p-2 rounded-xl hover:bg-zinc-50 transition-colors">
                  <div class="h-8 w-8 rounded-lg bg-zinc-50 border border-[#E5E3DC]/20 flex items-center justify-center text-[#84CC16] shrink-0">
                    <sub.icon class="h-4.5 w-4.5" />
                  </div>
                  <div class="flex flex-col text-left">
                    <span class="text-xs font-bold text-black">{sub.title}</span>
                    <span class="text-[10px] text-zinc-500 font-normal leading-snug mt-0.5">{sub.desc}</span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Products Dropdown item -->
        <div 
          class="relative py-4 cursor-pointer"
          onmouseenter={() => activeDropdown = 'products'}
          onmouseleave={() => activeDropdown = ''}
          role="none"
        >
          <button class="hover:text-[#111111]/70 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none" aria-expanded={activeDropdown === 'products'}>
            <span>Products</span>
            <ChevronDown class="h-3 w-3 transition-transform duration-200 {activeDropdown === 'products' ? 'rotate-180' : ''}" />
          </button>

          {#if activeDropdown === 'products'}
            <div 
              transition:fade={{ duration: 150 }}
              class="absolute top-full left-0 mt-1 w-[260px] bg-white border border-[#E5E3DC]/60 rounded-2xl shadow-xl p-4 z-50 text-left flex flex-col gap-3.5"
            >
              {#each productsSubItems as sub}
                <a href={sub.href} class="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 transition-colors">
                  <CheckCircle2 class="h-4 w-4 text-[#84CC16] shrink-0 mt-0.5" />
                  <div class="flex flex-col text-left">
                    <span class="text-xs font-bold text-black">{sub.name}</span>
                    <span class="text-[10px] text-zinc-500 font-normal leading-normal">{sub.desc}</span>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Direct links -->
        <a href="#pricing" class="hover:text-[#111111]/70 transition-colors py-1">Pricing</a>
        <a href="#blog" class="hover:text-[#111111]/70 transition-colors py-1">Blog</a>
        <a href="#about" class="hover:text-[#111111]/70 transition-colors py-1">Company</a>

      </nav>

    </div>
    
    <!-- Right Group: Docs, Sign in & Get Started Capsule -->
    <div class="flex items-center gap-6 text-[13.5px] font-medium text-[#111111]">
      <a 
        href="#api-docs" 
        class="hidden sm:inline hover:text-[#111111]/70 transition-colors focus-visible:outline-none"
      >
        Documentation
      </a>
      
      <a 
        href="#signin" 
        class="hover:text-[#111111]/70 transition-colors focus-visible:outline-none"
      >
        Sign in
      </a>
      
      <!-- Outlined capsule Get Started button -->
      <a 
        href="#cta" 
        class="border border-[#111111] px-5 py-2.5 rounded-full text-[13px] font-bold text-[#111111] hover:bg-[#111111]/5 transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
      >
        <span>Get Started</span>
        <span class="text-sm font-sans font-light">&rarr;</span>
      </a>
    </div>

  </Container>
</header>
