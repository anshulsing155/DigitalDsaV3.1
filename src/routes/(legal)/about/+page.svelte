<svelte:head>
	<title>About Us - DigitalDSA</title>
	<meta
		name="description"
		content="About DigitalDSA — India's B2B intelligence platform for Direct Selling Agents and loan professionals."
	/>
</svelte:head>

<article class="legal-page">
	<h1>About Us</h1>
	<p class="legal-date">DigitalDSA Technologies Private Limited</p>

	<section>
		<h2>Our Mission</h2>
		<p>
			DigitalDSA is on a mission to <strong>empower Direct Selling Agents (DSAs)</strong> across India
			with the intelligence and tools they need to serve their clients better, faster, and more profitably.
		</p>
		<p>
			We believe that independent loan agents — the backbone of India's retail lending ecosystem —
			deserve access to the same quality of data and decision-support that large corporate DSAs and
			banks have had for years.
		</p>
	</section>

	<section>
		<h2>What We Do</h2>
		<p>
			DigitalDSA is a <strong>B2B intelligence platform</strong> built exclusively for DSAs, loan brokers,
			Corporate DSAs, and Bank Relationship Managers (RMs) in India. We are not a lender, NBFC, or consumer-facing
			loan marketplace.
		</p>
		<p>Our platform helps DSAs:</p>
		<ul>
			<li>
				<strong>Match clients to the right lender</strong> — Our engine evaluates income profiles across
				12+ income types, multiple applicants, and existing obligations to identify which banks will approve,
				at what terms.
			</li>
			<li>
				<strong>Compare payout slabs</strong> — See which DSA codes and lenders offer the highest payouts
				for each case, so you earn what you deserve.
			</li>
			<li>
				<strong>Find the right RM</strong> — Access a verified, crowdsourced database of bank Relationship
				Managers filtered by lender, city, and product.
			</li>
			<li>
				<strong>Build professional loan files</strong> — Generate lender-ready application files with
				presentation controls, without re-entering data.
			</li>
			<li>
				<strong>Track cases end-to-end</strong> — From intake to disbursement, manage your entire pipeline
				with stage tracking, query management, and timeline views.
			</li>
		</ul>
	</section>

	<section>
		<h2>Why DigitalDSA</h2>
		<p>
			Most DSAs today spend hours researching bank policies, comparing slabs across WhatsApp groups,
			and manually preparing loan files. This wastes time that could be spent acquiring clients and
			closing deals.
		</p>
		<p>
			DigitalDSA changes this by putting <strong
				>hours of research into minutes of intelligence</strong
			>:
		</p>
		<ul>
			<li>
				<strong>Know before you file</strong> — Which bank will approve, how much they'll sanction, which
				code pays most, and which RM to call.
			</li>
			<li>
				<strong>Privacy-first design</strong> — No customer PII is required. Our system evaluates eligibility
				using financial profiles, not personal identity.
			</li>
			<li>
				<strong>Built for Indian DSAs</strong> — Every feature is designed around the specific workflow
				of loan agents in India, not adapted from a foreign product.
			</li>
			<li>
				<strong>Income profiling depth</strong> — 12 income types, multi-source per applicant, obligation
				deductions. This is our competitive moat and the reason our matches are accurate.
			</li>
		</ul>
	</section>

	<section>
		<h2>Our Values</h2>
		<ul>
			<li>
				<strong>DSA-first</strong> — Every decision we make starts with "does this help the DSA?" If not,
				we don't build it.
			</li>
			<li>
				<strong>Trust</strong> — DSAs are sensitive about client data. We earn trust through transparency,
				optional PII, and system-enforced privacy.
			</li>
			<li>
				<strong>Accuracy over speed</strong> — We'd rather give you the right answer slowly than the wrong
				answer quickly.
			</li>
			<li>
				<strong>Simplicity</strong> — Complex doesn't mean complicated. Our income profiling is deep,
				but the interface stays clean.
			</li>
		</ul>
	</section>

	<section>
		<h2>Contact</h2>
		<p>Have questions or want to learn more?</p>
		<ul>
			<li>
				<strong>Email:</strong> <a href="mailto:support@digitaldsa.com">support@digitaldsa.com</a>
			</li>
			<li><strong>Phone:</strong> <a href="tel:+911204994466">(+91) 120-4994466</a></li>
			<li><strong>Website:</strong> <a href="https://digitaldsa.com">digitaldsa.com</a></li>
		</ul>
		<p>
			<strong>DigitalDSA Technologies Private Limited</strong><br />
			202, G Block, Sector 63, Noida, Chotpur,<br />
			Uttar Pradesh 201307, India
		</p>
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
		scroll-margin-top: 5rem;
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

	.legal-page ul {
		list-style: disc;
		padding-left: 1.5rem;
		margin: 0.5rem 0 1rem;
	}

	.legal-page ul li {
		font-size: 0.9375rem;
		color: var(--landing-text-secondary, #475569);
		margin-bottom: 0.5rem;
		line-height: 1.7;
	}

	.legal-page a {
		color: var(--landing-accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.legal-page a:hover {
		color: var(--landing-accent-hover);
	}

	.legal-page strong {
		color: var(--landing-text, #0f172a);
		font-weight: 600;
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
