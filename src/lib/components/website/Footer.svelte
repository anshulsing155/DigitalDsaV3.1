<script>
	const footerList = [
		{
			'Quick Access': [
				{ list: 'Stay Safe Online', link: '/cyber-security-against-scams' },
				{ list: 'Refer & Get Rewarded!', link: '/refer-&-earn' },
				{ list: 'Financial Help & Support', link: '/finance-support' },
				{ list: 'Share Your Feedback', link: '/complaint-compliment' },
				{ list: 'Knowledge', link: '/knowledge' }
			]
		},
		{
			'About Us': [
				{ list: 'Who We Are', link: '/about-us' },
				{ list: 'Get In Touch With Us', link: '/contact' },
				{ list: 'Careers & Opportunities', link: '/career' },
				{ list: 'Get Expert Insight', link: '/appointment' }
			]
		},
		{
			'Important Info': [
				{ list: 'Essential Documents', link: '/important-info' },
				{ list: 'Cookies & Preferences', link: '/cookies' },
				{ list: 'Privacy & Security', link: '/privacy-policy' },
				{ list: 'Terms of Service', link: '/terms-conditions' },
				{ list: 'Credits & Attributions', link: '/credits-attributions' }
			]
		},
		{
			'Follow Us': [
				{
					list: 'Twitter (X)',
					link: 'https://x.com/DigitalDSA001',
					icon: '/icons/twitterIcon.svg',
					altIcon: 'twitter-icon'
				},
				{
					list: 'LinkedIn',
					link: 'https://www.linkedin.com/company/digitaldsa',
					icon: '/icons/linkedinIcon.svg',
					altIcon: 'linkedin-icon'
				},
				{
					list: 'YouTube',
					link: 'https://www.youtube.com/@DigitalDSA',
					icon: '/icons/youtubeIcon.svg',
					altIcon: 'youtube-icon'
				},
				{
					list: 'Facebook',
					link: 'https://www.facebook.com/profile.php?id=61561179107296',
					icon: '/icons/fbIcon.svg',
					altIcon: 'facebook-icon'
				},
				{
					list: 'Instagram',
					link: 'https://www.instagram.com/digitaldsa1/',
					icon: '/icons/instaIcon.svg',
					altIcon: 'insta-icon'
				}
			]
		}
	];

	function goToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	let currentYear = new Date().getFullYear();
</script>

<section class="border-[var(--form-border)] relative z-20 w-full border-t bg-[var(--landing-bg)]">
	<div class="relative">
		<div class="relative mx-auto flex w-full flex-col gap-4 lg:w-11/12 xl:w-10/12 2xl:w-[89.5%]">
			<nav
				class="grid grid-cols-1 gap-[2rem] px-2 pt-[4rem] sm:grid-cols-2 md:gap-[4rem] lg:grid-cols-4 lg:px-[4rem]"
			>
				{#each footerList as section}
					{#each Object.entries(section) as [title, items]}
						<div>
							<h3
								class="mb-4 typography-label text-[var(--form-text)] underline underline-offset-4 decoration-primary"
							>
								{title}
							</h3>
							<ul>
								{#each items as item}
									<a
										href={item.link}
										target={item.link.includes('http') ? '_blank' : '_self'}
										class="mb-2 flex items-center gap-2 underline-offset-4 hover:underline typography-body-sm !text-[var(--form-text-secondary)]"
										>{#if item.icon}
											<img src={item.icon} alt={item.altIcon} class="h-[1.5rem]" />
										{/if}
										{item.list}</a
									>
								{/each}
							</ul>
						</div>
					{/each}
				{/each}
			</nav>
			<div class="bg-dividerColor h-[1px] w-full"></div>

			<div
				class="flex flex-col items-center justify-center gap-2 px-[1rem] py-4 text-center lg:px-[4rem] typography-label-description !text-[var(--form-text-secondary)]"
			>
				<p>
					Digital DSA is a platform fully owned and operated by E YANTRIK, a proprietorship company.
				</p>
				<p>
					© 2018–{currentYear}. All rights reserved by E YANTRIK for Digital DSA.
				</p>
			</div>

			<button
				onclick={goToTop}
				type="button"
				aria-label="Go to Top"
				class="btn-primary absolute -top-[2.5rem] right-2 flex h-[4rem] w-[4rem] cursor-pointer items-center justify-center hover:opacity-90"
			>
				<i class="fa-solid fa-angle-up"></i>
			</button>
		</div>
	</div>
</section>
