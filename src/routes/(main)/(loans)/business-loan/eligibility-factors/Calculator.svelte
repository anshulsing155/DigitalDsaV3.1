<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  
  let visible = false;
  let monthlyIncome = 200000;
  let averageBalance = 100000;
  let annualTurnover = 2400000;
  let annualProfit = 800000;
  let businessType = "retail";
  
  let eligibilityAmount = 0;
  let eligibilityRange = { min: 0, max: 0 };
  
  onMount(() => {
    visible = true;
    calculateEligibility();
  });
  
  function calculateEligibility() {
    // Different weights based on business type
    let weights = {
      retail: { income: 0.1, balance: 0.1, turnover: 0.5, profit: 0.3 },
      manufacturing: { income: 0.05, balance: 0.05, turnover: 0.4, profit: 0.5 },
      service: { income: 0.1, balance: 0.1, turnover: 0.3, profit: 0.5 }
    };
    
    // Calculate based on different factors with weights
    let incomeBasedAmount = monthlyIncome * 12 * 0.3;
    let balanceBasedAmount = averageBalance * 24;
    let turnoverBasedAmount = annualTurnover * 0.15;
    let profitBasedAmount = annualProfit * 4;
    
    // Apply weights based on business type
    const w = weights[businessType];
    eligibilityAmount = Math.round(
      (incomeBasedAmount * w.income) +
      (balanceBasedAmount * w.balance) +
      (turnoverBasedAmount * w.turnover) +
      (profitBasedAmount * w.profit)
    );
    
    // Calculate range (80% to 120% of the calculated amount)
    eligibilityRange = {
      min: Math.round(eligibilityAmount * 0.8),
      max: Math.round(eligibilityAmount * 1.2)
    };
  }
  
  function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }
</script>

{#if visible}
  <div class="py-12 bg-[var(--landing-bg)] px-4 lg:px-16" in:fade={{ duration: 500 }}>
    <h2 class="typography-h2 text-center mb-8 text-[var(--form-text)]">Business Loan Eligibility Calculator</h2>
    <p class="typography-body-lg text-center max-w-3xl mx-auto mb-12 text-[var(--form-text-secondary)]">
      Estimate how much business loan you might qualify for based on your financial details.
    </p>
    
    <div class="max-w-4xl mx-auto bg-[var(--landing-bg-card)] border border-[var(--form-border)] rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 md:p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block typography-label text-[var(--form-text-secondary)] mb-2" for="business-type">
              Business Type
            </label>
            <select
              id="business-type"
              bind:value={businessType}
              onchange={calculateEligibility}
              class="w-full typography-input px-3 py-2 border border-[var(--form-border)] rounded-xl shadow-sm bg-[var(--landing-bg)] text-[var(--form-text)] focus:outline-none focus:ring-primary focus:border-[var(--form-border)]"
            >
              <option value="retail">Retail Business</option>
              <option value="manufacturing">Manufacturing Business</option>
              <option value="service">Service Business</option>
            </select>
          </div>
          
          <div>
            <label class="block typography-label text-[var(--form-text-secondary)] mb-2" for="monthly-income">
              Monthly Cash Income (₹)
            </label>
            <input
              id="monthly-income"
              type="number"
              bind:value={monthlyIncome}
              oninput={calculateEligibility}
              min="10000"
              step="10000"
              class="w-full typography-input px-3 py-2 border border-[var(--form-border)] rounded-xl shadow-sm bg-[var(--landing-bg)] text-[var(--form-text)] focus:outline-none focus:ring-primary focus:border-[var(--form-border)]"
            />
          </div>
          
          <div>
            <label class="block typography-label text-[var(--form-text-secondary)] mb-2" for="average-balance">
              Average Monthly Balance (₹)
            </label>
            <input
              id="average-balance"
              type="number"
              bind:value={averageBalance}
              oninput={calculateEligibility}
              min="5000"
              step="5000"
              class="w-full typography-input px-3 py-2 border border-[var(--form-border)] rounded-xl shadow-sm bg-[var(--landing-bg)] text-[var(--form-text)] focus:outline-none focus:ring-primary focus:border-[var(--form-border)]"
            />
          </div>
          
          <div>
            <label class="block typography-label text-[var(--form-text-secondary)] mb-2" for="annual-turnover">
              Annual GST Turnover (₹)
            </label>
            <input
              id="annual-turnover"
              type="number"
              bind:value={annualTurnover}
              oninput={calculateEligibility}
              min="100000"
              step="100000"
              class="w-full typography-input px-3 py-2 border border-[var(--form-border)] rounded-xl shadow-sm bg-[var(--landing-bg)] text-[var(--form-text)] focus:outline-none focus:ring-primary focus:border-[var(--form-border)]"
            />
          </div>
          
          <div>
            <label class="block typography-label text-[var(--form-text-secondary)] mb-2" for="annual-profit">
              Annual Net Profit (₹)
            </label>
            <input
              id="annual-profit"
              type="number"
              bind:value={annualProfit}
              oninput={calculateEligibility}
              min="50000"
              step="50000"
              class="w-full typography-input px-3 py-2 border border-[var(--form-border)] rounded-xl shadow-sm bg-[var(--landing-bg)] text-[var(--form-text)] focus:outline-none focus:ring-primary focus:border-[var(--form-border)]"
            />
          </div>
        </div>
        
        <div class="mt-8 p-6 bg-[var(--landing-bg)] border border-[var(--form-border)] rounded-xl">
          <h3 class="typography-h3 text-[var(--form-text)] mb-4">Estimated Loan Eligibility</h3>
          <div class="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <p class="typography-body-sm text-[var(--form-text-secondary)] mb-1">Estimated Range</p>
              <p class="typography-h1 text-primary">
                {formatCurrency(eligibilityRange.min)} - {formatCurrency(eligibilityRange.max)}
              </p>
            </div>
            <div class="mt-4 md:mt-0">
              <a href="/get-started/how-can-we-help" class="btn btn-primary typography-button">
                Get Personalized Offers
              </a>
            </div>
          </div>
          <p class="mt-4 typography-body-sm text-[var(--form-text-secondary)]">
            This is an estimate based on the information provided. Actual loan eligibility may vary based on additional factors like credit score, business vintage, and lender policies.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}