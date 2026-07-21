<!-- src/lib/landing-v3/components/MakeItYourOwn.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import Button from './shared/Button.svelte';
  import Card from './shared/Card.svelte';
  import { scrollReveal } from '../animations/motion';

  let containerEl = $state<HTMLElement | null>(null);

  // Customizer reactive state
  let selectedTheme = $state<'blue' | 'black' | 'cream'>('blue');
  let portalLabel = $state('DigitalDSA Portal');

  onMount(() => {
    if (containerEl) {
      scrollReveal(containerEl);
    }
  });

  const cardsData = {
    blue: { bg: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white', textColor: 'text-blue-100', dot: 'bg-blue-300' },
    black: { bg: 'bg-[#111111] text-white', textColor: 'text-zinc-400', dot: 'bg-zinc-600' },
    cream: { bg: 'bg-[#FAF9F5] border border-[#E5E3DC] text-[#111111]', textColor: 'text-zinc-500', dot: 'bg-[#A3E635]' }
  };
</script>

<Section id="customization" class="bg-[#FAF9F5] border-t border-[#E5E3DC]/30">
  <Container>
    <div 
      bind:this={containerEl}
      class="flex flex-col lg:flex-row items-center justify-between gap-16 opacity-0"
    >
      
      <!-- Left side: Interactive customization dashboard -->
      <div class="w-full lg:w-[500px] shrink-0">
        <Card padding="none" class="w-full h-[400px] border border-[#E5E3DC] bg-white relative flex flex-col justify-between overflow-hidden p-6 sm:p-8">
          
          <!-- Customizable Portal Card Header Mockup -->
          <div class="flex items-center justify-between border-b border-[#E5E3DC]/30 pb-4">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full {cardsData[selectedTheme].dot}"></span>
              <span class="text-[10px] font-mono font-bold tracking-wider text-[#111111] uppercase">{portalLabel}</span>
            </div>
            <span class="text-[8px] font-mono text-[#6B7280]">Interactive Preview</span>
          </div>

          <!-- Customizable visual card stack rendering -->
          <div class="flex-1 flex items-center justify-center relative py-8">
            
            <!-- Stack card 3 (Background offset) -->
            <div class="absolute w-[280px] h-[160px] rounded-2xl bg-zinc-300/40 border border-[#E5E3DC]/30 rotate-[-6deg] translate-y-[-10px] opacity-40"></div>
            
            <!-- Stack card 2 (Background offset) -->
            <div class="absolute w-[280px] h-[160px] rounded-2xl bg-zinc-400/20 border border-[#E5E3DC]/30 rotate-[4deg] translate-y-[-4px] opacity-60"></div>
            
            <!-- Stack card 1 (Active customizable card) -->
            <div 
              class="w-[280px] h-[160px] rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 relative z-10 {cardsData[selectedTheme].bg}"
            >
              <div class="flex justify-between items-start">
                <span class="text-[10px] font-mono uppercase tracking-wider opacity-85">Sourcing Network Card</span>
                <!-- Mini chip illustration -->
                <div class="h-6 w-8 rounded bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
                  <div class="h-3 w-5 bg-amber-400/40 rounded-sm"></div>
                </div>
              </div>

              <div>
                <span class="block font-mono text-xs tracking-widest leading-none">**** **** **** 2026</span>
                <div class="flex justify-between items-end mt-4">
                  <div>
                    <span class="block text-[8px] uppercase tracking-wider opacity-60">Agent Name</span>
                    <span class="block font-sans font-bold text-[10px]">Aarav Sharma</span>
                  </div>
                  <!-- Logo brand visual inside the card -->
                  <div class="flex items-center gap-1">
                    <span class="text-[9px] font-bold tracking-tighter">DigitalDSA</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Customizer Controller Row at bottom -->
          <div class="border-t border-[#E5E3DC]/30 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs font-medium">
            <!-- Theme selectors -->
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-mono text-[#6B7280] uppercase">Theme:</span>
              <div class="flex gap-2">
                <button 
                  class="h-5 w-5 rounded-full bg-blue-600 border-2 {selectedTheme === 'blue' ? 'border-[#A3E635]' : 'border-transparent'}" 
                  onclick={() => selectedTheme = 'blue'}
                  aria-label="Blue theme"
                ></button>
                <button 
                  class="h-5 w-5 rounded-full bg-[#111111] border-2 {selectedTheme === 'black' ? 'border-[#A3E635]' : 'border-transparent'}" 
                  onclick={() => selectedTheme = 'black'}
                  aria-label="Black theme"
                ></button>
                <button 
                  class="h-5 w-5 rounded-full bg-[#FAF9F5] border border-[#E5E3DC] border-2 {selectedTheme === 'cream' ? 'border-[#A3E635]' : 'border-transparent'}" 
                  onclick={() => selectedTheme = 'cream'}
                  aria-label="Cream theme"
                ></button>
              </div>
            </div>

            <!-- Portal label input box -->
            <input 
              type="text" 
              bind:value={portalLabel} 
              class="px-3 py-1 rounded bg-[#FAF9F5] border border-[#E5E3DC] font-mono text-[9px] text-[#111111] uppercase tracking-wider focus-visible:outline-none focus-visible:border-[#A3E635]"
              maxlength="20"
            />
          </div>

        </Card>
      </div>

      <!-- Right side: Copy text & button -->
      <div class="flex flex-col gap-6 max-w-xl text-left">
        <span class="w-max px-3 py-1 text-[11px] font-mono tracking-wider text-[#A3E635] uppercase bg-[#A3E635]/10 border border-[#A3E635]/20 rounded-full">
          Tailored Branding
        </span>
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#111111] leading-[1.12]">
          Make it Your Own
        </h2>
        <p class="text-sm sm:text-base leading-relaxed text-[#6B7280] font-normal">
          With DigitalDSA's flexible configuration console, customize portals for your sourcing networks, adapt colors to your corporate guidelines, and provision branded agent tracking dashboards with zero development efforts.
        </p>
        <div class="mt-2">
          <Button variant="black" href="#api-docs">
            Read the Docs &rarr;
          </Button>
        </div>
      </div>

    </div>
  </Container>
</Section>
