<script>
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import TwoColumn from '$lib/components/website/TwoColumn.svelte';
	import Information from '$lib/components/website/Information.svelte';
	import NewHome from '$lib/components/website/NewHome.svelte';
	import Ways from '$lib/components/website/Ways.svelte';
	import WhyChoose from '$lib/components/website/WhyChoose.svelte';
	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import BlogCard from '$lib/components/website/BlogCard.svelte';
	import Sublist from '$lib/components/website/Sublist.svelte';
	import ButtonBanner from '$lib/components/website/ButtonBanner.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import content from '$lib/data/website/lap.json';
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="content">
	<NewPageLayout pageData={content.pageData}>
		<Sublist subList={content.subList} />
		<div class="px-4 lg:px-16">
			<div class="border-b border-[var(--form-border)]">
				<WhyChoose facilities={content.facilities} />
			</div>

			<div class="grid gap-[2rem] py-[2rem] lg:grid-cols-3 lg:gap-[2rem] lg:py-[4rem]">
				{#each content.blogs as blog (blog.title)}
					<BlogCard
						icon={blog.icon}
						altName={blog.altName}
						title={blog.title}
						paragraph={blog.paragraph}
						btnName={blog.linkName}
						link={blog.link}
						btnClass="btn-secondary"
					/>
				{/each}
			</div>

			<Ways ways={content.ways} />
			<div class="border-b border-[var(--form-border)]">
				<NewHome steps={content.steps} />
			</div>

			<ButtonBanner contents={content.buttonBanner} />
			<div class="border-b border-[var(--form-border)]">
				<TwoColumn
					cardImage={content.businessHealthCard.cardImage}
					cardAltName={content.businessHealthCard.cardAltName}
					cardHeading={content.businessHealthCard.cardHeading}
					reverse={content.businessHealthCard.reverse}
				>
					<ul class="typography-body-md grid gap-4 text-[var(--form-text-secondary)]" slot="list">
						<li>
							{content.businessHealthCard.para}
						</li>
						<li>
							<a
								class="underline underline-offset-4 hover:no-underline"
								href={content.businessHealthCard.link}
							>
								{content.businessHealthCard.linkName}
							</a>
						</li>
					</ul>
				</TwoColumn>
			</div>

			<div class="border-b border-[var(--form-border)]">
				<TwoColumn
					cardImage={content.messageUsCard.cardImage}
					cardAltName={content.messageUsCard.cardAltName}
					cardHeading={content.messageUsCard.cardHeading}
				>
					<ul class="typography-body-md grid gap-8 text-[var(--form-text-secondary)]" slot="list">
						<li>
							{content.messageUsCard.para}
						</li>

						<div class="w-auto">
							<Button link="/contact" btnClass="btn-secondary" btnName="Message Us" />
						</div>
					</ul>
				</TwoColumn>
			</div>
			<Information />
		</div>

		<div slot="secondary">
			<HelpList contents={content.help} />
			<ThingsYouShould thinkKnow={content.common_components.thingsYouShouldKnow} disc="list-decimal" containerClass="px-0"
			></ThingsYouShould>
		</div>
	</NewPageLayout>
</section>
