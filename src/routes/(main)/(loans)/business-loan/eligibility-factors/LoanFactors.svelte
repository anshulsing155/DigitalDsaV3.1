<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  let visible = false;
  
  onMount(() => {
    visible = true;
  });
  
  const factors = [
    {
      icon: "/icons/coinHouse.svg",
      title: "Cash Income",
      description: "Banks assess your daily and monthly cash inflows through bank statements, determining your regular income patterns.",
      importance: "Primary factor for small retailers and service-based businesses without formal accounting."
    },
    {
      icon: "/icons/bank.svg",
      title: "Monthly Average Balance (MAB)",
      description: "Your account's average daily balance over a month shows financial stability and liquidity.",
      importance: "Critical for evaluating cash flow management and working capital efficiency."
    },
    {
      icon: "/icons/document.svg",
      title: "GST Turnover",
      description: "Your GSTR filings demonstrate business volume and formalization level, with banks typically offering 10-20% of annual turnover.",
      importance: "Highly weighted for registered businesses with consistent filing history."
    },
    {
      icon: "/icons/growth.svg",
      title: "Yearly Net Profit",
      description: "Income tax returns and financial statements reveal profitability, with loans typically capped at 3-6 times annual profit.",
      importance: "The gold standard for established businesses with proper financial records."
    }
  ];
</script>

<div class="py-12">
  <h2 class="text-3xl font-bold text-center mb-8">Key Eligibility Factors</h2>
  <p class="text-lg text-center max-w-3xl mx-auto mb-12">
    Banks evaluate these four primary factors when determining your business loan eligibility. Understanding them can significantly improve your chances of approval.
  </p>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
    {#each factors as factor, i}
      {#if visible}
        <div 
          class="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-all duration-300"
          in:fly={{ y: 50, delay: i * 150, duration: 500 }}
        >
          <div class="flex items-start">
           
            <div>
              <h3 class="text-xl font-semibold mb-2">{factor.title}</h3>
              <p class="text-gray-700 mb-3">{factor.description}</p>
              <div class="bg-gray-50 p-3 rounded-md">
                <p class="text-sm font-medium text-gray-800">
                  <span class="text-yellow-600 font-bold">Important:</span> {factor.importance}
                </p>
              </div>
            </div>
            
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>