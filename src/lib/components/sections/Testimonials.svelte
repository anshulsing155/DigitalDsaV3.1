<!-- src/lib/components/website/Testimonials.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  const carouselItems = [
    {
      id: 1,
      icon: "/images/coupleWithSister.jpg",
      review: "DigitalDSA Pro transformed how I compare lender policies. I used to spend hours calling banks for rate sheets — now I match client profiles to the best lender in minutes. My login-to-disbursal ratio improved by 40% in the first quarter.",
      name: "Sanjay Singh",
      job: "Senior DSA — Home Loans",
    },
    {
      id: 2,
      icon: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=300&fit=crop",
      review: "The client assessment tools are a game-changer. I pre-qualify clients before bank login, which means fewer rejections and faster processing. My team's approval rate went from 55% to 82% after adopting the platform.",
      name: "Rakesh Gupta",
      job: "Corporate DSA — Multi-Product",
    },
    {
      id: 3,
      icon: "/images/blogImage2.jpg",
      review: "As a Bank RM, I need instant calculations during client meetings. The EMI, eligibility, and balance transfer calculators run in seconds. Clients are impressed, and I close deals on the spot instead of 'getting back to them later'.",
      name: "Priya Sharma",
      job: "Relationship Manager — HDFC Bank",
    },
    {
      id: 4,
      icon: "/images/police-officer-loan.png",
      review: "The part-payment and EMI step-up planners help me show clients exactly how much interest they'll save. It positions me as a trusted advisor, not just a loan pusher. Repeat referrals have doubled since I started using these tools.",
      name: "Saurabh Jain",
      job: "Independent Loan Broker — LAP Specialist",
    },
    {
      id: 5,
      icon: "images/personal-loan-1.jpg",
      review: "DigitalDSA Pro's property risk assessment tool saved one of my clients from a disputed title purchase. That kind of value-add builds lifetime client relationships. The platform pays for itself with a single deal saved.",
      name: "Shashank Kapoor",
      job: "DSA — Secured Loans & LAP",
    },
    {
      id: 6,
      icon: "/images/manishPatel.jpg",
      review: "Data security was my biggest concern as a Corporate DSA handling hundreds of client files. DigitalDSA Pro's bank-grade encryption and compliance infrastructure gave us confidence to onboard our entire team of 25 agents.",
      name: "Amit Khanna",
      job: "Director — Corporate DSA Firm",
    },
  ];

  function preloadImage(url: string) {
    const img = new Image();
    img.src = url;
  }

  function handleHover() {
    const nextIndex = (currentIndex + 1) % carouselItems.length;
    const nextImage = carouselItems[nextIndex]?.icon;
    if (nextImage) preloadImage(nextImage);
  }

  let currentIndex = $state(0);
  let interval: ReturnType<typeof setInterval>;
  let progress = $state(0);
  let animating = $state(false);
  let isPaused = $state(false);
  const delay = 4000;
  const progressStep = 100 / (delay / 100);

  function next() {
    animating = true;
    currentIndex = (currentIndex + 1) % carouselItems.length;
    resetProgress();
  }

  function prev() {
    animating = true;
    currentIndex = (currentIndex - 1 + carouselItems.length) % carouselItems.length;
    resetProgress();
  }

  function startCarousel() {
    stopCarousel();
    interval = setInterval(() => {
      if (!isPaused) {
        progress += progressStep;
        if (progress >= 100) {
          progress = 0;
          next();
        }
      }
    }, 100);
  }

  function stopCarousel() {
    clearInterval(interval);
  }

  function resetProgress() {
    progress = 0;
    setTimeout(() => { animating = false; }, 300);
  }

  function handleMouseEnter() {
    isPaused = true;
    handleHover();
  }

  function handleMouseLeave() {
    isPaused = false;
  }

  onMount(() => { startCarousel(); });
  onDestroy(() => { stopCarousel(); });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="relative overflow-hidden mx-auto"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  ontouchstart={handleMouseEnter}
>
  <div class="carousel-track flex transition-transform duration-300 ease-in-out">
    {#key currentIndex}
      <div class="grid md:grid-cols-2 gap-6 items-center pb-6 md:p-6 min-h-[250px]">
        <!-- svelte-ignore a11y_img_redundant_alt -->
        <div class="lg:max-h-[80vh] h-[30vh] md:h-full">
          <img
            src={carouselItems[currentIndex].icon}
            alt="Reviewer photo"
            class="rounded-xl aspect-[4/3] object-cover object-top w-full h-full"
          />
        </div>

        <div class="flex flex-col gap-4 md:gap-8">
          <div>
            <svg class="h-6 md:h-8 w-6 md:w-8 text-btnBg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          <blockquote class="font-FourthHead text-para text-[var(--landing-text-secondary)] leading-relaxed">
            "{carouselItems[currentIndex].review}"
          </blockquote>
          <div class="flex flex-col justify-start">
            <p class="font-FourthHead text-[var(--landing-text)]">— {carouselItems[currentIndex].name}</p>
            <p class="text-sm text-[var(--landing-text-muted)]">{carouselItems[currentIndex].job}</p>
          </div>
        </div>
      </div>
    {/key}
  </div>

  <!-- Controls -->
  <div class="absolute bottom-4 right-4 flex gap-2">
    <button
      onclick={prev}
      class="px-4 py-2 border rounded font-medium text-sm transition-colors {animating ? 'border-gray-300 opacity-50 cursor-not-allowed' : 'border-btnBg text-btnBg hover:bg-btnBg hover:text-[var(--landing-accent-text)]'}"
      aria-label="Previous"
    >
      <i class="fa-solid fa-angle-left"></i>
    </button>
    <button
      onclick={next}
      class="px-4 py-2 border rounded font-medium text-sm transition-colors {animating ? 'border-gray-300 opacity-50 cursor-not-allowed' : 'border-btnBg text-btnBg hover:bg-btnBg hover:text-[var(--landing-accent-text)]'}"
      aria-label="Next"
    >
      <i class="fa-solid fa-angle-right"></i>
    </button>
  </div>

  <!-- Progress Bar -->
  <div class="absolute bottom-0 left-0 w-full h-1 bg-[var(--landing-glass-border)]">
    <div class="h-full bg-btnBg transition-all duration-100 ease-linear" style="width: {progress}%" />
  </div>
</div>

<style>
  .carousel-track { will-change: transform; }
  button:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
</style>
