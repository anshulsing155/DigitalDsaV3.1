<script>
	import { onMount } from 'svelte';
	import Button from '$lib/components/website/Button.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import SecondPageLayout from '$lib/components/website/SecondPageLayout.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import { blogs } from '$lib/data/allBlogs';
	import Loader from '$lib/components/website/Loader.svelte';
	import Seo from '$lib/components/website/Seo.svelte';
	import content from '$lib/data/website/knowledge.json';
	import {
		Trash2,
		SquareCheck,
		Square,
		Funnel,
		Search,
		ChevronLeft,
		ChevronRight,
		X
	} from '$lib/utils/iconRegistry.ts';

	// Blog categories from Code 1 structure
	const blogCategory = [
		'All',
		'Home Loan',
		'Plot Loan',
		'Personal Loan',
		'Business Loan',
		'Professional Loan',
		'LAP',
		'Finance Support',
		'Cyber Security',
		'Retirement Planning',
		'Others'
	];

	// const categoryMap = {
	// 	All: 'All',
	// 	'Home Loan': 'HL',
	// 	'Personal Loan': 'PL',
	// 	'Business Loan': 'BL',
	// 	'Loan Against Property': 'LAP',
	// 	'Balance Transfer': 'BT',
	// 	'Plot Loan': 'Plot',
	// 	'Top-Up Loan': 'Top-Up',
	// 	'Construction Loan': 'CL',
	// 	'Education Loan': 'EL',
	// 	'Vehicle Loan': 'VL'
	// };

	// function getCategoryLabel(category) {
	// 	return categoryMap[category] ?? category;
	// }

	// State variables
	let searchQuery = $state('');
	let selectedCategories = $state([]); // empty array means "All"
	let itemsPerPage = $state(20);
	let currentPage = $state(1);
	let mobileCategoryBar = $state(false);
	let handleImageLoad = $state(false);
	let isLoading = $state(false);
	let selectedCategory = $state('All');

	onMount(() => {
		// Simple image loading delay
		setTimeout(() => {
			handleImageLoad = true;
		}, 1000);
	});

	// category toggle logic
	function toggleCategory(category) {
		if (category === 'All') {
			selectedCategories = [];
		} else {
			selectedCategories = selectedCategories.filter((c) => c !== 'All');
			if (selectedCategories.includes(category)) {
				selectedCategories = selectedCategories.filter((c) => c !== category);
			} else {
				selectedCategories = [...selectedCategories, category];
			}
		}
		currentPage = 1; // Reset to first page when filter changes
	}

	// Count blogs per category
	function countBlogs(category) {
		if (category === 'All') {
			return blogs.length;
		}
		return blogs.filter((blog) => blog.categoryType.toLowerCase() === category.toLowerCase())
			.length;
	}

	// Generate dropdown options for items per page
	function selectDropdownOptions(max) {
		let options = [];
		if (max <= 5) return [max];
		if (max <= 10) return [5, max];
		if (max <= 20) return [5, 10, max];
		return [5, 10, 20, max];
	}

	// filtering logic
	let filteredBlogs = $derived(
		blogs.filter((blog) => {
			const matchesSearch =
				blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				blog.description.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesCategory =
				selectedCategories.length === 0 ||
				selectedCategories.some(
					(category) => category.toLowerCase() === blog.categoryType.toLowerCase()
				);

			return matchesSearch && matchesCategory;
		})
	);

	let selectOptions = $derived(selectDropdownOptions(filteredBlogs.length));

	// $effect(() => {
	// 	console.log(filteredBlogs, '<< filteredBlogs');
	// });

	// Adjust itemsPerPage if current value is not available
	$effect(() => {
		if (!selectOptions.includes(itemsPerPage)) {
			itemsPerPage = selectOptions[selectOptions.length - 1];
		}
	});

	// Pagination logic
	let totalPages = $derived(Math.ceil(filteredBlogs.length / itemsPerPage));
	let paginatedBlogs = $derived(
		filteredBlogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	// Reset to first page if current page exceeds total pages
	$effect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			currentPage = 1;
		}
	});

	function goToPreviousPage() {
		if (currentPage > 1) {
			currentPage--;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	// Next page function
	function goToNextPage() {
		if (currentPage < totalPages) {
			currentPage++;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function resetFilters() {
		selectedCategories = [];
		searchQuery = '';
		currentPage = 1;
	}

	// Navigation handler
	async function handleNavigate(path) {
		if (!path) return;
		isLoading = true;
		try {
			// Simulate navigation
			window.location.href = path;
		} finally {
			isLoading = false;
		}
	}
</script>

<Seo
	type="WebPage"
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

{#if isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-[var(--landing-bg)]">
		<Loader />
	</div>
{/if}

<SecondPageLayout pageData={content.pageData}>
	<div class="relative border border-[var(--landing-glass-border)]">
		<div class="grid gap-2 border-b border-[var(--form-border)] sm:grid-cols-[20%_80%]">
			<!-- Category sidebar -->
			<div
				class="sticky top-0 border-[var(--form-border)] py-[0.5rem] pl-[1rem] lg:border-r lg:px-[2rem] lg:py-[4rem]"
			>
				<h3
					class="typography-body-lg hidden border-b border-[var(--form-border)] pb-2 !font-semibold text-[var(--form-text)] sm:block sm:pb-4"
				>
					Categories
				</h3>

				<!-- Desktop search -->
				<div class="relative mt-4 hidden overflow-hidden sm:block">
					<input
						class="typography-body-sm h-10 w-full rounded-sm border border-[var(--landing-border)] bg-[var(--landing-bg-card)] pr-12 pl-2 text-[var(--form-text)] outline-none focus:border-primary"
						type="text"
						placeholder="Search blog titles..."
						bind:value={searchQuery}
					/>
					<button
						class="group bg-ddsa-gradient-primary typography-button absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer rounded-r-sm p-3 text-[var(--form-text-label)]"
						onclick={resetFilters}
						aria-label="Clear search"
					>
						<Trash2
							class="h-5 w-5 transition-all duration-200 ease-out group-hover:scale-110 active:scale-95"
						/>
					</button>
				</div>

				<!-- Desktop category list -->
				<ul class="hidden flex-col gap-4 pt-4 sm:flex">
					{#each blogCategory as category}
						<li class="flex items-center gap-4 select-none">
							<label class="flex cursor-pointer gap-2">
								<input
									class="sr-only"
									type="checkbox"
									checked={category === 'All'
										? selectedCategories.length === 0
										: selectedCategories.includes(category)}
									onchange={() => toggleCategory(category)}
								/>

								{#if category === 'All' ? selectedCategories.length === 0 : selectedCategories.includes(category)}
									<span>
										<SquareCheck class="h-5 w-5 text-primary" />
									</span>
								{:else}
									<span>
										<Square class="h-5 w-5 text-[var(--landing-text-secondary)]" />
									</span>
								{/if}

								<span
									class={`typography-body-sm md:ml-2 ${
										(
											category === 'All'
												? selectedCategories.length === 0
												: selectedCategories.includes(category)
										)
											? '!text-primary'
											: 'text-[var(--landing-text-secondary)]'
									}`}
								>
									{category} ({countBlogs(category)})
								</span>
							</label>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Main content -->
			<div class="p-[0.5rem] lg:p-[4rem]">
				<!-- Items per page selector -->
				<!-- <div class="flex flex-row items-center justify-end gap-2 py-0 sm:py-4 md:gap-4">
					<span class="typography-body-sm text-[var(--landing-text-secondary)]">Show blogs:</span>

					<select
						class="typography-body-sm cursor-pointer rounded-sm border border-[var(--landing-border)] bg-[var(--landing-bg-card)] px-2 text-[var(--form-text)] ring-primary outline-none focus:ring-2"
						bind:value={selectedCategory}
						onchange={() => toggleCategory(selectedCategory)}
					>
						{#each blogCategory as category}
							<option value={category}>
								{getCategoryLabel(category)}
								({category === 'All' ? filteredBlogs.length : countBlogs(category)})
							</option>
						{/each}
					</select>
				</div> -->

				<div class="flex items-center gap-2">
					<!-- Mobile filter toggle -->
					<div class="typography-body-sm block sm:hidden">
						<button
							type="button"
							class="flex h-8 w-8 items-center justify-center bg-primary text-white"
							onclick={() => (mobileCategoryBar = true)}
							class:hidden={mobileCategoryBar}
							aria-label="Toggle categories"
						>
							<Funnel
								class="h-4 w-4 transition-all duration-200 ease-out group-hover:scale-110 active:scale-95"
							/>
						</button>
					</div>

					<!-- Mobile search -->
					<div class="relative my-4 block w-full overflow-hidden sm:hidden">
						<input
							class="typography-body-sm h-8 w-full rounded-sm border border-[var(--landing-border)] bg-[var(--landing-bg-card)] pr-12 pl-2 text-[var(--form-text)] outline-none focus:border-primary focus:ring-primary sm:h-10"
							type="text"
							placeholder="Search blog titles..."
							bind:value={searchQuery}
						/>
						<button
							class="typography-button absolute top-1/2 right-0 -translate-y-1/2 transform rounded-r-sm bg-primary p-3 text-white"
							onclick={resetFilters}
							aria-label="Clear search"
						>
							<Trash2
								class="h-4 w-4 transition-all duration-200 ease-out group-hover:scale-110 active:scale-95"
							/>
						</button>
					</div>
				</div>

				<!-- Blog grid -->
				<div class="grid gap-[1rem] sm:grid-cols-2 lg:grid-cols-3">
					{#each paginatedBlogs as blog}
						<a
							href={blog.path}
							onclick={(e) => {
								e.preventDefault();
								(() => handleNavigate(blog.path))(e);
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
									{#if blog.issue}<span class="text-dangerColor">[{blog.issue}]</span>{/if}
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
				</div>

				{#if paginatedBlogs.length === 0}
					<div class="typography-body-lg mt-10 text-center text-[var(--form-text-secondary)]">
						No blogs found matching your search <span><Search /></span>
					</div>
				{/if}

				<!-- Pagination -->
				<div
					class="typography-body-md mt-4 items-center justify-center gap-4 {paginatedBlogs.length ===
					0
						? 'hidden'
						: 'flex'}"
				>
					<button
						type="button"
						class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[var(--form-text-label)] {currentPage ==
						1
							? 'cursor-not-allowed'
							: 'cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-primary/90 active:scale-95'}"
						onclick={goToPreviousPage}
						class:opacity-50={currentPage === 1}
						disabled={currentPage === 1}
						aria-label="Previous page"
					>
						<ChevronLeft />
					</button>

					<div class="flex items-center text-[var(--form-text-label)]">
						<span>{currentPage}</span>
						<span> /</span>
						<span>{totalPages}</span>
					</div>

					<button
						type="button"
						class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[var(--form-text-label)] {currentPage ==
						totalPages
							? 'cursor-not-allowed'
							: 'cursor-pointer transition-all duration-200 hover:scale-105 hover:bg-primary/90 active:scale-95'}"
						onclick={goToNextPage}
						class:opacity-50={currentPage === totalPages}
						disabled={currentPage === totalPages}
						aria-label="Next page"
					>
						<ChevronRight />
					</button>
				</div>
			</div>
		</div>

		<TwoColumnWithImage contents={content.messageUs}>
			<p>
				{content.messageUs.para}
			</p>
			<div class="w-full lg:w-auto">
				<Button
					link={content.messageUs.button.link}
					btnClass={content.messageUs.button.btnClass}
					btnName={content.messageUs.button.btnName}
				/>
			</div>
		</TwoColumnWithImage>
	</div>

	{#snippet secondary()}
		<HelpList contents={content.help} isBorder />
		<ThingsYouShould thinkKnow={content.thingsYouShould} disc="list-decimal" containerClass="px-0"
		></ThingsYouShould>
	{/snippet}

	<!-- Mobile category sidebar -->
	<div class="block w-full sm:hidden">
		<div
			class="fixed top-0 left-0 z-50 h-full w-full bg-[var(--landing-bg)] text-[var(--form-text)] transition-transform duration-300 ease-in-out {mobileCategoryBar
				? 'translate-x-0'
				: '-translate-x-full'}"
		>
			<!-- Close button -->
			<div class="typography-body-sm sticky top-0 bg-primary text-end">
				<button
					type="button"
					class="h-10 w-10 text-white"
					onclick={() => (mobileCategoryBar = false)}
					aria-label="Close categories"
				>
					<X />
				</button>
			</div>

			<ul class="flex flex-col gap-4 p-4 text-[var(--form-text)]">
				{#each blogCategory as category}
					<li class="flex items-center gap-4 select-none">
						<label class="flex cursor-pointer gap-2">
							<input
								class="sr-only"
								type="checkbox"
								checked={category === 'All'
									? selectedCategories.length === 0
									: selectedCategories.includes(category)}
								onchange={() => toggleCategory(category)}
							/>

							{#if category === 'All' ? selectedCategories.length === 0 : selectedCategories.includes(category)}
								<span><i class="fa-solid fa-check-square text-primary"></i></span>
							{:else}
								<span><i class="fa-regular fa-square border-iconColor"></i></span>
							{/if}

							<span class="typography-body-sm text-[var(--landing-text-secondary)] md:ml-2">
								{category} ({countBlogs(category)})
							</span>
						</label>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</SecondPageLayout>
