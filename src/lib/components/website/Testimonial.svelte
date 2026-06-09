<script>
  import CheckCard from "./CheckCard.svelte";
  import CheckCard2 from "./CheckCard2.svelte";
  import CheckCard3 from "./CheckCard3.svelte";
  import CheckCard4 from "./CheckCard4.svelte";
  import CheckCard5 from "./CheckCard5.svelte";
</script>

<section class="flex flex-col gap-2 justify-center items-center">
  <div
    class="flex flex-col gap-[2rem] border p-[4rem] relative overflow-hidden"
  >
    <div class="flex gap-4">
      <div class="flex flex-col gap-4">
        <CheckCard
          contents={{
            userName: "Alok Raj Singh",
            profileImg: "/testimonialTest.png",
            para: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae,
      cupiditate.`,
          }}
        />
        <CheckCard2
          contents={{
            userName: "Alok Raj Singh",
            profileImg: "/testimonialTest.png",
            para: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae,
      cupiditate.`,
            stars: [
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-8",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
            ],
          }}
        />
      </div>

      <div class="flex flex-col gap-4">
        <CheckCard3
          contents={{
            userName: "Alok Raj Singh",
            profileImg: "/testimonialTest.png",
            para: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae,
      cupiditate.`,
            stars: [
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-8",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
              {
                ratingIcon: "/star.png",
                ratingStyle: "h-4",
              },
            ],
          }}
        />
        <CheckCard4
          contents={{
            userName: "Alok Raj Singh",
            profileImg: "/testimonialTest.png",
            para: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae,
      cupiditate.`,
            quotes: ` Try not to become a man of success, but rather try to become a man of
          value.`,
            profileName: `Computer engineer`,
          }}
        />
        <CheckCard5
          contents={{
            userName: "Alok Raj Singh",
            profileImg: "/testimonialTest.png",
            para: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Itaque sunt vitae hic consequatur ipsam repudiandae rerum, asperiores quod velit expedita, nulla, maxime earum ut neque.`,
            profileName: `Computer engineer`,
          }}
        />
      </div>
    </div>

    <div class="flex justify-end gap-4 items-center">
      <button aria-label="Previous"><i class="fa-solid fa-angle-left"></i></button>
      <button aria-label="Next"><i class="fa-solid fa-angle-right"></i></button>
    </div>
  </div>
</section>
