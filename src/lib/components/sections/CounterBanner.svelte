<!-- src/lib/components/website/CounterBanner.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { page } from "$app/state";

  let applications = $state(0);
  let cities = $state(0);
  let loan = $state(0);
  let lender = $state(0);
  let counterData = $state<any>(null);

  async function fetchCounters() {
    try {
      let data = page.data.counterData;
      if (data) {
        data = JSON.parse(data)?.[0] || {};
      } else {
        const res = await fetch("/api/updateCounters");
        if (!res.ok) {
          throw new Error("Failed to fetch counters");
        }
        data = await res.json();
      }

      counterData = data;

      // Animate counters in a timeline
      const tl = gsap.timeline();
      tl.to(
        { count: 0 },
        {
          count: counterData.applications || 2300,
          duration: 1,
          ease: "power1.out",
          onUpdate: function () {
            applications = Math.round(this.targets()[0].count);
          },
        }
      )
        .to(
          { count: 0 },
          {
            count: counterData.cities || 80,
            duration: 1,
            ease: "power1.out",
            onUpdate: function () {
              cities = Math.round(this.targets()[0].count);
            },
          },
          "-=0.8"
        )
        .to(
          { count: 0 },
          {
            count: counterData.loan || 675,
            duration: 1,
            ease: "power1.out",
            onUpdate: function () {
              loan = Math.round(this.targets()[0].count);
            },
          },
          "-=0.8"
        )
        .to(
          { count: 0 },
          {
            count: 100,
            duration: 1,
            ease: "power1.out",
            onUpdate: function () {
              lender = Math.round(this.targets()[0].count);
            },
          },
          "-=0.8"
        );
    } catch (err: any) {
      counterData = { applications: 2300, cities: 80, loan: 675, lender: 100 };
      
      // Trigger animation with fallback values
      gsap.to(
        { count: 0 },
        {
          count: counterData.applications,
          duration: 1,
          ease: "power1.out",
          onUpdate: function () {
            applications = Math.round(this.targets()[0].count);
          },
        }
      );
      gsap.to(
        { count: 0 },
        {
          count: counterData.cities,
          duration: 1,
          ease: "power1.out",
          onUpdate: function () {
            cities = Math.round(this.targets()[0].count);
          },
        }
      );
      gsap.to(
        { count: 0 },
        {
          count: counterData.loan,
          duration: 1,
          ease: "power1.out",
          onUpdate: function () {
            loan = Math.round(this.targets()[0].count);
          },
        }
      );
      gsap.to(
        { count: 0 },
        {
          count: counterData.lender,
          duration: 1,
          ease: "power1.out",
          onUpdate: function () {
            lender = Math.round(this.targets()[0].count);
          },
        }
      );
    }
  }

  onMount(() => {
    fetchCounters();
  });
</script>

{#if !counterData}
  <div class="flex justify-start items-start gap-[1rem] md:gap-[3rem] md:w-[80%]">
    <div class="animate-pulse h-6 w-20 bg-gray-300 rounded"></div>
    <div class="animate-pulse h-6 w-20 bg-gray-300 rounded"></div>
    <div class="animate-pulse h-6 w-20 bg-gray-300 rounded"></div>
    <div class="animate-pulse h-6 w-20 bg-gray-300 rounded"></div>
  </div>
{:else}
  <div id="counter-container" class="flex justify-start items-start gap-[1.5rem] md:gap-[3rem] md:w-[80%] text-left">
    <div class="flex flex-col gap-1">
      <p class="font-ThirdHead text-xl md:text-2xl font-bold text-gray-900">
        {applications}<span><sup class="text-black font-semibold">+</sup></span>
      </p>
      <p class="font-SubPara text-xs text-gray-600">Applications</p>
    </div>

    <div class="flex flex-col gap-1">
      <p class="font-ThirdHead text-xl md:text-2xl font-bold text-gray-900">
        {cities}<span><sup class="text-black font-semibold">+</sup></span>
      </p>
      <p class="font-SubPara text-xs text-gray-600">Cities</p>
    </div>

    <div class="flex flex-col gap-1">
      <p class="font-ThirdHead text-xl md:text-2xl font-bold text-gray-900">
        {Math.round(loan)}Cr<span><sup class="text-black font-semibold">+</sup></span>
      </p>
      <p class="font-SubPara text-xs text-gray-600">Disbursed</p>
    </div>

    <div class="flex flex-col gap-1">
      <p class="font-ThirdHead text-xl md:text-2xl font-bold text-gray-900">
        {lender}<span><sup class="text-black font-semibold">+</sup></span>
      </p>
      <p class="font-SubPara text-xs text-gray-600">Lender's</p>
    </div>
  </div>
{/if}
