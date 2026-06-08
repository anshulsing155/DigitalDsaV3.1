<script lang="ts">
	/**
	 * Notification Preferences (SEC-8)
	 * ══════════════════════════════════════════════════════════════════
	 * Target of the "Notification preferences" link in every transactional
	 * email footer (committed to AWS SES case 177987930900751 as item #2
	 * of the 5-element footer). All DigitalDSA email is transactional in
	 * v1, so there are no per-category opt-outs to expose — the page
	 * explains the stance and points at Close Account for full suppression.
	 *
	 * Auth is inherited from /dashboard/dsa/+layout.server.ts which calls
	 * requireRole(locals, 'dsa').
	 * ══════════════════════════════════════════════════════════════════
	 */
</script>

<svelte:head>
	<title>Notification preferences — DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<h1 class="text-2xl font-semibold text-[var(--dash-text)]">Notification preferences</h1>

	<p class="mt-2 text-sm text-[var(--dash-text-muted)]">
		What you'll receive from DigitalDSA and how to change it.
	</p>

	<section class="mt-8 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2 class="text-lg font-semibold text-[var(--dash-text)]">All our email is transactional</h2>

		<p class="mt-3 text-sm leading-relaxed text-[var(--dash-text)]">
			DigitalDSA sends email only when an account action or billing event triggers it. There are
			no newsletters, no promotional sends, and no bulk marketing. The four categories of email
			you may receive are:
		</p>

		<ul class="mt-4 list-disc space-y-2 pl-6 text-sm text-[var(--dash-text)]">
			<li>
				<strong>Account verification</strong> — one-time codes sent during signup or when you
				change your email.
			</li>
			<li>
				<strong>Subscription receipts</strong> — confirmation when a renewal payment succeeds.
			</li>
			<li>
				<strong>Payment-failure notices</strong> — alerts when a charge fails and what action you
				can take.
			</li>
			<li>
				<strong>Team activity</strong> — when someone invites you to their team or when you invite
				a teammate.
			</li>
		</ul>

		<p class="mt-4 text-sm leading-relaxed text-[var(--dash-text-muted)]">
			Because every email is tied to something you or your account did, we don't offer
			per-category opt-outs — turning off subscription receipts, for instance, would leave you
			without a record of your own payments.
		</p>
	</section>

	<section class="mt-6 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2 class="text-lg font-semibold text-[var(--dash-text)]">Stop receiving DigitalDSA email</h2>

		<p class="mt-3 text-sm leading-relaxed text-[var(--dash-text)]">
			The only way to fully stop email from DigitalDSA is to close your account. Closing
			immediately suppresses every future send to your address.
		</p>

		<p class="mt-4">
			<a
				href="/dashboard/dsa/settings/account/close"
				class="inline-flex items-center rounded-md border border-[var(--dash-border)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] hover:bg-[var(--dash-btn-ghost-bg)]"
			>
				Close my account
			</a>
		</p>
	</section>

	<section class="mt-6 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6">
		<h2 class="text-lg font-semibold text-[var(--dash-text)]">Replying to our emails</h2>

		<p class="mt-3 text-sm leading-relaxed text-[var(--dash-text)]">
			Every transactional email lists <code class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-xs">support@digitaldsa.com</code> as the Reply-To address. Replies reach the support inbox during business hours; we'll honour a manual unsubscribe within one business day.
		</p>
	</section>
</div>
