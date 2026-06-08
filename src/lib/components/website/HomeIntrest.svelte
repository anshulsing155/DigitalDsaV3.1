<script>
	let {
		homeInterest,
		btnName,
		btnColor = "",
		btnBorder,
		btnLink
	} = $props();


	import Button from './Button.svelte';
	
	
	
	
	
</script>

<section
	class="grid items-center justify-center gap-[2rem] border-b border-borderColor py-[4rem] md:grid-cols-3"
>
	<p class="text-center font-ThirdHead text-miniHeadFont md:col-span-2">
		{@html homeInterest}
	</p>

	<div>
		<Button btnName={btnName} btnBorder={btnBorder} link={btnLink} btnColor={btnColor} />
	</div>
</section>
