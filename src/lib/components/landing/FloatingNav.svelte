<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { gsap } from '$lib/utils/gsapSetup';
	import { smoothScrollTo, onScroll } from '$lib/utils/scroll';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { themeState } from '$lib/stores/theme.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { Coins } from '$lib/utils/iconRegistry';
	import { ROUTES } from '$lib/config/routes.js';

	interface Props {
		user: any;
		availableCoins: number;
	}

	let { user, availableCoins }: Props = $props();

	let navRef: HTMLElement | undefined = $state(undefined);
	let mobileMenuOpen = $state(false);
	let currentSection = $state('hero');
	let themeMode = $derived(themeState.mode);
	/** Resolved theme (light/dark) — handles 'system' correctly */
	let resolvedTheme = $derived(themeState.resolved);
	/** Logo: black in light mode, white in dark mode */
	let logoSrc = $derived(resolvedTheme === 'light' ? '/logo/logoBlack.svg' : '/logo/whiteLogo.svg');
	let scrolled = $state(false);

	const navItems = [
		{ id: 'hero', label: 'Home' },
		{ id: 'how-it-works', label: 'How It Works' },
		{ id: 'product-demo', label: 'Demo' },
		{ id: 'pricing', label: 'Pricing' },
		{ id: 'trust-pledge', label: 'Trust' }
	];

	const sections = navItems.map((n) => n.id);

	onMount(() => {
		// Scroll tracking
		const unsubScroll = onScroll((scrollY) => {
			scrolled = scrollY > 50;

			// Determine active section
			for (let i = sections.length - 1; i >= 0; i--) {
				const el = document.getElementById(sections[i]);
				if (el) {
					const rect = el.getBoundingClientRect();
					if (rect.top <= 120) {
						currentSection = sections[i];
						break;
					}
				}
			}
		});

		// GSAP mount animation (skip if user prefers reduced motion)
		if (navRef && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			gsap.set(navRef, { y: -80, opacity: 0 });
			gsap.to(navRef, {
				y: 0,
				opacity: 1,
				duration: 0.7,
				ease: 'power3.out',
				delay: 0.1
			});
		}

		return () => {
			unsubScroll();
		};
	});

	function handleNavClick(sectionId: string) {
		if (sectionId === 'hero') {
			if (browser) window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			smoothScrollTo(sectionId, 80);
		}
		mobileMenuOpen = false;
	}

	function handleCtaClick() {
		landingNav.handleCTA();
	}

	function handleToggleTheme() {
		themeState.toggleTheme();
	}

	let isLoggedIn = $derived(authState.isAuthenticated);
	let isLoggingOut = $state(false);

	async function handleLogout() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		try {
			await authState.logout();
		} catch {
			// Logout API failed — clear cookies manually as fallback
			if (browser) {
				document.cookie = 'accessToken=; path=/; max-age=0';
				document.cookie = 'refreshToken=; path=/; max-age=0';
				document.cookie = 'activeRole=; path=/; max-age=0';
			}
		}
		// Always hard-navigate to ensure clean state (goto may fail after error recovery)
		if (browser) window.location.href = '/login';
	}

	let dashboardHref = $derived.by(() => {
		const role = user?.activeRole || 'dsa';
		const dashMap: Record<string, string> = {
			dsa: '/dashboard/dsa',
			rm: '/dashboard/rm',
			admin: '/dashboard/admin'
		};
		return dashMap[role] || '/dashboard/dsa';
	});
</script>

<nav
	bind:this={navRef}
	class="floating-nav"
	class:floating-nav--scrolled={scrolled}
	aria-label="Main navigation"
