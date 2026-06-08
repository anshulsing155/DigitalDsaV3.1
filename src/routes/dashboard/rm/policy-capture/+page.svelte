<script lang="ts">
	import { ROUTES } from '$lib/config/routes.js';
	import {
		Plus,
		FileText,
		Calendar,
		CheckCircle2,
		AlertCircle,
		ChevronRight
	} from '$lib/utils/iconRegistry';

	let { data } = $props();

	const statusColors: Record<string, string> = {
		draft: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		under_review: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		accepted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		clarification_needed: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]'
	};

	const statusLabels: Record<string, string> = {
		draft: 'Draft',
		submitted: 'Submitted',
		under_review: 'Under Review',
		accepted: 'Accepted',
		rejected: 'Rejected',
		clarification_needed: 'Needs Clarification'
	};

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>RM: Policy Capture | DigitalDSA</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<a
				href={ROUTES.DASHBOARD.RM.ROOT}
				class="text-sm text-[var(--dash-text-muted)] hover:text-[var(--dash-text-secondary)]"
			>
				Back to Dashboard
			</a>
			<h1 class="mt-2 text-2xl font-bold text-[var(--dash-text)]">Policy Capture</h1>
			<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
				Fill structured policy forms for your bank's lending products
			</p>
		</div>
		<a
			href="{ROUTES.DASHBOARD.RM.POLICY_CAPTURE}/new"
			class="inline-flex items-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] transition-colors hover:brightness-105"
		>
			<Plus class="h-4 w-4" />
			New Capture
		</a>
	</div>

	<!-- Empty state -->
	{#if data.captures.length === 0}
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-12 text-center"
		>
			<FileText class="mx-auto h-12 w-12 text-[var(--dash-text-muted)]" />
			<h3 class="mt-4 text-lg font-medium text-[var(--dash-text)]">No policy captures yet</h3>
			<p class="mt-2 text-sm text-[var(--dash-text-secondary)]">
				Start by creating a new policy capture for your bank's lending products. The form will guide
				you through every parameter our system needs.
			</p>
			<a
				href="{ROUTES.DASHBOARD.RM.POLICY_CAPTURE}/new"
				class="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--dash-btn-bg)] px-5 py-2.5 text-sm font-medium text-[var(--dash-btn-text)] hover:brightness-105"
			>
				<Plus class="h-4 w-4" />
				Create First Capture
			</a>
		</div>
	{:else}
		<!-- Captures list -->
		<div class="space-y-3">
			{#each data.captures as capture}
				<a
					href="{ROUTES.DASHBOARD.RM.POLICY_CAPTURE}/{capture.capture_id}"
					class="block rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-5 transition-all hover:border-[var(--dash-btn-ghost-border)] hover:shadow-sm"
				>
					<div class="flex items-center justify-between">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-3">
								<h3 class="text-base font-semibold text-[var(--dash-text)]">
									{capture.lender_name}
								</h3>
								<span
									class="rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[
										capture.status
									] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
								>
									{statusLabels[capture.status] || capture.status}
								</span>
								{#if capture.provenance_source === 'admin_manual_proxy'}
									<span
										class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-contrast-text)]"
									>
										Entered by admin · confirm
									</span>
								{:else if capture.provenance_source === 'rm_confirmed'}
									<span
										class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-accent-text)]"
									>
										Confirmed by you
									</span>
								{/if}
							</div>
							<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
								{data.productTypeLabels[capture.product_type] || capture.product_type}
							</p>
							<div class="mt-2 flex items-center gap-4 text-xs text-[var(--dash-text-muted)]">
								<span class="flex items-center gap-1">
									<Calendar class="h-3.5 w-3.5" />
									Updated {formatDate(capture.updated_at)}
								</span>
								{#if capture.unknown_fields_count > 0}
									<span class="flex items-center gap-1 text-[var(--dash-contrast-text)]">
										<AlertCircle class="h-3.5 w-3.5" />
										{capture.unknown_fields_count} unknown fields
									</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-4">
							<!-- Completion bar -->
							<div class="flex items-center gap-2">
								<div class="h-2 w-24 overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
									<div
										class="h-full rounded-full transition-all
											{capture.completion_percent >= 80
											? 'bg-[var(--dash-btn-bg)]'
											: capture.completion_percent >= 40
												? 'bg-[var(--dash-btn-bg)]'
												: 'bg-[var(--dash-text-muted)]'}"
										style="width: {capture.completion_percent}%"
									></div>
								</div>
								<span class="text-xs font-medium text-[var(--dash-text-secondary)]"
									>{capture.completion_percent}%</span
								>
							</div>
							<ChevronRight class="h-5 w-5 text-[var(--dash-text-muted)]" />
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
