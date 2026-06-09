<script lang="ts">
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";

  // Define interfaces for type safety
  interface Example {
    [key: string]: string;
    title: string;
    business: string;
    cashIncome: string;
    "Monthly Average Balance": string;
    gst: string;
    profit: string;
    eligibility: string;
    explanation: string;
  }

  interface Examples {
    [key: string]: Example;
  }

  let activeTab: string = "retail";
  let visible: boolean = false;

  onMount(() => {
    visible = true;
    return () => {
      visible = false; // Cleanup on unmount
    };
  });

  const examples: Examples = {
    retail: {
      title: "Retail Business Example",
      business: "Local Grocery Store",
      cashIncome: "₹1,50,000 monthly",
      "Monthly Average Balance": "₹75,000",
      gst: "₹18,00,000 annually",
      profit: "₹6,00,000 annually",
      eligibility: "₹18,00,000 to ₹24,00,000",
      explanation:
        "Based primarily on GST turnover (10-15%) and supported by consistent cash flow patterns.",
    },
    manufacturing: {
      title: "Manufacturing Business Example",
      business: "Small Textile Manufacturer",
      cashIncome: "₹4,50,000 monthly",
      "Monthly Average Balance": "₹2,25,000",
      gst: "₹54,00,000 annually",
      profit: "₹12,00,000 annually",
      eligibility: "₹36,00,000 to ₹48,00,000",
      explanation:
        "Based on a combination of annual profit (3-4x) and GST turnover, with higher weight on formal financial statements.",
    },
    service: {
      title: "Service Business Example",
      business: "IT Consulting Firm",
      cashIncome: "₹3,00,000 monthly",
      "Monthly Average Balance": "₹1,50,000",
      gst: "₹36,00,000 annually",
      profit: "₹15,00,000 annually",
      eligibility: "₹45,00,000 to ₹75,00,000",
      explanation:
        "Based primarily on annual profit (3-5x) due to high-margin nature of the business with minimal physical assets.",
    },
    hospitality: {
      title: "Hospitality Business Example",
      business: "Family Restaurant",
      cashIncome: "₹2,00,000 monthly",
      "Monthly Average Balance": "₹1,00,000",
      gst: "₹24,00,000 annually",
      profit: "₹8,00,000 annually",
      eligibility: "₹20,00,000 to ₹28,00,000",
      explanation:
        "Based primarily on Cash Income due to high daily transactions, with GST turnover as a supporting factor.",
    },
    ecommerce: {
      title: "E-commerce Business Example",
      business: "Online Fashion Store",
      cashIncome: "₹2,50,000 monthly",
      "Monthly Average Balance": "₹1,25,000",
      gst: "₹48,00,000 annually",
      profit: "₹10,00,000 annually",
      eligibility: "₹32,00,000 to ₹44,00,000",
      explanation:
        "Based primarily on GST turnover (10-15%) reflecting online sales volume, with MAB supporting financial stability.",
    },
    freelance: {
      title: "Freelance Business Example",
      business: "Graphic Design Studio",
      cashIncome: "₹1,00,000 monthly",
      "Monthly Average Balance": "₹50,000",
      gst: "₹12,00,000 annually",
      profit: "₹9,00,000 annually",
      eligibility: "₹27,00,000 to ₹36,00,000",
      explanation:
        "Based primarily on annual profit (3-4x) due to irregular cash flows but strong profitability from project-based work.",
    },
  };

  // Map tabs to their primary factor(s) for highlighting
  const highlightFactors: { [key: string]: string[] } = {
    retail: ["gst"],
    manufacturing: ["gst", "profit"],
    service: ["profit"],
    hospitality: ["cashIncome"],
    ecommerce: ["gst"],
    freelance: ["profit"],
  };
</script>

<section
  class="py-16"
  aria-labelledby="eligibility-examples"
>
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <h2
      id="eligibility-examples"
      class="text-4xl sm:text-5xl font-extrabold text-center text-black dark:text-white mb-6 tracking-tight"
    >
      Eligibility Calculation Examples
    </h2>
    <p
      class="text-lg sm:text-xl text-center text-[var(--form-text-secondary)] max-w-4xl mx-auto mb-12 leading-relaxed"
    >
      Explore how banks assess loan eligibility for various business types based
      on key financial factors.
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
                  ? 'bg-btnBg text-black'
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
          <div class="bg-btnBg p-6">
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
                    ? 'border-2 border-btnBg'
                    : 'border border-[var(--form-border)]'}"
                  aria-label={highlightFactors[activeTab].includes(key)
                    ? 'Primary factor for loan eligibility'
                    : undefined}
                >
                  <p class="text-sm text-[var(--form-text-secondary)] capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p class="text-lg font-semibold text-black dark:text-white">
                    {examples[activeTab][key]}
                  </p>
                </div>
              {/each}
            </div>

            <div class="border-t border-[var(--form-border)] pt-6">
              <div class="bg-[var(--landing-bg)] border border-btnBg p-4 rounded-lg mb-4 shadow-sm">
                <p class="text-sm text-[var(--form-text-secondary)]">Estimated Loan Eligibility</p>
                <p class="text-2xl font-bold text-btnBg">
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