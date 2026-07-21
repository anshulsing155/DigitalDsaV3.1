<!-- src/lib/landing-v3/components/LaunchCTA.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import Button from './shared/Button.svelte';
  import Grid from './shared/Grid.svelte';
  import Card from './shared/Card.svelte';
  import { scrollReveal } from '../animations/motion';

  import { Smartphone, RefreshCw, Milestone } from 'lucide-svelte';

  let containerEl = $state<HTMLElement | null>(null);

  onMount(() => {
    if (containerEl) {
      scrollReveal(containerEl);
    }
  });
</script>

<Section id="cta" class="bg-[#FAF9F5] border-t border-[#E5E3DC]/30">
  <Container>
    <div 
      bind:this={containerEl}
      class="opacity-0"
    >
      <Grid cols={2} gap="lg">
        
        <!-- Card 1: Plan Your Integration -->
        <Card padding="lg" class="flex flex-col justify-between h-[400px] border border-[#E5E3DC] bg-white">
          <div class="flex flex-col gap-4 text-left">
            <span class="text-[9px] font-mono tracking-widest text-[#6B7280] uppercase">Integration Roadmap</span>
            <h3 class="text-2xl font-bold text-[#111111] leading-none">Plan Your Integration</h3>
            <p class="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-sm mt-1">
              Connect with our solutions engineers to build customized loan distribution networks matching your current stacks.
            </p>
            <div class="mt-2">
              <Button variant="black" href="#talk-expert" class="py-2.5 px-6">
                Talk to an Expert &rarr;
              </Button>
            </div>
          </div>

          <!-- Bottom Visual SVG -->
          <div class="w-full h-24 rounded-2xl bg-[#FAF9F5]/80 border border-[#E5E3DC]/30 flex items-center justify-center relative overflow-hidden select-none">
            <div class="flex items-center gap-8 relative z-10">
              <div class="h-10 w-10 rounded-full bg-[#111111] text-white flex items-center justify-center">
                <Smartphone class="h-5 w-5" />
              </div>
              
              <!-- Connecting arrow -->
              <svg class="h-4 w-12 text-[#6B7280]" viewBox="0 0 48 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M0 8h40" stroke-dasharray="2 2" />
                <path d="M37 5l3 3-3 3" />
              </svg>

              <div class="h-12 w-12 rounded-xl bg-[#A3E635]/25 border border-[#A3E635] flex items-center justify-center text-[#65A30D]">
                <Milestone class="h-6 w-6" />
              </div>
            </div>
            <!-- Glow overlay decoration -->
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.03),transparent_60%)] pointer-events-none"></div>
          </div>
        </Card>

        <!-- Card 2: Migrate to DigitalDSA -->
        <Card padding="lg" class="flex flex-col justify-between h-[400px] border border-[#E5E3DC] bg-white">
          <div class="flex flex-col gap-4 text-left">
            <span class="text-[9px] font-mono tracking-widest text-[#6B7280] uppercase">Channel Migration</span>
            <h3 class="text-2xl font-bold text-[#111111] leading-none">Migrate to DigitalDSA</h3>
            <p class="text-xs sm:text-sm text-[#6B7280] leading-relaxed max-w-sm mt-1">
              Migrate your existing relationship networks, sub-agent directories, and loan pipelines with zero downtime.
            </p>
            <div class="mt-2">
              <Button variant="black" href="#migrate" class="py-2.5 px-6">
                Migrate Pipeline &rarr;
              </Button>
            </div>
          </div>

          <!-- Bottom Visual SVG -->
          <div class="w-full h-24 rounded-2xl bg-[#FAF9F5]/80 border border-[#E5E3DC]/30 flex items-center justify-center relative overflow-hidden select-none">
            <div class="flex items-center gap-8 relative z-10">
              <div class="h-10 w-14 rounded bg-zinc-300 border border-zinc-400 flex items-center justify-center text-zinc-500 opacity-60">
                <span class="text-[8px] font-mono font-bold">LEGACY</span>
              </div>
              
              <!-- Connecting arrow -->
              <svg class="h-4 w-12 text-[#6B7280]" viewBox="0 0 48 16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M0 8h40" stroke-dasharray="2 2" />
                <path d="M37 5l3 3-3 3" />
              </svg>

              <div class="h-10 w-14 rounded bg-[#A3E635] text-black flex items-center justify-center shadow-md">
                <RefreshCw class="h-4 w-4 animate-spin" style="animation-duration: 6s;" />
              </div>
            </div>
            <!-- Glow overlay decoration -->
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.03),transparent_60%)] pointer-events-none"></div>
          </div>
        </Card>

      </Grid>
    </div>
  </Container>
</Section>
