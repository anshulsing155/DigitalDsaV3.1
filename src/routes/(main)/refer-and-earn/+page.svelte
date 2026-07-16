<script>
	let { data = $bindable() } = $props();

	import ThingsYouShould from '$lib/components/website/ThingsYouShould.svelte';
	import Payments from '$lib/components/website/Payments.svelte';
	import { page } from '$app/state';
	import HelpList from '$lib/components/website/HelpList.svelte';
	import Seo from '$lib/components/website/Seo.svelte';
	import AboveTitleWithLeftIconCard from '$lib/components/website/AboveTitleWithLeftIconCard.svelte';
	import TwoColumnWithImage from '$lib/components/website/TwoColumnWithImage.svelte';
	import Button from '$lib/components/website/Button.svelte';
	import NewPageLayout from '$lib/components/website/NewPageLayout.svelte';
	import { goto } from '$app/navigation';
	import content from '$lib/data/website/referAndEarn.json';
	import { Copy } from '$lib/utils/iconRegistry.ts';

	let showModal = $state(false);
	let dialogBox;

	function handleModal() {
		showModal = !showModal;
		dialogBox.close();
	}

	// ----------generate-=link-------------------
	let referralLink = $state(page.data.user?.referralLink || '');
	let copied = $state(false);
	let errorMessage = $state('');

	const generateReferralLink = async () => {
		if (!data.user) {
			const originalUrl = page.url.pathname + page.url.search;
			goto(`/login?redirect=${encodeURIComponent(originalUrl)}`);
		} else {
			errorMessage = '';

			try {
				const response = await fetch('/api/generate-referral', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						mobileNumber: page.data.user?.mobileNumber,
						url: page.url.origin
					})
				});

				const dataRes = await response.json();

				if (response.ok) {
					referralLink = dataRes.referralLink; // Update user object with the new referral link
				} else {
					errorMessage = dataRes.error || 'Something went wrong.';
				}
			} catch (error) {
				console.error(error);
				errorMessage = 'An unexpected error occurred. Please try again.';
			}
		}
	};

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(referralLink);
			alert('Link copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<section class="content">
	<NewPageLayout pageData={content.pageData} onClick={handleModal}>
		<div class="border-b border-[var(--form-border)] bg-[var(--landing-bg)] p-[1rem] md:p-[1.5rem] lg:p-[3rem]">
			<div class="flex flex-col gap-[2rem] md:flex-row md:items-center md:justify-between">
				<h2 class="typography-h2-md text-[var(--form-text)]">Refer to your friend & get ₹5000</h2>

				{#if !referralLink}
					<button
						onclick={(e) => {
							e.preventDefault();
							generateReferralLink();
						}}
						class="typography-button btn-primary cursor-pointer rounded-full p-4 text-[var(--form-text)]"
					>
						Generate Referral Link
					</button>
				{:else}
					<div class="flex items-center gap-4">
						<div>
							<a href={referralLink} target="_blank" rel="noopener noreferrer">
								{referralLink}
							</a>
						</div>

						<button
							type="button"
							onclick={copyToClipboard}
							class="flex items-center justify-center border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-3 py-2 text-[var(--form-text)] transition-colors hover:bg-[var(--landing-bg)]"
							disabled={!referralLink}
						>
							{#if copied}
								<CopyCheck class="h-5 w-5 text-primary" />
							{:else}
								<Copy class="h-5 w-5 text-primary" />
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>
		<div class="lg:px-16">
			<AboveTitleWithLeftIconCard contents={content.howItWorks} paddingClass="lg:px-0" isBorder />

			<Payments supportHeading={content.keyBenefits.supportHeading} isBorder>
				<div class="grid gap-[2rem] md:grid-cols-2">
					<div class="col-span-1 grid gap-4">
						<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
							{content.keyBenefits.userHeading}
						</h2>
						<ul class="grid list-disc gap-4 pl-4">
							{#each content.keyBenefits.userList as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
					<div class="col-span-1 grid gap-4">
						<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
							{content.keyBenefits.refereeHeading}
						</h2>
						<ul class="grid list-disc gap-4 pl-4">
							{#each content.keyBenefits.refereeList as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
				</div>
			</Payments>

			<Payments
				supportHeading={content.advantage.supportHeading}
				colSpan={content.advantage.colSpan}
				colSpanText={content.advantage.colSpanText}
				isBorder
			>
				<div class="grid gap-[2rem] md:grid-cols-2 lg:grid-cols-3">
					{#each content.advantage.categories as cat}
						<div class="col-span-1 flex flex-col gap-4">
							<h2 class="typography-body-lg !font-semibold text-[var(--form-text)]">
								{cat.heading}
							</h2>
							<ul class="grid list-disc gap-4 pl-4 text-[var(--form-text-secondary)]">
								{#each cat.bullets as bullet}
									<li>
										<span class="font-semibold text-[var(--form-text)]">{bullet.title}</span
										>{bullet.desc}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</Payments>

			<TwoColumnWithImage contents={content.messageUs} paddingClass="lg:px-0" >
				<p>
					{content.messageUs.para}
				</p>
				<div class="w-full lg:w-auto">
					<Button link="/contact" btnClass="btn-secondary w-full" btnName="Message us" />
				</div>
			</TwoColumnWithImage>
		</div>

		{#snippet secondary()}
			<HelpList contents={content.help} isBorder />
			<ThingsYouShould
				thinkKnow={content.thingsYouShould}
				disc="list-decimal"
				containerClass="px-0"
			/>
		{/snippet}
	</NewPageLayout>
</section>
