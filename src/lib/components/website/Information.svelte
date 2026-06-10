<script>
  import { fade } from "svelte/transition";
  import { feedbackYes } from "$lib/stores/stores";

  let feedback = "";
</script>

<section class="py-[3rem]">
  <div class="grid lg:grid-cols-4 justify-between items-center md:w-4/6 gap-4">
    <p class="col-span-2 typography-body-md text-text-light">
      Did you find the information on this page helpful?
    </p>
    <div class="col-span-2 flex flex-col sm:flex-row gap-4">
      <button
        onclick={() => (feedback = "Yes")}
        class:bg-[#ffcc00]={feedback === "Yes"}
        class="w-full rounded-full border border-[#4F4C4D] px-[3rem] py-3 typography-body-md text-text-light hover:opacity-9 sm:w-auto flex gap-2 items-center justify-center"
      >
        <img src="/icons/like.svg" alt="like-icon" class="h-4" />
        <p class="typography-body-sm text-text-light">Yes</p>
      </button>
      <button
        onclick={() => (feedback = "No")}
        class:bg-[#ffcc00]={feedback === "No"}
        class="text-center w-full rounded-full border border-[#4F4C4D] px-[3rem] py-3 typography-body-md text-text-light hover:opacity-90 sm:w-auto flex gap-2 items-center justify-center"
      >
        <img src="/icons/dislike.svg" alt="dislike-icon" class="h-4" />
        <p class="typography-body-sm text-text-light">No</p>
      </button>
    </div>
  </div>
  {#if feedback == "No"}
    <p in:fade class="mt-[2rem] typography-body-md">
      <span class="font-semibold">Thank you for your feedback.</span> <br>
      Have any suggestions? Please
      <a href="/complaint-compliment#feedback" onclick={() => {$feedbackYes = 0}}
        class="text-linkColor underline underline-offset-4">
        let us know how we can improve.
      </a>
    </p>
  {:else if feedback == "Yes"}
    <p in:fade class="mt-[2rem] typography-body-md text-text-light">
      <span class="font-semibold typography-body-md">Glad to hear that!</span> <br>
      Share your experience with us, and
      <a href="/complaint-compliment#feedback"
        class="text-linkColor underline underline-offset-4"
        onclick={() => {$feedbackYes = 5}}>
        we might feature your testimonial
      </a> on our web app.
    </p>
  {/if}
</section>
