<script>
	import { goto } from '$app/navigation';
	import SecondPageLayout from '$lib/components/layout/SecondPageLayout.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { blogs } from '$lib/data/allBlogs';
	import Loader from '$lib/components/layout/Loader.svelte';

	let isLoading = $state(false);
	let handleImageLoad = $state(false);

	import { onMount } from 'svelte';
	onMount(() => {
		setTimeout(() => {
			handleImageLoad = true;
		}, 800);
	});

	const budgetBlogs = $derived(
		blogs.filter(
			(blog) => blog.categoryType && blog.categoryType.toLowerCase() === 'budget'
		)
	);

	async function handleNavigate(path) {
		if (!path) return;
		isLoading = true;
		try {
			window.location.href = path;
		} finally {
			isLoading = false;
		}
	}
</script>

<Seo
	type="WebPage"
	title="Budget & Money Management — Knowledge Hub | DigitalDSA"
	description="Expert budgeting tips, money management strategies, and financial planning articles to help you make smarter financial decisions."
	keywords="budget, money management, financial planning, budgeting tips, personal finance"
/>

{#if isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--landing-bg)]">
		<Loader />
	</div>
{/if}

<SecondPageLayout
	pageData={{
		coverImage: '/images/budget-cover.jpg',
		coverAlt: 'Budget and money management knowledge',
		classStyle: 'object-cover xl:h-[90svh] 3xl:max-h-[60svh]',
		heading: 'Budget & Money Management',
		sourceName: 'DigitalDSA Knowledge',
		originalSource: ''
	}}
>
	<div
		class="grid gap-[1rem] px-[0.5rem] py-[4rem] sm:grid-cols-2 lg:grid-cols-3 lg:px-[4rem] lg:py-0 lg:pt-[4rem] lg:pb-[8rem]"
	>
		{#each budgetBlogs as blog}
			<a
				href={blog.path}
				onclick={(e) => {
					e.preventDefault();
					handleNavigate(blog.path);
				}}
				class="group cursor-pointer overflow-hidden rounded border border-[var(--form-border)] pb-2"
			>
				<div class="relative z-30">
					{#if !handleImageLoad}
						<div
							class="h-[15rem] max-h-[7rem] w-full animate-pulse bg-[var(--landing-bg-card)] sm:max-h-[10rem]"
						></div>
					{:else}
						<img
							src={blog.coverImage}
							alt={blog.coverAlt}
							class="z-30 aspect-square h-[15rem] max-h-[7rem] w-full overflow-hidden object-cover object-top transition-transform duration-300 group-hover:scale-105 sm:max-h-[10rem]"
						/>
					{/if}
					<span class="typography-input absolute right-0 bottom-0 bg-primary p-1 text-white">
						{blog.categoryType}
					</span>
				</div>
				<div class="flex flex-col gap-1 p-2 text-[var(--form-text)] sm:gap-2">
					<h3
						class="typography-body-md line-clamp-1 !font-semibold text-[var(--form-text)] sm:line-clamp-2"
					>
						{blog.title}
					</h3>
					<p
						class="typography-body-sm line-clamp-3 text-[var(--landing-text-secondary)] sm:line-clamp-4"
					>
						{blog.description}
					</p>
					<span
						class="{blog.path
							? 'text-[var(--ddsa-info-text)]'
							: 'text-[var(--ddsa-error-text)]'} typography-body-sm underline underline-offset-4 group-hover:no-underline group-hover:opacity-90"
					>
						Know more
					</span>
				</div>
			</a>
		{/each}

		{#if budgetBlogs.length === 0}
			<div class="typography-body-lg col-span-full mt-10 text-center text-[var(--form-text-secondary)]">
				No budget articles found. Check back soon!
			</div>
		{/if}
	</div>
</SecondPageLayout>
