<script>
  import CheckCard from "./CheckCard.svelte";
  import CheckCard2 from "./CheckCard2.svelte";
  import CheckCard3 from "./CheckCard3.svelte";
  import CheckCard4 from "./CheckCard4.svelte";
  import CheckCard5 from "./CheckCard5.svelte";
  import content from "$lib/data/website/testimonial.json";
</script>

<section class="flex flex-col gap-2 justify-center items-center">
  <div
    class="flex flex-col gap-[2rem] border p-[4rem] relative overflow-hidden"
  >
    <div class="flex gap-4">
      <div class="flex flex-col gap-4">
        <CheckCard
          contents={content.carousel.card1}
        />
        <CheckCard2
          contents={content.carousel.card2}
        />
      </div>

      <div class="flex flex-col gap-4">
        <CheckCard3
          contents={content.carousel.card3}
        />
        <CheckCard4
          contents={content.carousel.card4}
        />
        <CheckCard5
          contents={content.carousel.card5}
        />
      </div>
    </div>

    <div class="flex justify-end gap-4 items-center">
      <button aria-label="Previous"><i class="fa-solid fa-angle-left"></i></button>
      <button aria-label="Next"><i class="fa-solid fa-angle-right"></i></button>
    </div>
  </div>
</section>
