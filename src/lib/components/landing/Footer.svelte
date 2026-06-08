<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { gsap } from '$lib/utils/gsapSetup';
	import { secureFetch } from '$lib/utils/csrf';

	const currentYear = new Date().getFullYear();

	let columnsEl: HTMLElement;
	let newsletterEmail = $state('');
	let newsletterStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let newsletterMessage = $state('');

	async function handleNewsletterSubmit(e: Event) {
		e.preventDefault();
		if (!newsletterEmail.trim()) return;

		newsletterStatus = 'loading';
		try {
			const res = await secureFetch('/api/newsletter/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: newsletterEmail.trim() })
			});
			const data = await res.json();
			if (data.success) {
				newsletterStatus = 'success';
				newsletterMessage = data.message || 'Successfully subscribed!';
				newsletterEmail = '';
			} else {
				newsletterStatus = 'error';
				newsletterMessage = data.error || 'Something went wrong.';
			}
		} catch {
			newsletterStatus = 'error';
			newsletterMessage = 'Network error. Please try again.';
		}
	}

	const platformLinks = [
		{ name: 'How It Works', route: '#how-it-works' },
		{ name: 'Bank Matching', route: '#four-answers' },
		{ name: 'RM Network', route: '#four-answers' },
		{ name: 'Pricing', route: '#pricing' },
		{ name: 'For Corporate DSAs', route: '#pricing' },
		{ name: 'Trust Pledge', route: '#trust-pledge' }
	];

	const quickLinks = [
		{ name: 'About Us', route: '/about' },
		{ name: 'Contact Us', route: '/contact' },
		{ name: 'Privacy Policy', route: '/privacy' },
		{ name: 'Terms & Conditions', route: '/terms' },
		{ name: 'FAQ', route: '#faq' },
		{ name: 'Help Center', route: '/help' }
	];

	function handleNavigation(route: string) {
		if (route.startsWith('#')) {
			const element = document.querySelector(route);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		} else {
			goto(route);
		}
	}

	function handleSocialLink(platform: string) {
		const urls: Record<string, string> = {
			facebook: 'https://www.facebook.com/profile.php?id=61561179107296',
			twitter: 'https://x.com/DigitalDSA001',
			linkedin: 'https://www.linkedin.com/company/digitaldsa',
			instagram: 'https://www.instagram.com/digitaldsa1/',
			youtube: 'https://www.youtube.com/@DigitalDSA'
		};
		if (browser) window.open(urls[platform], '_blank');
	}

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const ctx = gsap.context(() => {
			if (columnsEl) {
				gsap.from(columnsEl.children, {
					y: 50,
					opacity: 0,
					duration: 0.7,
					stagger: 0.12,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: columnsEl,
						start: 'top 85%',
						toggleActions: 'play none none reverse'
					}
				});
			}
		}, columnsEl);

		return () => ctx.revert();
	});
</script>

