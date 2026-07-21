<!-- src/lib/landing-v3/components/Footer.svelte -->
<script lang="ts">
  import Container from './shared/Container.svelte';
  import { footerBrand, footerSections } from '../data/footer';
  
  import { Send, ArrowUp, Mail } from 'lucide-svelte';

  let emailValue = $state('');

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (emailValue.trim()) {
      alert(`Subscribed: ${emailValue}`);
      emailValue = '';
    }
  }

  function scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
</script>

<footer class="w-full bg-[#111111] text-zinc-400 py-20 px-6 sm:px-8 border-t border-zinc-900 font-sans relative z-10 select-none">
  <Container class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 border-b border-zinc-800 pb-16">
    
    <!-- Left Column: Branding details & brand statement -->
    <div class="lg:col-span-2 flex flex-col gap-6 text-left">
      <a href="/" class="flex items-center gap-2 focus-visible:outline-none">
        <div class="h-6 w-6 rounded-full bg-[#A3E635] flex items-center justify-center relative shadow-sm">
          <div class="h-3 w-3 rounded-full bg-black"></div>
        </div>
        <span class="font-bold tracking-tight text-base text-white">
          Digital<span class="text-[#84CC16]">DSA</span>
        </span>
      </a>
      
      <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
        {footerBrand.description}
      </p>
      
      <!-- Brand statement -->
      <span class="text-[10px] font-mono text-[#84CC16] uppercase tracking-wider block">
        Digitizing India's B2B loan pipelines
      </span>
    </div>

    <!-- Middle Sitemap columns -->
    {#each footerSections as section}
      <div class="flex flex-col gap-4 text-left">
        <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
          {section.title}
        </span>
        <ul class="space-y-2.5 text-xs sm:text-sm">
          {#each section.links as link}
            <li>
              <a 
                href={link.href} 
                class="hover:text-[#A3E635] hover:underline transition-all focus-visible:outline-none"
              >
                {link.label}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}

    <!-- Right Column: Newsletter signup & support email link -->
    <div class="lg:col-span-2 flex flex-col gap-5 text-left">
      <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
        Stay Updated
      </span>
      <p class="text-xs text-zinc-400 max-w-xs leading-normal">
        Subscribe to our newsletter to receive the latest updates, guides, and policy releases.
      </p>
      
      <form onsubmit={handleSubmit} class="flex items-center gap-2 w-full max-w-xs">
        <input 
          type="email" 
          placeholder="Email address"
          bind:value={emailValue}
          required
          class="flex-1 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-650 focus-visible:outline-none focus-visible:border-[#A3E635]"
        />
        <button 
          type="submit" 
          class="h-8.5 w-8.5 rounded-full bg-[#FAF9F5] text-black hover:bg-[#A3E635] flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none cursor-pointer"
          aria-label="Subscribe"
        >
          <Send class="h-3.5 w-3.5" />
        </button>
      </form>

      <!-- Support details -->
      <div class="flex items-center gap-2 mt-2 text-xs text-zinc-550">
        <Mail class="h-3.5 w-3.5 text-[#84CC16]" />
        <a href="mailto:support@digitaldsa.com" class="hover:text-[#FAF9F5] transition-colors">support@digitaldsa.com</a>
      </div>
    </div>

  </Container>

  <!-- Sub Footer row with Back-to-Top scroll button -->
  <Container class="pt-8 flex flex-col sm:flex-row justify-between items-center gap-6 text-[11px] text-zinc-600">
    <p>{footerBrand.copyright}</p>
    
    <div class="flex items-center gap-6">
      <div class="flex gap-4">
        <a href="#privacy" class="hover:text-zinc-450">Privacy Policy</a>
        <a href="#terms" class="hover:text-zinc-450">Terms of Service</a>
      </div>

      <!-- Back to top button -->
      <button 
        onclick={scrollToTop}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 bg-transparent text-zinc-400 hover:text-white transition-all cursor-pointer"
        aria-label="Scroll back to top"
      >
        <span>Back to top</span>
        <ArrowUp class="h-3 w-3" />
      </button>
    </div>
  </Container>
</footer>
