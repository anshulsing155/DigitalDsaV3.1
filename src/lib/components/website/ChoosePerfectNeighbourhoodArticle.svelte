<script>
	import HelpList from './HelpList.svelte';
	import NewPageLayout from './NewPageLayout.svelte';
	import Seo from './Seo.svelte';
	import ThingsYouKnow from './ThingsYouKnow.svelte';
	import VerticalBlog from './VerticalBlog.svelte';
	import content from '$lib/data/website/choosePerfectNeighbourhoodArticle.json';
	import { BookOpen, MapPin, Compass, Shield, IndianRupee, Heart } from '$lib/utils/iconRegistry';
	let { pageData = content.pageData } = $props();
</script>

<Seo
	type="WebPage"
	title={content.seo.title}
	image={pageData.coverImage}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section>
	<NewPageLayout {pageData}>
		<div
			class="items-center px-[0.5rem] py-7 pb-10 md:mx-[2rem] md:p-12 md:pb-16 lg:mx-[13rem] lg:pb-20"
		>
			{#each content.sections as section, i}
				<div class="mb-12">
					<div class="flex items-center my-{i === 0 ? '5' : '8'}">
						{#if section.icon === 'book-open'}
							<BookOpen class="mr-3 text-primary" />
						{:else if section.icon === 'map-pin'}
							<MapPin class="mr-3 text-primary" />
						{:else if section.icon === 'compass'}
							<Compass class="mr-3 text-primary" />
						{:else if section.icon === 'shield'}
							<Shield class="mr-3 text-primary" />
						{:else if section.icon === 'indian-rupee'}
							<IndianRupee class="mr-3 text-primary" />
						{:else if section.icon === 'heart'}
							<Heart class="mr-3 text-primary" />
						{/if}

						<h2
							class="typography-body-lg border-l-4 border-primary pl-3 !font-semibold text-[var(--form-text)]"
						>
							{section.heading}
						</h2>
					</div>
					{#each section.paragraphs as paragraph}
						<p class="typography-body-md ml-10 text-[var(--form-text-secondary)]">
							{@html paragraph}
						</p>
					{/each}
					{#if section.list}
						<ul
							class="typography-body-md mt-3 ml-10 list-disc space-y-3 pl-5 text-[var(--form-text-secondary)]"
						>
							{#each section.list as item}
								<li>
									{#if item.bold}
										<strong class="mr-1">{@html item.bold}</strong>
									{/if}
									{@html item.text}
								</li>
							{/each}
						</ul>
					{/if}
					{#if section.callout}
						<p class="typography-body-md mt-3 ml-10 text-[var(--form-text-secondary)]">
							{@html section.callout}
						</p>
					{/if}
				</div>
			{/each}
		</div>

		{#snippet secondary()}
			<div class="px-2 lg:px-0 py-16">
				<h2 class="typography-h2-md mb-8 text-[var(--form-text)]">
					{content.resonateWithYou.heading}
				</h2>
				<div class="gap-2 md:flex">
					<VerticalBlog blogLists={content.resonateWithYou.blogLists} />
				</div>
			</div>

			<HelpList contents={content.common_components.helpList.contents} />

			<ThingsYouKnow contents={{ heading: `Things you should know` }}>
				<ul class="flex list-disc flex-col gap-4 px-2 pl-4">
					{#each content.common_components.thinkYouShouldKnow.bullets as bullet}
						<li>
							<span class="font-semibold">{bullet.title}</span>
							{bullet.text}
						</li>
					{/each}
				</ul>
			</ThingsYouKnow>
		{/snippet}
	</NewPageLayout>
</section>
