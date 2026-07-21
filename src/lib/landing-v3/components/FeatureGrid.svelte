<!-- src/lib/landing-v3/components/FeatureGrid.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import SectionHeader from './shared/SectionHeader.svelte';
  import Button from './shared/Button.svelte';
  import Grid from './shared/Grid.svelte';
  import Card from './shared/Card.svelte';
  
  import { featuresHeader, featuresData } from '../data/features';
  import { staggerReveal } from '../animations/motion';

  import { Check, Info } from 'lucide-svelte';

  let gridContainerEl = $state<HTMLElement | null>(null);

  // Interactive toggle state for Card 5
  let toggleActive1 = $state(true);
  let toggleActive2 = $state(false);

  onMount(() => {
    if (gridContainerEl) {
      staggerReveal(gridContainerEl, '.feature-card-item', 0.1);
    }
  });
</script>

<Section id="features" class="bg-[#FBFBF9] border-t border-[#E5E3DC]/30">
  <Container>
    <!-- Section Header with right-aligned button action -->
    {#snippet headerActions()}
      <Button variant="black" href="#modern-stack">
        {featuresHeader.ctaText} &rarr;
      </Button>
    {/snippet}

    <SectionHeader 
      align="left"
      label="Platform Matrix"
      title={featuresHeader.title}
      description={featuresHeader.description}
      actions={headerActions}
    />

    <!-- Features Card Grid -->
    <div bind:this={gridContainerEl}>
      <Grid cols={3} gap="md" class="mt-8">
        {#each featuresData as feature}
          <div class="feature-card-item opacity-0">
            <Card padding="md" interactive={true} class="h-[370px] flex flex-col justify-between group">
              
              <!-- Vector Illustration Canvas -->
              <div class="w-full h-32 rounded-2xl bg-[#FAF9F5]/70 border border-[#E5E3DC]/30 flex items-center justify-center relative overflow-hidden select-none">
                
                {#if feature.illustrationType === 'compliance'}
                  <!-- AI Eligibility Circular Gauge -->
                  <svg class="h-16 w-16 text-zinc-400 dark:text-zinc-600" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Gauge outer circle arc -->
                    <path d="M14 46 A 22 22 0 1 1 50 46" stroke="#E5E3DC" stroke-dasharray="2 2" />
                    <path d="M14 46 A 22 22 0 1 1 45 22" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Needle -->
                    <line x1="32" y1="32" x2="42" y2="20" stroke="#111111" stroke-width="2.5" />
                    <circle cx="32" cy="32" r="3.5" fill="#111111" />
                    <!-- Score text -->
                    <text x="32" y="48" text-anchor="middle" font-size="10" font-family="monospace" font-weight="bold" fill="#84CC16" stroke="none">98%</text>
                  </svg>
                  
                {:else if feature.illustrationType === 'stats'}
                  <!-- Analytics Bar Chart with animated trend -->
                  <svg class="h-16 w-32 text-zinc-400" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="10" y1="54" x2="110" y2="54" stroke="#E5E3DC" />
                    <!-- Bars -->
                    <rect x="25" y="30" width="8" height="24" rx="2" fill="#E5E3DC" stroke="none" />
                    <rect x="45" y="16" width="8" height="38" rx="2" fill="#84CC16" stroke="none" class="group-hover:fill-[#bef264] transition-colors" />
                    <rect x="65" y="24" width="8" height="30" rx="2" fill="#E5E3DC" stroke="none" />
                    <rect x="85" y="38" width="8" height="16" rx="2" fill="#E5E3DC" stroke="none" />
                    <!-- Connection trend line -->
                    <path d="M29 30 L 49 16 L 69 24 L 89 38" fill="none" stroke="#111111" stroke-width="1.5" />
                  </svg>

                {:else if feature.illustrationType === 'ledger'}
                  <!-- Ledger Node Routing Tree -->
                  <svg class="h-16 w-20 text-zinc-400" viewBox="0 0 80 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Root node -->
                    <circle cx="40" cy="16" r="4.5" fill="#111111" stroke="none" />
                    <!-- Connections -->
                    <path d="M40 21 L 20 38 M 40 21 L 60 38" stroke="#E5E3DC" />
                    <path d="M40 21 L 40 46" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Sub nodes -->
                    <circle cx="20" cy="40" r="3.5" fill="#E5E3DC" stroke="none" />
                    <circle cx="60" cy="40" r="3.5" fill="#E5E3DC" stroke="none" />
                    <circle cx="40" cy="48" r="4.5" fill="#84CC16" stroke="none" />
                    <!-- Pulse dot indicator on active path -->
                    <circle cx="40" cy="30" r="2.5" fill="#84CC16" stroke="none" class="animate-ping" />
                  </svg>

                {:else if feature.illustrationType === 'recommendations'}
                  <!-- Approval Timeline Checklist -->
                  <svg class="h-16 w-32 text-zinc-400" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Connective bar -->
                    <line x1="20" y1="32" x2="100" y2="32" stroke="#E5E3DC" />
                    <line x1="20" y1="32" x2="60" y2="32" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Steps -->
                    <circle cx="20" cy="32" r="5" fill="#84CC16" stroke="none" />
                    <circle cx="60" cy="32" r="5" fill="#84CC16" stroke="none" />
                    <circle cx="100" cy="32" r="5" fill="#E5E3DC" stroke="none" />
                    <!-- Mini status texts -->
                    <text x="20" y="48" text-anchor="middle" font-size="6.5" font-family="sans-serif" font-weight="bold" fill="#6B7280" stroke="none">CIBIL</text>
                    <text x="60" y="48" text-anchor="middle" font-size="6.5" font-family="sans-serif" font-weight="bold" fill="#84CC16" stroke="none">FOIR</text>
                    <text x="100" y="48" text-anchor="middle" font-size="6.5" font-family="sans-serif" font-weight="bold" fill="#94A3B8" stroke="none">Offer</text>
                  </svg>

                {:else if feature.illustrationType === 'toggles'}
                  <!-- Interactive Policy Toggles -->
                  <div class="flex flex-col gap-3.5 items-center w-full">
                    <!-- Toggle 1 -->
                    <button 
                      class="w-20 h-7 rounded-full border transition-all duration-200 p-0.5 flex items-center relative cursor-pointer
                             {toggleActive1 ? 'bg-[#84CC16]/10 border-[#84CC16] justify-end' : 'bg-zinc-100 border-zinc-200 justify-start'}"
                      onclick={() => toggleActive1 = !toggleActive1}
                      aria-label="Toggle setting one"
                    >
                      <span class="w-5.5 h-5.5 rounded-full shadow-sm transition-all duration-200 {toggleActive1 ? 'bg-[#84CC16]' : 'bg-zinc-400'}"></span>
                    </button>
                    <!-- Toggle 2 -->
                    <button 
                      class="w-20 h-7 rounded-full border transition-all duration-200 p-0.5 flex items-center relative cursor-pointer
                             {toggleActive2 ? 'bg-[#84CC16]/10 border-[#84CC16] justify-end' : 'bg-zinc-100 border-zinc-200 justify-start'}"
                      onclick={() => toggleActive2 = !toggleActive2}
                      aria-label="Toggle setting two"
                    >
                      <span class="w-5.5 h-5.5 rounded-full shadow-sm transition-all duration-200 {toggleActive2 ? 'bg-[#84CC16]' : 'bg-zinc-400'}"></span>
                    </button>
                  </div>

                {:else}
                  <!-- Sync Terminal Connected Arcs -->
                  <svg class="h-16 w-20 text-zinc-400" viewBox="0 0 80 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="24" cy="32" r="7.5" stroke="#E5E3DC" />
                    <circle cx="56" cy="32" r="7.5" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Connecting arrow -->
                    <path d="M32 32 L 48 32" stroke="#84CC16" stroke-dasharray="2 2" />
                    <path d="M44 29 L 47 32 L 44 35" stroke="#84CC16" />
                    <!-- Pulse waves -->
                    <circle cx="56" cy="32" r="14" stroke="#84CC16" stroke-width="1" stroke-opacity="0.3" class="animate-ping" style="animation-duration: 2.5s;" />
                  </svg>
                {/if}
                
                <!-- Ambient vector background glow details -->
                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.03),transparent_60%)] pointer-events-none"></div>
              </div>

              <!-- Card Details -->
              <div class="flex flex-col gap-2">
                <h3 class="text-base font-bold text-[#111111] dark:text-white capitalize transition-colors group-hover:text-[#84CC16]">
                  {feature.title}
                </h3>
                <p class="text-xs sm:text-sm font-normal leading-relaxed text-[#6B7280] dark:text-[#94A3B8]">
                  {feature.description}
                </p>
              </div>

            </Card>
          </div>
        {/each}
      </Grid>
    </div>
  </Container>
</Section>
