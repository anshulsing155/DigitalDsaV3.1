<script>
	let { blogData, budgetBlogs } = $props();

	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import Seo from './Seo.svelte';
	import content from '$lib/data/website/budget101.json';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import SectionIntro from '$lib/components/website/SectionIntro.svelte';

	const {
		seo,
		pageData,
		whyMatters,
		benefits,
		steps,
		actions,
		finalThoughts,
		messageUs,
		helpList,
		thingsYouShouldKnow
	} = content;
</script>

<Seo
	type={seo.type}
	title={seo.title}
	image={seo.image}
	description={seo.description}
	keywords={seo.keywords}
/>

<section>
	<NewPageLayout {pageData}>
		<SectionIntro heading={whyMatters.title} para={whyMatters.description} isBorder />
		<SectionIntro heading={benefits.title} isBorder>
			<ul class="typography-body-md space-y-3 pl-2 text-[var(--form-text-secondary)]">
				{#each benefits.items as item}
					<li>{item}</li>
				{/each}
			</ul>
		</SectionIntro>

		<SectionIntro heading="Core Budgeting Steps" isBorder>
			<ol class="list-decimal space-y-6 pl-[0.8rem] lg:pl-4">
				{#each steps as step}
					<li>
						<h3 class="typography-h3 font-semibold text-[var(--form-text)]">
							{step.heading}
						</h3>
						<p class="typography-body-md mt-2 text-[var(--form-text-secondary)]">
							{step.desc}
						</p>
					</li>
				{/each}
			</ol>
		</SectionIntro>

		<SectionIntro heading={actions.title} isBorder>
			<ul
				class="typography-body-md list-disc space-y-3 pl-[0.8rem] lg:pl-4 text-[var(--form-text-secondary)]"
			>
				{#each actions.points as pt}
					<li>{pt}</li>
				{/each}
			</ul>
		</SectionIntro>

		<SectionIntro heading="Final Thoughts" isBorder>
			{#each finalThoughts.paragraphs as para}
				<p class="typography-body-md leading-relaxed text-[var(--form-text-secondary)]">
					{para}
				</p>
			{/each}
		</SectionIntro>

		<TwoColumnWithImage contents={messageUs}>
			<p class="typography-body-md mb-6 text-[var(--form-text-secondary)]">
				Need professional assistance to organize your budget or plan your savings? Connect with a
				financial specialist today for tailormade money management advice.
			</p>
			<div class="w-auto">
				<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
			</div>
		</TwoColumnWithImage>
	</NewPageLayout>
</section>
