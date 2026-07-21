<!-- src/lib/landing-v3/components/ReadLatest.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Section from './shared/Section.svelte';
  import Container from './shared/Container.svelte';
  import SectionHeader from './shared/SectionHeader.svelte';
  import Grid from './shared/Grid.svelte';
  import Card from './shared/Card.svelte';
  
  import { resourcesHeader, resourcesData } from '../data/resources';
  import { staggerReveal } from '../animations/motion';

  let containerEl = $state<HTMLElement | null>(null);

  onMount(() => {
    if (containerEl) {
      staggerReveal(containerEl, '.resource-card-item', 0.1);
    }
  });
</script>

<Section id="blog" class="bg-[#FAF9F5] border-t border-[#E5E3DC]/30">
  <Container>
    <SectionHeader 
      align="left"
      label="Resources"
      title={resourcesHeader.title}
      description={resourcesHeader.description}
    />

    <div bind:this={containerEl}>
      <Grid cols={3} gap="md" class="mt-8">
        {#each resourcesData as article}
          <div class="resource-card-item opacity-0">
            <Card padding="md" interactive={true} class="h-[370px] flex flex-col justify-between group">
              
              <!-- Diagram illustration inside each article -->
              <div class="w-full h-32 rounded-2xl bg-[#FAF9F5]/70 border border-[#E5E3DC]/30 flex items-center justify-center relative overflow-hidden select-none">
                
                {#if article.illustrationType === 'sbi-sync'}
                  <!-- SVG: DigitalDSA + SBI Sync circle connecting -->
                  <svg class="h-16 w-32 text-zinc-400" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="35" cy="32" r="7.5" stroke="#111111" />
                    <circle cx="85" cy="32" r="7.5" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Connecting arrow -->
                    <path d="M43 32 L 77 32" stroke="#84CC16" stroke-dasharray="2 2" />
                    <!-- Check inside the green node -->
                    <path d="M82 32 l2 2 3.5-4" stroke="#84CC16" stroke-width="1.5" />
                  </svg>
                  
                {:else if article.illustrationType === 'ledger-architecture'}
                  <!-- SVG: Ledger architecture Sponsor Bank -> DigitalDSA connection graph -->
                  <svg class="h-16 w-32 text-zinc-400" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Blocks -->
                    <rect x="20" y="22" width="22" height="20" rx="4" stroke="#111111" />
                    <rect x="78" y="22" width="22" height="20" rx="4" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Transfer arrow -->
                    <path d="M43 32 L 77 32" stroke="#84CC16" />
                    <path d="M72 28 L 77 32 L 72 36" stroke="#84CC16" />
                  </svg>

                {:else}
                  <!-- SVG: Policy 101 Processor -> DigitalDSA mapping diagrams -->
                  <svg class="h-16 w-32 text-zinc-400" viewBox="0 0 120 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Node circles -->
                    <circle cx="30" cy="18" r="5" stroke="#111111" />
                    <circle cx="30" cy="46" r="5" stroke="#111111" />
                    <circle cx="90" cy="32" r="6" stroke="#84CC16" stroke-width="2.5" />
                    <!-- Paths -->
                    <path d="M36 21 L 84 31.5" stroke="#E5E3DC" />
                    <path d="M36 43 L 84 32.5" stroke="#84CC16" />
                  </svg>
                {/if}

                <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.03),transparent_60%)] pointer-events-none"></div>
              </div>

              <!-- Content details -->
              <div class="flex flex-col gap-2.5 text-left">
                <div class="flex items-center gap-2 text-[10px] font-mono text-[#6B7280]">
                  <span class="px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E5E3DC]/30 uppercase">{article.category}</span>
                  <span>&bull;</span>
                  <span>{article.readTime}</span>
                </div>
                
                <h3 class="text-sm sm:text-base font-bold text-[#111111] dark:text-white leading-snug group-hover:text-[#84CC16] transition-colors">
                  {article.title}
                </h3>
              </div>

            </Card>
          </div>
        {/each}
      </Grid>
    </div>
  </Container>
</Section>
