<script lang="ts">
  import { slide } from 'svelte/transition';
  
  let faqs = [
    {
      question: "What is the minimum business vintage required for a business loan?",
      answer: "Most lenders require a minimum business vintage of 1-3 years. Established businesses with longer operating history typically qualify for larger loan amounts and better interest rates. Some specialized lenders offer startup loans for businesses with less than 1 year of operation, but these often come with higher interest rates and stricter eligibility criteria."
    },
    {
      question: "Do I need to provide collateral for a business loan?",
      answer: "It depends on the loan type and amount. Secured business loans require collateral (property, equipment, inventory), while unsecured loans don't. Unsecured loans typically have higher interest rates and lower maximum amounts. Many lenders offer both options, with secured loans providing more favorable terms for larger amounts."
    },
    {
      question: "How does my credit score affect business loan eligibility?",
      answer: "Your personal credit score significantly impacts business loan approval, especially for small businesses. Most lenders require a minimum CIBIL score of 700-750. A higher score improves your chances of approval, better interest rates, and higher loan amounts. Some lenders may consider business loans with lower scores but will typically charge higher interest rates to offset the perceived risk."
    },
    {
      question: "Can I get a business loan if my business is not GST registered?",
      answer: "Yes, but your options may be limited. Non-GST registered businesses can still qualify for loans based on bank statements, income tax returns, and financial statements. However, GST registration often opens up more loan options with better terms. Some specialized lenders and NBFCs offer specific loan products for non-GST registered businesses."
    },
    {
      question: "What documents are typically required for a business loan application?",
      answer: "Common documents include: Business registration proof (GST registration, shop establishment certificate), KYC documents (Aadhaar, PAN), bank statements (6-12 months), income tax returns (1-3 years), financial statements, business vintage proof, and address proof. Additional documents may be required based on loan type and amount."
    },
    {
      question: "How long does the business loan approval process take?",
      answer: "The approval timeline varies by lender and loan type. Digital lenders may approve loans within 24-48 hours, while traditional banks typically take 7-14 business days. Larger loan amounts and secured loans generally require more thorough verification and may take longer. Having all required documents ready can significantly speed up the process."
    }
  ];
  
  let activeIndex = -1;
  
  function toggleFAQ(index: number) {
    activeIndex = activeIndex === index ? -1 : index;
  }
</script>

<div class="py-12">
  <h2 class="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
  <p class="text-lg text-center max-w-3xl mx-auto mb-12">
    Get answers to common questions about business loan eligibility criteria and application process.
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
      Have more questions? <a href="/contact" class="text-btnBg hover:underline">Contact our loan experts</a>
    </p>
  </div>
</div>