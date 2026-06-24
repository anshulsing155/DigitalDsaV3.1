<script lang="ts">
	import Seo from '../Seo.svelte';
	import Tooltip from '../Tooltip.svelte';
	import NewPageLayout from '../NewPageLayout.svelte';
	import TwoColumnWithImage from '../TwoColumnWithImage.svelte';
	import Button from '../Button.svelte';
	import HelpList from '../HelpList.svelte';
	import ThingsYouShould from '../ThingsYouShould.svelte';
	import type { RetirementArticleData } from '$lib/data/website/retirementData';

	let { article }: { article: RetirementArticleData } = $props();

	// Common footer/support data matching other website pages
	const helpListContents = {
		heading: "We're here to help",
		xlGridCol: 4,
		borderBottom: false,
		cards: [
			{
				heading: 'Know your borrowing power',
				para: 'Book instantly to speak to a home loan specialist at a time that suits you',
				icon: '/icons/calc.svg',
				altName: 'icons-calc',
				url: '/calculators/emi-calculator'
			},
			{
				heading: 'Check loan offers',
				para: 'In as little as 10 minutes and tailored exactly as per your financial profile.',
				icon: '/icons/manageLoan2.svg',
				altName: 'Alert Icon',
				url: '/get-started/how-can-we-help'
			},
			{
				heading: 'Contact us',
				para: 'Fast-track your call and connect with a specialist in the DigitalDSA.',
				icon: '/icons/contact.svg',
				altName: 'Alert Icon',
				url: '/contact'
			},
			{
				heading: 'Message us',
				para: 'Get instant help from our online assistants or chat to a specialist.',
				icon: '/icons/msg.svg',
				altName: 'Alert Icon',
				url: '/contact'
			}
		]
	};

	const thingsYouShouldKnow = {
		heading: 'Things you should know',
		paraGraph: [
			'Investment products are subject to market risks. Read all scheme-related documents carefully before investing.',
			'Returns are not guaranteed and can vary based on market conditions.',
			'Interest rates mentioned are indicative and subject to change by respective institutions.',
			'Tax implications vary based on individual financial situations. Consult a tax advisor before investing.'
		]
	};

	const messageUsContents = {
		cardImage: '/images/message.jpg',
		cardAltName: 'message-us',
		cardHeading: 'Message us 24/7',
		reverse: true
	};
</script>

<Seo
	type="WebPage"
	title={article.seo.title}
	image={article.seo.image}
	description={article.seo.description}
	keywords={article.seo.keywords}
/>

<section class="w-full px-1">
	<NewPageLayout
		pageData={{
			coverImage: article.coverImage,
			coverAlt: article.coverAlt,
			heading: article.heading,
			para: article.intro[0] || ''
		}}
	>
		<div id="pageDesign" class="mx-auto bg-white py-4">
			<!-- Extra Intro Paragraphs if any -->
			{#if article.intro.length > 1}
				<div class="px-[0.5rem] lg:px-[4rem] pb-[3rem]">
					{#each article.intro.slice(1) as para}
						<p class="typography-body-lg mb-6 text-[var(--form-text-secondary)]">
							{para}
						</p>
					{/each}
				</div>
			{/if}

			<!-- Render Sections Dynamically -->
			{#each article.sections as section}
				{#if section.type === 'table'}
					<div class="py-[4rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)]">
						<h2 class="typography-h2-md font-semibold text-[var(--form-text)] mb-[2rem]">
							{section.title}
						</h2>
						{#if section.intro}
							<p class="typography-body-md text-[var(--form-text-secondary)] mb-[2rem]">
								{section.intro}
							</p>
						{/if}
						<div class="overflow-x-auto my-6 rounded-lg border border-[var(--form-border)]">
							<table class="min-w-full border-collapse text-left bg-white font-sans text-sm">
								<thead class="bg-gray-100 border-b border-[var(--form-border)]">
									<tr>
										{#each section.headers as header}
											<th class="px-6 py-4 font-semibold text-[var(--form-text)] text-xs uppercase tracking-wider">
												{header}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each section.rows as row}
										{#each Object.entries(row) as [key, values]}
											<tr class="hover:bg-gray-50 transition-colors">
												<td class="px-6 py-4 font-semibold text-[var(--form-text)] whitespace-nowrap align-top">
													{key}
												</td>
												{#each values as val}
													<td class="px-6 py-4 text-[var(--form-text-secondary)] align-top">
														{val}
													</td>
												{/each}
											</tr>
										{/each}
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{:else if section.type === 'list'}
					<div class="py-[4rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)]">
						<h2 class="typography-h2-md font-semibold text-[var(--form-text)] mb-[2rem]">
							{section.title}
						</h2>
						{#if section.intro}
							<p class="typography-body-md text-[var(--form-text-secondary)] mb-[2rem]">
								{section.intro}
							</p>
						{/if}
						<ul class="space-y-4 my-6 pl-2">
							{#each section.items as item}
								<li class="flex items-start gap-3">
									<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-black text-xs font-bold mt-0.5">
										✓
									</span>
									<p class="typography-body-md text-[var(--form-text-secondary)]">
										{#if item.heading}
											<strong class="text-[var(--form-text)] font-semibold">{item.heading}:</strong>
										{/if}
										{item.desc}
									</p>
								</li>
							{/each}
						</ul>
					</div>
				{:else if section.type === 'text'}
					<div class="py-[4rem] px-[0.5rem] lg:px-[4rem] border-b border-[var(--form-border)]">
						<h2 class="typography-h2-md font-semibold text-[var(--form-text)] mb-[2rem]">
							{section.title}
						</h2>
						{#each section.paragraphs as p}
							<p class="typography-body-md text-[var(--form-text-secondary)] mb-6 leading-relaxed">
								{p}
							</p>
						{/each}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Message Us Section -->
		<TwoColumnWithImage contents={messageUsContents}>
			<p class="typography-body-md text-[var(--form-text-secondary)] mb-6">
				Get instant help from the Digital DSA app or connect with a specialist who can message you back.
				You’ll need Digital DSA app notifications turned on so you know when you’ve received a reply.
			</p>
			<div class="w-auto">
				<Button link="/contact" btnClass="btn-secondary" btnName="Message us" />
			</div>
		</TwoColumnWithImage>

		<div slot="secondary">
			<HelpList contents={helpListContents} />
			<ThingsYouShould thinkKnow={thingsYouShouldKnow} disc="list-decimal" containerClass="px-0" />
		</div>
	</NewPageLayout>
</section>

<style>
	#pageDesign {
		max-width: 1200px;
	}
</style>
