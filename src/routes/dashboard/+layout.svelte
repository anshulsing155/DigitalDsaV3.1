<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { beforeNavigate } from '$app/navigation';
	import { authState } from '$lib/state/auth.svelte';
	import { addToast } from '$lib/state/ui.svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';
	import type { Snippet } from 'svelte';
	import DemoBanner from '$lib/components/DemoBanner.svelte';
	import DemoRestrictionModal from '$lib/components/DemoRestrictionModal.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import TourLauncher from '$lib/components/walkthrough/TourLauncher.svelte';
	import DsaQuotaIndicator from '$lib/components/dashboard/DsaQuotaIndicator.svelte';
	import NpsBanner from '$lib/components/account/NpsBanner.svelte';
	import type { QuotaState } from '$lib/server/billing/quotaState';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { initLanguage } from '$lib/i18n';
	import { themeState, COLOR_SCHEMES, type ColorScheme } from '$lib/stores/theme.svelte';
	import { ROUTES } from '$lib/config/routes.js';
	import { onMount } from 'svelte';
	import {
		LayoutDashboard,
		User,
		FolderOpen,
		BarChart3,
		Users,
		Link,
		MessageSquare,
		Contact,
		TrendingUp,
		Plus,
		Inbox,
		Megaphone,
		ClipboardList,
		Send,
		Search,
		Settings,
		FileCheck,
		FlaskConical,
		Play,
		ScrollText,
		ShieldCheck,
		Sun,
		Moon,
		Monitor,
		Home,
		Trash2,
		LogOut,
		MoreVertical,
		CircleUser,
		ChevronDown,
		Check,
		Palette,
		CreditCard,
		Lock,
		DoorOpen,
		Calculator
	} from 'lucide-svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import ErrorBoundary from '$lib/components/landing/ErrorBoundary.svelte';
	import KickedToast from '$lib/components/auth/KickedToast.svelte';
	import { createSessionStatusPoller } from '$lib/utils/sessionStatusPoller.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let isLoggingOut = $state(false);

	// SEC-10 Commit C — kicked-side poll. Polls /api/auth/session-status
	// every ~8s while this tab is visible; when the server has revoked
	// this session's row (a SEC-10 confirm-and-kick on another device,
	// or a self close-account), the poll returns 401, the kicked-toast
	// renders, and the user is redirected to /login. Spec §6.
	const sessionPoller = createSessionStatusPoller();

	async function handleLogout() {
		if (isLoggingOut) return;
		isLoggingOut = true;
		try {
			await authState.logout();
		} catch {
			// logout API may fail — still redirect to login
		}
		// Full page reload to cleanly unmount dashboard layout before login renders
		if (browser) window.location.href = '/login';
	}

	const role = $derived(($page.data as { role?: string }).role ?? 'dsa');
	// DSA-only — inherited from dashboard/dsa/+layout.server.ts via $page.data.
	// Null on admin/RM dashboards (those layouts don't load it) → indicator hides.
	const quotaState = $derived(($page.data as { quotaState?: QuotaState | null }).quotaState ?? null);
	const roles = $derived(
		($page.data as { roles?: { admin?: boolean; dsa?: boolean; rm?: boolean } | null }).roles
	);
	const isDemo = $derived(($page.data as { isDemo?: boolean }).isDemo === true);
	const serverLang = $derived(($page.data as { preferredLanguage?: string }).preferredLanguage);
	const trialDaysLeft = $derived(
		($page.data as { trialDaysLeft?: number | null }).trialDaysLeft ?? null
	);
	const npsWindow = $derived(
		($page.data as { npsWindow?: 'day30' | 'day180' | null }).npsWindow ?? null
	);
	const teamContext = $derived(
		(
			$page.data as {
				teamContext?: {
					isOwner: boolean;
					ownerName?: string;
					permissions?: Record<string, boolean>;
				};
			}
		).teamContext
	);
	const adminPermissions = $derived(
		(
			$page.data as {
				adminPermissions?: {
					user_management: boolean;
					rule_authoring: boolean;
					system_settings: boolean;
				} | null;
			}
		).adminPermissions
	);
	const isSuperAdmin = $derived(($page.data as { isSuperAdmin?: boolean }).isSuperAdmin === true);
	const isAdminUser = $derived(roles?.admin === true);
	const dsaCaseCount = $derived(($page.data as { dsaCaseCount?: number }).dsaCaseCount ?? 0);

	const serverThemePrefs = $derived(
		($page.data as { themePreferences?: { theme_mode?: string; color_scheme?: string } | null })
			.themePreferences
	);

	let themeMode = $derived(themeState.mode);
	let showDemoRestriction = $state(false);
	let isSwitchingRole = $state(false);
	let userMenuOpen = $state(false);
	let colorPickerOpen = $state(false);
	const currentScheme = $derived(
		COLOR_SCHEMES.find((s) => s.id === themeState.scheme) || COLOR_SCHEMES[0]
	);
	let prefSaveTimer: ReturnType<typeof setTimeout> | null = null;

	const switchableRoles = $derived(
		isAdminUser ? (['admin', 'dsa', 'rm'] as const).filter((r) => r !== role) : []
	);

	async function switchRole(newRole: string) {
		if (isSwitchingRole) return;
		isSwitchingRole = true;
		try {
			// secureFetch adds the CSRF token header — raw fetch gets 403 from
			// hooks.server.ts validateCSRF (which checks all non-GET state-changing requests)
			const res = await secureFetch('/api/set-role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: newRole })
			});
			const data = await res.json();
			if (data.success) {
				const meta = ROLE_META[newRole];
				await goto(meta?.dashboardPath || '/dashboard', { invalidateAll: true });
			}
		} catch {
			// silently fail
		} finally {
			isSwitchingRole = false;
		}
	}

	async function savePreferences(update: { mode?: string; scheme?: string }) {
		if (prefSaveTimer) clearTimeout(prefSaveTimer);
		prefSaveTimer = setTimeout(async () => {
			await secureFetch('/api/user/preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					theme_mode: update.mode,
					color_scheme: update.scheme
				})
			}).catch(() => {});
		}, 500);
	}

	function handleSchemeChange(scheme: ColorScheme) {
		themeState.setScheme(scheme);
		savePreferences({ scheme });
	}

	function handleModeToggle() {
		themeState.toggleTheme();
		savePreferences({ mode: themeState.mode });
	}

	beforeNavigate(({ to, cancel }) => {
		if (!isDemo || !to) return;
		const path = to.url.pathname;
		if (
			path.startsWith('/form/') ||
			path === '/form' ||
			path.startsWith('/evaluating') ||
			path.endsWith('-application') ||
			path.endsWith('-offers')
		) {
			cancel();
			showDemoRestriction = true;
		}
	});

	onMount(() => {
		initLanguage(serverLang);
		themeState.init();

		if (serverThemePrefs) {
			if (serverThemePrefs.color_scheme) {
				themeState.setScheme(serverThemePrefs.color_scheme as ColorScheme);
			}
			if (serverThemePrefs.theme_mode) {
				themeState.setTheme(serverThemePrefs.theme_mode as 'light' | 'dark' | 'system');
			}
		}

		if (browser) {
			const params = new URLSearchParams(window.location.search);
			if (params.has('demo_restricted')) {
				showDemoRestriction = true;
				const url = new URL(window.location.href);
				url.searchParams.delete('demo_restricted');
				window.history.replaceState({}, '', url.toString());
			}
		}

		sessionPoller.start();
		return () => sessionPoller.stop();
	});

	// ── Role metadata (brand palette) ──────────────────────────
	const ROLE_META: Record<
		string,
		{ label: string; shortLabel: string; color: string; bgColor: string; dashboardPath: string }
	> = {
		dsa: {
			label: 'DSA Agent',
			shortLabel: 'DSA',
			color: 'text-[var(--dash-accent-text)]',
			bgColor: 'bg-[var(--dash-btn-ghost-bg)] border-[var(--ddsa-primary-200)]',
			dashboardPath: '/dashboard/dsa'
		},
		rm: {
			label: 'Bank RM',
			shortLabel: 'RM',
			color: 'text-[var(--dash-text-secondary)]',
			bgColor: 'bg-[var(--dash-bg-alt)] border-[var(--dash-border)]',
			dashboardPath: '/dashboard/rm'
		},
		admin: {
			label: 'Admin',
			shortLabel: 'Admin',
			color: 'text-[var(--ddsa-accent-600)]',
			bgColor: 'bg-[var(--ddsa-accent-50)] border-[var(--ddsa-accent-200)]',
			dashboardPath: '/dashboard/admin'
		}
	};

	// ── Progressive unlock thresholds ────────────────────────────
	const UNLOCK_CASES_THRESHOLD = 5;

	// ── Navigation items (Lucide icons) ──────────────────────────
	// lockConfig: if present, item shows as locked when criteria aren't met
	// (instead of being hidden). Only applies to owner DSA accounts.
	const allDsaNavItems: {
		label: string;
		href: string;
		icon: any;
		exact?: boolean;
		permKey?: string;
		ownerOnly?: boolean;
		walkthroughId?: string;
		lockConfig?: { type: 'cases'; threshold: number } | { type: 'plan'; plan: string };
	}[] = [
		{
			label: 'Dashboard',
			href: '/dashboard/dsa',
			icon: LayoutDashboard,
			exact: true,
			walkthroughId: 'dashboard'
		},
		{ label: 'Profile', href: '/dashboard/dsa/profile', icon: User, walkthroughId: 'profile' },
		{
			label: 'Cases',
			href: '/dashboard/dsa/cases',
			icon: FolderOpen,
			permKey: 'cases_view',
			walkthroughId: 'cases'
		},
		{
			label: 'CRM',
			href: '/dashboard/dsa/crm',
			icon: BarChart3,
			permKey: 'leads_view',
			walkthroughId: 'crm',
			lockConfig: { type: 'cases', threshold: UNLOCK_CASES_THRESHOLD }
		},
		{
			label: 'Team',
			href: '/dashboard/dsa/team',
			icon: Users,
			ownerOnly: true,
			walkthroughId: 'team',
			lockConfig: { type: 'cases', threshold: UNLOCK_CASES_THRESHOLD }
		},
		{
			label: 'Shared Links',
			href: '/dashboard/dsa/shared-links',
			icon: Link,
			permKey: 'cases_view',
			walkthroughId: 'shared-links'
		},
		{
			label: 'Communication',
			href: '/dashboard/dsa/communication',
			icon: MessageSquare,
			permKey: 'communication_view',
			walkthroughId: 'communication'
		},
		{
			label: 'RM Contacts',
			href: '/dashboard/dsa/rm-contacts',
			icon: Contact,
			permKey: 'cases_view'
		},
		{
			label: 'Billing',
			href: '/dashboard/dsa/billing',
			icon: CreditCard
		},
		{
			label: 'Tools',
			href: ROUTES.TOOLS.DASHBOARD.ROOT,
			icon: Calculator,
			walkthroughId: 'tools'
		},
		{
			label: 'Analytics',
			href: '/dashboard/dsa/analytics',
			icon: TrendingUp,
			permKey: 'analytics_view',
			walkthroughId: 'analytics',
			lockConfig: { type: 'plan', plan: 'pro' }
		},
		{
			// `?new=1` marks this navigation as "start a brand-new case" so:
			//   - the results-page `beforeNavigate` guard skips the
			//     "Edit this application?" modal (it's intended only for
			//     genuine browser-back-into-the-same-case edits), AND
			//   - the how-can-we-help page auto-clears stored form state and
			//     skips the "Welcome back!" resume modal.
			// One click on "New Case" → fresh form, no intermediate prompts.
			label: 'New Case',
			href: `${ROUTES.FORM.HOW_CAN_WE_HELP}?new=1`,
			icon: Plus,
			permKey: 'cases_create',
			walkthroughId: 'new-case'
		}
	];

	/** Check if a nav item is locked based on progressive unlock criteria */
	function isNavItemLocked(item: (typeof allDsaNavItems)[0]): boolean {
		if (!item.lockConfig) return false;
		if (item.lockConfig.type === 'cases') {
			return dsaCaseCount < item.lockConfig.threshold;
		}
		if (item.lockConfig.type === 'plan') {
			// Pro plan unlock — always locked in v1 (subscription system not yet live)
			return true;
		}
		return false;
	}

	/** Tooltip text for a locked nav item */
	function getLockedTooltip(item: (typeof allDsaNavItems)[0]): string {
		if (!item.lockConfig) return '';
		if (item.lockConfig.type === 'cases') {
			const remaining = item.lockConfig.threshold - dsaCaseCount;
			return `Complete ${remaining} more case${remaining !== 1 ? 's' : ''} to unlock`;
		}
		if (item.lockConfig.type === 'plan') {
			return 'Upgrade to Pro to unlock';
		}
		return '';
	}

	/** Lock badge text for sidebar display */
	function getLockBadge(item: (typeof allDsaNavItems)[0]): string {
		if (!item.lockConfig) return '';
		if (item.lockConfig.type === 'cases') return `${item.lockConfig.threshold} CASES`;
		if (item.lockConfig.type === 'plan') return 'PRO';
		return '';
	}

	// Filtered nav: show lockable items as locked (not hidden) for owners
	const filteredDsaNav = $derived(
		allDsaNavItems.filter((item) => {
			// Items with lockConfig are always shown (just locked/unlocked)
			if (item.lockConfig) {
				// For team members, still respect permission filtering
				if (teamContext && !teamContext.isOwner) {
					if (item.ownerOnly) return false;
					if (item.permKey && teamContext.permissions) {
						return teamContext.permissions[item.permKey] !== false;
					}
				}
				return true;
			}
			// Regular filtering for non-lockable items
			if (!teamContext) return !item.ownerOnly;
			if (teamContext.isOwner) return true;
			if (item.ownerOnly) return false;
			if (item.permKey && teamContext.permissions) {
				return teamContext.permissions[item.permKey] !== false;
			}
			return true;
		})
	);

	const navItems: Record<
		string,
		{
			label: string;
			href: string;
			icon: any;
			exact?: boolean;
			walkthroughId?: string;
			adminPerm?: string;
			superOnly?: boolean;
		}[]
	> = {
		dsa: [] as {
			label: string;
			href: string;
			icon: any;
			exact?: boolean;
			walkthroughId?: string;
		}[],
		rm: [
			{
				label: 'Dashboard',
				href: '/dashboard/rm',
				icon: LayoutDashboard,
				exact: true,
				walkthroughId: 'rm-dashboard'
			},
			{
				label: 'Cases Received',
				href: '/dashboard/rm/cases',
				icon: Inbox,
				walkthroughId: 'rm-cases'
			},
			{
				label: 'Communication',
				href: '/dashboard/rm/communication',
				icon: MessageSquare,
				walkthroughId: 'rm-communication'
			},
			{
				label: 'Broadcasts',
				href: '/dashboard/rm/broadcasts',
				icon: Megaphone,
				walkthroughId: 'rm-broadcasts'
			},
			{
				label: 'Policies',
				href: '/dashboard/rm/policies',
				icon: ClipboardList,
				walkthroughId: 'rm-policies'
			},
			{
				label: 'Submissions',
				href: '/dashboard/rm/submissions',
				icon: Send,
				walkthroughId: 'rm-submissions'
			},
			{
				label: 'DSA Search',
				href: '/dashboard/rm/dsa-search',
				icon: Search,
				walkthroughId: 'rm-dsa-search'
			},
			{
				label: 'Analytics',
				href: '/dashboard/rm/analytics',
				icon: TrendingUp,
				walkthroughId: 'rm-analytics'
			},
			{
				label: 'Settings',
				href: '/dashboard/rm/settings',
				icon: Settings,
				walkthroughId: 'rm-settings'
			}
		],
		admin: [
			{
				label: 'Dashboard',
				href: '/dashboard/admin',
				icon: LayoutDashboard,
				exact: true,
				walkthroughId: 'admin-dashboard'
			},
			{
				label: 'Users',
				href: '/dashboard/admin/users',
				icon: Users,
				adminPerm: 'user_management',
				walkthroughId: 'admin-users'
			},
			{
				label: 'Policies',
				href: '/dashboard/admin/policies',
				icon: ClipboardList,
				adminPerm: 'rule_authoring',
				walkthroughId: 'admin-policies'
			},
			{
				label: 'Approvals',
				href: '/dashboard/admin/policies/approvals',
				icon: FileCheck,
				adminPerm: 'rule_authoring',
				walkthroughId: 'admin-approvals'
			},
			{
				label: 'QA Testing',
				href: '/dashboard/admin/qa',
				icon: FlaskConical,
				adminPerm: 'qa_view',
				walkthroughId: 'admin-qa'
			},
			{
				label: 'Testing',
				href: '/dashboard/admin/testing',
				icon: FlaskConical,
				adminPerm: 'rule_authoring',
				walkthroughId: 'admin-testing'
			},
			{
				label: 'E2E Runner',
				href: '/dashboard/admin/testing/e2e-run',
				icon: Play,
				adminPerm: 'rule_authoring',
				walkthroughId: 'admin-e2e-runner'
			},
			{
				label: 'Audit Log',
				href: '/dashboard/admin/audit',
				icon: ScrollText,
				walkthroughId: 'admin-audit'
			},
			{
				// D.1 S7 + D.2 — billing/reconciliation admin landing. The
				// /dashboard/admin/billing/ subtree currently has only the
				// reconciliation view; if we add an admin invoices browser
				// (D.2 follow-up), it lives under here too. Linking the
				// subtree root keeps the nav stable as we add sub-pages.
				label: 'Billing',
				href: '/dashboard/admin/billing/reconciliation',
				icon: CreditCard,
				walkthroughId: 'admin-billing'
			},
			{
				label: 'Settings',
				href: '/dashboard/admin/settings',
				icon: Settings,
				adminPerm: 'system_settings',
				walkthroughId: 'admin-settings'
			},
			{
				label: 'Admin Accounts',
				href: '/dashboard/admin/users/admins',
				icon: ShieldCheck,
				superOnly: true
			}
		]
	};

	const filteredAdminNav = $derived(
		(navItems['admin'] || []).filter((item) => {
			if (isSuperAdmin) return true;
			if (item.superOnly) return false;
			if (item.adminPerm && adminPermissions) {
				return adminPermissions[item.adminPerm as keyof typeof adminPermissions] === true;
			}
			return true;
		})
	);

	// Split DSA nav: main items (unlocked) and locked items (shown in separate section)
	const dsaMainNav = $derived(
		role === 'dsa' ? filteredDsaNav.filter((item) => !isNavItemLocked(item)) : []
	);
	const dsaLockedNav = $derived(
		role === 'dsa' ? filteredDsaNav.filter((item) => isNavItemLocked(item)) : []
	);

	const currentNav = $derived(
		role === 'dsa'
			? dsaMainNav
			: role === 'admin'
				? filteredAdminNav
				: navItems[role] || navItems['dsa']
	);
	const currentPath = $derived($page.url.pathname);

	function isNavActive(item: { href: string; exact?: boolean }): boolean {
		if (item.exact) return currentPath === item.href;
		return currentPath === item.href || currentPath.startsWith(item.href + '/');
	}
	const currentMeta = $derived(ROLE_META[role] || ROLE_META['dsa']);

	// ── Mobile state ──────────────────────────────────────
	let showMobileMore = $state(false);

	// ── Delete Account state ──────────────────────────────
	let showDeleteModal = $state(false);
	let deleteConfirmText = $state('');
	let isDeleting = $state(false);
	// Native <dialog> reference — gives us focus trap, Escape key, and backdrop for free
	let deleteDialog: HTMLDialogElement | undefined = $state(undefined);

	// Sync the showDeleteModal state with the native dialog open/close
	$effect(() => {
		if (!deleteDialog) return;
		if (showDeleteModal) {
			deleteDialog.showModal();
		} else {
			deleteDialog.close();
		}
	});

	async function handleDeleteAccount() {
		if (deleteConfirmText !== 'DELETE') return;
		isDeleting = true;
		try {
			const res = await secureFetch('/api/auth/delete-account', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			const data = await res.json();
			if (data.success) {
				if (browser) window.location.href = '/login';
				return;
			}
		} catch {
			// silently fail
		} finally {
			isDeleting = false;
			showDeleteModal = false;
			deleteConfirmText = '';
		}
	}
</script>

{#if isDemo}
	<DemoBanner />
{/if}

<div class="flex min-h-screen bg-[var(--dash-bg)]">
	<!-- ═══ Desktop Sidebar (navigation only) ═══ -->
	<aside
		class="sticky top-0 hidden h-screen w-52 flex-col overflow-hidden border-r border-[var(--dash-border)] bg-[var(--dash-bg-card)] lg:flex"
	>
		<!-- Logo -->
		<a
			href="/"
			data-sveltekit-reload
			class="flex shrink-0 items-center gap-2 border-b border-[var(--dash-border-light)] px-4 py-3.5 transition-colors hover:bg-[var(--dash-hover)]"
			title="Go to Home Page"
		>
			<div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ddsa-accent-500)] to-[var(--ddsa-primary-500)]"
			>
				<span class="text-base font-bold text-white">D</span>
			</div>
			<div>
				<p class="text-sm font-bold text-[var(--dash-text)]">Digital DSA</p>
				<p class="text-xs text-[var(--dash-text-muted)] capitalize">
					{currentMeta.label}
				</p>
			</div>
		</a>

		<!-- DSA quota — plan name + current cycle date range. DSA-only;
		     component self-hides for admin/RM (quotaState null) and for
		     Enterprise (Infinity caseLimit — nothing to gate). -->
		{#if role === 'dsa'}
			<div class="mt-2">
				<DsaQuotaIndicator {quotaState} mode="sidebar" />
			</div>
		{/if}

		<!-- Main Navigation -->
		<nav class="flex-1 overflow-y-auto p-2.5">
			<ul class="space-y-0.5">
				{#each currentNav as item}
					{@const isActive = isNavActive(item)}
					{@const NavIcon = item.icon}
					<li>
						<a
							href={item.href}
							data-walkthrough={item.walkthroughId ?? undefined}
							class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
								{isActive
								? 'border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'
								: 'border border-transparent text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]'}"
						>
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors
									{isActive ? 'bg-[var(--dash-btn-bg)]' : 'bg-[var(--dash-btn-ghost-bg)]'}"
							>
								<NavIcon
									size={16}
									strokeWidth={1.8}
									class={isActive
										? 'text-[var(--dash-btn-text)]'
										: 'text-[var(--dash-accent-text)]'}
								/>
							</div>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>

			<!-- Locked items section — visually separated at the bottom -->
			{#if dsaLockedNav.length > 0}
				<div class="mt-3 border-t border-[var(--dash-border)] pt-3">
					<p
						class="mb-2 px-3 text-[12px] font-semibold tracking-widest text-[var(--dash-text-muted)] uppercase"
					>
						Unlocks later
					</p>
					<ul class="space-y-0.5">
						{#each dsaLockedNav as item}
							{@const NavIcon = item.icon}
							<li>
								<div
									class="group relative flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-35 select-none"
									title={getLockedTooltip(item)}
								>
									<div
										class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-bg-alt)]"
									>
										<NavIcon size={16} strokeWidth={1.5} class="text-[var(--dash-text-muted)]" />
									</div>
									<span class="flex-1 text-[var(--dash-text-muted)]">{item.label}</span>
									<span
										class="shrink-0 rounded border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold tracking-wider text-[var(--dash-text-muted)]"
									>
										{getLockBadge(item)}
									</span>
									<!-- Tooltip on hover -->
									<span
										class="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md border border-[var(--dash-border)] bg-[var(--dash-bg-elevated)] px-2.5 py-1.5 text-xs whitespace-nowrap text-[var(--dash-text-secondary)] shadow-lg group-hover:block"
									>
										{getLockedTooltip(item)}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</nav>

		<!-- Sidebar bottom: Home Page + Delete Account -->
		<div class="shrink-0 border-t border-[var(--dash-border)] px-3 py-2">
			<a
				href="/"
				data-sveltekit-reload
				class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
			>
				<Home size={15} strokeWidth={1.5} class="shrink-0" />
				Home Page
			</a>
			<button
				type="button"
				onclick={() => (showDeleteModal = true)}
				class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-contrast-text)]"
			>
				<Trash2 size={13} strokeWidth={1.5} class="shrink-0" />
				Delete Account
			</button>
		</div>
	</aside>

	<!-- ═══ Main Area (top bar + content + right panel) ═══ -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- ── Desktop Top Bar ────────────────────────────── -->
		<header
			class="sticky top-0 z-10 hidden h-12 items-center justify-end gap-3 border-b border-[var(--dash-border-light)] bg-[var(--dash-bg-card)] px-5 lg:flex"
		>
			<!-- Color scheme dropdown -->
			<div class="relative">
				<button
					type="button"
					onclick={() => (colorPickerOpen = !colorPickerOpen)}
					class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
					aria-label="Change color scheme"
					title={currentScheme.label}
				>
					<span
						class="block h-4 w-4 rounded-full ring-1 ring-[var(--dash-border)]"
						style="background-color: {currentScheme.swatch};"
					></span>
					<ChevronDown size={12} strokeWidth={2} class="opacity-50" />
				</button>

				{#if colorPickerOpen}
					<button
						type="button"
						class="fixed inset-0 z-40 cursor-default border-0 bg-transparent p-0"
						aria-label="Close color picker"
						onclick={() => (colorPickerOpen = false)}
					></button>
					<div
						class="absolute top-full right-0 z-50 mt-1.5 w-44 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-1.5 shadow-lg"
					>
						{#each COLOR_SCHEMES as s}
							<button
								type="button"
								onclick={() => {
									handleSchemeChange(s.id);
									colorPickerOpen = false;
								}}
								class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
									{themeState.scheme === s.id
									? 'bg-[var(--dash-btn-ghost-bg)] text-[var(--dash-accent-text)]'
									: 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
							>
								<span
									class="block h-4 w-4 shrink-0 rounded-full"
									style="background-color: {s.swatch};"
								></span>
								<span class="flex-1 text-left">{s.label}</span>
								{#if themeState.scheme === s.id}
									<Check
										size={14}
										strokeWidth={2}
										class="shrink-0 text-[var(--dash-accent-text)]"
									/>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="h-5 w-px bg-[var(--dash-border)]"></div>

			<!-- Theme mode toggle -->
			<button
				type="button"
				onclick={() => handleModeToggle()}
				class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)]"
				aria-label="Toggle theme, current: {themeMode}"
				title="Theme: {themeMode}"
			>
				{#if themeMode === 'light'}
					<Sun size={16} strokeWidth={1.5} />
				{:else if themeMode === 'dark'}
					<Moon size={16} strokeWidth={1.5} />
				{:else}
					<Monitor size={16} strokeWidth={1.5} />
				{/if}
			</button>

			<div class="h-5 w-px bg-[var(--dash-border)]"></div>

			<!-- Language selector -->
			<LanguageSelector saveToServer={true} compact={true} />

			<!-- DSA quota — "Cases Consumed X/Y" pill. DSA-only; the component
			     self-hides for admin/RM and for Enterprise. -->
			{#if role === 'dsa'}
				<div class="h-5 w-px bg-[var(--dash-border)]"></div>
				<DsaQuotaIndicator {quotaState} mode="chip" />
			{/if}

			<!-- Guide -->
			<TourLauncher variant="dashboard" />

			<div class="h-5 w-px bg-[var(--dash-border)]"></div>

			<!-- Notifications bell -->
			<NotificationBell />

			<!-- Role switcher (admin only) -->
			{#if isAdminUser && switchableRoles.length > 0}
				<div class="h-5 w-px bg-[var(--dash-border)]"></div>
				<div class="flex items-center gap-1.5">
					{#each switchableRoles as r}
						{@const meta = ROLE_META[r]}
						<button
							type="button"
							onclick={() => switchRole(r)}
							disabled={isSwitchingRole}
							class="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors
								{meta.color} {meta.bgColor} hover:brightness-95 disabled:opacity-50"
						>
							{meta.label}
						</button>
					{/each}
				</div>
			{/if}

			<div class="h-5 w-px bg-[var(--dash-border)]"></div>

			<!-- Logout button with door icon + label -->
			<button
				type="button"
				onclick={handleLogout}
				disabled={isLoggingOut}
				class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-contrast-text)] disabled:opacity-50"
				aria-label="Logout"
			>
				{#if isLoggingOut}
					<span
						class="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
					></span>
					Logging out...
				{:else}
					<DoorOpen size={16} strokeWidth={1.5} class="shrink-0" />
					Logout
				{/if}
			</button>
		</header>

		<!-- ── Main Content ────────────── -->
		<main id="main-content" class="min-w-0 flex-1 pb-20 lg:pb-0">
			{#if teamContext && !teamContext.isOwner}
				<div
					class="border-b border-[var(--ddsa-primary-200)] bg-[var(--dash-btn-ghost-bg)] px-4 py-2 text-center text-sm text-[var(--dash-accent-text)] dark:border-[var(--ddsa-primary-800)] dark:bg-[var(--ddsa-primary-900)]/20 dark:text-[var(--ddsa-primary-300)]"
				>
					Operating as part of <strong>{teamContext.ownerName || 'Team Owner'}</strong>'s team
				</div>
			{/if}

			<!-- DSA quota — mobile banner. Only visible <lg (desktop has the
			     sidebar block + top-bar chip; mobile has neither). -->
			{#if role === 'dsa'}
				<div class="lg:hidden">
					<DsaQuotaIndicator {quotaState} mode="banner" />
				</div>
			{/if}

			<!-- F.5 — NPS banner. Server-side eligibility check at
			     +layout.server.ts decides whether to mount; component
			     itself handles its own submit + dismiss lifecycle. -->
			{#if npsWindow}
				<div class="px-4 pt-3">
					<NpsBanner />
				</div>
			{/if}

			<!-- Trial expiry warning banner (DSA only, <=3 days left) -->
			{#if trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0}
				<div
					class="flex items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
				>
					<span
						>Your trial expires in <strong
							>{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}</strong
						>. Upgrade to keep evaluating cases.</span
					>
					<a
						href="/dashboard/dsa/billing"
						class="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
					>
						Upgrade
					</a>
				</div>
			{/if}
			<div class="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
				<ErrorBoundary>
					{@render children()}
				</ErrorBoundary>
			</div>
		</main>
	</div>

	<!-- ═══ Mobile Bottom Nav ═══ -->
	<nav
		class="fixed right-0 bottom-0 left-0 z-50 border-t border-[var(--dash-border)] bg-[var(--dash-bg-card)] lg:hidden"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<div class="flex items-center justify-around py-2">
			{#each currentNav.slice(0, 4) as item}
				{@const isActive = isNavActive(item)}
				{@const MobIcon = item.icon}
				<a
					href={item.href}
					data-walkthrough={item.walkthroughId ? `mobile-${item.walkthroughId}` : undefined}
					class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-2 py-1 text-center
						{isActive ? 'text-[var(--dash-text)]' : 'text-[var(--dash-text-muted)]'}"
				>
					<MobIcon size={20} strokeWidth={1.5} />
					<span class="text-[13px] font-medium">{item.label}</span>
				</a>
			{/each}
			<!-- "More" button -->
			<button
				type="button"
				onclick={() => (showMobileMore = !showMobileMore)}
				class="flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-2 py-1 text-center
					{showMobileMore ? 'text-[var(--dash-text)]' : 'text-[var(--dash-text-muted)]'}"
			>
				<MoreVertical size={20} strokeWidth={1.5} />
				<span class="text-[13px] font-medium">More</span>
			</button>
		</div>
	</nav>

	<!-- ═══ Mobile "More" Menu ═══ -->
	{#if showMobileMore}
		<div
			class="fixed inset-0 z-40 lg:hidden"
			role="dialog"
			aria-modal="true"
			aria-label="More navigation options"
			tabindex="-1"
			onclick={() => (showMobileMore = false)}
			onkeydown={(e) => {
				if (e.key === 'Escape') showMobileMore = false;
			}}
		>
			<div class="absolute inset-0 bg-black/30"></div>
			<!-- Non-interactive container: stopPropagation prevents backdrop close when clicking menu content -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute right-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-2 max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-2 shadow-xl"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Remaining nav items beyond first 4 -->
				{#each currentNav.slice(4) as item}
					{@const isActive = isNavActive(item)}
					{@const SideIcon = item.icon}
					<a
						href={item.href}
						onclick={() => (showMobileMore = false)}
						class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
							{isActive
							? 'bg-[var(--dash-bg-alt)] text-[var(--dash-text)]'
							: 'text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'}"
					>
						<SideIcon size={18} strokeWidth={1.5} class="shrink-0" />
						{item.label}
					</a>
				{/each}

				<!-- Locked items in mobile More menu -->
				{#if dsaLockedNav.length > 0}
					<div class="my-1 border-t border-[var(--dash-border-light)]"></div>
					<p
						class="px-3 py-1.5 text-[12px] font-semibold tracking-widest text-[var(--dash-text-muted)] uppercase"
					>
						Unlocks later
					</p>
					{#each dsaLockedNav as item}
						{@const SideIcon = item.icon}
						<div
							class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-35"
							title={getLockedTooltip(item)}
						>
							<SideIcon
								size={18}
								strokeWidth={1.5}
								class="shrink-0 text-[var(--dash-text-muted)]"
							/>
							<span class="flex-1 text-[var(--dash-text-muted)]">{item.label}</span>
							<span
								class="rounded border border-[var(--dash-border)] bg-[var(--dash-bg-alt)] px-1.5 py-0.5 text-[12px] font-bold tracking-wider text-[var(--dash-text-muted)]"
							>
								{getLockBadge(item)}
							</span>
						</div>
					{/each}
				{/if}

				{#if currentNav.length > 4 && dsaLockedNav.length === 0}
					<div class="my-1 border-t border-[var(--dash-border-light)]"></div>
				{/if}

				<!-- Theme toggle -->
				<button
					type="button"
					onclick={() => {
						themeState.toggleTheme();
					}}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					{#if themeMode === 'light'}
						<Sun size={18} strokeWidth={1.5} class="shrink-0" />
						<span>Light Mode</span>
					{:else if themeMode === 'dark'}
						<Moon size={18} strokeWidth={1.5} class="shrink-0" />
						<span>Dark Mode</span>
					{:else}
						<Monitor size={18} strokeWidth={1.5} class="shrink-0" />
						<span>System</span>
					{/if}
				</button>

				<!-- Language selector -->
				<div class="px-3 py-1.5">
					<LanguageSelector saveToServer={true} compact={true} />
				</div>

				<!-- Color scheme -->
				<div class="px-3 py-2">
					<div class="flex items-center gap-1.5">
						{#each COLOR_SCHEMES as s}
							<button
								type="button"
								onclick={() => handleSchemeChange(s.id)}
								title={s.label}
								aria-label="Switch to {s.label}"
								class="relative h-5 w-5 rounded-full transition-all duration-150 hover:scale-110
									{themeState.scheme === s.id
									? 'scale-110 ring-2 ring-[var(--dash-text)] ring-offset-1'
									: 'opacity-60 hover:opacity-100'}"
								style="background-color: {s.swatch};"
							>
								{#if themeState.scheme === s.id}
									<svg class="absolute inset-0 m-auto h-2.5 w-2.5" viewBox="0 0 10 10">
										<path
											d="M1.5 5l2.5 2.5 4.5-4.5"
											stroke="white"
											stroke-width="1.5"
											fill="none"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				{#if isAdminUser && switchableRoles.length > 0}
					<div class="my-1 border-t border-[var(--dash-border-light)]"></div>
					<p
						class="px-3 py-1 text-[13px] font-semibold tracking-wider text-[var(--dash-text-muted)] uppercase"
					>
						Switch Role
					</p>
					{#each switchableRoles as r}
						{@const meta = ROLE_META[r]}
						<button
							type="button"
							onclick={() => {
								showMobileMore = false;
								switchRole(r);
							}}
							disabled={isSwitchingRole}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
								{meta.color} hover:bg-[var(--dash-hover)] disabled:opacity-50"
						>
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded text-[13px] font-bold {meta.bgColor}"
								>{meta.shortLabel.charAt(0)}</span
							>
							{meta.label}
						</button>
					{/each}
				{/if}

				<div class="my-1 border-t border-[var(--dash-border-light)]"></div>

				<!-- Home Page -->
				<a
					href="/"
					data-sveltekit-reload
					onclick={() => (showMobileMore = false)}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					<Home size={18} strokeWidth={1.5} class="shrink-0" />
					Home Page
				</a>

				<!-- Delete Account -->
				<button
					type="button"
					onclick={() => {
						showMobileMore = false;
						showDeleteModal = true;
					}}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					<Trash2 size={18} strokeWidth={1.5} class="shrink-0" />
					Delete Account
				</button>

				<!-- Logout -->
				<button
					type="button"
					onclick={() => {
						showMobileMore = false;
						handleLogout();
					}}
					disabled={isLoggingOut}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dash-text-muted)] transition-colors hover:bg-[var(--dash-hover)] hover:text-[var(--dash-text)] disabled:opacity-50"
				>
					{#if isLoggingOut}
						<span
							class="inline-block h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
					{:else}
						<DoorOpen size={18} strokeWidth={1.5} class="shrink-0" />
					{/if}
					{isLoggingOut ? 'Logging out...' : 'Logout'}
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Demo Restriction Modal -->
<DemoRestrictionModal open={showDemoRestriction} onclose={() => (showDemoRestriction = false)} />

<!-- SEC-10 kicked-side toast — surfaces when /api/auth/session-status returns 401 -->
{#if sessionPoller.state.kicked}
	<KickedToast
		reason={sessionPoller.state.kicked.reason}
		at={sessionPoller.state.kicked.at}
	/>
{/if}

<!-- Delete Account Confirmation Modal — native <dialog> provides focus trap, Escape key, and backdrop -->
<dialog
	bind:this={deleteDialog}
	aria-label="Delete account confirmation"
	class="m-auto w-full max-w-md rounded-xl bg-[var(--dash-bg-card)] p-6 shadow-2xl backdrop:bg-black/50"
	onclose={() => {
		showDeleteModal = false;
		deleteConfirmText = '';
	}}
>
	{#if showDeleteModal}
		<div>
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dash-btn-ghost-bg)]"
			>
				<Trash2 size={28} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>

			<h3 class="mb-2 text-center text-lg font-bold text-[var(--dash-text)]">
				Delete Your Account?
			</h3>

			<div class="mb-4 rounded-lg bg-[var(--dash-bg-alt)] p-3">
				<p class="text-sm text-[var(--dash-text-secondary)]">
					<strong>Warning:</strong> This action will permanently deactivate your account. You will lose
					access to:
				</p>
				<ul class="mt-2 space-y-1 text-sm text-[var(--dash-text-muted)]">
					<li>- Your dashboard and all settings</li>
					<li>- Application history and referrals</li>
					<li>- Earned coins and commissions</li>
				</ul>
			</div>

			<p class="mb-3 text-sm text-[var(--dash-text-secondary)]">
				Type <strong class="font-mono text-[var(--dash-accent-text)]">DELETE</strong> to confirm:
			</p>

			<input
				type="text"
				bind:value={deleteConfirmText}
				placeholder="Type DELETE"
				class="mb-4 w-full rounded-lg border border-[var(--dash-border)] bg-[var(--dash-input-bg)] px-4 py-2.5 font-mono text-sm text-[var(--dash-text)] focus:border-[var(--ddsa-primary-500)] focus:ring-2 focus:ring-[var(--ddsa-primary-500)]/20 focus:outline-none"
			/>

			<div class="flex gap-3">
				<button
					type="button"
					onclick={() => {
						showDeleteModal = false;
						deleteConfirmText = '';
					}}
					class="flex-1 rounded-lg border border-[var(--dash-border)] px-4 py-2.5 text-sm font-medium text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-hover)]"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleDeleteAccount}
					disabled={deleteConfirmText !== 'DELETE' || isDeleting}
					class="flex-1 rounded-lg bg-[var(--ddsa-secondary-800)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ddsa-secondary-900)] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isDeleting ? 'Deleting...' : 'Delete Account'}
				</button>
			</div>
		</div>
	{/if}
</dialog>

<!-- Global ConfirmModal for dashboard pages -->
<ConfirmModal />

<!-- Command Palette (Cmd+K / Ctrl+K) -->
<CommandPalette {role} />

<style>
	/*
	 * Native <dialog> backdrop — replaces the manual bg-black/50 overlay wrapper.
	 * The ::backdrop pseudo-element is painted outside the stacking context,
	 * so it naturally covers everything below without needing z-index juggling.
	 */
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}
</style>
