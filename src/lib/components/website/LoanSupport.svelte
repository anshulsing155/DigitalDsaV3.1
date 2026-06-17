<script>
	let {
		support = {}
	} = $props();




</script>

<section class="grid lg:grid-cols-7 gap-[2rem] lg:gap-4 py-[3rem]" >
    <div class="lg:col-span-3 grid typography-h2 text-text-main">
        {support.title}
    </div>
    <div class="lg:col-span-4 grid gap-[2rem]">
        <p class="typography-body-sm text-[var(--form-text-secondary)]">{support.paraGraph}</p>
        <p class="h-[3rem]">
            <a class={`underline hover:no-underline underline-offset-4 ${support.url ==="" ?"text-dangerColor":"text-linkColor"} typography-body-md text-[var(--form-text-secondary)]`} href={support.url}>{support.link}</a>
        </p>
    </div>
</section>