<footer class="footer-root">
	<!-- Main Footer Content -->
	<div class="footer-inner">
		<div bind:this={columnsEl} class="footer-grid">
			<!-- Company Info -->
			<div class="footer-col">
				<div class="footer-brand">
					<h3 class="footer-logo-text">DigitalDSA</h3>
					<p class="footer-description">
						India's B2B intelligence platform for Direct Selling Agents, loan brokers, and Corporate
						DSAs. We give loan professionals the data to match faster, earn more, and file with
						confidence.
					</p>
				</div>

				<div class="footer-contact-list">
					<div class="footer-contact-item">
						<svg class="footer-contact-icon" fill="currentColor" viewBox="0 0 20 20">
							<path
								d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
							/>
						</svg>
						<span>(+91) 120-4994466</span>
					</div>
					<div class="footer-contact-item">
						<svg class="footer-contact-icon" fill="currentColor" viewBox="0 0 20 20">
							<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
							<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
						</svg>
						<span>support@digitaldsa.com</span>
					</div>
				</div>
			</div>

			<!-- Loan Products -->
			<div class="footer-col">
				<h4 class="footer-col-title">Platform</h4>
				<ul class="footer-link-list">
					{#each platformLinks as link}
						<li>
							<button class="footer-link" onclick={() => handleNavigation(link.route)}>
								{link.name}
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Quick Links -->
			<div class="footer-col">
				<h4 class="footer-col-title">Quick Links</h4>
				<ul class="footer-link-list">
					{#each quickLinks as link}
						<li>
							<button class="footer-link" onclick={() => handleNavigation(link.route)}>
								{link.name}
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Newsletter -->
			<div class="footer-col">
				<h4 class="footer-col-title">Stay Updated</h4>
				<p class="footer-newsletter-desc">
					Get policy updates, new lender additions, and payout slab changes delivered weekly.
				</p>
				<form class="footer-newsletter-form" onsubmit={handleNewsletterSubmit}>
					<input
						type="email"
						placeholder="Your email address"
						aria-label="Email address for newsletter"
						class="footer-newsletter-input"
						bind:value={newsletterEmail}
						disabled={newsletterStatus === 'loading'}
					/>
					<button
						type="submit"
						class="footer-newsletter-btn"
						disabled={newsletterStatus === 'loading' || !newsletterEmail.trim()}
					>
						{newsletterStatus === 'loading' ? '...' : 'Subscribe'}
					</button>
				</form>
				{#if newsletterStatus === 'success'}
					<p class="footer-newsletter-msg footer-newsletter-success">{newsletterMessage}</p>
				{:else if newsletterStatus === 'error'}
					<p class="footer-newsletter-msg footer-newsletter-error">{newsletterMessage}</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- B2B Disclaimer -->
	<div class="footer-disclaimer">
		<p>
			DigitalDSA Pro is a B2B intelligence platform exclusively for Direct Selling Agents, loan
			brokers, Corporate DSAs and Bank RMs in India. This site does not provide personal loans or
			serve individual consumers. For borrower loan comparison &amp; tools visit <a
				href="https://digitaldsa.com"
				class="footer-disclaimer-link">digitaldsa.com</a
			>.
		</p>
	</div>

	<!-- Bottom Bar -->
	<div class="footer-bottom">
		<div class="footer-bottom-inner">
			<div class="footer-copyright">
				&copy; {currentYear} DigitalDSA. All rights reserved.
			</div>

			<!-- Social Links -->
			<div class="footer-socials">
				<!-- Facebook -->
				<button
					class="footer-social-btn"
					onclick={() => handleSocialLink('facebook')}
					aria-label="Facebook"
				>
					<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
						/>
					</svg>
				</button>
				<!-- Twitter / X -->
				<button
					class="footer-social-btn"
					onclick={() => handleSocialLink('twitter')}
					aria-label="X (Twitter)"
				>
					<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
						/>
					</svg>
				</button>
				<!-- LinkedIn -->
				<button
					class="footer-social-btn"
					onclick={() => handleSocialLink('linkedin')}
					aria-label="LinkedIn"
				>
					<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
						/>
					</svg>
				</button>
				<!-- Instagram -->
				<button
					class="footer-social-btn"
					onclick={() => handleSocialLink('instagram')}
					aria-label="Instagram"
				>
					<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
						/>
					</svg>
				</button>
				<!-- YouTube -->
				<button
					class="footer-social-btn"
					onclick={() => handleSocialLink('youtube')}
					aria-label="YouTube"
				>
					<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer-root {
		background: var(--landing-bg);
		border-top: 1px solid var(--landing-border);
	}

	.footer-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 4rem 1.5rem;
	}

	.footer-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
	}

	@media (min-width: 768px) {
		.footer-grid {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
		}
	}

	@media (min-width: 1024px) {
		.footer-grid {
			grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
			gap: 3rem;
		}
	}

	.footer-col {
		min-width: 0;
	}

	.footer-brand {
		margin-bottom: 1.5rem;
	}

	.footer-logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--landing-text);
		margin-bottom: 0.75rem;
	}

	.footer-description {
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--landing-text-muted);
	}

	.footer-contact-list {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.footer-contact-item {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
		color: var(--landing-text-muted);
		gap: 0.625rem;
	}

	.footer-contact-icon {
		width: 1rem;
		height: 1rem;
		color: var(--landing-accent-accessible);
		flex-shrink: 0;
	}

	.footer-col-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--landing-text-secondary);
		margin-bottom: 1.25rem;
	}

	.footer-link-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.footer-link {
		display: inline;
		background: none;
		border: none;
		padding: 0;
		font-size: 0.875rem;
		color: var(--landing-text-muted);
		cursor: pointer;
		text-align: left;
		transition: color 0.25s ease;
		line-height: 1.5;
	}

	.footer-link:hover {
		color: var(--landing-accent-accessible);
	}

	.footer-newsletter-desc {
		font-size: 0.875rem;
		color: var(--landing-text-muted);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.footer-newsletter-form {
		display: flex;
		gap: 0.5rem;
	}

	.footer-newsletter-input {
		flex: 1;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		outline: none;
		background: var(--landing-bg-card);
		color: var(--landing-text);
		border: 1px solid var(--landing-border);
		transition: border-color 0.25s ease;
		min-width: 0;
	}

	.footer-newsletter-input:focus {
		border-color: var(--landing-accent);
	}

	.footer-newsletter-input::placeholder {
		color: var(--landing-text-muted);
		opacity: 0.7;
	}

	.footer-newsletter-btn {
		padding: 0.625rem 1.125rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		transition: all 0.25s ease;
		white-space: nowrap;
	}

	.footer-newsletter-btn:hover:not(:disabled) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.footer-newsletter-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.footer-newsletter-msg {
		font-size: 0.75rem;
		margin-top: 0.5rem;
	}

	.footer-newsletter-success {
		color: #ffcc00;
	}

	.footer-newsletter-error {
		color: #888888;
	}

	/* Bottom Bar */
	.footer-bottom {
		border-top: 1px solid var(--landing-border);
		padding: 1.25rem 0;
	}

	.footer-bottom-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.footer-bottom-inner {
			flex-direction: row;
			justify-content: space-between;
		}
	}

	.footer-copyright {
		font-size: 0.75rem;
		color: var(--landing-text-muted);
	}

	.footer-socials {
		display: flex;
		gap: 0.5rem;
	}

	.footer-social-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 9999px;
		border: none;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.footer-social-btn:hover {
		background: var(--landing-accent-hover);
	}

	/* B2B Disclaimer */
	.footer-disclaimer {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem;
		text-align: center;
		font-size: 0.8rem;
		line-height: 1.7;
		color: var(--landing-text-muted);
		opacity: 0.8;
		border-top: 1px solid var(--landing-border);
	}

	.footer-disclaimer-link {
		color: var(--landing-accent-accessible);
		text-decoration: underline;
	}

	.footer-disclaimer-link:hover {
		opacity: 0.8;
	}
</style>
