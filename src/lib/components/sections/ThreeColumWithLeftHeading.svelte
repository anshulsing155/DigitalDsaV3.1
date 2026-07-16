<script>
  import Anchor from '../ui/Anchor.svelte';
  import Button from '../ui/Button.svelte';

  export let contents = {};
  export let paddingX = 4;
  // export let onClick = () => {};
</script>

<section
  class="lg:border-b border-borderColor py-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
>
  <div class="grid grid-cols-3 gap-[2rem] px-[0.5rem] lg:px-[{paddingX}rem]">
    <!-- left-heading  -->
    <div class="col-span-3 lg:col-span-1 flex flex-col gap-4">
      {#if contents.heading}
        <p class="font-ThirdHead text-sectionHeading">
          {@html contents.heading}
        </p>
      {/if}

      {#if contents.para}
        <p class="font-Paragraph text-subPara">
          {@html contents.para}
        </p>
      {/if}
    </div>

    {#if contents.cardData}
      <div class="col-span-3 grid grid-cols-2 gap-[4rem] lg:col-span-2">
        {#each contents.cardData as card}
          <div
            class={`col-span-2 grid gap-[4rem] md:col-span-1 pb-[2rem] md:pb-0 border-b md:border-b-0 border-borderColor `}
          >
            <!-- card-heading and para  -->
            <div class="flex flex-col gap-4">
              {#if card.title}
                <p class="font-FourthHead text-cardHeading">
                  {@html card.title}
                </p>
              {/if}
              {#if card.para}
                <p class="font-SubPara text-subPara">
                  {@html card.para}
                </p>
              {/if}
              <!-- button  -->
              {#if card.btnName}
                <div class="w-full md:w-auto">
                  <Button
                    btnName={card.btnName}
                    link={card.btnLink}
                    btnColor={card.btnColor}
                    btnBorder={card.btnBorder}
                    onClick={card.btnClick}
                  />
                </div>
              {/if}
              <!-- link  -->
              {#if card.linkName}
                <Anchor link={card.url} linkName={card.linkName} />
              {/if}

              {#if card.links}
                <div class="flex flex-col gap-2">
                  {#each card.links as link}
                    <ul class="grid list-disc pl-5 marker:text-black">
                      <li>
                        <Anchor
                          link={link.secUrl}
                          linkName={link.secLinkName}
                        />
                      </li>
                    </ul>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
