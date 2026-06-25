<script lang="ts">
	import Loader from '$lib/components/website/Loader.svelte';

	let { children } = $props();

	let loading = $state(true);

	const MIN_LOADING_TIME = 800;

	$effect(() => {
		const timer = setTimeout(() => {
			loading = false;
		}, MIN_LOADING_TIME);

		return () => clearTimeout(timer);
	});
</script>

<div
	class="bg-mainBg flex min-h-screen flex-col items-center justify-center"
>
	{#if loading}
		<div
			class="flex h-screen w-full items-center justify-center"
			aria-busy="true"
			aria-label="Loading page"
		>
			<Loader />
		</div>
	{:else}
		<main
			class="relative mx-auto flex w-11/12 flex-col items-center justify-center py-8 md:w-10/12 xl:w-8/12 2xl:w-6/12"
		>
			{@render children()}
		</main>
	{/if}
</div>