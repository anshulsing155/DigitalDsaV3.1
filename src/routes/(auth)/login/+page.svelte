<script lang="ts">
	/**
	 * Login Page — Phone-First Design
	 * ═══════════════════════════════════════════════════════════════════
	 * Flow:
	 *   1. MOBILE INPUT — Enter Indian phone number
	 *   2. OTP VERIFICATION — Enter 4-digit code
	 *   3. DETECT ROLES → route directly:
	 *      a) No profile → auto-create Applicant → DSA onboarding
	 *      b) DSA found → DSA dashboard
	 *      c) RM found → RM dashboard
	 *      d) Admin → Admin dashboard
	 *
	 * No role picker. Identity first, single role per login.
	 * Partner signup for RMs is at /partner-signup.
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { goto } from '$app/navigation';

	import clientLogger from '$lib/utils/clientLogger';
	import { loginSchema } from '$lib/formValidationSchema';
	import { addToast, setAuthData } from '$lib/stores/stores.js';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { MoveLeft, Shield, AlertCircle, Phone, RotateCcw, Plus } from '$lib/utils/iconRegistry';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import { initLanguage } from '$lib/i18n';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser } from '$app/environment';
	import { safeRedirectPath, isSafeRedirectPath } from '$lib/utils/safeRedirectPath';
	import { buildFingerprints } from '$lib/utils/sessionFingerprint';
	import SessionConflictModal from '$lib/components/SessionConflictModal.svelte';
	import type { ExistingSessionDigest } from '$lib/server/auth/sessionConflict';

	interface Props {
		data?: {
			redirect?: string;
		};
	}
	let { data = {} }: Props = $props();
	let redirectUrl = $derived(data.redirect ?? page.url.searchParams.get('redirect') ?? 'dashboard');

	// Dashboard paths per role
	const ROLE_DASHBOARD: Record<string, string> = {
		dsa: '/dashboard/dsa',
		rm: '/dashboard/rm',
		admin: '/dashboard/admin'
	};

	// ── Page State ───────────────────────────────────────────────
	type PageStep = 'mobile' | 'otp' | 'foreigner' | 'restore-choice';

	let currentStep: PageStep = $state('mobile');

	let isLoading = $state(true);
	let isWaiting = $state(false);

	// ── Form Data (minimal — just mobile + OTP) ──────────────────
	interface FormData {
		userMobile?: string;
	}
	interface FormErrors {
		userMobile?: { _errors?: string[] };
	}
	let formData = $state<FormData>({});
	let errors = $state<FormErrors>({});

	// ── OTP State ────────────────────────────────────────────────
	let otp = $state(['', '', '', '']);
	let otpCode = $derived(otp.join(''));
	let requestId = $state('');
	let lastOtpSent = $state(0);
	const OTP_COOLDOWN = 30000;
	const SESSION_TIMEOUT = 10 * 60 * 1000;
	let countdown = $state(30);
	let isResendDisabled = $state(true);
	let sessionStartTime = $state(0);
	let otpError = $state('');

	// ── Location State ───────────────────────────────────────────
	let country = $state('');
	let nri = $state(false);
	let visitor = $state(false);
	let isButtonEnabled = $derived(nri || visitor);

	let widgetData = $state(null);
	let isDemoLoading = $state(false);

	// ── SEC-10 — session-conflict modal state ────────────────────
	// Populated when check-dsa returns { status: 'session_conflict', ... }.
	// While the modal is open, isWaiting is false (the OTP screen below
	// shouldn't spin under a modal). confirmInFlight gates the modal's
	// own buttons during the /api/auth/login-confirm POST.
	let sessionConflictOpen = $state(false);
	let conflictExistingSessions = $state<ExistingSessionDigest[]>([]);
	let pendingLoginToken = $state<string | null>(null);
	let pendingLoginRole = $state<string | null>(null);
	let confirmInFlight = $state(false);

	// ── Deleted Account State (for restore/fresh choice) ────────
	let deletedAccountName = $state('');
	let deletedAccountDate = $state('');

	// ── Role Confirmation Modal (when user has both DSA/RM + admin) ──
	let showRoleModal = $state(false);
	let availableRoles = $state<string[]>([]);
	let roleModalUserName = $state('');

	// ── Demo Login ──────────────────────────────────────────────
	async function enterDemoMode() {
		isDemoLoading = true;
		try {
			const response = await fetch('/api/auth/demo-login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result = await response.json();

			if (result.success) {
				setAuthData(result.user, {
					accessToken: 'demo', // Cookie is set server-side
					refreshToken: 'demo'
				});

				addToast({
					type: 'success',
					message: 'Welcome to the demo! Explore all features freely.',
					duration: 3000
				});

				window.location.href = '/dashboard/dsa';
			} else {
				addToast({
					type: 'error',
					message: 'Demo unavailable right now. Please try again.',
					duration: 3000
				});
			}
		} catch {
			addToast({
				type: 'error',
				message: 'Demo unavailable right now. Please try again.',
				duration: 3000
			});
		} finally {
			isDemoLoading = false;
		}
	}

	// ── Timer references ─────────────────────────────────────────
	let otpCountdownInterval: ReturnType<typeof setInterval> | null = null;

	onMount(async () => {
		initLanguage();
		await initializeComponent();
	});

	$effect(() => {
		return () => {
			if (otpCountdownInterval) clearInterval(otpCountdownInterval);
		};
	});

	// ── Initialization ───────────────────────────────────────────
	async function initializeComponent() {
		if (!browser) {
			isLoading = false;
			return;
		}

		isLoading = true;
		try {
			const widgetResponse = await fetch('/api/auth/init-widget');
			if (!widgetResponse.ok) throw new Error('Failed to initialize widget');
			const widgetResult = await widgetResponse.json();
			if (!widgetResult.success) throw new Error(widgetResult.error || 'Widget init failed');
			widgetData = widgetResult.widgetData;

			const locationResponse = await fetch('/api/auth/check-location');
			if (!locationResponse.ok) throw new Error('Failed to fetch location');
			const locationData = await locationResponse.json();
			country = locationData.location?.country || 'Unknown';

			if (country !== 'IN') {
				currentStep = 'foreigner';
			}
		} catch (error) {
			clientLogger.error({ err: error }, 'Initialization error:');
			addToast({
				type: 'error',
				message: 'IP blocked. Try again in 24 hours or contact us.',
				duration: 3000
			});
		} finally {
			isLoading = false;
		}
	}

	// ── Navigation ───────────────────────────────────────────────
	function goBackToMobile() {
		currentStep = 'mobile';
		otp = ['', '', '', ''];
	}

	// ── Security ─────────────────────────────────────────────────
	// Legacy `isSafeRedirect` (domain-allowlist) removed 2026-05-29 — it
	// matched the host but didn't enforce same-origin paths, and was
	// never actually called on the post-login navigation site (the
	// open-redirect was live). Replaced with `safeRedirectPath` from
	// $lib/utils/safeRedirectPath — strict path-only validation.

	function sanitizeText(text: string): string {
		return text.replace(
			/[<>&"']/g,
			(match: string) =>
				(
					({
						'<': '&lt;',
						'>': '&gt;',
						'&': '&amp;',
						'"': '&quot;',
						"'": '&#x27;'
					}) as Record<string, string>
				)[match]
		);
	}

	// ── Form Validation ──────────────────────────────────────────

	/** Formatting only — strip non-digits, cap at 10. Runs on every keystroke. */
	function formatMobile(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 10);
		formData.userMobile = value;
		// Clear stale error while user is still typing
		if (errors.userMobile) errors.userMobile = undefined;
	}

	/** Full schema validation — runs on blur and before submit. */
	function validateMobile(): boolean {
		if (!formData.userMobile) {
			errors.userMobile = { _errors: ['Mobile number is required'] };
			return false;
		}
		const result = loginSchema.safeParse({ mobileNumber: formData.userMobile });
		errors.userMobile = result.success ? undefined : result.error.format().mobileNumber;
		return result.success;
	}

	// ── OTP Functions ────────────────────────────────────────────
	async function sendOTP() {
		if (!browser) return;

		if (Date.now() - lastOtpSent < OTP_COOLDOWN) {
			addToast({
				type: 'warning',
				message: 'Please wait before requesting another OTP',
				duration: 3000
			});
			return;
		}

		if (!validateMobile()) {
			return;
		}

		if (!widgetData) {
			addToast({
				type: 'error',
				message: 'IP blocked. Try again in 24 hours or contact us.',
				duration: 3000
			});
			return;
		}

		isWaiting = true;
		try {
			const response = await fetch('/api/auth/send-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: Number(formData.userMobile) })
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.message || 'Failed to send OTP');

			requestId = result.reqId || '';
			sessionStartTime = Date.now();
			currentStep = 'otp';
			startCountdown();
			lastOtpSent = Date.now();
			addToast({ type: 'success', message: 'OTP sent successfully', duration: 3000 });

			await tick();
			document.getElementById('otp-input-0')?.focus();
		} catch {
			addToast({ type: 'error', message: 'Failed to send OTP', duration: 3000 });
		} finally {
			isWaiting = false;
		}
	}

	/**
	 * After OTP verification:
	 * 1. Verify OTP with MSG91 via /api/auth/verify-otp
	 * 2. Detect role booleans via /api/auth/detect-roles
	 * 3. Route based on role booleans:
	 *    - requiresOnboarding (no roles true) → create bare Applicant → onboarding
	 *    - admin → show all 5 roles in picker
	 *    - 1 active role → direct to dashboard
	 *    - multiple active roles → role picker
	 */
	async function verifyOTP() {
		if (!browser) return;
		if (isWaiting) return;

		otpError = '';

		if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
			otpError = 'Please enter all 4 digits';
			return;
		}

		if (!requestId) {
			otpError = 'No active OTP session. Please request a new OTP.';
			return;
		}

		if (sessionStartTime && Date.now() - sessionStartTime > SESSION_TIMEOUT) {
			requestId = '';
			otpError = 'OTP expired. Please request a new one.';
			return;
		}

		isWaiting = true;
		try {
			// Step 1: Verify OTP with default 'user' role
			const verifyResponse = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					otpCode,
					reqId: requestId,
					mobileNumber: formData.userMobile,
					userRole: 'user'
				})
			});

			const verifyResult = await verifyResponse.json();
			if (!verifyResponse.ok || !verifyResult.success) {
				throw new Error(verifyResult.error || 'Invalid OTP');
			}

			// Step 2: Detect all roles for this mobile number
			const rolesResponse = await fetch('/api/auth/detect-roles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: formData.userMobile })
			});

			const rolesResult = await rolesResponse.json();

			if (!rolesResult.success) {
				throw new Error(rolesResult.error || 'Failed to detect roles');
			}

			const {
				hasAnyProfile,
				activeRoles: detectedActiveRoles,
				isAdmin: detectedIsAdmin,
				requiresOnboarding: needsOnboarding,
				hasDeletedAccount,
				deletedAccountInfo
			} = rolesResult.data;

			if (!hasAnyProfile || needsOnboarding) {
				// Check if this is a re-registering user with a deleted account
				if (hasDeletedAccount && deletedAccountInfo) {
					deletedAccountName = deletedAccountInfo.name || '';
					deletedAccountDate = deletedAccountInfo.deletedAt || '';
					currentStep = 'restore-choice';
					return;
				}

				// NEW USER: auto-create bare Applicant, redirect to DSA onboarding
				try {
					const signupResponse = await fetch('/api/auth/signup', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ mobileNumber: formData.userMobile })
					});
					const signupResult = await signupResponse.json();

					if (!signupResponse.ok && signupResponse.status !== 409) {
						throw new Error(signupResult.error || 'Failed to create account');
					}
				} catch (signupErr) {
					clientLogger.error({ err: signupErr }, 'Auto-signup failed:');
				}

				addToast({
					type: 'success',
					message: "Welcome! Let's set up your profile.",
					duration: 3000
				});
				window.location.href = '/dsa-onboarding';
				return;
			}

			if (detectedIsAdmin) {
				// Admin detected: always show role picker with all 3 options
				// Admins can access DSA/RM dashboards for testing regardless of profiles
				availableRoles = ['admin', 'dsa', 'rm'];
				roleModalUserName = rolesResult.data.userName || '';
				showRoleModal = true;
				// Don't auto-login — wait for user to pick from modal
			} else if (detectedActiveRoles.length >= 1) {
				// Single role (could be admin-only, dsa-only, or rm-only) — route directly
				await loginWithRole(detectedActiveRoles[0]);
			} else {
				// Edge case: hasAnyProfile but no active roles
				addToast({ type: 'info', message: 'Please complete your profile setup', duration: 3000 });
				window.location.href = '/dsa-onboarding';
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
			otpError = message;
			// Clear OTP for easy retry
			otp = ['', '', '', ''];
			await tick();
			document.getElementById('otp-input-0')?.focus();
		} finally {
			isWaiting = false;
		}
	}

	/**
	 * SEC-10 — post-success navigation, factored out so both the check-dsa
	 * success path AND the login-confirm success path (after the user
	 * resolves a session conflict) navigate identically.
	 *
	 * Mirrors the original inline code (auth-data store → activeRole cookie
	 * → onboarding-vs-dashboard branch → safe redirect). Pulls from the
	 * same module-scope closures (redirectUrl, ROLE_DASHBOARD, setActiveRole).
	 */
	async function applyLoginSuccess(
		checkData: any,
		role: string
	): Promise<void> {
		if (checkData.accessToken && checkData.refreshToken) {
			setAuthData(checkData.user, {
				accessToken: checkData.accessToken,
				refreshToken: checkData.refreshToken
			});
		}

		await setActiveRole(role);

		const dashboardPath = ROLE_DASHBOARD[role] || '/dashboard';

		if (checkData.user?.onboardingCompleted === false && role !== 'admin') {
			const onboardingPath = role === 'rm' ? '/rm-onboarding' : '/dsa-onboarding';
			addToast({
				type: 'info',
				message: "Welcome back! Let's finish setting up your profile.",
				duration: 3000
			});
			const onboardingWithRedirect = isSafeRedirectPath(redirectUrl)
				? `${onboardingPath}?redirect=${encodeURIComponent(redirectUrl)}`
				: onboardingPath;
			window.location.href = onboardingWithRedirect;
			return;
		}

		addToast({
			type: 'success',
			message: `Welcome back${checkData.user?.name ? `, ${checkData.user.name}` : ''}!`,
			duration: 3000
		});
		// Full page reload ensures hooks.server.ts runs fresh and auth layout unmounts cleanly.
		window.location.href = safeRedirectPath(redirectUrl, dashboardPath);
	}

	/**
	 * SEC-10 — user clicked "Continue here" on the SessionConflictModal.
	 * POST the pending-login-token + chosen kick_session_ids to login-confirm.
	 * On success, run the same post-login navigation as check-dsa's no-conflict
	 * path. On failure, close the modal + toast — the user is back at the
	 * login screen and can retry.
	 */
	async function handleSessionConflictConfirm(kickSessionIds: string[]): Promise<void> {
		if (!pendingLoginToken || !pendingLoginRole) return;
		// Snapshot the role BEFORE the network call so applyLoginSuccess
		// receives a stable value even if pendingLoginRole is cleared by
		// a re-entrant flow (e.g. user opens login in another tab).
		const role = pendingLoginRole;
		confirmInFlight = true;

		// Reset the pending state to a clean error/cancel-resistant shape.
		// On success, applyLoginSuccess() will window.location.href-navigate
		// so this state never gets read again. On error, the modal closes
		// and the user is at the login screen with no stale token sitting
		// around to be reused on retry.
		const clearPending = () => {
			confirmInFlight = false;
			sessionConflictOpen = false;
			pendingLoginToken = null;
			pendingLoginRole = null;
			conflictExistingSessions = [];
		};

		try {
			const response = await fetch('/api/auth/login-confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pending_login_token: pendingLoginToken,
					kick_session_ids: kickSessionIds
				})
			});
			const result = await response.json();

			if (!result.success) {
				clearPending();
				addToast({
					type: 'error',
					message: result?.error || 'Sign-in failed. Please try again.',
					duration: 4000
				});
				return;
			}

			// Close the modal but DON'T clear pending fields until after
			// applyLoginSuccess starts navigating — keeps the snapshot
			// stable for the navigation call.
			sessionConflictOpen = false;
			await applyLoginSuccess(result.data, role);
		} catch {
			clearPending();
			addToast({
				type: 'error',
				message: 'Sign-in failed. Please try again.',
				duration: 4000
			});
		}
	}

	/**
	 * SEC-10 — user clicked Cancel / X / Escape / backdrop on the modal.
	 * Clear the pending state, drop the spinner, return to the login screen.
	 */
	function handleSessionConflictCancel(): void {
		sessionConflictOpen = false;
		pendingLoginToken = null;
		pendingLoginRole = null;
		conflictExistingSessions = [];
		isWaiting = false;
		confirmInFlight = false;
		addToast({
			type: 'info',
			message: 'Sign-in cancelled.',
			duration: 3000
		});
	}

	/**
	 * Login with a specific role:
	 * Calls the appropriate check-{role} endpoint to generate tokens,
	 * sets the activeRole cookie, and navigates to dashboard.
	 */
	async function loginWithRole(role: string) {
		isWaiting = true;
		try {
			// Single auth check endpoint handles DSA, RM, and admin.
			// Pass preferredRole so multi-role users (e.g. DSA + admin) hit the right collection.
			// For admins picking DSA/RM: always auth via 'admin' (their identity is in AdminUsers),
			// then switch activeRole via cookie — they may not have DSA/RM profiles.
			const isAdminSwitching = availableRoles.includes('admin') && role !== 'admin';
			const authRole = isAdminSwitching ? 'admin' : role;
			const checkUrl = '/api/auth/check-dsa';

			// SEC-10: compute device + browser fingerprints client-side
			// before the check-dsa call. Server runs conflict detection
			// against the user's active Sessions rows + sanitizes the
			// inputs (malformed hex → silently dropped). When the env
			// flag is unset (default soak), conflict detection emits
			// telemetry only and the response shape is unchanged.
			const fingerprints = await buildFingerprints();

			const response = await fetch(checkUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mobileNumber: formData.userMobile,
					preferredRole: authRole,
					deviceFingerprint: fingerprints.device,
					browserFingerprint: fingerprints.browser,
					clientClass: fingerprints.clientClass
				})
			});

			const result = await response.json();

			// DX-4: check-dsa now returns apiOk / apiError envelope.
			// Error branch: result.success is false (rate-limit, validation, server error).
			if (!result.success) {
				isWaiting = false;
				if (response.status === 429) {
					addToast({
						type: 'error',
						message: result?.error || 'Too many login attempts. Please wait a moment.',
						duration: 4000
					});
				} else if (response.status === 400) {
					addToast({
						type: 'error',
						message: 'Please check your mobile number and try again.',
						duration: 4000
					});
				} else {
					addToast({
						type: 'error',
						message: result?.error || 'Login failed. Please try again.',
						duration: 4000
					});
				}
				return;
			}

			// Success envelope: unwrap data. userExists=false means
			// no account found — redirect to onboarding.
			const checkData = result.data;

			// SEC-10: conflict-resolution branch. The server enters this
			// path when SESSION_ENFORCEMENT_KICK_ENABLED='true' AND the
			// incoming fingerprints conflict with an active Sessions row.
			// Open the modal; the user's confirm/cancel decision drives
			// the rest of the flow via handleSessionConflictConfirm /
			// handleSessionConflictCancel below.
			if (checkData?.status === 'session_conflict') {
				isWaiting = false;
				conflictExistingSessions = checkData.existing_sessions ?? [];
				pendingLoginToken = checkData.pending_login_token;
				pendingLoginRole = role;
				sessionConflictOpen = true;
				return;
			}

			if (!checkData.userExists) {
				// User was detected but check failed — send to onboarding.
				// Preserve the original deep-link destination via ?redirect=,
				// but ONLY if the destination is a safe same-origin path.
				// Otherwise drop the param so the onboarding flow lands on
				// the default dashboard at the end (rather than passing an
				// attacker-controlled URL further down the chain).
				await setActiveRole(role);
				const onboardingPath = role === 'rm' ? '/rm-onboarding' : '/dsa-onboarding';
				addToast({ type: 'info', message: 'Please complete your profile setup', duration: 3000 });
				const onboardingWithRedirect = isSafeRedirectPath(redirectUrl)
					? `${onboardingPath}?redirect=${encodeURIComponent(redirectUrl)}`
					: onboardingPath;
				window.location.href = onboardingWithRedirect;
				return;
			}

			// No-conflict path: hand off to the shared post-success helper.
			// applyLoginSuccess sets auth data, activeRole cookie, then
			// decides between onboarding and dashboard navigation.
			await applyLoginSuccess(checkData, role);
		} catch {
			isWaiting = false;
			addToast({ type: 'error', message: 'Login failed. Please try again.', duration: 3000 });
		}
	}

	/**
	 * Set the active role via the set-role API
	 */
	async function setActiveRole(role: string) {
		try {
			// secureFetch adds the CSRF token header — raw fetch gets 403 from
			// hooks.server.ts validateCSRF in production
			await secureFetch('/api/set-role', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});
		} catch {
			// Non-critical — role cookie is also set during JWT auth
		}
	}

	/**
	 * Restore a previously deleted account
	 */
	async function restoreAccount() {
		isWaiting = true;
		try {
			const response = await secureFetch('/api/auth/restore-account', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: formData.userMobile })
			});

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to restore account');
			}

			addToast({
				type: 'success',
				message: `Welcome back${result.user?.name ? `, ${result.user.name}` : ''}! Your account has been restored.`,
				duration: 3000
			});
			window.location.href = result.redirect || '/dashboard/dsa';
		} catch (err) {
			isWaiting = false;
			const message = err instanceof Error ? err.message : 'Restore failed. Please try again.';
			addToast({ type: 'error', message, duration: 3000 });
		}
	}

	/**
	 * Start fresh — proceed with normal signup + onboarding (sample data seeded by onboarding endpoint)
	 */
	async function startFresh() {
		isWaiting = true;
		try {
			const signupResponse = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mobileNumber: formData.userMobile })
			});
			const signupResult = await signupResponse.json();

			if (!signupResponse.ok && signupResponse.status !== 409) {
				throw new Error(signupResult.error || 'Failed to create account');
			}

			addToast({ type: 'success', message: "Let's set up your new profile.", duration: 3000 });
			window.location.href = '/dsa-onboarding';
		} catch (err) {
			isWaiting = false;
			const message = err instanceof Error ? err.message : 'Signup failed. Please try again.';
			addToast({ type: 'error', message, duration: 3000 });
		}
	}

	async function retryOTP() {
		if (!browser) return;
		if (Date.now() - lastOtpSent < OTP_COOLDOWN || !requestId) return;

		try {
			const response = await fetch('/api/auth/resend-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reqId: requestId,
					mobileNumber: Number(formData.userMobile)
				})
			});
			const result = await response.json();
			if (!response.ok || !result.success) throw new Error(result.error || 'Failed to resend OTP');

			requestId = result.requestId || requestId;
			lastOtpSent = Date.now();
			startCountdown();
			addToast({ type: 'success', message: 'OTP resent successfully', duration: 3000 });
		} catch {
			addToast({ type: 'error', message: 'Failed to resend OTP', duration: 3000 });
		}
	}

	// ── Countdown Helpers ────────────────────────────────────────
	function startCountdown() {
		isResendDisabled = true;
		countdown = 30;
		if (otpCountdownInterval) clearInterval(otpCountdownInterval);
		otpCountdownInterval = setInterval(() => {
			if (countdown > 0) countdown--;
			else {
				if (otpCountdownInterval) clearInterval(otpCountdownInterval);
				otpCountdownInterval = null;
				isResendDisabled = false;
			}
		}, 1000);
	}

	// ── OTP Input Helpers ────────────────────────────────────────
	function updateDigit(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, '').slice(0, 1);
		otp[index] = value;
		otpError = ''; // Clear error on new input
		if (value && index < otp.length - 1) {
			document.getElementById(`otp-input-${index + 1}`)?.focus();
		}
		if (value && index === otp.length - 1 && otp.every((d: string) => d)) {
			setTimeout(verifyOTP, 300);
		}
	}

	function handleBackspace(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace') {
			if (otp[index]) {
				// Current field has digit — clear it
				otp[index] = '';
				event.preventDefault();
			} else if (index > 0) {
				// Current field empty — move back and clear previous
				otp[index - 1] = '';
				document.getElementById(`otp-input-${index - 1}`)?.focus();
				event.preventDefault();
			}
			otpError = ''; // Clear error on backspace
		}
	}

	function handleOtpPaste(event: ClipboardEvent) {
		event.preventDefault();
		const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
		if (!pasted) return;

		for (let i = 0; i < 4; i++) {
			otp[i] = pasted[i] || '';
			const el = document.getElementById(`otp-input-${i}`) as HTMLInputElement | null;
			if (el) el.value = otp[i];
		}
		otpError = '';
		// Focus last filled or first empty
		const focusIdx = Math.min(pasted.length, 3);
		document.getElementById(`otp-input-${focusIdx}`)?.focus();
		// Auto-submit if all 4 pasted
		if (pasted.length === 4) setTimeout(verifyOTP, 300);
	}

	function handleEnter(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter') action();
	}

	function proceed() {
		if (nri || visitor) {
			currentStep = 'mobile';
		}
	}
