<script>
  import { fade } from "svelte/transition";
  import { feedbackYes } from "$lib/stores/stores";
  import { onMount } from "svelte";
  let feedback = "";
  let isMobile = false;

onMount(() => {
  const checkScreenSize = () => {
    isMobile = window.innerWidth <= 768; // Adjust breakpoint as needed
  };

  checkScreenSize(); // Initial check
  window.addEventListener("resize", checkScreenSize);

  return () => window.removeEventListener("resize", checkScreenSize);
});
</script>

<section class="py-[3rem] px-[1rem] lg:px-[4rem]">
  <div class="grid lg:grid-cols-4 justify-between items-center md:w-4/6 gap-4">
    <p class="col-span-2 font-Paragraph text-minParaFont md:text-subParaFont">
      Was the information on this page useful?
    </p>
    <div class="col-span-2 flex flex-col sm:flex-row gap-4">
      <button
        onclick={() => (feedback = "Yes")}
        class:bg-[#ffcc00]={feedback === "Yes"}
        class="w-full rounded-full border border-[#4F4C4D] px-[3rem] py-3 font-Paragraph text-minParaFont md:text-subParaFont hover:opacity-9 sm:w-auto flex gap-2 items-center justify-center"
      >
        <img src="/icons/like.svg" alt="like-icon" class="h-4" />
        <p class="font-Paragraph text-minParaFont md:text-subParaFont">Yes</p>
      </button>
      <button
        onclick={() => (feedback = "No")}
        class:bg-[#ffcc00]={feedback === "No"}
        class="text-center w-full rounded-full border border-[#4F4C4D] px-[3rem] py-3 font-Paragraph text-minParaFont md:text-subParaFont hover:opacity-90 sm:w-auto flex gap-2 items-center justify-center"
      >
        <img src="/icons/dislike.svg" alt="dislike-icon" class="h-4" />
        <p class="font-Paragraph text-minParaFont md:text-subParaFont">No</p>
      </button>
    </div>
  </div>
  {#if feedback == "No"}
    <p in:fade class="mt-[2rem] font-SubPara text-minParaFont md:text-subParaFont">
      <span class="font-FourthHead text-minParaFont md:text-subParaFont"> Thanks for your feedback. </span>
      <br /> Have a suggestion? Please
      <a
        href="/complaint-compliment#feedback"
        onclick={() => {
          $feedbackYes = 2;}}
        class="text-linkColor underline underline-offset-4">help us improve.</a
      >
    </p>
  {:else if feedback == "Yes"}
    <p in:fade class="mt-[2rem] font-SubPara text-minParaFont md:text-subParaFont">
      <span class="font-FourthHead text-minParaFont md:text-subParaFont">That's really great.</span>
      <br />
      Share your experience with us and
      <a
        href="/complaint-compliment#feedback"
        class="text-linkColor underline underline-offset-4"
        onclick={() => {
          $feedbackYes = 5;}}
      >
        we'll proudly feature your testimonial
      </a>on our web app.
    </p>
  {/if}
</section>
