<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  // Define interface for type safety
  interface Bank {
    name: string;
    logo: string;
    minTurnover: string;
    minBusinessAge: string;
    maxLoanAmount: string;
    interestRate: string;
    processingFee: string;
    uniqueFeature: string;
  }

  let visible = $state(false);
  let sortKey = $state<keyof Bank | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');

  // Bank data
  const banks: Bank[] = [
    {
      name: 'HDFC Bank',
      logo: '/bankList/HDFC-Bank.svg',
      minTurnover: '₹40 Lakhs',
      minBusinessAge: '3 years',
      maxLoanAmount: 'Up to ₹50 Lakhs',
      interestRate: '14% - 19%',
      processingFee: '1.5% - 2%',
      uniqueFeature: 'Overdraft facility available with business current account',
    },
    {
      name: 'ICICI Bank',
      logo: '/bankList/ICICI-Bank.svg',
      minTurnover: '₹30 Lakhs',
      minBusinessAge: '2 years',
      maxLoanAmount: 'Up to ₹40 Lakhs',
      interestRate: '15% - 18%',
      processingFee: '1% - 2%',
      uniqueFeature: 'Pre-approved offers for existing customers',
    },
    {
      name: 'SBI',
      logo: '/bankList/sbi-logo.svg',
      minTurnover: '₹20 Lakhs',
      minBusinessAge: '2 years',
      maxLoanAmount: 'Up to ₹25 Lakhs',
      interestRate: '11% - 16%',
      processingFee: '0.5% - 1%',
      uniqueFeature: 'Special schemes for MSME sector',
    },
    {
      name: 'Axis Bank',
      logo: '/bankList/Axis-Bank.svg',
      minTurnover: '₹35 Lakhs',
      minBusinessAge: '3 years',
      maxLoanAmount: 'Up to ₹30 Lakhs',
      interestRate: '14% - 17%',
      processingFee: '1% - 1.5%',
      uniqueFeature: 'Digital approval process with minimal documentation',
    },
  ];

  // Derived sorting
  let sortedBanks = $derived.by(() => {
    if (!sortKey) return [...banks];
    return [...banks].sort((a, b) => {
      const valueA = a[sortKey!];
      const valueB = b[sortKey!];
      if (sortDirection === 'asc') {
        return valueA.localeCompare(valueB, undefined, { numeric: true });
      }
      return valueB.localeCompare(valueA, undefined, { numeric: true });
    });
  });

  // Sorting function
  function sortTable(key: keyof Bank) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }

  onMount(() => {
    visible = true;
    return () => {
      visible = false;
    };
  });
</script>

<section class="py-16 " aria-labelledby="bank-comparison">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <h2 id="bank-comparison" class="text-4xl sm:text-5xl font-extrabold text-center text-black dark:text-white mb-6 tracking-tight">
      Compare Banks for Business Loans
    </h2>
    <p class="text-lg sm:text-xl text-center text-[var(--form-text-secondary)] max-w-4xl mx-auto mb-12 leading-relaxed">
      Explore varying eligibility criteria and features from top banks to find the best loan option for your business.
    </p>

    {#if visible}
      <div class="overflow-x-auto" in:fade={{ duration: 400 }}>
        <table class="min-w-full bg-[var(--landing-bg-card)] rounded-xl shadow-lg overflow-hidden">
          <thead class="bg-darkColor text-white">
            <tr>
              {#each ['name', 'minTurnover', 'minBusinessAge', 'maxLoanAmount', 'interestRate', 'processingFee', 'uniqueFeature'] as key}
                <th
                  class="py-4 px-6 text-left text-sm font-semibold cursor-pointer hover:bg-spanColor transition-colors"
                  onclick={() => sortTable(key as keyof Bank)}
                  role="columnheader"
                  aria-sort={sortKey === key as keyof Bank ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div class="flex items-center space-x-2">
                    <span>
                      {key === 'name' ? 'Bank' : key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {#if sortKey === key as keyof Bank}
                      <span class="text-yellow-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    {/if}
                  </div>
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each sortedBanks as bank, i}
              <tr
                class="{i % 2 === 0 ? 'bg-[var(--landing-bg-card)]' : 'bg-[var(--landing-bg)]'} hover:bg-[var(--form-border)] transition-colors duration-200"
                role="row"
              >
                <td class="py-4 px-6">
                  <div class="flex space-x-3">
                    <img
                      src={bank.logo}
                      alt={`${bank.name} logo`}
                      class="w-20 h-10  object-contain"
                      loading="lazy"
                    />
                    <!-- <span class="font-medium text-gray-900">{bank.name}</span> -->
                  </div>
                </td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.minTurnover}</td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.minBusinessAge}</td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.maxLoanAmount}</td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.interestRate}</td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.processingFee}</td>
                <td class="py-4 px-6 text-[var(--form-text-secondary)]">{bank.uniqueFeature}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-8 text-center">
        <p class="text-sm text-[var(--form-text-secondary)] italic">
          Note: Information is indicative and may vary based on individual profiles and bank policies. Always verify with the bank.
        </p>
      </div>
    {/if}
  </div>
</section>

<style>
  :global(.container) {
    scroll-margin-top: 80px; /* Adjust for fixed header */
  }
</style>