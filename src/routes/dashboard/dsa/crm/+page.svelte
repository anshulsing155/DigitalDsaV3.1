<script lang="ts">
	import { page } from '$app/stores';
	import { ROUTES } from '$lib/config/routes.js';
	import StatCard from '$lib/components/dashboard/StatCard.svelte';
	import MiniDonut from '$lib/components/dashboard/MiniDonut.svelte';
	import {
		Briefcase,
		FileUp,
		TrendingUp,
		Clock,
		BadgeCheck,
		Plus,
		ClipboardList,
		Link2,
		Landmark,
		ArrowLeft,
		FileText
	} from 'lucide-svelte';
	import PipelineColumn from '$lib/components/dashboard/PipelineColumn.svelte';
	import PageTourButton from '$lib/components/walkthrough/PageTourButton.svelte';
	import { formatCurrency } from '$lib/i18n';

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			pipeline: Array<{
				stage: string;
				label: string;
				count: number;
				total_amount: number;
				color: string;
				cases: Array<{
					case_id: string;
					label: string;
					loan_type: string;
					loan_amount: number;
					days_in_stage: number;
					lenders: string[];
				}>;
			}>;
			sourceBreakdown: Array<{
				source_type: string;
				count: number;
				sanctioned_count: number;
				conversion_rate: number;
			}>;
			communicationLog: Array<{
				case_id: string;
				case_label: string;
				event_type: string;
				description: string;
				created_at: string;
			}>;
			metrics: {
				total_cases: number;
				active_cases: number;
				conversion_rate: number;
				avg_days_to_sanction: number;
				total_sanctioned_amount: number;
				this_month_cases: number;
				this_month_sanctioned: number;
			};
			crmCounts?: {
				leads: number;
				sources: number;
				lenders: number;
			};
		}
	);

	// ── State ────────────────────────────────────────────────────
	let commFilter = $state('all');

	// ── Derived ──────────────────────────────────────────────────
	const metrics = $derived(data.metrics);
	const pipeline = $derived(data.pipeline);
	const sourceBreakdown = $derived(data.sourceBreakdown || []);
	const communicationLog = $derived(data.communicationLog || []);

	const totalPipelineCases = $derived(pipeline.reduce((sum, s) => sum + s.count, 0));

	// Donut segments for pipeline overview
	const pipelineDonutSegments = $derived(
		pipeline
			?.filter((s) => s.count > 0)
			.map((s) => ({ value: s.count, color: s.color, label: s.label })) || []
	);

	// Best performing source
	const bestSource = $derived(
		sourceBreakdown.length > 0
			? sourceBreakdown.reduce((best, s) => (s.conversion_rate > best.conversion_rate ? s : best))
			: null
	);

	// Unique event types for the communication filter
	const commEventTypes = $derived(
		Array.from(new Set(communicationLog.map((e) => e.event_type))).sort()
	);

	const filteredCommLog = $derived(
		commFilter === 'all'
			? communicationLog
			: communicationLog.filter((e) => e.event_type === commFilter)
	);

	// Source label map
	const SOURCE_LABELS: Record<string, string> = {
		'walk-in': 'Walk-in',
		builder: 'Builder',
		ca: 'CA / Accountant',
		referral: 'Referral',
		online: 'Online',
		broker: 'Broker',
		self: 'Self',
		unknown: 'Not Specified'
	};

	// Event type display map
	const EVENT_LABELS: Record<string, string> = {
		message_sent: 'Message Sent',
		query_raised: 'Query Raised',
		query_responded: 'Query Responded',
		query_resolved: 'Query Resolved',
		note_added: 'Note Added',
		stage_changed: 'Stage Changed',
		lender_status_changed: 'Lender Update',
		sanction: 'Sanction',
		rejection: 'Rejection',
		disbursement: 'Disbursement'
	};

	// ── Format helpers ──────────────────────────────────────────
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

	function formatDateTime(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Max count for source bar chart
	const maxSourceCount = $derived(
		sourceBreakdown.length > 0 ? Math.max(...sourceBreakdown.map((s) => s.count)) : 1
	);
</script>

<svelte:head>
	<title>CRM | DigitalDSA</title>
</svelte:head>

<div class="pb-20 lg:pb-8">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- HEADER                                                      -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-[var(--dash-text)] sm:text-2xl">CRM Dashboard</h1>
				<PageTourButton pageId="crm" />
			</div>
			<p class="mt-0.5 text-[13px] text-[var(--dash-text-secondary)]">
				Source tracking, pipeline view, and communication log
			</p>
		</div>
		<a
			href="/dashboard/dsa"
			class="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[var(--dash-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
		>
			<ArrowLeft size={14} strokeWidth={2} />
			Dashboard
		</a>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- CRM QUICK NAV (Lucide icons)                                -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" data-walkthrough="crm-nav-grid">
		<a
			href="/dashboard/dsa/crm/leads"
			class="flex items-center gap-3 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-3 shadow-sm transition-all hover:border-[var(--ddsa-primary-300)] hover:shadow-md"
		>
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
			>
				<ClipboardList size={18} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<span class="text-sm font-semibold text-[var(--dash-text)]">Leads</span>
			{#if data.crmCounts?.leads}
				<span
					class="ml-auto rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--dash-accent-text)]"
				>
					{data.crmCounts.leads}
				</span>
			{/if}
		</a>
		<a
			href="/dashboard/dsa/crm/sources"
			class="flex items-center gap-3 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-3 shadow-sm transition-all hover:border-[var(--ddsa-primary-300)] hover:shadow-md"
		>
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
			>
				<Link2 size={18} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<span class="text-sm font-semibold text-[var(--dash-text)]">Sources</span>
			{#if data.crmCounts?.sources}
				<span
					class="ml-auto rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--dash-accent-text)]"
				>
					{data.crmCounts.sources}
				</span>
			{/if}
		</a>
		<a
			href="/dashboard/dsa/crm/lenders"
			class="flex items-center gap-3 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-4 py-3 shadow-sm transition-all hover:border-[var(--ddsa-primary-300)] hover:shadow-md"
		>
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-btn-ghost-bg)]"
			>
				<Landmark size={18} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<span class="text-sm font-semibold text-[var(--dash-text)]">Lenders</span>
			{#if data.crmCounts?.lenders}
				<span
					class="ml-auto rounded-full bg-[var(--dash-btn-ghost-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--dash-accent-text)]"
				>
					{data.crmCounts.lenders}
				</span>
			{/if}
		</a>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- KEY METRICS — 2 rows of 4 + 3, with pipeline donut         -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="mb-5 flex items-start gap-4" data-walkthrough="crm-metrics-grid">
		<div class="flex-1 space-y-3">
			<!-- Row 1: 4 cards -->
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
				<StatCard
					title="Total Cases"
					value={metrics.total_cases}
					subtitle="All time"
					icon={Briefcase}
				/>
				<StatCard
					title="Active Cases"
					value={metrics.active_cases}
					subtitle={metrics.total_cases > 0 ? `of ${metrics.total_cases} total` : 'No cases yet'}
					trend={metrics.active_cases > 0 ? 'up' : 'neutral'}
					icon={FileUp}
				/>
				<StatCard
					title="Conversion Rate"
					value={metrics.conversion_rate > 0 ? `${metrics.conversion_rate}%` : '--'}
					subtitle="Sanctioned / Total"
					trend={metrics.conversion_rate > 20 ? 'up' : 'neutral'}
					icon={TrendingUp}
				/>
				<StatCard
					title="Avg. to Sanction"
					value={metrics.avg_days_to_sanction > 0 ? `${metrics.avg_days_to_sanction}d` : '--'}
					subtitle={metrics.avg_days_to_sanction > 0 ? 'Average days' : 'No data yet'}
					trend="neutral"
					icon={Clock}
				/>
			</div>
			<!-- Row 2: 3 cards -->
			<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
				<StatCard
					title="Sanctioned Value"
					value={metrics.total_sanctioned_amount > 0
						? formatCurrency(metrics.total_sanctioned_amount, true)
						: '--'}
					subtitle="Total sanctioned"
					trend={metrics.total_sanctioned_amount > 0 ? 'up' : 'neutral'}
					icon={BadgeCheck}
				/>
				<StatCard
					title="This Month New"
					value={metrics.this_month_cases}
					subtitle="Cases created"
					trend={metrics.this_month_cases > 0 ? 'up' : 'neutral'}
					icon={Plus}
				/>
				<StatCard
					title="This Month Sanctioned"
					value={metrics.this_month_sanctioned}
					subtitle="Sanctions this month"
					trend={metrics.this_month_sanctioned > 0 ? 'up' : 'neutral'}
					icon={BadgeCheck}
				/>
			</div>
		</div>
		<!-- Pipeline Donut (desktop only) -->
		{#if totalPipelineCases > 0}
			<div
				class="hidden shrink-0 flex-col items-center rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-5 py-4 shadow-sm md:flex"
			>
				<MiniDonut
					segments={pipelineDonutSegments}
					size={120}
					strokeWidth={14}
					centerText={String(totalPipelineCases)}
					centerSubtext="in pipeline"
				/>
				<div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
					{#each pipelineDonutSegments.slice(0, 6) as seg}
						<div class="flex items-center gap-1.5">
							<span class="inline-block h-2 w-2 rounded-full" style="background-color: {seg.color};"
							></span>
							<span class="text-[13px] text-[var(--dash-text-muted)]">{seg.label}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PIPELINE VIEW (KANBAN)                                      -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div
		class="mb-5 rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
		data-walkthrough="crm-pipeline"
	>
		<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-sm font-semibold text-[var(--dash-text)]">Pipeline View</h2>
			<span
				class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
			>
				{totalPipelineCases} case{totalPipelineCases !== 1 ? 's' : ''} across {pipeline.filter(
					(s) => s.count > 0
				).length} stages
			</span>
		</div>

		{#if totalPipelineCases === 0}
			<div class="flex flex-col items-center justify-center py-10 text-center">
				<div
					class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
				>
					<FileText size={28} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
				</div>
				<p class="text-sm font-semibold text-[var(--dash-text-secondary)]">No cases in pipeline</p>
				<p class="mt-0.5 text-xs text-[var(--dash-text-muted)]">
					Create your first case to see it here
				</p>
				<a
					href={ROUTES.FORM.HOW_CAN_WE_HELP}
					class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-[13px] font-semibold text-[var(--dash-btn-text)] transition-colors hover:bg-[var(--ddsa-primary-600)]"
				>
					<Plus size={14} strokeWidth={2} />
					Create Case
				</a>
			</div>
		{:else}
			<div class="flex gap-3 overflow-x-auto pb-2" style="-webkit-overflow-scrolling: touch;">
				{#each pipeline as stage (stage.stage)}
					<PipelineColumn
						stage={stage.stage}
						label={stage.label}
						count={stage.count}
						totalAmount={stage.total_amount}
						cases={stage.cases}
						color={stage.color}
					/>
				{/each}
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- SOURCE + COMMUNICATION (side by side on desktop)            -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div class="grid gap-5 lg:grid-cols-2">
		<!-- SOURCE ANALYSIS -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
			data-walkthrough="crm-source-analysis"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-sm font-semibold text-[var(--dash-text)]">Source Analysis</h2>
				{#if bestSource && bestSource.conversion_rate > 0}
					<span
						class="rounded-full bg-[var(--dash-btn-ghost-bg)] px-2.5 py-0.5 text-[13px] font-semibold text-[var(--dash-accent-text)]"
					>
						Best: {SOURCE_LABELS[bestSource.source_type] || bestSource.source_type} ({bestSource.conversion_rate}%)
					</span>
				{/if}
			</div>

			{#if sourceBreakdown.length === 0}
				<div class="py-6 text-center">
					<p class="text-xs text-[var(--dash-text-muted)]">
						No source data available yet. Add source information to your cases.
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-[13px]">
						<thead>
							<tr class="border-b border-[var(--dash-border)]">
								<th
									class="pr-2 pb-2 pl-3 text-left text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
									>Source</th
								>
								<th
									class="w-16 px-2 pb-2 text-right text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
									>Cases</th
								>
								<th
									class="w-16 px-2 pb-2 text-right text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
									>Sanct.</th
								>
								<th
									class="w-16 px-2 pr-3 pb-2 text-right text-[13px] font-semibold tracking-wider text-[var(--dash-text-secondary)] uppercase"
									>Conv.</th
								>
							</tr>
						</thead>
						<tbody>
							{#each sourceBreakdown as src (src.source_type)}
								{@const isBest =
									bestSource?.source_type === src.source_type && bestSource.conversion_rate > 0}
								<tr
									class="border-b border-[var(--dash-border-light)] {isBest
										? 'bg-[var(--dash-btn-ghost-bg)]/50'
										: ''}"
								>
									<td class="min-w-[100px] py-2.5 pr-2 pl-3">
										<span class="block font-medium text-[var(--dash-text)]"
											>{SOURCE_LABELS[src.source_type] || src.source_type}</span
										>
										<div class="mt-1 h-1 overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
											<div
												class="h-full rounded-full transition-all duration-500"
												style="width: {(src.count / maxSourceCount) *
													100}%; background-color: var(--ddsa-primary-400);"
											></div>
										</div>
									</td>
									<td
										class="px-2 py-2.5 text-right font-semibold text-[var(--dash-text)] tabular-nums"
										>{src.count}</td
									>
									<td
										class="px-2 py-2.5 text-right font-semibold text-[var(--dash-text)] tabular-nums"
										>{src.sanctioned_count}</td
									>
									<td class="px-2 py-2.5 pr-3 text-right">
										<span
											class="text-xs font-semibold {src.conversion_rate >= 30
												? 'text-[var(--dash-accent-text)]'
												: src.conversion_rate > 0
													? 'text-[var(--dash-accent-text)]'
													: 'text-[var(--dash-text-muted)]'}"
										>
											{src.conversion_rate}%
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- COMMUNICATION LOG -->
		<div
			class="rounded-xl border border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] p-4 shadow-sm md:p-5"
			data-walkthrough="crm-comm-log"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-sm font-semibold text-[var(--dash-text)]">Communication Log</h2>
				<span
					class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--dash-text-secondary)]"
				>
					{communicationLog.length} events
				</span>
			</div>

			<!-- Filter tabs -->
			{#if commEventTypes.length > 1}
				<div class="mb-3 flex flex-wrap gap-1.5 border-b border-[var(--dash-border-light)] pb-2">
					<button
						class="rounded-md border px-2 py-1 text-[13px] font-medium transition-colors
							{commFilter === 'all'
							? 'border-[var(--ddsa-primary-300)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
							: 'border-[var(--dash-border)] bg-[var(--dash-input-bg)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
						onclick={() => (commFilter = 'all')}
					>
						All
					</button>
					{#each commEventTypes as et (et)}
						<button
							class="rounded-md border px-2 py-1 text-[13px] font-medium transition-colors
								{commFilter === et
								? 'border-[var(--ddsa-primary-300)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
								: 'border-[var(--dash-border)] bg-[var(--dash-input-bg)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
							onclick={() => (commFilter = et)}
						>
							{EVENT_LABELS[et] || et.replace(/_/g, ' ')}
						</button>
					{/each}
				</div>
			{/if}

			{#if filteredCommLog.length === 0}
				<div class="py-6 text-center">
					<p class="text-xs text-[var(--dash-text-muted)]">
						{commFilter === 'all'
							? 'No communication events yet. Events will appear as you work on cases.'
							: 'No events matching this filter.'}
					</p>
				</div>
			{:else}
				<div class="flex max-h-[420px] flex-col overflow-y-auto">
					{#each filteredCommLog as entry (entry.case_id + entry.created_at)}
						<div
							class="flex items-start gap-2.5 border-b border-[var(--dash-border-light)] py-2.5 last:border-b-0"
						>
							<span class="mt-1.5 block h-2 w-2 shrink-0 rounded-full bg-[var(--ddsa-primary-400)]"
							></span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between gap-2">
									<a
										href="/dashboard/dsa/cases/{entry.case_id}"
										class="truncate text-xs font-semibold text-[var(--dash-accent-text)] hover:underline"
									>
										{entry.case_label}
									</a>
									<span
										class="shrink-0 text-[13px] text-[var(--dash-text-muted)]"
										title={formatDateTime(entry.created_at)}
									>
										{formatTimeAgo(entry.created_at)}
									</span>
								</div>
								<span class="text-[13px] font-semibold text-[var(--dash-accent-text)]">
									{EVENT_LABELS[entry.event_type] || entry.event_type.replace(/_/g, ' ')}
								</span>
								<p
									class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--dash-text-secondary)]"
								>
									{entry.description}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
