<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" />
</svelte:head>

<div class="legal-shell">
	<!-- Header -->
	<header class="legal-header">
		<a href="/" class="legal-brand">
			<img src="/logo/whiteLogo.svg" alt="DigitalDSA" class="legal-logo" />
			<span class="legal-brand-name">DigitalDSA</span>
		</a>
		<a href="/" class="legal-back">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
			</svg>
			Back to Home
		</a>
	</header>

	<!-- Content -->
	<main class="legal-content">
		{@render children?.()}
	</main>

	<!-- Footer -->
	<footer class="legal-footer">
		<div class="legal-footer-links">
			<a href="/about">About</a>
			<span class="legal-footer-sep">|</span>
			<a href="/contact">Contact</a>
			<span class="legal-footer-sep">|</span>
			<a href="/privacy">Privacy Policy</a>
			<span class="legal-footer-sep">|</span>
			<a href="/terms">Terms of Service</a>
		</div>
		<p class="legal-footer-copy">
			&copy; {new Date().getFullYear()} DigitalDSA Technologies Private Limited. All rights reserved.
		</p>
	</footer>
</div>

<style>
	.legal-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--landing-bg);
	}

	/* ── Header ────────────────────────────────────── */

	.legal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1.5rem;
		background: #0f172a;
		position: sticky;
		top: 0;
		z-index: 20;
	}

	.legal-brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		text-decoration: none;
	}

	.legal-logo {
		height: 1.75rem;
		width: auto;
	}

	.legal-brand-name {
		font-family: var(--font-title);
		font-size: 1.125rem;
		font-weight: 700;
		color: white;
		letter-spacing: -0.01em;
	}

	.legal-back {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.legal-back:hover {
		color: white;
	}

	/* ── Content ───────────────────────────────────── */

	.legal-content {
		flex: 1;
		max-width: 48rem;
		width: 100%;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
	}

	/* ── Footer ────────────────────────────────────── */

	.legal-footer {
		border-top: 1px solid var(--landing-border, #e2e8f0);
		padding: 1.5rem;
		text-align: center;
	}

	.legal-footer-links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.legal-footer-links a {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--landing-text-secondary, #64748b);
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.legal-footer-links a:hover {
		color: var(--landing-text, #0f172a);
	}

	.legal-footer-sep {
		color: var(--landing-text-muted, #cbd5e1);
		font-size: 0.75rem;
	}

	.legal-footer-copy {
		font-size: 0.75rem;
		color: var(--landing-text-muted, #94a3b8);
	}

	@media (max-width: 640px) {
		.legal-content {
			padding: 1.5rem 1rem 3rem;
		}

		.legal-header {
			padding: 0.75rem 1rem;
		}

		.legal-back {
			font-size: 0.75rem;
		}
	}
</style>
