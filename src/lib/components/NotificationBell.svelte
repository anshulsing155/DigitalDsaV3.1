<script lang="ts">
	import { Bell, Check, ExternalLink, BellRing } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { goto } from '$app/navigation';
	import { formatTimeAgo } from '$lib/i18n';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import {
		isPushSupported,
		getPushPermission,
		subscribeToPush,
		isSubscribedToPush
	} from '$lib/utils/pushSubscription';

	type Notification = {
		_id: string;
		type: string;
		title: string;
		message: string;
		action_url?: string;
		read: boolean;
		created_at: string;
	};

	type NotificationsResponse = {
		notifications: Notification[];
		unreadCount: number;
	};

	// ── State ──────────────────────────────────────────────────────
	let isOpen = $state(false);
	let panelRef = $state<HTMLElement | null>(null);

	// ── Push notification state ────────────────────────────────────
	let pushSupported = $state(false);
	let pushSubscribed = $state(false);
	let pushPromptDismissed = $state(false);

	/** Whether to show the "Enable push" prompt in the dropdown */
	let showPushPrompt = $derived(
		pushSupported && !pushSubscribed && !pushPromptDismissed && getPushPermission() !== 'denied'
	);

	async function enablePush() {
		const success = await subscribeToPush();
		if (success) {
			pushSubscribed = true;
		}
	}

	// ── Notification queries (PERF-3 — TanStack Query) ─────────────
	// Pre-migration: two hand-rolled fetches (full list + count-only) +
	// setInterval 60s + a `mounted` flag to guard against post-unmount
	// state writes. Plus optimistic local updates after markAsRead /
	// markAllRead. Worked, but the cleanup discipline + the manual
	// unreadCount-vs-list dual-state was easy to drift out of sync.
	//
	// Post-migration:
	//   - `unreadCountQuery` always polls (60s) using ?limit=1 — drives
	//     the badge in the header.
	//   - `listQuery` is enabled only when the panel is open. Returns
	//     the full payload (notifications + unreadCount). The cache key
	//     differs from the count-only query so they don't conflict.
	//   - After a mutation (mark-as-read / mark-all-read), both queries
	//     are invalidated by the queryClient. No manual local state.
	//   - Cleanup is automatic on unmount — no `mounted` flag.
	const queryClient = useQueryClient();

	const unreadCountQuery = createQuery<NotificationsResponse>(() => ({
		queryKey: ['notifications', 'unread-count'],
		queryFn: async () => {
			const res = await secureFetch('/api/notifications?limit=1');
			if (!res.ok) throw new Error('Failed to fetch unread count');
			const data = await res.json();
			if (!data.success) throw new Error(data.error ?? 'Failed to fetch unread count');
			return data.data as NotificationsResponse;
		},
		refetchInterval: 60_000,
		staleTime: 30_000
	}));

	const listQuery = createQuery<NotificationsResponse>(() => ({
		queryKey: ['notifications', 'list'],
		queryFn: async () => {
			const res = await secureFetch('/api/notifications?limit=10');
			if (!res.ok) throw new Error('Failed to fetch notifications');
			const data = await res.json();
			if (!data.success) throw new Error(data.error ?? 'Failed to fetch notifications');
			return data.data as NotificationsResponse;
		},
		enabled: isOpen,
		staleTime: 10_000
	}));

	// Display derivations — @tanstack/svelte-query v6 returns a reactive
	// object (no $-prefix). When the panel is open we prefer the fresher
	// list payload's unreadCount; otherwise fall back to the count-only
	// query's value.
	let unreadCount = $derived(
		listQuery.data?.unreadCount ?? unreadCountQuery.data?.unreadCount ?? 0
	);
	let notifications = $derived<Notification[]>(listQuery.data?.notifications ?? []);
	let loading = $derived(isOpen && listQuery.isFetching);

	// ── Actions ────────────────────────────────────────────────────
	async function markAsRead(notificationId: string) {
		try {
			await secureFetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
			// Invalidate both queries so the badge + list both refetch fresh.
			await queryClient.invalidateQueries({ queryKey: ['notifications'] });
		} catch {
			// Silently fail — notification mark-read is non-critical
		}
	}

	async function markAllRead() {
		try {
			await secureFetch('/api/notifications/mark-all-read', { method: 'POST' });
			await queryClient.invalidateQueries({ queryKey: ['notifications'] });
		} catch {
			// Silently fail
		}
	}

	function handleNotificationClick(notification: Notification) {
		// Mark as read if unread
		if (!notification.read) {
			markAsRead(notification._id);
		}
		// Navigate to action URL if present
		if (notification.action_url) {
			isOpen = false;
			goto(notification.action_url);
		}
	}

	function togglePanel() {
		isOpen = !isOpen;
		// No manual fetch — listQuery's `enabled: isOpen` flag triggers
		// the fetch automatically when isOpen flips to true.
	}

	// ── Close on outside click ─────────────────────────────────────
	function handleWindowClick(event: MouseEvent) {
		if (isOpen && panelRef && !panelRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	// ── Lifecycle ──────────────────────────────────────────────────
	onMount(() => {
		// Check push notification support and subscription status (async, fire-and-forget)
		pushSupported = isPushSupported();
		if (pushSupported) {
			isSubscribedToPush().then((subscribed) => {
				pushSubscribed = subscribed;
			});
		}

		// Close on outside click — only listener that needs lifecycle.
		// TanStack Query handles its own polling + cleanup.
		window.addEventListener('click', handleWindowClick);
		return () => {
			window.removeEventListener('click', handleWindowClick);
		};
	});

	// ── Type icon color based on notification type ─────────────────
	function getTypeColor(type: string): string {
		switch (type) {
			case 'case_status':
				return 'text-blue-500';
			case 'lead':
				return 'text-green-500';
			case 'feedback':
				return 'text-amber-500';
			case 'billing':
				return 'text-purple-500';
			case 'system':
				return 'text-gray-500';
			default:
				return 'text-gray-400';
		}
	}
</script>

<!-- Notification bell + dropdown panel -->
<div class="relative" bind:this={panelRef}>
	<!-- Bell button with unread badge -->
	<button
		type="button"
		onclick={togglePanel}
		class="relative rounded-lg p-1.5 text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-bg-hover)] hover:text-[var(--dash-text)]"
		aria-label="Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}"
	>
		<Bell size={18} />

		{#if unreadCount > 0}
			<span
				class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
			>
				{unreadCount > 99 ? '99+' : unreadCount}
			</span>
		{/if}
	</button>

	<!-- Dropdown panel -->
	{#if isOpen}
		<div
			class="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--dash-border)] px-4 py-3">
				<h3 class="text-sm font-semibold text-[var(--dash-text)]">Notifications</h3>
				{#if unreadCount > 0}
					<button
						type="button"
						onclick={markAllRead}
						class="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-500/10"
					>
						<Check size={12} />
						Mark all read
					</button>
				{/if}
			</div>

			<!-- Push notification prompt -->
			{#if showPushPrompt}
				<div
					class="flex items-center gap-2 border-b border-[var(--dash-border)] bg-blue-50 px-4 py-2.5 dark:bg-blue-900/20"
				>
					<BellRing size={14} class="shrink-0 text-blue-500" />
					<span class="text-xs text-blue-700 dark:text-blue-300">Get notified instantly</span>
					<button
						type="button"
						onclick={enablePush}
						class="ml-auto rounded bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-600"
					>
						Enable
					</button>
					<button
						type="button"
						onclick={() => (pushPromptDismissed = true)}
						class="text-xs text-blue-400 hover:text-blue-600"
						aria-label="Dismiss"
					>
						&times;
					</button>
				</div>
			{/if}

			<!-- Notification list -->
			<div class="max-h-80 overflow-y-auto">
				{#if notifications.length === 0}
					<div class="px-4 py-8 text-center text-sm text-[var(--dash-text-muted)]">
						No notifications yet
					</div>
				{:else}
					{#each notifications as notification (notification._id)}
						<button
							type="button"
							onclick={() => handleNotificationClick(notification)}
							class="flex w-full items-start gap-3 border-b border-[var(--dash-border)] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[var(--dash-bg-hover)]
								{notification.read ? 'opacity-60' : ''}"
						>
							<!-- Unread dot -->
							<div class="mt-1.5 shrink-0">
								{#if !notification.read}
									<div class="h-2 w-2 rounded-full bg-blue-500"></div>
								{:else}
									<div class="h-2 w-2"></div>
								{/if}
							</div>

							<!-- Content -->
							<div class="min-w-0 flex-1">
								<p
									class="text-sm font-medium text-[var(--dash-text)] {getTypeColor(
										notification.type
									)}"
								>
									{notification.title}
								</p>
								<p class="mt-0.5 line-clamp-2 text-xs text-[var(--dash-text-muted)]">
									{notification.message}
								</p>
								<p class="mt-1 text-[10px] text-[var(--dash-text-muted)]">
									{formatTimeAgo(new Date(notification.created_at))}
								</p>
							</div>

							<!-- Link indicator -->
							{#if notification.action_url}
								<ExternalLink size={12} class="mt-1 shrink-0 text-[var(--dash-text-muted)]" />
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
