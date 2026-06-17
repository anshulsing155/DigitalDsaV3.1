<script>
	let {
		ways = {}
	} = $props();


  import Button from "./Button.svelte";
;
</script>

<section
  class="flex flex-col items-center justify-center gap-[2rem] border-y border-[var(--form-border)] py-[4rem]"
>
  {#if ways.heading}
    <h2
      class="typography-h2-md text-center text-[var(--form-text)]"
    >
      {ways.heading}
    </h2>
  {/if}
  <div class="flex flex-col md:flex-row gap-[2rem] item-center justify-center">
    {#if ways.para}
      <p class="typography-body-md text-[var(--form-text-secondary)] my-auto md:w-8/12 text-center">
        {ways.para}
      </p>
    {/if}

    <Button
      btnName={ways.btnName}
      btnClass={ways.btnClass}
      btnAnimation={ways.btnAnimation}
      link={ways.btnLink}
    />
  </div>
</section>
