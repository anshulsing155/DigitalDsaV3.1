<script>
	let {
		contents = {}
	} = $props();


  import Button from "./Button.svelte";

;
</script>

<section
  class="py-[3rem] w-full border-b border-[var(--form-border)] px-[1.5rem]  lg:px-[4rem]"
>
  {#if !contents.para}
    <div
      class="flex flex-col lg:flex-row justify-center items-center gap-[2rem] md:gap-[4rem] w-full lg:w-auto"
    >
      <h2
        class="typography-h2 text-black dark:text-white text-center"
      >
        {@html contents.heading}
      </h2>
      <div class="w-full md:w-auto px-[2rem]">
        <Button
          btnName={contents.btnName}
          link={contents.btnLink}
          btnColor={contents.btnColor}
          btnBorder={contents.btnBorder}
          onClick={contents.btnClick}
        />
      </div>
    </div>
  {:else if contents.para}
    <div
      class="flex flex-col justify-center items-center gap-[2rem] md:gap-[4rem] w-full lg:w-auto"
    >
      <h2
        class="typography-h2 text-black dark:text-white text-center"
      >
        {@html contents.heading}
      </h2>
      <div class="grid lg:grid-cols-12 gap-[3rem]">
        <div class="lg:col-span-8">
          <p
            class="typography-body-md text-[var(--form-text-secondary)] text-center lg:w-8/12 lg:justify-self-end"
          >
            {@html contents.para}
          </p>
        </div>
        <div
          class="w-full md:w-auto lg:justify-self-start justify-self-center lg:col-span-4"
        >
          <Button
            btnName={contents.btnName}
            link={contents.btnLink}
            btnColor={contents.btnColor}
            btnBorder={contents.btnBorder}
            onClick={contents.btnClick}
          />
        </div>
      </div>
    </div>
  {/if}
</section>
