<script lang="ts">
  import { slide } from 'svelte/transition';
  import content from "$lib/data/website/businessLoanEligibility.json";

  const { heading, description, ctaText, ctaLinkText, faqs } = content.faqSection;
  
  let activeIndex = $state(-1);
  
  function toggleFAQ(index: number) {
    activeIndex = activeIndex === index ? -1 : index;
  }
</script>

<div class="py-12">
  <h2 class="text-3xl font-bold text-center mb-8">{heading}</h2>
  <p class="text-lg text-center max-w-3xl mx-auto mb-12">
    {description}
  </p>
  
  <div class="max-w-3xl mx-auto">
    {#each faqs as faq, i}
      <div class="mb-4 border border-[var(--form-border)] rounded-lg overflow-hidden">
        <button
          class="w-full flex justify-between items-center p-5 bg-[var(--landing-bg-card)] hover:bg-[var(--landing-bg)] focus:outline-none"
          onclick={() => toggleFAQ(i)}
          aria-expanded={activeIndex === i}
        >
          <span class="text-left font-medium text-[var(--form-text)]">{faq.question}</span>
          <svg
            class="w-5 h-5 text-[var(--form-text-secondary)] transform transition-transform duration-200 {activeIndex === i ? 'rotate-180' : ''}"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        {#if activeIndex === i}
          <div class="px-5 pb-5" transition:slide={{ duration: 300}}>
            <p class="text-[var(--form-text-secondary)]">{faq.answer}</p>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  <div class="mt-8 text-center">
    <p class="text-[var(--form-text-secondary)]">
      {ctaText} <a href="/contact" class="text-primary hover:underline">{ctaLinkText}</a>
    </p>
  </div>
</div>