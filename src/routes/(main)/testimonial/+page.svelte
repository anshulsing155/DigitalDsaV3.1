<script>
  import CheckCard2 from "$lib/components/website/CheckCard2.svelte";
  import CheckCard5 from "$lib/components/website/CheckCard5.svelte";
  import Testimonial from "$lib/components/website/Testimonial.svelte";
</script>

<section>
  <Testimonial />
  <!-- <CheckCard2
    contents={{
      userName: "Sameer Srivastava",
      profileImg: "/testimonialTest.png",
      profileName: "Home loan",
      para: `I was nervous about getting my first home loan, but Nishant Bajpai made the process smooth and stress-free. He explained everything clearly, found me the best rates, and kept me updated at every step and from start to finish, Nishant Bajpai went above and beyond. He was always available, answered all my concerns, and made sure I got the best possible loan terms. I will definitely recommend them to friends and family!`,
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
  /> -->
  <CheckCard5
    contents={{
      userName: "Sameer Srivastava",
      profileImg: "/testimonialImage/sameer.jpg",
      para: `I was nervous about getting my first home loan, but Nishant Bajpai made the process smooth and stress-free. He explained everything clearly, found me the best rates, and kept me updated at every step and from start to finish, Nishant Bajpai went above and beyond. He was always available, answered all my concerns, and made sure I got the best possible loan terms. I will definitely recommend them to friends and family!`,
      profileName: `Home loan`,
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
</section>
