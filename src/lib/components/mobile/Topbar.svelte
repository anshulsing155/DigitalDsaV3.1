<script lang="ts">
	import { goto } from '$app/navigation';
	import { addToast } from '$lib/state/ui.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { secureFetch } from '$lib/utils/csrf';

	// Using Lucide icons for a cleaner, professional look on mobile
	import { LogOut, UserPlus, LogIn, Menu } from '$lib/utils/iconRegistry';
	import clientLogger from '$lib/utils/clientLogger';

	// Props (Svelte 5 runes)
	interface Props {
		data?: any;
	}
	let { data }: Props = $props();

	// Derived values (Svelte 5 runes)
	const isAuthenticated = $derived(authState.isAuthenticated);
	const currentUser = $derived(authState.currentUser);

	// The provided handleLogout logic
	async function handleLogout() {
		try {
			const response = await secureFetch('/api/auth/logout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			if (!response.ok) {
				clientLogger.error({ status: response.status }, 'Logout error: response not ok');
			}
		} catch (error) {
			clientLogger.error({ err: error }, 'Logout error');
		} finally {
			await authState.logout();
			addToast({ type: 'success', message: 'You have been logged out.' });
		}
	}

	// Determine the route for the Sign Up button to be clearer than the original code
	const signupRoute = '/signup';
</script>

<!--
    The header uses 'fixed' positioning, a clean white background, and a subtle shadow
    to create the professional, persistent mobile app bar feel.
-->
<header class="fixed top-0 left-0 z-50 w-full bg-[var(--dash-bg-card)] shadow-md">
	<div class="container mx-auto max-w-lg px-4">
		<div class="flex h-16 items-center justify-between py-3">
			<!-- App Title/Logo Area -->
			<div class="flex items-center">
				<!-- Assuming the logo path is correct -->
				<img src="/logo/appIcon.svg" alt="DigitalDSA Logo" class="mr-2 h-8 w-auto" />
				<span class="text-xl font-extrabold tracking-wide text-[#007bff]">DigitalDSA</span>
			</div>

			<!-- Action Buttons -->
			{#if data?.user}
				<!-- Logged In State: Logout Button (Red for clear action) -->
				<div class="flex items-center gap-4">
					<!-- This could be an avatar or user initials in a real app -->
					<!-- For simplicity, we just show the logout action -->
					<button
						class="focus:ring-opacity-50 rounded-full bg-red-500 p-3 font-semibold text-white transition duration-150 hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none min-h-11 min-w-11"
						onclick={handleLogout}
						aria-label="Logout"
					>
						<!-- Only icon is preferred for mobile headers to save space -->
						<LogOut size={20} />
					</button>
				</div>
			{:else}
				<!-- Logged Out State: Primary Call to Action (Sign Up) and Secondary Action (Login) -->
				<div class="flex items-center gap-3">
					<!-- Secondary Action: Login (Text Link/Ghost Button) -->
					<button
						class="flex items-center gap-1 font-medium text-[var(--dash-text-secondary)] transition duration-150 hover:text-[#007bff] py-2 px-3"
						onclick={() => goto('/login')}
						aria-label="Login"
					>
						<span class="text-sm">Login</span>
						<LogIn size={20} class="sm:hidden" />
					</button>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- Spacer element is critical for fixed headers to prevent content from hiding underneath -->
<div class="h-16"></div>
