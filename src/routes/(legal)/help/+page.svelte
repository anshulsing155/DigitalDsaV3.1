<svelte:head>
	<title>Help Center - DigitalDSA</title>
	<meta
		name="description"
		content="DigitalDSA Help Center — guides for DSAs on creating cases, understanding lender offers, and using the platform."
	/>
</svelte:head>

<article class="legal-page">
	<h1>Help Center</h1>
	<p class="legal-date">Guides & Frequently Asked Questions</p>

	<section>
		<h2>Getting Started</h2>
		<p>
			DigitalDSA helps you match your clients to the right lender, compare offers across banks, and
			build professional loan files. Here's how to get started:
		</p>
		<ol>
			<li>
				<strong>Create your account</strong> — Sign up with your mobile number and verify via OTP.
			</li>
			<li>
				<strong>Complete onboarding</strong> — Enter your DSA details and preferred working areas.
			</li>
			<li>
				<strong>Create your first case</strong> — Select the loan type and fill in the application form.
			</li>
			<li>
				<strong>View offers</strong> — Submit the form to see which lenders approve and at what terms.
			</li>
		</ol>
	</section>

	<section>
		<h2>Creating a Case</h2>
		<p>
			Each case represents one loan application. The form wizard guides you through these steps:
		</p>
		<ul>
			<li>
				<strong>Loan Requirements</strong> — Loan type, amount, purpose, and property details (for secured
				loans).
			</li>
			<li>
				<strong>Applicant Details</strong> — Add the primary applicant and any co-applicants or guarantors.
			</li>
			<li>
				<strong>Income & Financial Profile</strong> — Income sources, credit score, and existing obligations
				for each applicant.
			</li>
			<li>
				<strong>Review & Submit</strong> — The system evaluates your case against 50+ lender policies
				and shows results.
			</li>
		</ul>
		<p>You can save your progress at any time and resume later. The form auto-saves as you work.</p>
	</section>

	<section>
		<h2>Understanding Results</h2>
		<p>
			After submission, each lender gets a <strong>traffic light</strong> rating:
		</p>
		<ul>
			<li>
				<strong style="color: #16a34a;">Green (Eligible)</strong> — The client meets this lender's requirements.
				Proceed with the application.
			</li>
			<li>
				<strong style="color: #d97706;">Amber (Marginal)</strong> — Close to eligibility. Deviations may
				be possible with manager approval.
			</li>
			<li>
				<strong style="color: #dc2626;">Red (Not Eligible)</strong> — Does not meet this lender's current
				criteria.
			</li>
		</ul>
		<p>
			Each offer card shows the <strong>offered amount</strong>, <strong>interest rate</strong>,
			<strong>EMI</strong>, and <strong>tenure</strong>. Use the sort and filter options to compare
			lenders.
		</p>
	</section>

	<section>
		<h2>Frequently Asked Questions</h2>

		<details>
			<summary>How many lenders does DigitalDSA evaluate?</summary>
			<p>
				The platform evaluates your case against 50+ lender policies spanning Private Banks,
				Government Banks, NBFCs, Housing Finance Companies, and Small Finance Banks.
			</p>
		</details>

		<details>
			<summary>Can I edit a submitted case?</summary>
			<p>
				Yes. Open the case from your dashboard and click "Edit Form." Changes create a new version —
				the original is preserved for audit trail. Re-submit to get updated offers.
			</p>
		</details>

		<details>
			<summary>What is a co-applicant vs a guarantor?</summary>
			<p>
				A <strong>co-applicant</strong> is anyone who signed the loan agreement — legally liable
				regardless of EMI or property participation. A <strong>guarantor</strong> is separate — liable
				only on default as a fallback for recovery.
			</p>
		</details>

		<details>
			<summary>How does income assessment work?</summary>
			<p>
				DigitalDSA supports 12+ income types (salaried, business, rental, professional, etc.) with
				per-type haircuts matching actual lender policies. Multi-source income from multiple
				applicants is pooled per lender rules. The system assesses each income entry individually.
			</p>
		</details>

		<details>
			<summary>Is my data secure?</summary>
			<p>
				All data is encrypted in transit (HTTPS) and at rest. No PII (name, PAN, Aadhaar, address)
				appears in generated PDFs. Role-based access ensures only authorized users see case data.
			</p>
		</details>

		<details>
			<summary>How do I add an RM contact?</summary>
			<p>
				Go to the RM Database from your dashboard. You can search existing RMs by lender, city, and
				product — or add a new RM contact that becomes available to all DSAs on the platform.
			</p>
		</details>

		<details>
			<summary>Can I stay signed in on multiple devices?</summary>
			<p>
				No — your account allows <strong>one active session at a time</strong>. When you sign
				in on a new device or in a different browser, DigitalDSA shows a confirmation modal
				explaining the existing session(s) and asks whether you want to continue here. Choosing
				"Continue here" signs out the other session within a few seconds and starts the new one.
				Choosing "Cancel" keeps the old session active and abandons the new login.
			</p>
		</details>

		<details>
			<summary>Do extra tabs in the same browser count as new sessions?</summary>
			<p>
				No. Tabs in the same browser share the same sign-in cookies, so they all belong to the
				<em>same</em> session. You can open as many tabs as you need — the form, results, billing,
				and Help in parallel — without triggering the session-conflict modal. Only opening DigitalDSA
				in a <strong>different browser</strong> (e.g. Chrome and Firefox on the same machine), a
				<strong>different device</strong>, or an <strong>incognito window</strong> counts as a new
				session.
			</p>
		</details>

		<details>
			<summary>What does the "You've been signed out" toast mean?</summary>
			<p>
				It means a newer sign-in (yours, on a different device or browser) chose to continue
				there — so this session was ended. It also appears if you closed the account from another
				device. You'll be redirected to the sign-in screen automatically; signing back in restores
				access. If you didn't initiate the other sign-in, change your account password and contact
				<strong>support@digitaldsa.com</strong>.
			</p>
		</details>
	</section>

	<section>
		<h2>Need More Help?</h2>
		<p>If you can't find what you're looking for, reach out to us:</p>
		<ul>
			<li><a href="/contact">Contact Us</a> — Send us a message through the contact form.</li>
			<li>Email: <strong>support@digitaldsa.com</strong></li>
		</ul>
	</section>
</article>
