<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import SelectNavigator from '$lib/components/sections/SelectNavigator.svelte';
	import { calculatorsList } from '$lib/data/calculatorList';
	import { browser } from '$app/environment';

	let showCalculator = $state(false);
	let selectedCal = $state('');

	function checkScreenWidth() {
		showCalculator = window.innerWidth >= 1024;
	}

	$effect(() => {
		if (browser) {
			if (!selectedCal) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = 'auto';
			}
		}
	});

	onMount(() => {
		checkScreenWidth(); // Check on mount

		window.addEventListener('resize', checkScreenWidth);
		return () => window.removeEventListener('resize', checkScreenWidth);
	});
</script>

<section class="bg-white h-screen">
	<div>
		{#if !selectedCal}
			<div
				id="calCover"
				transition:slide={{ duration: 400 }}
				class="md:hidden bg-white flex flex-col pt-[8rem] h-full fixed top-[3.5rem] left-0 w-full z-30"
			>
				<SelectNavigator
					innerPlaceHolder="Select your calculators"
					bind:selectedValue={selectedCal}
					options={calculatorsList}
					icon="/icons/badge.svg"
					iconBg="bg-black"
				/>
			</div>
		{/if}
	</div>
	<div>
		{#if selectedCal}
			<div class="md:hidden bg-white flex flex-col left-0 w-full z-30 pt-1">
				<SelectNavigator
					innerPlaceHolder="Select your calculators"
					bind:selectedValue={selectedCal}
					options={calculatorsList}
					icon="/icons/badge.svg"
					iconBg="bg-black"
				/>
			</div>
		{/if}
	</div>
</section>
