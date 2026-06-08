<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<svelte:head>
	<title>Contact Us - DigitalDSA</title>
	<meta
		name="description"
		content="Get in touch with DigitalDSA — India's B2B intelligence platform for Direct Selling Agents and loan professionals."
	/>
</svelte:head>

<article class="legal-page">
	<h1>Contact Us</h1>
	<p class="legal-date">We'd love to hear from you</p>

	<section>
		<h2>Get in Touch</h2>
		<p>
			Whether you have questions about our platform, need support with your account, or want to
			share feedback — our team is here to help.
		</p>

		<div class="contact-grid">
			<!-- Contact Info -->
			<div class="contact-info">
				<div class="contact-card">
					<h3>Email</h3>
					<a href="mailto:support@digitaldsa.com">support@digitaldsa.com</a>
				</div>

				<div class="contact-card">
					<h3>Phone</h3>
					<p><a href="tel:+911204994466">(+91) 120-4994466</a></p>
					<p class="contact-note">Mon–Sat, 9 AM – 6 PM IST</p>
				</div>

				<div class="contact-card">
					<h3>Office</h3>
					<p>DigitalDSA Technologies Private Limited</p>
					<p>202, G Block, Sector 63, Noida, Chotpur,</p>
					<p>Uttar Pradesh 201307, India</p>
				</div>
			</div>

			<!-- Contact Form -->
			<div class="contact-form-wrapper">
				{#if form?.success}
					<div class="form-success">
						<svg
							class="success-icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3>Message Sent</h3>
						<p>Thank you for reaching out. We'll get back to you within 24–48 hours.</p>
					</div>
				{:else}
					<form method="POST" use:enhance class="contact-form">
						<div class="form-group">
							<label for="name">Your Name</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								placeholder="Enter your name"
								value={form?.name ?? ''}
							/>
						</div>

						<div class="form-group">
							<label for="email">Email Address</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								placeholder="you@example.com"
								value={form?.email ?? ''}
							/>
						</div>

						<div class="form-group">
							<label for="message">Message</label>
							<textarea
								id="message"
								name="message"
								required
								rows="5"
								placeholder="How can we help?"
								maxlength="2000">{form?.message ?? ''}</textarea
							>
						</div>

						{#if form?.error}
							<p class="form-error">{form.error}</p>
						{/if}

						<button type="submit" class="form-submit">Send Message</button>
					</form>
				{/if}
			</div>
		</div>
	</section>
</article>

<style>
	.legal-page {
		font-family: 'Poppins', sans-serif;
		color: var(--landing-text, #0f172a);
		line-height: 1.8;
	}

	.legal-page h1 {
		font-family: var(--font-title);
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.legal-date {
		font-size: 0.875rem;
		color: var(--landing-text-muted, #94a3b8);
		margin-bottom: 2rem;
	}

	.legal-page section {
		margin-bottom: 2rem;
	}

	.legal-page h2 {
		font-family: var(--font-title);
		font-size: 1.375rem;
		font-weight: 600;
		margin-top: 2.5rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--landing-border, #e2e8f0);
	}

	.legal-page p {
		font-size: 0.9375rem;
		color: var(--landing-text-secondary, #475569);
		margin-bottom: 0.75rem;
	}

	.legal-page a {
		color: var(--landing-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.legal-page a:hover {
		color: var(--landing-accent-hover);
	}

	/* ── Contact Grid ────────────────────────────── */

	.contact-grid {
		display: grid;
		gap: 2rem;
		margin-top: 1.5rem;
	}

	@media (min-width: 768px) {
		.contact-grid {
			grid-template-columns: 1fr 1.5fr;
		}
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.contact-card {
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: var(--landing-bg-alt, #f8fafc);
		border: 1px solid var(--landing-border, #e2e8f0);
	}

	.contact-card h3 {
		font-family: var(--font-title);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--landing-text, #0f172a);
		margin-bottom: 0.375rem;
	}

	.contact-card p,
	.contact-card a {
		font-size: 0.875rem;
		margin-bottom: 0.125rem;
	}

	.contact-note {
		font-size: 0.75rem !important;
		color: var(--landing-text-muted, #94a3b8) !important;
		margin-top: 0.25rem;
	}

	/* ── Contact Form ────────────────────────────── */

	.contact-form-wrapper {
		padding: 1.5rem;
		border-radius: 0.75rem;
		background: var(--landing-bg-alt, #f8fafc);
		border: 1px solid var(--landing-border, #e2e8f0);
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--landing-text-secondary, #475569);
	}

	.form-group input,
	.form-group textarea {
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		border: 1px solid var(--landing-border, #e2e8f0);
		background: var(--landing-bg-card, #fff);
		font-size: 0.875rem;
		color: var(--landing-text, #0f172a);
		font-family: 'Poppins', sans-serif;
		transition: border-color 0.15s ease;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--landing-accent);
		box-shadow: 0 0 0 3px rgba(var(--landing-accent-rgb), 0.15);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.form-error {
		font-size: 0.8125rem;
		color: #dc2626;
		margin: 0;
	}

	.form-submit {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		border: none;
		background: var(--landing-accent);
		color: var(--landing-accent-text);
		font-size: 0.875rem;
		font-weight: 600;
		font-family: 'Poppins', sans-serif;
		cursor: pointer;
		transition: all 0.2s ease;
		align-self: flex-start;
	}

	.form-submit:hover {
		background: var(--landing-accent-hover);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(var(--landing-accent-rgb), 0.25);
	}

	/* ── Success State ───────────────────────────── */

	.form-success {
		text-align: center;
		padding: 2rem 1rem;
	}

	.success-icon {
		width: 3rem;
		height: 3rem;
		color: #10b981;
		margin: 0 auto 1rem;
	}

	.form-success h3 {
		font-family: var(--font-title);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--landing-text, #0f172a);
		margin-bottom: 0.5rem;
	}

	.form-success p {
		font-size: 0.875rem;
		color: var(--landing-text-secondary, #475569);
	}

	@media (max-width: 640px) {
		.legal-page h1 {
			font-size: 1.5rem;
		}

		.legal-page h2 {
			font-size: 1.1875rem;
		}
	}
</style>
