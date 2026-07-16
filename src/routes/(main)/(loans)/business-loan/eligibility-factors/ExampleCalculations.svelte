<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import content from "$lib/data/website/businessLoanEligibility.json";

  const { heading, description } = content.examplesSection;
  const examples = content.examplesSection.examples as Record<string, any>;
  const highlightFactors = content.examplesSection.highlightFactors as Record<string, string[]>;

  let activeTab = $state("retail");
  let visible = $state(false);

  onMount(() => {
    visible = true;
    return () => {
      visible = false;
    };
  });
</script>

<section
  class="py-16"
  aria-labelledby="eligibility-examples"
>
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <h2
      id="eligibility-examples"
      class="text-4xl sm:text-5xl font-extrabold text-center text-[var(--form-text)] mb-6 tracking-tight"
    >
      {heading}
    </h2>
    <p
      class="text-lg sm:text-xl text-center text-[var(--form-text-secondary)] max-w-4xl mx-auto mb-12 leading-relaxed"
    >
      {description}
    </p>

    {#if visible}
      <div class="max-w-5xl mx-auto" in:fade={{ duration: 400 }}>
        <!-- Tab Navigation -->
        <div class="flex justify-center mb-10">
          <div
            class="inline-flex flex-wrap justify-center rounded-lg shadow-sm bg-[var(--landing-bg-card)] border border-[var(--form-border)] overflow-hidden"
            role="tablist"
          >
            {#each Object.keys(examples) as tab, index}
              <button
                class="px-6 py-3 text-sm font-medium transition-all duration-200 {activeTab ===
                tab
                  ? 'bg-primary text-black'
                  : 'bg-[var(--landing-bg-card)] text-[var(--form-text-secondary)] hover:bg-[var(--landing-bg)]'} {index ===
                0
                  ? 'rounded-l-lg'
                  : ''} {index === Object.keys(examples).length - 1
                  ? 'rounded-r-lg'
                  : ''} border-r last:border-r-0 border-[var(--form-border)]"
                onclick={() => (activeTab = tab)}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                id={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            {/each}
          </div>
        </div>

        <!-- Example Card -->
        <div
          class="bg-[var(--landing-bg-card)] rounded-xl shadow-lg overflow-hidden"
          in:slide={{ duration: 300 }}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          <div class="bg-primary p-6">
            <h3 class="text-2xl font-bold text-black">
              {examples[activeTab].title}
            </h3>
            <p class="text-black opacity-80 text-lg">
              {examples[activeTab].business}
            </p>
          </div>

          <div class="p-6 sm:p-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {#each ["cashIncome", "Monthly Average Balance", "gst", "profit"] as key}
                <div
                  class="bg-[var(--landing-bg)] p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 {highlightFactors[activeTab].includes(key)
                    ? 'border-2 border-[var(--form-border)]'
                    : 'border border-[var(--form-border)]'}"
                  aria-label={highlightFactors[activeTab].includes(key)
                    ? 'Primary factor for loan eligibility'
                    : undefined}
                >
                  <p class="text-sm text-[var(--form-text-secondary)] capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p class="text-lg font-semibold text-[var(--form-text)]">
                    {examples[activeTab][key]}
                  </p>
                </div>
              {/each}
            </div>

            <div class="border-t border-[var(--form-border)] pt-6">
              <div class="bg-[var(--landing-bg)] border border-[var(--form-border)] p-4 rounded-lg mb-4 shadow-sm">
                <p class="text-sm text-[var(--form-text-secondary)]">Estimated Loan Eligibility</p>
                <p class="text-2xl font-bold text-primary">
                  {examples[activeTab].eligibility}
                </p>
              </div>
              <p class="text-[var(--form-text-secondary)] leading-relaxed">
                {examples[activeTab].explanation}
              </p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  :global(.container) {
    scroll-margin-top: 80px; /* Adjust for fixed header */
  }
</style>