>
	<div class="nav-container">
		<!-- Logo -->
		<a href={ROUTES.HOME} class="nav-logo" aria-label="DigitalDSA home">
			<img src={logoSrc} alt="" class="nav-logo-img" />
			<span class="nav-logo-text">DigitalDSA</span>
		</a>

		<!-- Desktop center links -->
		<div class="nav-links" role="navigation" aria-label="Page sections">
			{#each navItems as item}
				<button
					class="nav-link"
					class:nav-link--active={currentSection === item.id}
					onclick={() => handleNavClick(item.id)}
				>
					{item.label}
					<span
						class="nav-link-indicator"
						class:nav-link-indicator--visible={currentSection === item.id}
					></span>
				</button>
			{/each}
		</div>

		<!-- Desktop right actions -->
		<div class="nav-actions">
			<!-- Coins badge -->
			{#if availableCoins != null}
				<div class="coins-badge" aria-label="Available coins: {availableCoins}">
					<Coins class="coins-icon" size={14} />
					<span class="coins-count">
						{availableCoins >= 500 ? '500' : availableCoins}
					</span>
				</div>
			{/if}

			<!-- Theme toggle -->
			<button
				onclick={handleToggleTheme}
				class="theme-toggle"
				aria-label="Toggle theme, current: {themeMode}"
				title="Theme: {themeMode}"
			>
				{#if themeMode === 'light'}
					<!-- Sun -->
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<path
							d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
						/>
					</svg>
				{:else if themeMode === 'dark'}
					<!-- Moon -->
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{:else}
					<!-- Monitor / System -->
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<path d="M8 21h8m-4-4v4" />
					</svg>
				{/if}
			</button>

			<!-- CTA / Auth actions -->
			{#if isLoggedIn}
				<a href={dashboardHref} class="nav-cta" data-sveltekit-reload> Dashboard </a>
				<button onclick={handleLogout} disabled={isLoggingOut} class="nav-cta nav-cta--logout">
					{isLoggingOut ? 'Logging out...' : 'Logout'}
				</button>
			{:else}
				<button onclick={handleCtaClick} class="nav-cta"> Start Free Trial </button>
			{/if}
		</div>

		<!-- Mobile right group -->
		<div class="nav-mobile-actions">
			<!-- Theme toggle mobile -->
			<button onclick={handleToggleTheme} class="theme-toggle" aria-label="Toggle theme">
				{#if themeMode === 'light'}
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="5" />
						<path
							d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
						/>
					</svg>
				{:else if themeMode === 'dark'}
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{:else}
					<svg
						class="theme-icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<path d="M8 21h8m-4-4v4" />
					</svg>
				{/if}
			</button>

			<!-- Hamburger -->
			<button
				class="hamburger"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileMenuOpen}
			>
				{#if mobileMenuOpen}
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M18 6 6 18" /><path d="m6 6 12 12" />
					</svg>
				{:else}
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile dropdown -->
	{#if mobileMenuOpen}
		<div class="mobile-menu">
			<div class="mobile-menu-inner">
				{#each navItems as item}
					<button
						class="mobile-link"
						class:mobile-link--active={currentSection === item.id}
						onclick={() => handleNavClick(item.id)}
					>
						{item.label}
					</button>
				{/each}

				<div class="mobile-divider"></div>

				{#if availableCoins != null}
					<div class="mobile-coins">
						<Coins class="coins-icon" size={14} />
						<span>{availableCoins >= 500 ? '500' : availableCoins} coins</span>
					</div>
				{/if}

				{#if isLoggedIn}
					<a href={dashboardHref} class="mobile-cta" data-sveltekit-reload> Dashboard </a>
					<button
						onclick={handleLogout}
						disabled={isLoggingOut}
						class="mobile-cta mobile-cta--logout"
					>
						{isLoggingOut ? 'Logging out...' : 'Logout'}
					</button>
				{:else}
					<button onclick={handleCtaClick} class="mobile-cta"> Start Free Trial </button>
				{/if}
			</div>
		</div>
	{/if}
</nav>

<!-- Backdrop to close mobile menu -->
{#if mobileMenuOpen}
	<button
		type="button"
		class="mobile-backdrop"
		onclick={() => (mobileMenuOpen = false)}
		aria-label="Close menu"
		tabindex="-1"
	></button>
{/if}

<style>
	/* ---- Nav shell ---- */
	.floating-nav {
		position: sticky;
		top: 0;
		z-index: 50;
		width: 100%;
		background: var(--landing-nav-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid transparent;
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
		will-change: transform, opacity;
	}

	.floating-nav--scrolled {
		border-bottom-color: var(--landing-border);
		box-shadow: 0 1px 12px rgba(0, 0, 0, 0.06);
	}

	.nav-container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.875rem 1.25rem;
	}

	@media (min-width: 1024px) {
		.nav-container {
			padding: 0.875rem 2rem;
		}
	}

	/* ---- Logo ---- */
	.nav-logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		flex-shrink: 0;
	}

	.nav-logo-img {
		width: 2rem;
		height: auto;
		object-fit: contain;
	}

	/* Logo text — always black (light) or white (dark), never colored */
	.nav-logo-text {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--landing-text);
		letter-spacing: -0.02em;
	}

	/* ---- Desktop links ---- */
	.nav-links {
		display: none;
	}

	@media (min-width: 1024px) {
		.nav-links {
			display: flex;
			align-items: center;
			gap: 0.25rem;
		}
	}

	.nav-link {
		position: relative;
		padding: 0.375rem 0.75rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--landing-text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s ease;
		white-space: nowrap;
	}

	.nav-link:hover {
		color: var(--landing-text);
	}

	.nav-link--active {
		color: var(--landing-text);
		font-weight: 600;
	}

	.nav-link-indicator {
		position: absolute;
		bottom: -2px;
		left: 50%;
		transform: translateX(-50%) scaleX(0);
		width: 60%;
		height: 2px;
		border-radius: 1px;
		background: var(--landing-accent);
		transition: transform 0.25s ease;
	}

	.nav-link-indicator--visible {
		transform: translateX(-50%) scaleX(1);
	}

	/* ---- Desktop actions ---- */
	.nav-actions {
		display: none;
	}

	@media (min-width: 1024px) {
		.nav-actions {
			display: flex;
			align-items: center;
			gap: 0.625rem;
			flex-shrink: 0;
		}
	}

	/* Coins badge */
	.coins-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.6rem;
		border-radius: 999px;
		background: var(--landing-bg-alt);
		color: var(--landing-text-muted);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.coins-badge :global(.coins-icon) {
		color: #ffcc00;
	}

	.coins-count {
		line-height: 1;
	}

	/* Theme toggle */
	.theme-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		background: var(--landing-bg-alt);
		color: var(--landing-text-secondary);
		transition:
			color 0.2s ease,
			background 0.2s ease;
	}

	.theme-toggle:hover {
		color: var(--landing-text);
	}

	.theme-icon {
		display: block;
	}

	/* CTA button */
	.nav-cta {
		padding: 0.5rem 1.25rem;
		font-size: 0.8rem;
		font-weight: 600;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		transition: all 0.25s ease;
		box-shadow: 0 2px 12px rgba(var(--landing-accent-rgb), 0.2);
		white-space: nowrap;
	}

	.nav-cta:hover {
		transform: translateY(-1px) scale(1.03);
		background: var(--landing-accent-hover);
		box-shadow: 0 4px 20px rgba(var(--landing-accent-rgb), 0.3);
	}

	.nav-cta--logout {
		background: transparent;
		color: var(--landing-text-secondary);
		box-shadow: none;
		border: 1px solid var(--landing-border);
	}

	.nav-cta--logout:hover {
		background: var(--landing-bg-alt);
		color: var(--landing-text);
		box-shadow: none;
		transform: translateY(-1px);
	}

	/* ---- Mobile actions ---- */
	.nav-mobile-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (min-width: 1024px) {
		.nav-mobile-actions {
			display: none;
		}
	}

	.hamburger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		background: var(--landing-bg-alt);
		color: var(--landing-text);
		transition: background 0.2s ease;
	}

	/* ---- Mobile menu ---- */
	.mobile-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		padding: 0.5rem 1rem 1rem;
		z-index: 60;
	}

	@media (min-width: 1024px) {
		.mobile-menu {
			display: none;
		}
	}

	.mobile-menu-inner {
		background: var(--landing-bg-card);
		border: 1px solid var(--landing-border);
		border-radius: 1rem;
		padding: 0.5rem 0;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
	}

	.mobile-link {
		display: block;
		width: 100%;
		padding: 0.75rem 1.25rem;
		text-align: left;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--landing-text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		transition:
			color 0.2s ease,
			background 0.15s ease;
	}

	.mobile-link:hover {
		background: var(--landing-bg-alt);
	}

	.mobile-link--active {
		color: var(--landing-text);
		font-weight: 600;
	}

	.mobile-divider {
		height: 1px;
		margin: 0.375rem 1rem;
		background: var(--landing-border);
	}

	.mobile-coins {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		font-size: 0.8rem;
		color: var(--landing-text-muted);
	}

	.mobile-coins :global(.coins-icon) {
		color: #ffcc00;
	}

	.mobile-cta {
		display: block;
		width: calc(100% - 2rem);
		margin: 0.5rem 1rem;
		padding: 0.65rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		text-align: center;
		transition: all 0.25s ease;
	}

	.mobile-cta:hover {
		transform: scale(1.02);
		background: var(--landing-accent-hover);
	}

	.mobile-cta--logout {
		background: transparent;
		color: var(--landing-text-secondary);
		border: 1px solid var(--landing-border);
	}

	.mobile-cta--logout:hover {
		background: var(--landing-bg-alt);
		color: var(--landing-text);
	}

	/* ---- Backdrop ---- */
	.mobile-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(0, 0, 0, 0.2);
		border: none;
		cursor: default;
	}
</style>
