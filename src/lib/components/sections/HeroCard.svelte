<!-- src/lib/components/website/HeroCard.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import LoanCard from './LoanCard.svelte';
  import SecondCardTest from './SecondCardTest.svelte';
  import AdvanceCalculator from '../features/calculators/AdvanceCalculator.svelte';

  const baseCards = [
    { component: LoanCard },
    { component: SecondCardTest },
    { component: AdvanceCalculator },
  ];

  // Duplicate to simulate infinite seamless scrolling
  const REPEAT_COUNT = 5;
  const allCards = Array(REPEAT_COUNT).fill(baseCards).flat();

  let currentIndex = $state(0);
  let interval: ReturnType<typeof setInterval>;
  let progress = $state(0);
  const delay = 4000;
  const progressStep = 100 / (delay / 100);
  const transitionDuration = 500;

  let track: HTMLElement;
  let transitioning = $state(false);

  function nextSlide() {
    if (transitioning) return;
    transitioning = true;

    currentIndex += 1;
    track.style.transition = `transform ${transitionDuration}ms ease-out`;
    updateTransform();
    resetProgress();

    setTimeout(() => {
      if (currentIndex >= allCards.length - baseCards.length) {
        track.style.transition = "none";
        currentIndex = currentIndex % baseCards.length;
        updateTransform();
      }
      transitioning = false;
    }, transitionDuration);
  }

  function updateTransform() {
    if (track) {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
  }

  function resetProgress() {
    progress = 0;
  }

  function startAutoScroll() {
    stopAutoScroll();
    interval = setInterval(() => {
      progress += progressStep;
      if (progress >= 100) {
        nextSlide();
      }
    }, 100);
  }

  function stopAutoScroll() {
    clearInterval(interval);
  }

  function handleMouseEnter() { stopAutoScroll(); }
  function handleMouseLeave() { resetProgress(); startAutoScroll(); }

  onMount(() => {
    startAutoScroll();
    return stopAutoScroll;
  });

  onDestroy(() => { stopAutoScroll(); });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<section
  class="flex flex-col items-center gap-4 w-full"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <div class="relative overflow-hidden w-full">
    <!-- Progress bar -->
    <div class="w-full h-1 bg-gray-200">
      <div class="h-full bg-btnBg transition-all duration-100 ease-linear" style="width: {progress}%" />
    </div>
    <div class="flex w-full mt-4" bind:this={track} style="transform: translateX(0);">
      {#each allCards as card}
        <div class="w-full flex-shrink-0">
          <svelte:component this={card.component} />
        </div>
      {/each}
    </div>
  </div>
</section>
