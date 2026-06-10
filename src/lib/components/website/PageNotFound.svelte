<script>
	let {
		errorMessage = "Requested page doesn't exist. ",
		imageSrc = "/errors/404.svg"
	} = $props();




  import { page } from "$app/state";
  // console.log(page.status, "khkdgfhy");
</script>

<div class="flex flex-col items-center justify-center h-screen">
  <div class="relative w-[80svw] xs:w-[60svw] md:w-[50svw] 2xl:w-[40svw]">
    <img src="/icons/Error404.svg" alt="Error-icon" class="w-full" />

    <div
      class="absolute top-[11%] left-1/2 transform -translate-x-1/2 -translate-y-1/2"
    >
      {#if page.status == 200}
        <p
          class="text-center font-FirstHead text-[6rem] text-white drop-shadow-[4rem]"
          style="text-shadow: 4px 7px 4px rgba(0, 0, 0, 0.4);"
        >
          404
        </p>
      {:else}
        <p
          class="text-center font-FirstHead text-[6rem] text-white drop-shadow-[4rem]"
          style="text-shadow: 4px 7px 4px rgba(0, 0, 0, 0.4);"
        >
          {page.status}
        </p>
      {/if}
    </div>
  </div>

  <p class="font-semibold typography-h3 sm:text-subHeadFont">
    {errorMessage}
  </p>
</div>
