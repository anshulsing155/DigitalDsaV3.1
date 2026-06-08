<script>
	let {
		contents = [],
		supportHeading = "",
		gridCol = 3
	} = $props();


  import Button from "./Button.svelte";




</script>

<section class=" flex flex-col gap-[2rem] lg:pt-[4rem] lg:pb-[8rem]">
  {#if supportHeading}
    <p
      class="md:text-start font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
    >
      {supportHeading}
    </p>
  {/if}

  <div class="grid md:grid-cols-2 md:gap-[2rem] lg:grid-cols-{gridCol}">
    {#each contents as content}
      <div
        class="col-span-1 flex flex-col gap-[1rem] border-b md:border-b-0 py-[1rem]"
      >
        {#if content.title}
          <p class="font-ThirdHead text-minSubHead md:w-3/4">{content.title}</p>
        {/if}

        {#if content.lists}
          <ul class="font-Paragraph text-subParaFont flex flex-col gap-4">
            {#each content.lists as list}
              <li>{@html list.name}</li>
            {/each}
          </ul>
        {/if}

        {#if content.links}
          <ul class="grid list-disc gap-2 pl-5 marker:text-black">
            {#each content.links as link}
              <li
                class="font-Paragraph text-minParaFont"
                class:text-linkColor={link.url !== ""}
                class:text-deActiveLinkColor={!link.url}
              >
                <a
                  href={link.url}
                  class="underline underline-offset-4 hover:no-underline"
                  >{link.name}</a
                >
              </li>
            {/each}
          </ul>
        {/if}
        <div>
          <slot />
        </div>
        {#if content.btn}
          <Button
            btnBorder="black"
            btnName={content.btn}
            link={content.btnLink}
          />
        {/if}
      </div>
    {/each}
  </div>
</section>
