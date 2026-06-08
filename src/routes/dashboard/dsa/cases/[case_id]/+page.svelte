<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import LenderApplicationCard from '$lib/components/dashboard/LenderApplicationCard.svelte';
	import LenderComparisonTable from '$lib/components/dashboard/LenderComparisonTable.svelte';
	import ShareLinkButton from '$lib/components/ShareLinkButton.svelte';
	import { bankData } from '$lib/config/bankSelection/bankName';
	import { openConfirmModal } from '$lib/stores/confirmModal';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import TaskSection from '$lib/components/dashboard/TaskSection.svelte';
	import type { Activity } from '$lib/data/sampleDashboardData';
	import { formatCurrency } from '$lib/i18n';
	import { loanTypeLabel } from '$lib/config/loanTypeLabels';

	// ── Server data ──────────────────────────────────────────────
	const layoutData = $derived(
		$page.data as {
			caseData: {
				case_id: string;
				label: string;
				stage: string;
				stage_label: string;
				loan: {
					type: string;
					amount_required?: number;
					tenure_years?: number;
					purpose?: string;
				};
				lender_applications: Array<{
					lender_application_id: string;
					lender_id: string;
					lender_name: string;
					status: string;
					status_history: any[];
					eligibility_snapshot?: {
						traffic_light: 'green' | 'amber' | 'red' | 'grey';
						message: string;
						computed_at: string;
					};
					document_checklist: any[];
					queries: any[];
					lender_tracking?: any;
					sanction?: any;
					file_snapshots: any[];
					created_at: string;
					updated_at: string;
				}>;
				primary_lender_id?: string | null;
				optional_contact?: {
					full_name?: string;
					mobile?: string;
					email?: string;
				};
				source?: {
					type?: string;
					label?: string;
				};
				notes?: string;
				is_sample: boolean;
				form_submission_id?: string;
				created_at: string;
				updated_at: string;
			};
			stageLabels: Record<string, string>;
		}
	);

	const pageData = $derived(
		$page.data as {
			recentTimeline: Array<{
				event_type: string;
				description: string;
				created_at: string;
				metadata?: Record<string, any>;
			}>;
			rmContacts: Array<{
				rm_name: string;
				lender_name: string;
				phone?: string;
				whatsapp?: string;
				designation?: string;
			}>;
			attentionItems: Array<{
				type: 'open_query' | 'expiring_document' | 'stuck_stage';
				label: string;
				description: string;
				severity: 'warning' | 'critical';
				lender_name?: string;
			}>;
		}
	);

	const caseData = $derived(layoutData.caseData);
	const shareLinksEnabled = $derived(
		($page.data as { shareLinksEnabled?: boolean }).shareLinksEnabled ?? false
	);
	const recentTimeline = $derived(pageData.recentTimeline || []);
	const rmContacts = $derived(pageData.rmContacts || []);
	const attentionItems = $derived(pageData.attentionItems || []);

	// ── Lender status transitions (matching ALLOWED_LENDER_STATUS_TRANSITIONS) ──
	const LENDER_STATUS_TRANSITIONS: Record<string, string[]> = {
		selected: ['file_building', 'withdrawn'],
		file_building: ['ready', 'withdrawn'],
		ready: ['submitted', 'withdrawn'],
		submitted: ['processing', 'rejected', 'withdrawn'],
		processing: ['query', 'sanctioned', 'rejected'],
		query: ['query_responded'],
		query_responded: ['processing', 'rejected'],
		sanctioned: ['disbursed', 'withdrawn'],
		disbursed: [],
		rejected: [],
		withdrawn: []
	};

	const LENDER_STATUS_LABELS: Record<string, string> = {
		selected: 'Selected',
		file_building: 'File Building',
		ready: 'Ready',
		submitted: 'Submitted',
		processing: 'Processing',
		query: 'Query',
		query_responded: 'Query Responded',
		sanctioned: 'Sanctioned',
		disbursed: 'Disbursed',
		rejected: 'Rejected',
		withdrawn: 'Withdrawn'
	};

	function getAvailableStatuses(currentStatus: string) {
		const transitions = LENDER_STATUS_TRANSITIONS[currentStatus] || [];
		return transitions.map((s) => ({
			value: s,
			label: LENDER_STATUS_LABELS[s] || s
		}));
	}

	// ── Comparison view toggle + primary lender state ───────────
	let showComparisonView = $state(false);
	let currentPrimaryLenderId = $state<string | null>(null);

	$effect(() => {
		currentPrimaryLenderId = caseData.primary_lender_id || null;
	});

	function handlePrimaryChange(lenderAppId: string) {
		currentPrimaryLenderId = lenderAppId;
	}

	// ── Add Lender modal ────────────────────────────────────────
	let showAddLenderModal = $state(false);
	let lenderSearch = $state('');
	let selectedLender = $state('');
	let addingLender = $state(false);
	let addLenderError = $state('');

	// ── Item F (2026-06-01) — Add Lender modal enriched with offer details ──
	// Pulls latest LenderResults offers from the layout (see
	// [case_id]/+layout.server.ts lenderOffers load). For each bank in
	// bankData, attach a matching offer when one exists. Sort: lenders WITH
	// offers first (by traffic_light priority: green → amber → red, then by
	// offered_amount desc), then lenders WITHOUT offers (alphabetical).
	// Search filter applies AFTER the enrichment+sort, so the ranking is
	// stable.
	type LenderOffer = {
		lender_id: string;
		lender_name: string;
		traffic_light: 'green' | 'amber' | 'red' | 'grey';
		offered_amount: number;
		roi: number;
		tenure_months: number;
	};

	const lenderOffers = $derived<LenderOffer[] | null>(
		($page.data as { lenderOffers?: LenderOffer[] | null }).lenderOffers ?? null
	);

	// O(1) lookup of offer by bank value (which matches lender_id).
	const offerByLenderId = $derived(() => {
		const map = new Map<string, LenderOffer>();
		if (lenderOffers) for (const o of lenderOffers) map.set(o.lender_id, o);
		return map;
	});

	const TRAFFIC_LIGHT_PRIORITY: Record<'green' | 'amber' | 'red' | 'grey', number> = {
		green: 0,
		amber: 1,
		red: 2,
		grey: 3
	};

	const enrichedBanks = $derived(() => {
		const offers = offerByLenderId();
		return bankData
			.map((b) => {
				const offer = offers.get(b.value);
				return { ...b, offer: offer ?? null };
			})
			.sort((a, b) => {
				const aHasOffer = a.offer !== null;
				const bHasOffer = b.offer !== null;
				if (aHasOffer !== bHasOffer) return aHasOffer ? -1 : 1; // offers first
				if (aHasOffer && bHasOffer) {
					const tlDiff =
						TRAFFIC_LIGHT_PRIORITY[a.offer!.traffic_light] -
						TRAFFIC_LIGHT_PRIORITY[b.offer!.traffic_light];
					if (tlDiff !== 0) return tlDiff;
					return b.offer!.offered_amount - a.offer!.offered_amount; // higher offer wins ties
				}
				return a.label.localeCompare(b.label); // alphabetical for no-offer rows
			});
	});

	const filteredBanks = $derived(
		lenderSearch.trim() === ''
			? enrichedBanks()
			: enrichedBanks().filter((b) => b.label.toLowerCase().includes(lenderSearch.toLowerCase()))
	);

	const offersCount = $derived(lenderOffers?.length ?? 0);
	const hasAnyOffers = $derived(offersCount > 0);

	function formatLakhs(amount: number): string {
		if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
		if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
		return `₹${amount.toLocaleString('en-IN')}`;
	}

	function formatTenureYears(months: number): string {
		const years = months / 12;
		return years % 1 === 0 ? `${years}y` : `${years.toFixed(1)}y`;
	}

	async function addLender() {
		if (!selectedLender) return;
		addingLender = true;
		addLenderError = '';

		try {
			const res = await secureFetch(`/api/cases/${caseData.case_id}/lender-applications`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lender_id: selectedLender,
					lender_name: selectedLender
				})
			});

			const result = await res.json();

			if (result.success) {
				showAddLenderModal = false;
				selectedLender = '';
				lenderSearch = '';
				goto($page.url.pathname, { invalidateAll: true });
			} else {
				addLenderError = result.error || 'Failed to add lender';
			}
		} catch {
			addLenderError = 'Network error. Please try again.';
		} finally {
			addingLender = false;
		}
	}

	let removeLenderError = $state('');
	let removingLender = $state(false);

	function removeLender(lenderAppId: string) {
		if (removingLender) return;
		openConfirmModal(
			'Remove Lender',
			'Remove this lender application? This cannot be undone.',
			async () => {
				removeLenderError = '';
				removingLender = true;
				try {
					const res = await secureFetch(
						`/api/cases/${caseData.case_id}/lender-applications/${lenderAppId}`,
						{
							method: 'DELETE'
						}
					);

					const result = await res.json();
					if (result.success) {
						goto($page.url.pathname, { invalidateAll: true });
					} else {
						removeLenderError = result.error || 'Failed to remove lender';
					}
				} catch {
					removeLenderError = 'Network error. Please try again.';
				} finally {
					removingLender = false;
				}
			},
			{ confirmLabel: 'Remove' }
		);
	}

	// ── Contact editing ─────────────────────────────────────────
	let showContactSection = $state(false);
	let contactName = $state('');
	let contactMobile = $state('');
	let contactEmail = $state('');
	let savingContact = $state(false);
	let contactSaveError = $state('');

	$effect(() => {
		contactName = caseData.optional_contact?.full_name || '';
		contactMobile = caseData.optional_contact?.mobile || '';
		contactEmail = caseData.optional_contact?.email || '';
	});

	async function saveContact() {
		savingContact = true;
		contactSaveError = '';
		try {
			const res = await secureFetch(`/api/cases/${caseData.case_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					optional_contact: {
						full_name: contactName || undefined,
						mobile: contactMobile || undefined,
						email: contactEmail || undefined
					}
				})
			});
			if (!res.ok) {
				contactSaveError = 'Failed to save contact info';
			}
		} catch {
			contactSaveError = 'Network error. Could not save contact info.';
		} finally {
			savingContact = false;
		}
	}

	// ── Source editing ───────────────────────────────────────────
	let showSourceSection = $state(false);
	let sourceType = $state('');
	let sourceLabel = $state('');
	let savingSource = $state(false);
	let sourceSaveError = $state('');

	$effect(() => {
		sourceType = caseData.source?.type || '';
		sourceLabel = caseData.source?.label || '';
	});

	async function saveSource() {
		savingSource = true;
		sourceSaveError = '';
		try {
			const res = await secureFetch(`/api/cases/${caseData.case_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source: {
						type: sourceType || undefined,
						label: sourceLabel || undefined
					}
				})
			});
			if (!res.ok) {
				sourceSaveError = 'Failed to save source info';
			}
		} catch {
			sourceSaveError = 'Network error. Could not save source info.';
		} finally {
			savingSource = false;
		}
	}

	// ── Private notes ───────────────────────────────────────────
	let notesText = $state('');
	let savingNotes = $state(false);
	let notesSaveError = $state('');
	let notesTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		notesText = caseData.notes || '';
	});

	function handleNotesInput(value: string) {
		notesText = value;
		notesSaveError = '';
		clearTimeout(notesTimeout);
		notesTimeout = setTimeout(() => saveNotes(), 2000);
	}

	async function saveNotes() {
		savingNotes = true;
		notesSaveError = '';
		try {
			const res = await secureFetch(`/api/cases/${caseData.case_id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes: notesText })
			});
			if (!res.ok) {
				notesSaveError = 'Failed to save notes';
			}
		} catch {
			notesSaveError = 'Network error. Could not save notes.';
		} finally {
			savingNotes = false;
		}
	}

	// ── Timeline format helpers ─────────────────────────────────
	const EVENT_TYPE_MAP: Record<string, { type: Activity['type'] }> = {
		case_created: { type: 'info' },
		case_updated: { type: 'info' },
		stage_changed: { type: 'info' },
		lender_added: { type: 'info' },
		lender_status_changed: { type: 'warning' },
		document_uploaded: { type: 'success' },
		document_status_changed: { type: 'info' },
		document_expiring: { type: 'warning' },
		query_raised: { type: 'warning' },
		query_responded: { type: 'info' },
		query_resolved: { type: 'success' },
		review_pdf_generated: { type: 'info' },
		submission_pdf_generated: { type: 'success' },
		message_sent: { type: 'info' },
		note_added: { type: 'neutral' },
		form_updated: { type: 'info' },
		rejection: { type: 'error' },
		sanction: { type: 'success' },
		disbursement: { type: 'success' }
	};

	const dotColor: Record<string, string> = {
		success: 'bg-green-500',
		info: 'bg-[var(--dash-accent-text)]',
		warning: 'bg-amber-500',
		error: 'bg-red-500',
		neutral: 'bg-[var(--dash-text-muted)]'
	};

	function formatTimeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	}

	const SOURCE_TYPES = [
		{ value: 'walk-in', label: 'Walk-in' },
		{ value: 'builder', label: 'Builder' },
		{ value: 'ca', label: 'CA' },
		{ value: 'referral', label: 'Referral' },
		{ value: 'online', label: 'Online' },
		{ value: 'broker', label: 'Broker' },
		{ value: 'self', label: 'Self' }
	];
</script>

<svelte:head>
	<title>Case Detail | DigitalDSA</title>
</svelte:head>

<div class="space-y-6">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- ATTENTION ITEMS                                            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if attentionItems.length > 0}
		<div
			class="rounded-xl border border-[var(--dash-contrast-ghost-border)] bg-[var(--dash-contrast-ghost-bg)] p-4"
		>
			<h3
				class="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--dash-contrast-text)]"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008z"
					/>
				</svg>
				Needs Attention
				<span
					class="rounded-full bg-[var(--dash-contrast-ghost-bg)] px-1.5 py-0.5 text-[12px] font-bold text-[var(--dash-contrast-text)]"
					>{attentionItems.length}</span
				>
			</h3>
			<div class="space-y-2">
				{#each attentionItems as item}
					<div
						class="flex items-start gap-2 rounded-lg bg-[var(--dash-bg-card)] px-3 py-2 {item.severity ===
						'critical'
							? 'border border-[var(--dash-contrast-ghost-border)]'
							: 'border border-[var(--dash-border)]'}"
					>
						<span
							class="mt-0.5 h-2 w-2 shrink-0 rounded-full {item.severity === 'critical'
								? 'bg-red-500'
								: 'bg-amber-500'}"
							role="img"
							aria-label={item.severity === 'critical' ? 'Critical' : 'Warning'}
						></span>
						<div>
							<p class="text-xs font-semibold text-[var(--dash-text)]">{item.label}</p>
							<p class="text-[13px] text-[var(--dash-text-secondary)]">{item.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- SUMMARY CARDS ROW                                          -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<!-- Loan Details -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
		>
			<h3 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Loan Details</h3>
			<div class="space-y-2.5">
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Type</span>
					<span class="text-xs font-semibold text-[var(--dash-text)]">{loanTypeLabel(caseData.loan.type)}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Amount</span>
					<span class="text-sm font-bold text-[var(--dash-text)]">
						{caseData.loan.amount_required
							? `${formatCurrency(caseData.loan.amount_required, true)}`
							: '--'}
					</span>
				</div>
				{#if caseData.loan.tenure_years}
					<div class="flex items-center justify-between">
						<span class="text-xs text-[var(--dash-text-secondary)]">Tenure</span>
						<span class="text-xs font-semibold text-[var(--dash-text)]"
							>{caseData.loan.tenure_years} years</span
						>
					</div>
				{/if}
				{#if caseData.loan.purpose}
					<div class="flex items-center justify-between">
						<span class="text-xs text-[var(--dash-text-secondary)]">Purpose</span>
						<span class="text-xs font-semibold text-[var(--dash-text)]"
							>{caseData.loan.purpose}</span
						>
					</div>
				{/if}
			</div>
		</div>

		<!-- Case Info -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
		>
			<h3 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Case Info</h3>
			<div class="space-y-2.5">
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Stage</span>
					<span class="text-xs font-semibold text-[var(--dash-text)]">{caseData.stage_label}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Lenders</span>
					<span class="text-xs font-semibold text-[var(--dash-text)]"
						>{caseData.lender_applications.length}</span
					>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Created</span>
					<span class="text-xs font-semibold text-[var(--dash-text)]">
						{new Date(caseData.created_at).toLocaleDateString('en-IN', {
							day: 'numeric',
							month: 'short',
							year: 'numeric'
						})}
					</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-xs text-[var(--dash-text-secondary)]">Last Updated</span>
					<span class="text-xs font-semibold text-[var(--dash-text)]"
						>{formatTimeAgo(caseData.updated_at)}</span
					>
				</div>
				{#if caseData.form_submission_id}
					<div class="flex items-center justify-between">
						<span class="text-xs text-[var(--dash-text-secondary)]">Form</span>
						<span
							class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-accent-text)]"
							>Linked</span
						>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- SHARE FORM WITH APPLICANT                                  -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if caseData.form_submission_id}
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
		>
			<h3 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">Quick Actions</h3>
			<ShareLinkButton
				applicationId={caseData.form_submission_id}
				applicantIndex={0}
				applicantName={caseData.optional_contact?.full_name || 'Applicant'}
				featureEnabled={shareLinksEnabled}
			/>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- LENDER APPLICATIONS                                        -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h3 class="text-sm font-semibold text-[var(--dash-text)]">
				Lender Applications
				{#if caseData.lender_applications.length > 0}
					<span
						class="ml-1 rounded-full bg-[var(--dash-bg-alt)] px-2 py-0.5 text-[12px] text-[var(--dash-text-secondary)]"
					>
						{caseData.lender_applications.length}
					</span>
				{/if}
			</h3>
			<div class="flex items-center gap-2">
				{#if caseData.lender_applications.length >= 2}
					<button
						onclick={() => (showComparisonView = !showComparisonView)}
						class="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--dash-text)] transition-colors hover:border-[var(--ddsa-accent-500)]/50 hover:bg-[var(--dash-btn-ghost-bg)] hover:text-[var(--ddsa-accent-500)]"
					>
						<svg
							class="h-3.5 w-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
							/>
						</svg>
						{showComparisonView ? 'Card View' : 'Compare'}
					</button>
				{/if}
				<button
					onclick={() => (showAddLenderModal = true)}
					class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--dash-btn-text)] transition-all hover:brightness-105"
				>
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
					Add Lender
				</button>
			</div>
		</div>

		{#if removeLenderError}
			<div
				class="mb-3 rounded-lg bg-[var(--dash-contrast-ghost-bg)] px-3 py-2 text-xs font-medium text-[var(--dash-contrast-text)]"
			>
				{removeLenderError}
			</div>
		{/if}

		{#if caseData.lender_applications.length > 0}
			{#if showComparisonView}
				<LenderComparisonTable
					lenderApplications={caseData.lender_applications}
					primaryLenderId={currentPrimaryLenderId}
					caseId={caseData.case_id}
					onPrimaryChange={handlePrimaryChange}
				/>
			{:else}
				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{#each caseData.lender_applications as la}
						<LenderApplicationCard
							lenderApp={la}
							caseId={caseData.case_id}
							availableStatuses={getAvailableStatuses(la.status)}
							onRemove={removeLender}
							onRefresh={() => goto($page.url.pathname, { invalidateAll: true })}
						/>
					{/each}
				</div>
			{/if}
		{:else}
			<!-- Empty-state CTA removed 2026-06-01 — the section-header "Add
			     Lender" button at the top of this section is always visible
			     above this empty state, so the empty-state CTA was a duplicate
			     ("why same button twice?" owner feedback). -->
			<EmptyState
				title="No lenders added yet"
				description="Use the Add Lender button above to start building the file."
				variant="default"
			/>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- MAIN CONTENT: 2-column layout                              -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- LEFT: Contact, Source, Notes -->
		<div class="space-y-4 lg:col-span-2">
			<!-- Optional Contact Section -->
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm"
			>
				<button
					onclick={() => (showContactSection = !showContactSection)}
					class="flex w-full items-center justify-between px-4 py-3 text-left"
				>
					<div class="flex items-center gap-2">
						<svg
							class="h-4 w-4 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
							/>
						</svg>
						<h3 class="text-sm font-semibold text-[var(--dash-text)]">Contact Info</h3>
						{#if caseData.optional_contact?.full_name}
							<span
								class="rounded bg-[var(--dash-btn-ghost-bg)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-accent-text)]"
								>Provided</span
							>
						{:else}
							<span
								class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)]"
								>Optional</span
							>
						{/if}
					</div>
					<svg
						class="h-4 w-4 text-[var(--dash-text-muted)] transition-transform {showContactSection
							? 'rotate-180'
							: ''}"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
					</svg>
				</button>

				{#if showContactSection}
					<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
						<p class="mb-3 text-[13px] text-[var(--dash-text-muted)]">
							Unlocks personalized messages and WhatsApp one-tap.
						</p>
						<div class="space-y-3">
							<div>
								<label
									for="case-contact-name"
									class="mb-1 block text-[13px] font-medium text-[var(--dash-text-secondary)]"
									>Full Name</label
								>
								<input
									id="case-contact-name"
									type="text"
									value={contactName}
									oninput={(e) => (contactName = e.currentTarget.value)}
									onblur={saveContact}
									placeholder="Applicant full name"
									class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
								/>
							</div>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div>
									<label
										for="case-contact-mobile"
										class="mb-1 block text-[13px] font-medium text-[var(--dash-text-secondary)]"
										>Mobile</label
									>
									<input
										id="case-contact-mobile"
										type="tel"
										value={contactMobile}
										oninput={(e) => (contactMobile = e.currentTarget.value)}
										onblur={saveContact}
										placeholder="+91 9876543210"
										class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
									/>
								</div>
								<div>
									<label
										for="case-contact-email"
										class="mb-1 block text-[13px] font-medium text-[var(--dash-text-secondary)]"
										>Email</label
									>
									<input
										id="case-contact-email"
										type="email"
										value={contactEmail}
										oninput={(e) => (contactEmail = e.currentTarget.value)}
										onblur={saveContact}
										placeholder="name@email.com"
										class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
									/>
								</div>
							</div>
							{#if savingContact}
								<p class="text-[12px] text-[var(--dash-text-muted)]">Saving...</p>
							{/if}
							{#if contactSaveError}
								<p class="text-[12px] font-medium text-[var(--dash-contrast-text)]">
									{contactSaveError}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Source Section -->
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] shadow-sm"
			>
				<button
					onclick={() => (showSourceSection = !showSourceSection)}
					class="flex w-full items-center justify-between px-4 py-3 text-left"
				>
					<div class="flex items-center gap-2">
						<svg
							class="h-4 w-4 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757"
							/>
						</svg>
						<h3 class="text-sm font-semibold text-[var(--dash-text)]">Source</h3>
						{#if caseData.source?.type}
							<span
								class="rounded bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--dash-text-secondary)] capitalize"
							>
								{caseData.source.type}
							</span>
						{/if}
					</div>
					<svg
						class="h-4 w-4 text-[var(--dash-text-muted)] transition-transform {showSourceSection
							? 'rotate-180'
							: ''}"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
					</svg>
				</button>

				{#if showSourceSection}
					<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
						<div class="space-y-3">
							<div>
								<label
									for="case-source-type"
									class="mb-1 block text-[13px] font-medium text-[var(--dash-text-secondary)]"
									>Source Type</label
								>
								<select
									id="case-source-type"
									value={sourceType}
									onchange={(e) => {
										sourceType = e.currentTarget.value;
										saveSource();
									}}
									class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
								>
									<option value="">Not specified</option>
									{#each SOURCE_TYPES as st}
										<option value={st.value}>{st.label}</option>
									{/each}
								</select>
							</div>
							<div>
								<label
									for="case-source-label"
									class="mb-1 block text-[13px] font-medium text-[var(--dash-text-secondary)]"
									>Source Label</label
								>
								<input
									id="case-source-label"
									type="text"
									value={sourceLabel}
									oninput={(e) => (sourceLabel = e.currentTarget.value)}
									onblur={saveSource}
									placeholder="e.g. Builder name, referral name"
									class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
								/>
							</div>
							{#if sourceSaveError}
								<p class="text-[12px] font-medium text-[var(--dash-contrast-text)]">
									{sourceSaveError}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Private Notes -->
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
			>
				<div class="mb-2 flex items-center justify-between">
					<h3 class="flex items-center gap-2 text-sm font-semibold text-[var(--dash-text)]">
						<svg
							class="h-4 w-4 text-[var(--dash-text-muted)]"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
							/>
						</svg>
						Private Notes
					</h3>
					{#if savingNotes}
						<span class="text-[12px] text-[var(--dash-text-muted)]">Saving...</span>
					{:else if notesSaveError}
						<span class="text-[12px] font-medium text-[var(--dash-contrast-text)]"
							>{notesSaveError}</span
						>
					{/if}
				</div>
				<textarea
					value={notesText}
					oninput={(e) => handleNotesInput(e.currentTarget.value)}
					onblur={saveNotes}
					placeholder="Add private notes about this case... (auto-saves)"
					rows="3"
					class="w-full resize-none rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-3 py-2 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
				></textarea>
			</div>

			<!-- Tasks -->
			<TaskSection caseId={caseData.case_id} />
		</div>

		<!-- RIGHT: Timeline + RM Contacts -->
		<div class="space-y-4">
			<!-- Recent Timeline -->
			<div
				class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
			>
				<h3 class="mb-4 text-sm font-semibold text-[var(--dash-text)]">Recent Timeline</h3>
				{#if recentTimeline.length > 0}
					<div class="space-y-0">
						{#each recentTimeline.slice(0, 5) as event, i}
							{@const mapped = EVENT_TYPE_MAP[event.event_type] || { type: 'neutral' as const }}
							<div class="flex gap-3 {i < Math.min(recentTimeline.length, 5) - 1 ? 'pb-4' : ''}">
								<div class="flex flex-col items-center">
									<div class="mt-1 h-2.5 w-2.5 rounded-full {dotColor[mapped.type]}"></div>
									{#if i < Math.min(recentTimeline.length, 5) - 1}
										<div class="w-px flex-1 bg-[var(--dash-border)]"></div>
									{/if}
								</div>
								<div class="flex-1 pb-1">
									<p class="text-sm font-medium text-[var(--dash-text)]">
										{event.event_type
											.replace(/_/g, ' ')
											.replace(/\b\w/g, (c: string) => c.toUpperCase())}
									</p>
									<p class="text-xs text-[var(--dash-text-secondary)]">{event.description}</p>
									<p class="mt-1 text-[12px] text-[var(--dash-text-muted)]">
										{formatTimeAgo(event.created_at)}
									</p>
								</div>
							</div>
						{/each}
					</div>
					{#if recentTimeline.length > 5}
						<a
							href="./timeline"
							class="mt-3 block text-center text-xs font-medium text-[var(--ddsa-accent-500)] transition-colors hover:text-[var(--ddsa-accent-600)]"
						>
							View Full Timeline
						</a>
					{/if}
				{:else}
					<EmptyState
						title="No activity yet"
						description="Events will appear as you work on this case"
						variant="compact"
					/>
				{/if}
			</div>

			<!-- RM Contacts -->
			{#if rmContacts.length > 0}
				<div
					class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm"
				>
					<h3 class="mb-3 text-sm font-semibold text-[var(--dash-text)]">RM Contacts</h3>
					<div class="space-y-2">
						{#each rmContacts as rm}
							<div class="flex items-center gap-3 rounded-lg bg-[var(--dash-bg-alt)] px-3 py-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
								>
									<span class="text-xs font-bold text-[var(--dash-accent-text)]">
										{rm.rm_name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-xs font-semibold text-[var(--dash-text)]">
										{rm.rm_name}
									</p>
									<p class="text-[12px] text-[var(--dash-text-secondary)]">
										{rm.lender_name}{rm.designation ? ` - ${rm.designation}` : ''}
									</p>
								</div>
								{#if rm.phone}
									<a
										href="tel:{rm.phone}"
										class="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)] transition-colors hover:brightness-95"
										title="Call"
									>
										<svg
											class="h-3.5 w-3.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
											/>
										</svg>
									</a>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- ADD LENDER MODAL                                           -->
<!-- ═══════════════════════════════════════════════════════════ -->
{#if showAddLenderModal}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Add lender application"
		tabindex="-1"
		onclick={(e) => {
			if (e.target === e.currentTarget) {
				showAddLenderModal = false;
				lenderSearch = '';
				selectedLender = '';
				addLenderError = '';
			}
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				showAddLenderModal = false;
				lenderSearch = '';
				selectedLender = '';
				addLenderError = '';
			}
		}}
	>
		<div class="w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] shadow-2xl">
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between border-b border-[var(--dash-border-light)] px-5 py-4"
			>
				<h3 class="text-base font-bold text-[var(--dash-text)]">Add Lender</h3>
				<button
					onclick={() => {
						showAddLenderModal = false;
						lenderSearch = '';
						selectedLender = '';
						addLenderError = '';
					}}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text-secondary)]"
					aria-label="Close add lender modal"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Modal Body -->
			<div class="px-5 py-4">
				<!-- Search -->
				<div class="relative mb-3">
					<svg
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--dash-text-muted)]"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
						/>
					</svg>
					<input
						type="text"
						placeholder="Search banks..."
						value={lenderSearch}
						oninput={(e) => (lenderSearch = e.currentTarget.value)}
						class="w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] py-2 pr-4 pl-10 text-sm text-[var(--dash-text-secondary)] placeholder:text-[var(--dash-text-muted)] focus:border-[var(--ddsa-accent-500)] focus:bg-[var(--dash-bg-card)] focus:ring-2 focus:ring-[var(--ddsa-accent-500)]/20 focus:outline-none"
					/>
				</div>

				<!-- Item F — header note: surface offer-count context. When the
				     case has been evaluated, show the count + "ranked by best
				     offer". When no evaluation yet (Intake / quota_blocked),
				     explain why offers aren't shown. -->
				<p class="mb-2 text-[11px] text-[var(--dash-text-muted)]">
					{#if hasAnyOffers}
						{offersCount} lender{offersCount === 1 ? '' : 's'} with offers — ranked by best offer first.
					{:else}
						Submit the application to compute lender offers. List shown alphabetically until then.
					{/if}
				</p>

				<!-- Bank list (Item F — enriched rows with offer details when available) -->
				<div class="max-h-72 overflow-y-auto rounded-lg border border-[var(--dash-border)]">
					{#each filteredBanks as bank}
						{@const isSelected = selectedLender === bank.value}
						{@const offer = bank.offer}
						<button
							onclick={() => (selectedLender = bank.value)}
							class="flex w-full items-start gap-3 border-b border-[var(--dash-border-light)] px-3 py-2 text-left transition-colors last:border-b-0 {isSelected
								? 'bg-[var(--dash-btn-ghost-bg)]'
								: 'hover:bg-[var(--dash-hover)]'}"
						>
							<!-- Classification badge (GOV / PVT / etc.) -->
							<div
								class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md {isSelected
									? 'bg-[var(--ddsa-accent-500)] text-white'
									: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
							>
								<span class="text-[11px] font-bold">{bank.Classification}</span>
							</div>

							<div class="min-w-0 flex-1">
								<!-- Bank name + traffic-light dot when an offer exists -->
								<div class="flex items-center gap-2">
									{#if offer}
										<span
											class="h-2 w-2 shrink-0 rounded-full {offer.traffic_light === 'green'
												? 'bg-emerald-500'
												: offer.traffic_light === 'amber'
													? 'bg-amber-500'
													: offer.traffic_light === 'red'
														? 'bg-rose-500'
														: 'bg-[var(--dash-text-muted)]'}"
											aria-label="Offer rating: {offer.traffic_light}"
										></span>
									{/if}
									<span
										class="truncate text-sm font-medium {isSelected
											? 'text-[var(--ddsa-accent-500)]'
											: 'text-[var(--dash-text)]'}"
									>
										{bank.label}
									</span>
								</div>

								<!-- Inline offer details — Amount / ROI / Tenure -->
								{#if offer}
									<div
										class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--dash-text-secondary)]"
									>
										<span><strong>{formatLakhs(offer.offered_amount)}</strong> approved</span>
										<span class="text-[var(--dash-text-muted)]">·</span>
										<span><strong>{offer.roi.toFixed(2)}%</strong> ROI</span>
										<span class="text-[var(--dash-text-muted)]">·</span>
										<span><strong>{formatTenureYears(offer.tenure_months)}</strong> tenure</span>
									</div>
								{/if}
							</div>

							{#if isSelected}
								<svg
									class="mt-1 h-4 w-4 shrink-0 text-[var(--ddsa-accent-500)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
								</svg>
							{/if}
						</button>
					{/each}
					{#if filteredBanks.length === 0}
						<div class="px-4 py-6 text-center">
							<p class="text-sm text-[var(--dash-text-secondary)]">No banks found</p>
						</div>
					{/if}
				</div>

				{#if addLenderError}
					<p class="mt-2 text-xs font-medium text-[var(--dash-contrast-text)]">{addLenderError}</p>
				{/if}
			</div>

			<!-- Modal Footer -->
			<div
				class="flex items-center justify-end gap-3 border-t border-[var(--dash-border-light)] px-5 py-4"
			>
				<button
					onclick={() => {
						showAddLenderModal = false;
						lenderSearch = '';
						selectedLender = '';
						addLenderError = '';
					}}
					class="rounded-lg border border-[var(--dash-border)] px-4 py-2 text-sm font-medium text-[var(--dash-text)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</button>
				<button
					onclick={addLender}
					disabled={!selectedLender || addingLender}
					class="rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-sm font-semibold text-[var(--dash-btn-text)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{addingLender ? 'Adding...' : 'Add Lender'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@media (max-width: 768px) {
		/* Ensure bank list items have adequate touch targets */
		:global(.max-h-60 button) {
			min-height: 2.75rem;
		}

		/* Lender header buttons: stack if needed */
		:global(.mb-4.flex.items-center.justify-between) {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		/* Modal footer buttons: min touch target */
		:global(.border-t.border-\[var\(--dash-border-light\)\] button) {
			min-height: 2.75rem;
		}
	}
</style>
