<script>
	let {
		contents = {}
	} = $props();



</script>

<div class="flex flex-col gap-4 p-4 bg-white max-w-[40rem] relative shadow-md">
  <div
    class="p-2 bg-white absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"
  >
    <div
      class="rounded-full bg-gray-200 flex justify-center items-center mx-auto w-[5rem] h-[5rem]"
    >
      <img
        src={contents.profileImg}
        alt=""
        class="w-[5rem] h-[5rem] object-cover rounded-full"
      />
    </div>
  </div>

  <div class="flex flex-col gap-2 justify-center text-center pt-[2rem]">
    <h2 class="font-FourthHead">{contents.userName}</h2>
    {#if contents.stars}
      <div class="flex justify-center gap-1 items-center">
        {#each contents.stars as star}
          <img src={star.ratingIcon} alt="" class={star.ratingStyle} />
        {/each}
      </div>
    {/if}
    <p>
      {contents.para}
    </p>
  </div>
</div>
