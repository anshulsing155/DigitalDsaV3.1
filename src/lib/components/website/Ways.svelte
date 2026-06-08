<script>
	let {
		ways = {}
	} = $props();


  import Button from "./Button.svelte";
;
</script>

<section
  class="flex flex-col items-center justify-center gap-[2rem] border-y border-borderColor py-[4rem]"
>
  {#if ways.heading}
    <p
      class="text-center font-ThirdHead text-minSubHead md:text-start md:text-miniHeadFont lg:text-minHeadFont"
    >
      {ways.heading}
    </p>
  {/if}
  <div class="flex flex-col md:flex-row gap-[2rem] item-center justify-center">
    {#if ways.para}
      <p class="font-Paragraph text-subParaFont my-auto md:w-8/12 text-center">
        {ways.para}
      </p>
    {/if}

    <Button
      btnName={ways.btnName}
      btnBorder={ways.btnBorder}
      btnColor={ways.btnColor}
      link={ways.btnLink}
    />
  </div>
</section>
