<script>
	let {
		contents = {}
	} = $props();


;
</script>

<div class="grid grid-cols-2 bg-white max-w-[60rem] relative shadow-md">
  <div class="bg-gray-100 p-[3rem]">
    <div
      class="flex flex-col gap-[2rem] col-span-1 justify-center items-center h-full text-center"
    >
      <p>
        {contents.para}
      </p>
    </div>
  </div>

  <div
    class="col-span-1 bg-white flex flex-col justify-center gap-4 items-center mx-auto"
  >
    <div class="w-[8rem] h-[8rem] rounded-full bg-gray-200">
      <img
        src={contents.profileImg}
        alt=""
        class="object-cover object-center w-[8rem] h-[8rem] rounded-full"
      />
    </div>
   
    <div class="flex flex-col justify-center items-center">
      {#if contents.stars}
      <div class="flex justify-center gap-2 items-center">
        {#each contents.stars as star}
          <img src={star.ratingIcon} alt="" class={star.ratingStyle} />
        {/each}
      </div>
    {/if}
      <h2 class="font-FourthHead">{contents.userName}</h2>
      <p class="font-SubPara text-subPara">{contents.profileName}</p>
    </div>
  </div>
</div>
