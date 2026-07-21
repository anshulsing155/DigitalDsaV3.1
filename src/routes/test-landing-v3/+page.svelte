<!-- src/routes/test-landing-v3/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  // Section Component Imports
  import Header from '$lib/landing-v3/components/Header.svelte';
  import Hero from '$lib/landing-v3/components/Hero.svelte';
  import FeatureGrid from '$lib/landing-v3/components/FeatureGrid.svelte';
  import MakeItYourOwn from '$lib/landing-v3/components/MakeItYourOwn.svelte';
  import LoanProducts from '$lib/landing-v3/components/LoanProducts.svelte';
  import ModernStack from '$lib/landing-v3/components/ModernStack.svelte';
  import LaunchCTA from '$lib/landing-v3/components/LaunchCTA.svelte';
  import ReadLatest from '$lib/landing-v3/components/ReadLatest.svelte';
  import Marquee from '$lib/landing-v3/components/Marquee.svelte';
  import Footer from '$lib/landing-v3/components/Footer.svelte';

  let progressBarEl = $state<HTMLElement | null>(null);

  $effect(() => {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);

    // Scroll progress bar indicator tween
    if (progressBarEl) {
      const progressTween = gsap.fromTo(progressBarEl, 
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.3
          }
        }
      );

      return () => {
        progressTween.kill();
        ScrollTrigger.getAll().forEach(t => t.kill());
      };
    }
  });
</script>

<svelte:head>
  <title>DigitalDSA | Flagship B2B Loan Sourcing Infrastructure</title>
  <meta name="description" content="Digitize and automate loan sourcing channels. Connect with top lenders, calculate eligibility instantly, and clear payouts automatically." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>


<main class="w-full min-h-screen bg-[#FAF9F5] text-[#111111] overflow-x-hidden relative selection:bg-[#84CC16]/25 selection:text-black">
  
  <!-- Scroll Progress Indicator -->
  <div 
    bind:this={progressBarEl} 
    class="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#84CC16] via-emerald-400 to-[#84CC16] z-[100] origin-left pointer-events-none"
  ></div>

  <!-- Page Layout Components -->
  <Header />
  
  <Hero />
  
  <FeatureGrid />
  
  <MakeItYourOwn />
  
  <LoanProducts />
  
  <ModernStack />
  
  <LaunchCTA />
  
  <ReadLatest />
  
  <Marquee />
  
  <Footer />

</main>
