<!-- src/lib/landing-v3/components/Marquee.svelte -->
<script lang="ts">
  const marqueeText = "Maximize Payouts. Scale Your Network. Grow With DigitalDSA. ";
  const repeatedText = Array(12).fill(marqueeText).join(" ");
</script>

<div class="relative w-full overflow-hidden bg-black py-8 select-none border-y border-zinc-800">
  <div class="marquee-track flex whitespace-nowrap">
    <div class="marquee-content text-xl sm:text-2xl lg:text-3xl font-extrabold uppercase tracking-widest text-[#FAF9F5]">
      {repeatedText}
    </div>
  </div>
</div>

<style>
  .marquee-track {
    display: flex;
    width: max-content;
  }

  .marquee-content {
    animation: scroll-marquee 40s linear infinite;
  }

  @keyframes scroll-marquee {
    0% {
      transform: translate3d(0, 0, 0);
    }
    100% {
      transform: translate3d(-50%, 0, 0);
    }
  }

  /* Support reduced motion settings */
  @media (prefers-reduced-motion: reduce) {
    .marquee-content {
      animation: none;
      white-space: normal;
      text-align: center;
    }
  }
</style>