</script>

<svelte:head>
	<title>Sign In - DigitalDSA</title>
	<meta
		name="description"
		content="Sign in to Digital DSA — India's smartest loan comparison platform for applicants, DSA agents, and bank RMs."
	/>
</svelte:head>

<section
	class="font-Poppins relative z-50 flex h-screen w-full flex-col overflow-hidden lg:flex-row"
>
	<!-- LEFT BRAND PANEL (desktop only) -->
	<div
		class="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[45%] xl:w-[42%] xl:p-14"
		style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1a2744 100%);"
	>
		<!-- Decorative elements -->
		<div class="absolute top-10 right-10 h-72 w-72 opacity-[0.04]">
			<img src="/logo/whiteLogo.svg" alt="" aria-hidden="true" class="h-full w-full" />
		</div>
		<div
			class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-10"
			style="background: radial-gradient(circle, #cb997e, transparent 70%);"
		></div>

		<!-- Logo -->
		<div class="relative z-10 mb-auto flex items-center gap-3">
			<img src="/logo/whiteLogo.svg" alt="DigitalDSA" class="h-9 w-auto" />
			<span class="text-xl font-bold tracking-tight text-white">DigitalDSA</span>
		</div>

		<!-- Brand Messaging -->
		<div class="relative z-10 flex flex-1 flex-col justify-center py-12">
			<h1 class="mb-4 text-3xl leading-tight font-bold text-white xl:text-[2.5rem]">
				India's #1 Intelligence<br />Platform for Loan DSAs
			</h1>
			<p class="max-w-md text-base leading-relaxed text-slate-300 xl:text-lg">
				Compare 100+ lenders instantly. Calculate exact eligibility. Close more loans with
				data-driven precision.
			</p>
		</div>

		<!-- Trust Stats -->
		<div class="relative z-10 border-t border-white/10 pt-8">
			<div class="grid grid-cols-3 gap-6">
				<div>
					<div class="text-2xl font-bold xl:text-3xl" style="color: #d6ae99;">2,940+</div>
					<div class="mt-1 text-xs text-slate-400">Loans Matched</div>
				</div>
				<div>
					<div class="text-2xl font-bold xl:text-3xl" style="color: #d6ae99;">100+</div>
					<div class="mt-1 text-xs text-slate-400">Lender Partners</div>
				</div>
				<div>
					<div class="text-2xl font-bold xl:text-3xl" style="color: #d6ae99;">80+</div>
					<div class="mt-1 text-xs text-slate-400">Cities Covered</div>
				</div>
			</div>
		</div>
	</div>

	<!-- RIGHT FORM PANEL -->
	<div class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--form-bg-card)]">
		<!-- Mobile-only brand header -->
		<div
			class="bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] px-6 pt-5 pb-4 lg:hidden"
		>
			<div class="flex items-center gap-3">
				<img src="/logo/whiteLogo.svg" alt="DigitalDSA" class="h-7 w-auto" />
				<span class="text-lg font-bold tracking-tight text-white">DigitalDSA</span>
			</div>
		</div>

		<!-- Form centering wrapper -->
		<div class="flex flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-16 xl:px-24">
			<div class="w-full max-w-md">
				{#if isLoading}
					<!-- Loading -->
					<div class="flex items-center justify-center py-32">
						<div class="loader" aria-label="Loading"></div>
					</div>
				{:else if !widgetData}
					<!-- IP Blocked -->
					<div class="w-full overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl">
						<div class="flex w-full justify-center p-6" style="background: #ddbea9;">
							<AlertCircle class="h-16 w-16 text-white/80" />
						</div>
						<div class="flex flex-col gap-4 px-6 py-8 text-center">
							<h2 class="text-2xl font-bold text-[var(--form-text)]">Access Restricted</h2>
							<p class="text-sm text-[var(--form-text-secondary)]">
								Your IP has been temporarily blocked. Please try again after 24 hours or contact
								support.
							</p>
							<button
								class="w-full rounded-lg px-6 py-3 font-semibold text-white transition-colors"
								style="background: #ddbea9;"
								onclick={() => goto('/contact')}
							>
								Contact Support
							</button>
						</div>
					</div>
				{:else if currentStep === 'foreigner'}
					<!-- Foreigner Gate -->
					<div in:fade={{ duration: 200 }}>
						<div class="mb-6 text-center">
							<div
								class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 dark:bg-stone-900/30"
							>
								<Shield class="h-7 w-7 text-stone-600" />
							</div>
							<h2 class="text-2xl font-bold text-[var(--form-text)]">India-Only Service</h2>
							<p class="mt-2 text-sm text-[var(--form-text-secondary)]">
								Our platform compares Indian banks and financial institutions. Access is restricted
								to Indian residents.
							</p>
						</div>

						<div
							class="mb-6 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900/20"
						>
							<p class="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
								<strong>NRI?</strong> You may proceed if you have an Indian mobile number or a GPA who
								is an Indian resident.
							</p>
						</div>

						<div class="mb-6 flex flex-col gap-3">
							<label
								class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--form-border)] p-3 transition-colors hover:bg-[var(--form-bg-alt)]"
							>
								<input
									type="checkbox"
									bind:checked={nri}
									class="h-4 w-4 rounded border-[var(--form-border)] text-stone-500 focus:ring-stone-400"
								/>
								<span class="text-sm text-[var(--form-text-secondary)]"
									>I am an NRI with a valid Indian mobile number</span
								>
							</label>
							<label
								class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--form-border)] p-3 transition-colors hover:bg-[var(--form-bg-alt)]"
							>
								<input
									type="checkbox"
									bind:checked={visitor}
									class="h-4 w-4 rounded border-[var(--form-border)] text-stone-500 focus:ring-stone-400"
								/>
								<span class="text-sm text-[var(--form-text-secondary)]"
									>I am a resident visiting outside India</span
								>
							</label>
						</div>

						<button
							onclick={proceed}
							disabled={!isButtonEnabled}
							class="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white
					transition-colors hover:bg-slate-800 disabled:cursor-not-allowed
					disabled:bg-[var(--form-bg-alt)] disabled:text-[var(--form-text-muted)]"
						>
							Continue
						</button>

						<p class="mt-4 text-center text-[10px] text-[var(--form-text-muted)]">
							If you're in India, please disable your VPN or proxy.
						</p>
					</div>
				{:else if currentStep === 'mobile'}
					<!-- ═══════════════════════════════════════════════════════════
		     STEP 1: MOBILE NUMBER — Phone-First, No Role Selection
		     ═══════════════════════════════════════════════════════════ -->
					<div in:fly={{ y: 20, duration: 300 }}>
						<!-- Header -->
						<div class="mb-8">
							<h2 class="text-2xl font-bold tracking-tight text-[var(--form-text)] sm:text-3xl">
								Welcome back
							</h2>
							<p class="mt-2 text-sm text-[var(--form-text-secondary)]">
								Sign in or create your account to continue
							</p>
						</div>

						<!-- Mobile Input -->
						<div class="space-y-4">
							<div>
								<label
									for="userMobile"
									class="mb-1.5 block text-sm font-semibold text-[var(--form-text-secondary)]"
								>
									Mobile Number
								</label>
								<div class="flex gap-2">
									<span
										class="flex items-center rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-alt)] px-3 text-sm font-medium text-[var(--form-text-secondary)]"
									>
										+91
									</span>
									<input
										id="userMobile"
										type="tel"
										inputmode="numeric"
										autocomplete="tel"
										bind:value={formData.userMobile}
										oninput={formatMobile}
										onblur={() => validateMobile()}
										onkeydown={(e) => handleEnter(e, sendOTP)}
										maxlength="10"
										placeholder="10-digit number"
										class="flex-1 rounded-xl border border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3 text-base
								font-medium text-[var(--form-text)]
								transition-all outline-none placeholder:text-[var(--form-text-muted)] focus:border-stone-400 focus:ring-2
								focus:ring-stone-400"
									/>
								</div>
								{#if errors.userMobile}
									<p class="mt-2 flex items-center gap-1 text-xs text-red-500">
										<AlertCircle class="h-3.5 w-3.5" />
										{errors.userMobile._errors?.[0]}
									</p>
								{/if}
							</div>

							{#if isWaiting}
								<button
									disabled
									class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] py-3.5 font-semibold text-white opacity-70"
								>
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
									></div>
									Sending OTP...
								</button>
							{:else}
								<button
									onclick={sendOTP}
									class="w-full transform cursor-pointer rounded-xl bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.01] hover:shadow-xl"
								>
									Continue
								</button>
							{/if}
						</div>

						<!-- Demo Access -->
						<div class="relative my-5">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-[var(--form-border)]"></div>
							</div>
							<div class="relative flex justify-center text-xs">
								<span
									class="bg-[var(--form-bg-card)] px-3 font-medium text-[var(--form-text-muted)]"
									>or</span
								>
							</div>
						</div>

						<button
							onclick={enterDemoMode}
							disabled={isDemoLoading}
							class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-stone-200 bg-stone-50 py-3
					text-sm font-semibold
					text-stone-700 transition-all duration-200 disabled:cursor-not-allowed
					disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900/20 dark:text-stone-300"
						>
							{#if isDemoLoading}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-stone-500 border-t-transparent"
								></div>
								Loading Demo...
							{:else}
								<span class="text-base">🎯</span>
								Explore Demo Dashboard
							{/if}
						</button>

						<!-- Partner Signup -->
						<div class="mt-4 text-center">
							<p class="text-sm text-[var(--form-text-secondary)]">
								Are you a lender RM?
								<a href="/partner-signup" class="font-semibold text-stone-600 hover:underline"
									>Sign up as Partner</a
								>
							</p>
						</div>

						<!-- Footer -->
						<div class="mt-5 text-center text-xs text-[var(--form-text-muted)]">
							<p>
								By continuing, you agree to our
								<a href="/terms" class="font-medium text-stone-600 hover:underline">Terms</a>
								and
								<a href="/privacy" class="font-medium text-stone-600 hover:underline"
									>Privacy Policy</a
								>.
							</p>
						</div>

						<!-- Language Selector -->
						<div class="mt-4 flex justify-center">
							<LanguageSelector compact={true} />
						</div>
					</div>
				{:else if currentStep === 'restore-choice'}
					<!-- ═══════════════════════════════════════════════════════════
		     RESTORE / START FRESH CHOICE
		     ═══════════════════════════════════════════════════════════ -->
					<div in:fly={{ y: 20, duration: 300 }}>
						<div class="mb-6 text-center">
							<div
								class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-500 to-neutral-600 shadow-lg"
							>
								<RotateCcw class="h-7 w-7 text-white" />
							</div>
							<h2 class="text-xl font-bold text-[var(--form-text)]">Welcome Back!</h2>
							<p class="mt-2 text-sm text-[var(--form-text-secondary)]">
								We found your previous account
								{#if deletedAccountName}
									for <strong class="text-[var(--form-text-secondary)]">{deletedAccountName}</strong
									>
								{/if}
							</p>
							{#if deletedAccountDate}
								<p class="mt-1 text-xs text-[var(--form-text-muted)]">
									Deleted on {new Date(deletedAccountDate).toLocaleDateString('en-IN', {
										day: 'numeric',
										month: 'short',
										year: 'numeric'
									})}
								</p>
							{/if}
						</div>

						<div class="space-y-3">
							<!-- Restore Option -->
							<button
								onclick={restoreAccount}
								disabled={isWaiting}
								class="group w-full rounded-xl border-2 border-stone-200 p-4 text-left
						transition-all duration-200 hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed
						disabled:opacity-60 dark:border-stone-700 dark:hover:bg-stone-900/20"
							>
								<div class="flex items-start gap-3">
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-stone-100 transition-colors group-hover:bg-stone-200 dark:bg-stone-900/30 dark:group-hover:bg-stone-900/50"
									>
										<RotateCcw class="h-5 w-5 text-stone-600" />
									</div>
									<div>
										<h3 class="text-sm font-semibold text-[var(--form-text)]">Restore my data</h3>
										<p class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
											Recover your previous cases, contacts, and settings
										</p>
									</div>
								</div>
							</button>

							<!-- Start Fresh Option -->
							<button
								onclick={startFresh}
								disabled={isWaiting}
								class="group w-full rounded-xl border-2 border-[var(--form-border)] p-4
						text-left transition-all duration-200 hover:border-gray-400 hover:bg-[var(--form-bg-alt)]
						disabled:cursor-not-allowed disabled:opacity-60 dark:hover:border-gray-500"
							>
								<div class="flex items-start gap-3">
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-900/30 dark:group-hover:bg-emerald-900/50"
									>
										<Plus class="h-5 w-5 text-emerald-600" />
									</div>
									<div>
										<h3 class="text-sm font-semibold text-[var(--form-text)]">Start fresh</h3>
										<p class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
											Create a new account with sample data to get started
										</p>
									</div>
								</div>
							</button>
						</div>

						{#if isWaiting}
							<div
								class="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--form-text-secondary)]"
							>
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-stone-500 border-t-transparent"
								></div>
								Processing...
							</div>
						{/if}
					</div>
				{:else if currentStep === 'otp'}
					<!-- ═══════════════════════════════════════════════════════════
		     STEP 2: OTP VERIFICATION
		     ═══════════════════════════════════════════════════════════ -->
					<div class="text-center" in:fly={{ x: 80, duration: 300 }}>
						<!-- Header -->
						<div class="mb-6">
							<div
								class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] shadow-lg"
							>
								<Shield class="h-7 w-7 text-white" />
							</div>
							<h2 class="text-2xl font-bold text-[var(--form-text)]">Verify OTP</h2>
							<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
								Enter the 4-digit code sent to
							</p>
							<!-- Phone number with change option -->
							<div class="mt-2 flex items-center justify-center gap-2">
								<span
									class="rounded-lg bg-[var(--form-bg-alt)] px-3 py-1 text-base font-bold tracking-wider text-[var(--form-text)]"
								>
									+91 {sanitizeText(formData.userMobile ?? '')}
								</span>
								<button
									onclick={goBackToMobile}
									class="text-xs font-medium transition-colors hover:underline"
									style="color: #b97550;"
								>
									Change
								</button>
							</div>
						</div>

						<!-- OTP Inputs -->
						<div
							class="mb-2 flex justify-center gap-3"
							role="group"
							aria-label="OTP input"
							onpaste={handleOtpPaste}
						>
							{#each otp as digit, index}
								<input
									id={`otp-input-${index}`}
									type="text"
									inputmode="numeric"
									pattern="[0-9]*"
									maxlength="1"
									bind:value={otp[index]}
									onkeydown={(e) => {
										handleBackspace(index, e);
										handleEnter(e, verifyOTP);
									}}
									oninput={(e) => updateDigit(index, e)}
									autocomplete="one-time-code"
									aria-label={`OTP digit ${index + 1}`}
									class="h-16 w-14 rounded-xl border-2 bg-[var(--form-bg-alt)]
							text-center text-2xl font-bold text-[var(--form-text)]
							transition-all duration-200 outline-none
							{otpError
										? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30'
										: 'border-[var(--form-border)] hover:border-gray-400 focus:border-stone-400 focus:ring-4 focus:ring-stone-100 dark:hover:border-gray-500 dark:focus:ring-stone-900/30'}"
								/>
							{/each}
						</div>

						<!-- Inline error message -->
						{#if otpError}
							<div
								class="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/30"
							>
								<AlertCircle class="h-3.5 w-3.5 flex-shrink-0" />
								{otpError}
							</div>
						{:else}
							<div class="mb-4"></div>
						{/if}

						<!-- Resend -->
						<div class="mb-5">
							<button
								onclick={retryOTP}
								disabled={isResendDisabled}
								class="text-sm font-medium transition-colors"
								class:text-[var(--form-text-muted)]={isResendDisabled}
								class:cursor-not-allowed={isResendDisabled}
								style={isResendDisabled ? '' : 'color: #b97550;'}
							>
								{#if isResendDisabled}
									Resend in {countdown}s
								{:else}
									Didn't receive it? Resend Code
								{/if}
							</button>
						</div>

						<!-- Verify Button -->
						{#if isWaiting}
							<button
								disabled
								class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] py-3.5 font-semibold text-white opacity-70"
							>
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
								Verifying...
							</button>
						{:else}
							<button
								onclick={verifyOTP}
								class="w-full rounded-xl bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-accent-600)] py-3.5 text-base font-bold text-white shadow-lg transition-all duration-200"
							>
								Verify & Continue
							</button>
						{/if}

						<!-- Wrong number hint -->
						<p class="mt-4 text-[10px] text-[var(--form-text-muted)]">
							Wrong number? Tap <strong>Change</strong> above to re-enter. If issue persists,
							contact
							<a href="mailto:support@digitaldsa.com" class="underline underline-offset-4">support@digitaldsa.com</a>
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════
     SEC-10 SESSION CONFLICT MODAL
     Shown when check-dsa returns { status: 'session_conflict', ... }.
     Dormant in soak mode (the response shape doesn't trigger).
     ═══════════════════════════════════════════════════════════ -->
<SessionConflictModal
	open={sessionConflictOpen}
	existingSessions={conflictExistingSessions}
	onConfirm={handleSessionConflictConfirm}
	onCancel={handleSessionConflictCancel}
	busy={confirmInFlight}
/>

<!-- ═══════════════════════════════════════════════════════════
     ROLE SELECTION MODAL (admin + other roles detected)
     ═══════════════════════════════════════════════════════════ -->
{#if showRoleModal}
	<div
		class="fixed inset-0 z-[999] flex items-center justify-center"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

		<!-- Modal -->
		<div
			class="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl"
			in:fly={{ y: 30, duration: 250 }}
		>
			<!-- Header -->
			<div class="px-6 pt-6 pb-3">
				<h3 class="text-lg font-bold text-[var(--form-text)]">
					{roleModalUserName ? `Hi ${roleModalUserName},` : 'Multiple profiles found'}
				</h3>
				<p class="mt-1 text-sm text-[var(--form-text-secondary)]">
					Which profile would you like to continue with?
				</p>
			</div>

			<!-- Role Options -->
			<div class="flex flex-col gap-3 px-6 pb-6">
				{#each availableRoles as role}
					<button
						onclick={() => {
							showRoleModal = false;
							loginWithRole(role);
						}}
						disabled={isWaiting}
						class="w-full rounded-xl border-2 border-[var(--form-border)] p-4 text-left
							transition-all duration-200 hover:border-stone-400
							hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-stone-900/20"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg
								{role === 'admin'
									? 'bg-purple-100 dark:bg-purple-900/30'
									: role === 'rm'
										? 'bg-blue-100 dark:bg-blue-900/30'
										: 'bg-stone-100 dark:bg-stone-900/30'}"
							>
								<span
									class="text-sm font-bold
									{role === 'admin' ? 'text-purple-600' : role === 'rm' ? 'text-blue-600' : 'text-stone-600'}"
								>
									{role === 'admin' ? 'A' : role === 'rm' ? 'RM' : 'D'}
								</span>
							</div>
							<div>
								<div class="text-sm font-semibold text-[var(--form-text)]">
									{role === 'admin'
										? 'Admin Dashboard'
										: role === 'rm'
											? 'Bank RM Dashboard'
											: 'DSA Dashboard'}
								</div>
								<div class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
									{role === 'admin'
										? 'System admin, user management, rule authoring'
										: role === 'rm'
											? 'Review cases, manage policies'
											: 'Manage cases, compare lenders'}
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>

			{#if isWaiting}
				<div
					class="flex items-center justify-center gap-2 px-6 pb-4 text-sm text-[var(--form-text-secondary)]"
				>
					<div
						class="h-4 w-4 animate-spin rounded-full border-2 border-stone-500 border-t-transparent"
					></div>
					Signing in...
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.loader {
		width: 20px;
		aspect-ratio: 1;
		display: grid;
		border-radius: 50%;
		background:
			linear-gradient(0deg, rgb(0 0 0 / 50%) 30%, #0000 0 70%, rgb(0 0 0 / 100%) 0) 50% / 8% 100%,
			linear-gradient(90deg, rgb(0 0 0 / 25%) 30%, #0000 0 70%, rgb(0 0 0 / 75%) 0) 50% / 100% 8%;
		background-repeat: no-repeat;
		animation: l23 1s infinite steps(12);
	}
	.loader::before,
	.loader::after {
		content: '';
		grid-area: 1/1;
		border-radius: 50%;
		background: inherit;
		opacity: 0.915;
		transform: rotate(30deg);
	}
	.loader::after {
		opacity: 0.83;
		transform: rotate(60deg);
	}
	@keyframes l23 {
		100% {
			transform: rotate(1turn);
		}
	}

	/*
	 * iOS Safari treats 100vh as the full viewport height including the browser chrome,
	 * causing the bottom content to be hidden behind the address bar.
	 * 100dvh (dynamic viewport height) fixes this — it shrinks when the browser chrome
	 * is visible. The h-screen Tailwind class uses 100vh as the base; we override here.
	 */
	section.font-Poppins {
		/* Base fallback: 100vh for older browsers */
		height: 100vh;
		/* Override with dynamic viewport height on browsers that support it */
		height: 100dvh;
	}
</style>
