<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { untrack } from 'svelte';

	// ── Types ────────────────────────────────────────────────────
	interface SerializedMessage {
		sender_role: 'dsa' | 'rm';
		message: string;
		message_type: 'text' | 'case_shared' | 'query' | 'response';
		created_at: string;
	}

	interface SerializedThread {
		_id: string;
		case_id: string;
		dsa_name: string;
		lender_name: string;
		case_label: string;
		case_loan_type: string;
		case_stage: string;
		status: 'active' | 'closed';
		message_count: number;
		unread_count: number;
		last_message: {
			sender_role: 'dsa' | 'rm';
			message: string;
			message_type: string;
			created_at: string;
		} | null;
		// L-N1 (CODE-REVIEW-2026-05-31): messages no longer shipped with
		// the bulk thread list — fetched lazily per selected thread via
		// GET /api/rm/threads/[id]/messages. See messagesByThread cache.
		updated_at: string;
	}

	// ── Server data ──────────────────────────────────────────────
	const data = $derived(
		$page.data as {
			threads: SerializedThread[];
			rmId: string;
		}
	);

	// ── RM Reply Templates (mirrors API) ─────────────────────────
	const RM_REPLY_TEMPLATES = [
		{
			id: 'ack_received',
			label: 'File Received',
			body: 'File received. We will start processing and update you shortly.'
		},
		{
			id: 'query_documents',
			label: 'Need Documents',
			body: 'We need additional documents for this case. Please check the query details and share at the earliest.'
		},
		{
			id: 'processing_update',
			label: 'Processing',
			body: 'Your file is currently being processed. We will update you once there is progress.'
		},
		{
			id: 'sanction_update',
			label: 'Sanctioned',
			body: 'Good news! The loan has been sanctioned. Please check the sanction details.'
		}
	] as const;

	// ── State ────────────────────────────────────────────────────
	let selectedThreadId = $state(untrack(() => (data.threads.length > 0 ? data.threads[0]._id : '')));
	let replyTemplateId = $state('');
	let customMessage = $state('');
	let isSending = $state(false);
	let sendError = $state('');
	let showMobileMessages = $state(false);

	// Audit fix (RM dashboard audit 2026-05-30): per-session client override
	// of the unread count. Keyed by thread id; once we POST mark-seen we
	// zero the badge here and the derived `unreadFor()` reads this before
	// falling back to the server-computed value. Survives until invalidate.
	let locallySeenIds = $state<Record<string, true>>({});

	// L-N1 (CODE-REVIEW-2026-05-31): per-thread message cache. Populated
	// lazy on first selection; survives until invalidateAll() refreshes
	// the page. 'loading' state lets the UI show a spinner without
	// double-fetching while a request is in flight.
	type MessageCacheEntry =
		| { status: 'loading' }
		| { status: 'loaded'; messages: SerializedMessage[] }
		| { status: 'error'; error: string };
	let messagesByThread = $state<Record<string, MessageCacheEntry>>({});

	function unreadFor(t: SerializedThread): number {
		return locallySeenIds[t._id] ? 0 : t.unread_count;
	}

	async function loadMessages(threadId: string): Promise<void> {
		// Skip if already loading or loaded — re-fetch only happens via
		// invalidateAll (which resets the page-level state anyway).
		if (messagesByThread[threadId]) return;
		messagesByThread = { ...messagesByThread, [threadId]: { status: 'loading' } };
		try {
			const res = await secureFetch(`/api/rm/threads/${threadId}/messages`, { method: 'GET' });
			const result = await res.json();
			if (!res.ok || !result.success) {
				messagesByThread = {
					...messagesByThread,
					[threadId]: { status: 'error', error: result.error || 'Failed to load messages' }
				};
				return;
			}
			const messages = (result.data?.messages ?? result.messages ?? []) as SerializedMessage[];
			messagesByThread = {
				...messagesByThread,
				[threadId]: { status: 'loaded', messages }
			};
		} catch {
			messagesByThread = {
				...messagesByThread,
				[threadId]: { status: 'error', error: 'Network error loading messages' }
			};
		}
	}

	// Mark the just-selected thread seen if it has unread messages, AND
	// kick off message lazy-load. Fires on initial mount (auto-selected
	// first thread) and on every click.
	$effect(() => {
		const id = selectedThreadId;
		if (!id) return;
		// Lazy-load messages for this thread (no-op if cached).
		void loadMessages(id);
		const thread = data.threads.find((t) => t._id === id);
		if (!thread) return;
		if (locallySeenIds[id]) return;
		if (thread.unread_count === 0) return;
		// Optimistic: zero the badge immediately, then POST. On failure we
		// leave the optimistic state — a refresh will resync from server.
		locallySeenIds = { ...locallySeenIds, [id]: true };
		secureFetch(`/api/rm/threads/${id}/mark-seen`, { method: 'POST' }).catch(() => {
			// Swallow — non-blocking; next page load will recompute.
		});
	});

	// ── Derived ──────────────────────────────────────────────────
	// Audit fix (RM dashboard audit 2026-05-30, B4): removed the dead
	// 'Corporate' tab — it filtered to an empty list with no implementation
	// behind it. Restore later if/when a corporate-DSA business-type lands.
	const filteredThreads = $derived(data.threads);

	const selectedThread = $derived(data.threads.find((t) => t._id === selectedThreadId) || null);

	// L-N1: messages come from the lazy cache, not from the thread doc.
	const selectedMessagesEntry = $derived(
		selectedThreadId ? messagesByThread[selectedThreadId] : undefined
	);

	const messagesLoading = $derived(selectedMessagesEntry?.status === 'loading');
	const messagesError = $derived(
		selectedMessagesEntry?.status === 'error' ? selectedMessagesEntry.error : ''
	);

	const sortedMessages = $derived(
		selectedMessagesEntry?.status === 'loaded'
			? [...selectedMessagesEntry.messages].sort(
					(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
				)
			: []
	);

	// ── Stage colors ─────────────────────────────────────────────
	const stageColors: Record<string, string> = {
		intake: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		profiling: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		file_building: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		submitted: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		processing: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		query: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		sanctioned: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		disbursed: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]',
		rejected: 'bg-[var(--dash-contrast-ghost-bg)] text-[var(--dash-contrast-text)]',
		dropped: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]',
		closed: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
	};

	const stageLabels: Record<string, string> = {
		intake: 'Intake',
		profiling: 'Profiling',
		file_building: 'File Building',
		submitted: 'Submitted',
		processing: 'Processing',
		query: 'Query',
		sanctioned: 'Sanctioned',
		disbursed: 'Disbursed',
		rejected: 'Rejected',
		dropped: 'Dropped',
		closed: 'Closed'
	};

	// ── Message type badges ──────────────────────────────────────
	const messageTypeBadges: Record<string, { label: string; classes: string }> = {
		case_shared: {
			label: 'Case Shared',
			classes: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
		},
		query: {
			label: 'Query',
			classes: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'
		},
		response: {
			label: 'Response',
			classes: 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
		}
	};

	// ── Helpers ──────────────────────────────────────────────────
	function formatTimeAgo(dateStr: string): string {
		const now = Date.now();
		const then = new Date(dateStr).getTime();
		const diff = now - then;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.floor(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		const days = Math.floor(hrs / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.floor(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.floor(months / 12)}y ago`;
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	// ── Actions ──────────────────────────────────────────────────
	function selectThread(threadId: string) {
		selectedThreadId = threadId;
		replyTemplateId = '';
		customMessage = '';
		sendError = '';
		showMobileMessages = true;
	}

	function selectTemplate(templateId: string) {
		if (replyTemplateId === templateId) {
			// Deselect
			replyTemplateId = '';
			customMessage = '';
		} else {
			replyTemplateId = templateId;
			const tpl = RM_REPLY_TEMPLATES.find((t) => t.id === templateId);
			if (tpl) {
				customMessage = tpl.body;
			}
		}
	}

	function goBackToList() {
		showMobileMessages = false;
	}

	async function sendMessage() {
		if (!selectedThreadId || isSending) return;

		const messageToSend = customMessage.trim();
		if (!messageToSend) {
			sendError = 'Please enter a message or select a template.';
			return;
		}
		if (messageToSend.length > 2000) {
			sendError = 'Message must be under 2000 characters.';
			return;
		}

		isSending = true;
		sendError = '';

		try {
			const payload: Record<string, string> = {};
			if (replyTemplateId) {
				payload.template_id = replyTemplateId;
				if (replyTemplateId === 'general_note') {
					payload.custom_message = messageToSend;
				}
			} else {
				payload.custom_message = messageToSend;
			}

			const res = await secureFetch(`/api/rm/threads/${selectedThreadId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await res.json();

			if (!res.ok || !result.success) {
				sendError = result.error || result.message || 'Failed to send message.';
				return;
			}

			// Clear form and refresh
			replyTemplateId = '';
			customMessage = '';
			// L-N1: invalidate this thread's message cache so the new
			// message appears, then reload. We could also append the
			// message client-side optimistically but a server fetch keeps
			// the canonical timestamp + ordering.
			if (selectedThreadId) {
				const { [selectedThreadId]: _drop, ...rest } = messagesByThread;
				messagesByThread = rest;
				void loadMessages(selectedThreadId);
			}
			await invalidateAll();
		} catch {
			sendError = 'Network error. Please check your connection and try again.';
		} finally {
			isSending = false;
		}
	}
</script>

<svelte:head>
	<title>Communication - RM Dashboard</title>
</svelte:head>

<div class="space-y-4">
	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- PAGE HEADER                                                 -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	<div>
		<h1 class="text-2xl font-bold text-[var(--dash-text)]">Communication</h1>
		<p class="mt-1 text-sm text-[var(--dash-text-secondary)]">
			{data.threads.length} conversation{data.threads.length !== 1 ? 's' : ''} with DSA agents
		</p>
	</div>

	<!-- ═══════════════════════════════════════════════════════════ -->
	<!-- MAIN LAYOUT: Thread list + Message panel                    -->
	<!-- ═══════════════════════════════════════════════════════════ -->
	{#if data.threads.length === 0}
		<!-- Empty state -->
		<div
			class="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
			>
				<svg
					class="h-8 w-8 text-[var(--dash-text-muted)]"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
					/>
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-[var(--dash-text)]">No conversations yet</h3>
			<p class="mx-auto mt-2 max-w-md text-sm text-[var(--dash-text-secondary)]">
				When DSA agents share cases with you and start conversations, they will appear here.
			</p>
			<a
				href="/dashboard/rm/cases"
				class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--dash-btn-bg)] px-4 py-2 text-xs font-medium text-[var(--dash-btn-text)] transition-all hover:brightness-105"
			>
				View Cases
			</a>
		</div>
	{:else}
		<div class="flex gap-4" style="height: calc(100vh - 220px); min-height: 500px;">
			<!-- ═════════════════════════════════════════════════════ -->
			<!-- THREAD LIST PANEL (left / mobile: full width)        -->
			<!-- ═════════════════════════════════════════════════════ -->
			<div
				class="flex w-full flex-col rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] lg:w-1/3 {showMobileMessages
					? 'hidden lg:flex'
					: 'flex'}"
			>
				<!-- Thread list header -->
				<div class="border-b border-[var(--dash-border-light)] px-4 py-2.5">
					<span class="text-xs font-semibold text-[var(--dash-text-secondary)]">
						All conversations ({data.threads.length})
					</span>
				</div>

				<!-- Thread list -->
				<div class="flex-1 overflow-y-auto">
					{#if filteredThreads.length === 0}
						<div class="flex flex-col items-center justify-center px-4 py-12 text-center">
							<div
								class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
							>
								<svg
									class="h-5 w-5 text-[var(--dash-text-muted)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="1.5"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859"
									/>
								</svg>
							</div>
							<p class="text-sm font-medium text-[var(--dash-text-secondary)]">
								No conversations
							</p>
						</div>
					{:else}
						{#each filteredThreads as thread (thread._id)}
							<button
								type="button"
								class="w-full border-b border-[var(--dash-border-light)] p-3 text-left transition-colors hover:bg-[var(--dash-hover)] {selectedThreadId ===
								thread._id
									? 'border-l-2 border-l-[var(--ddsa-primary-500)] bg-[var(--dash-btn-ghost-bg)]'
									: ''}"
								onclick={() => selectThread(thread._id)}
							>
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1.5">
											<div
												class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
											>
												<span class="text-[12px] font-bold text-[var(--dash-accent-text)]">
													{thread.dsa_name.charAt(0).toUpperCase()}
												</span>
											</div>
											<p class="truncate text-sm font-semibold text-[var(--dash-text)]">
												{thread.dsa_name}
											</p>
											<!-- Audit fix (RM dashboard audit 2026-05-30): unread badge. -->
											{#if unreadFor(thread) > 0}
												<span
													class="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--ddsa-primary-500)] px-1.5 py-0.5 text-[10px] font-bold text-white"
													title="Unread DSA messages"
												>
													{unreadFor(thread)}
												</span>
											{/if}
										</div>
										<div class="mt-1 ml-8.5">
											<p class="truncate text-xs text-[var(--dash-text-secondary)]">
												{thread.case_label}
												{#if thread.lender_name}
													<span class="text-[var(--dash-text-muted)]"> &middot; </span>
													<span class="text-[var(--dash-text-muted)]">{thread.lender_name}</span>
												{/if}
											</p>
											{#if thread.last_message}
												<p class="mt-0.5 truncate text-[13px] text-[var(--dash-text-muted)]">
													{#if thread.last_message.sender_role === 'rm'}
														<span class="font-medium text-[var(--dash-text-secondary)]">You: </span>
													{/if}
													{thread.last_message.message}
												</p>
											{/if}
										</div>
									</div>
									<div class="flex shrink-0 flex-col items-end gap-1">
										<span class="text-[12px] text-[var(--dash-text-muted)]">
											{formatTimeAgo(thread.updated_at)}
										</span>
										{#if thread.case_stage}
											<span
												class="rounded-full px-1.5 py-0.5 text-[12px] font-medium {stageColors[
													thread.case_stage
												] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
											>
												{stageLabels[thread.case_stage] || thread.case_stage}
											</span>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</div>

			<!-- ═════════════════════════════════════════════════════ -->
			<!-- MESSAGE PANEL (right / mobile: full width)            -->
			<!-- ═════════════════════════════════════════════════════ -->
			<div
				class="flex w-full flex-col rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] lg:w-2/3 {showMobileMessages
					? 'flex'
					: 'hidden lg:flex'}"
			>
				{#if selectedThread}
					<!-- Thread header -->
					<div class="flex items-center gap-3 border-b border-[var(--dash-border-light)] px-4 py-3">
						<!-- Mobile back button -->
						<button
							type="button"
							aria-label="Back to thread list"
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-bg-alt)] lg:hidden"
							onclick={goBackToList}
						>
							<svg
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15.75 19.5L8.25 12l7.5-7.5"
								/>
							</svg>
						</button>

						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
						>
							<span class="text-xs font-bold text-[var(--dash-accent-text)]">
								{selectedThread.dsa_name.charAt(0).toUpperCase()}
							</span>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="truncate text-sm font-semibold text-[var(--dash-text)]">
									{selectedThread.dsa_name}
								</h3>
								{#if selectedThread.case_stage}
									<span
										class="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium {stageColors[
											selectedThread.case_stage
										] || 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
									>
										{stageLabels[selectedThread.case_stage] || selectedThread.case_stage}
									</span>
								{/if}
							</div>
							<p class="truncate text-xs text-[var(--dash-text-secondary)]">
								{selectedThread.case_label}
								{#if selectedThread.lender_name}
									<span class="text-[var(--dash-text-muted)]"> &middot; </span>
									{selectedThread.lender_name}
								{/if}
								{#if selectedThread.case_loan_type}
									<span class="text-[var(--dash-text-muted)]"> &middot; </span>
									{selectedThread.case_loan_type}
								{/if}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<span
								class="rounded-full px-2 py-0.5 text-[12px] font-medium {selectedThread.status ===
								'active'
									? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
									: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)]'}"
							>
								{selectedThread.status === 'active' ? 'Active' : 'Closed'}
							</span>
						</div>
					</div>

					<!-- Messages list -->
					<div class="flex-1 overflow-y-auto px-4 py-4">
						{#if messagesLoading}
							<!-- L-N1: lazy-loaded thread messages — initial fetch state.
							     Skeleton would be nicer; spinner-style text keeps it minimal. -->
							<div class="flex items-center justify-center py-8 text-sm text-[var(--dash-text-muted)]">
								Loading messages…
							</div>
						{:else if messagesError}
							<div
								class="rounded-lg border p-4 text-sm"
								style:background-color="var(--dash-danger-bg)"
								style:border-color="var(--dash-danger-border)"
								style:color="var(--dash-danger-text)"
							>
								{messagesError}
							</div>
						{/if}
						<div class="flex flex-col gap-3">
							{#each sortedMessages as msg, i}
								{@const isRm = msg.sender_role === 'rm'}
								{@const showDate =
									i === 0 ||
									new Date(msg.created_at).toDateString() !==
										new Date(sortedMessages[i - 1].created_at).toDateString()}

								{#if showDate}
									<div class="my-2 flex items-center gap-3">
										<div class="h-px flex-1 bg-[var(--dash-bg-alt)]"></div>
										<span class="text-[12px] font-medium text-[var(--dash-text-muted)]">
											{new Date(msg.created_at).toLocaleDateString('en-IN', {
												day: 'numeric',
												month: 'short',
												year: 'numeric'
											})}
										</span>
										<div class="h-px flex-1 bg-[var(--dash-bg-alt)]"></div>
									</div>
								{/if}

								<div class="flex {isRm ? 'justify-end' : 'justify-start'}">
									<div
										class="max-w-[80%] rounded-2xl px-3.5 py-2.5 {isRm
											? 'rounded-br-md bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)]'
											: 'rounded-bl-md bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'}"
									>
										{#if msg.message_type !== 'text' && messageTypeBadges[msg.message_type]}
											{@const badge = messageTypeBadges[msg.message_type]}
											<span
												class="mb-1 inline-block rounded px-1.5 py-0.5 text-[12px] font-semibold {isRm
													? 'bg-[var(--dash-bg-card)]/20 text-white'
													: badge.classes}"
											>
												{badge.label}
											</span>
										{/if}
										<p class="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
										<p
											class="mt-1 text-[12px] {isRm
												? 'text-white/60'
												: 'text-[var(--dash-text-muted)]'} text-right"
										>
											{formatDate(msg.created_at)}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Reply section -->
					{#if selectedThread.status === 'active'}
						<div class="border-t border-[var(--dash-border-light)] px-4 py-3">
							<!-- Template quick-reply buttons -->
							<div class="mb-2.5 flex flex-wrap gap-1.5">
								{#each RM_REPLY_TEMPLATES as tpl}
									<button
										type="button"
										class="rounded-full border px-3 py-1 text-[13px] font-medium transition-colors {replyTemplateId ===
										tpl.id
											? 'border-[var(--ddsa-primary-500)] bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
											: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text-secondary)] hover:border-[var(--dash-border)] hover:bg-[var(--dash-hover)]'}"
										onclick={() => selectTemplate(tpl.id)}
									>
										{tpl.label}
									</button>
								{/each}
							</div>

							<!-- Text input + send -->
							<div class="flex gap-2">
								<textarea
									class="flex-1 resize-none rounded-xl border border-[var(--dash-border)] px-3 py-2.5 text-sm text-[var(--dash-text)] placeholder-[var(--dash-text-muted)] transition-colors outline-none focus:border-[var(--ddsa-primary-400)] focus:ring-1 focus:ring-[var(--ddsa-primary-200)]"
									rows="2"
									placeholder="Type a message or select a template..."
									bind:value={customMessage}
									onkeydown={(e: KeyboardEvent) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											sendMessage();
										}
									}}
								></textarea>
								<button
									type="button"
									class="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-[var(--dash-btn-bg)] text-[var(--dash-btn-text)] transition-all hover:bg-[var(--ddsa-primary-600)] disabled:opacity-50"
									disabled={isSending || !customMessage.trim()}
									onclick={sendMessage}
								>
									{#if isSending}
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									{:else}
										<svg
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke-width="2"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
											/>
										</svg>
									{/if}
								</button>
							</div>

							{#if sendError}
								<p class="mt-1.5 text-xs font-medium text-[var(--dash-contrast-text)]">
									{sendError}
								</p>
							{/if}
						</div>
					{:else}
						<div class="border-t border-[var(--dash-border-light)] px-4 py-3 text-center">
							<p class="text-xs text-[var(--dash-text-muted)]">This conversation has been closed</p>
						</div>
					{/if}
				{:else}
					<!-- No thread selected -->
					<div class="flex flex-1 flex-col items-center justify-center text-center">
						<div
							class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-bg-alt)]"
						>
							<svg
								class="h-7 w-7 text-[var(--dash-text-muted)]"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
								/>
							</svg>
						</div>
						<h3 class="text-sm font-semibold text-[var(--dash-text-secondary)]">
							Select a conversation
						</h3>
						<p class="mt-1 text-xs text-[var(--dash-text-muted)]">
							Choose a thread from the left to start messaging
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
