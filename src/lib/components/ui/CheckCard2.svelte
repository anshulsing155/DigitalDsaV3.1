<script>
	let {
		contents = {}
	} = $props();


;
</script>

<div class="flex flex-col gap-4 p-4 bg-[var(--landing-bg-card)] text-[var(--form-text)] max-w-[20rem] shadow-md h-full">
  <div
    class="rounded-full bg-gray-200 flex justify-center items-center mx-auto w-[5rem] h-[5rem] relative overflow-hidden"
  >
    <img
      src={contents.profileImg}
      alt=""
      class="w-[5rem] h-[5rem] object-cover rounded-full"
    />
  </div>

  <div class="flex flex-col gap-4 justify-center text-center">
    {#if contents.stars}
      <div class="flex justify-center gap-2 items-center">
        {#each contents.stars as star}
          <img src={star.ratingIcon} alt="" class={star.ratingStyle} />
        {/each}
      </div>
    {/if}
    <p>
      {contents.para}
    </p>
    <div class="flex flex-col text-end">
      <h2 class="font-semibold">{contents.userName}</h2>
      <p class="typography-body-sm text-subPara">{contents.profileName}</p>
    </div>
  </div>
</div>
