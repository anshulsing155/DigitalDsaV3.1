<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import content from "$lib/data/website/businessLoanEligibility.json";
  
  const { heading, description, factors } = content.factorsSection;
  let visible = $state(false);
  
  onMount(() => {
    visible = true;
  });
</script>

<div class="py-12">
  <h2 class="text-3xl font-bold text-center mb-8">{heading}</h2>
  <p class="text-lg text-center max-w-3xl mx-auto mb-12">
    {description}
  </p>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
    {#each factors as factor, i}
      {#if visible}
        <div 
          class="bg-[var(--landing-bg-card)] rounded-lg shadow-lg p-6 border-l-4 border-[var(--form-border)] hover:shadow-xl transition-all duration-300"
          in:fly={{ y: 50, delay: i * 150, duration: 500 }}
        >
          <div class="flex items-start">
           
            <div>
              <h3 class="text-xl font-semibold mb-2 text-[var(--form-text)]">{factor.title}</h3>
              <p class="text-[var(--form-text-secondary)] mb-3">{factor.description}</p>
              <div class="bg-[var(--landing-bg)] p-3 rounded-md">
                <p class="text-sm font-medium text-[var(--form-text)]">
                  <span class="text-primary font-bold">Important:</span> {factor.importance}
                </p>
              </div>
            </div>
            
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>