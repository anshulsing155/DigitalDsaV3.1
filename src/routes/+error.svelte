<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	import type { LayoutData } from './$types'; // Import types from +layout.ts

	// Extended error type to include optional code property
	interface ExtendedError {
		message?: string;
		code?: string;
	}

	interface Props {
		error?: ExtendedError | null;
		status?: number;
	}

	let { error = null, status = 500 }: Props = $props();

	// Access layout data with fallback
	let config = $derived(($page.data as any)?.config as any | undefined);

	// Determine status from multiple sources with proper prioritization
	// Prioritize $page.status which contains the actual HTTP status code
	let determinedStatus = $derived(
		(() => {
			// First check $page.status which should have the actual HTTP status code
			if (typeof $page.status === 'number' && $page.status >= 100 && $page.status < 600) {
				return $page.status;
			}
			// Then check config.status
			if (
				typeof ($page.data as any)?.config?.status === 'number' &&
				($page.data as any).config.status >= 100 &&
				($page.data as any).config.status < 600
			) {
				return ($page.data as any).config.status;
			}
			// Then check the status prop (only if it's not the default value of 500)
			if (typeof status === 'number' && status >= 100 && status < 600 && status !== 500) {
				return status;
			}
			// Default to 500 if all else fails
			return 500;
		})()
	);

	// Fallback configuration
	const defaultConfig = {
		siteName: 'DigitalDSA',
		baseUrl: 'https://digitaldsa.com',
		analyticsEnabled: false
	};

	// Use fallback if config is undefined
	let safeConfig = $derived(config || defaultConfig);

	// Map status codes to user-friendly messages
	const errorMessages: Record<number, string> = {
		404: 'The page you are looking for does not exist.',
		500: 'An unexpected server error occurred.',
		403: 'You do not have permission to access this page.',
		401: 'You must be logged in to access this page.',
		429: 'Too many requests. Please try again later.'
	};

	// Log error and send to analytics (client-side only)
	$effect(() => {
		if (!browser) return;
		const errorInfo = {
			status: determinedStatus,
			message: error?.message || 'No error details provided',
			code: error?.code || 'UNKNOWN_ERROR',
			path: window.location.pathname
		};
		console.error(`Error ${determinedStatus}`, errorInfo);

		(window as any).dataLayer = (window as any).dataLayer || [];
		(window as any).dataLayer.push({
			event: 'error',
			errorStatus: determinedStatus,
			errorMessage: error?.message || errorMessages[determinedStatus] || 'Unknown error',
			errorCode: error?.code || 'UNKNOWN_ERROR',
			pagePath: window.location.pathname
		});
	});
</script>

<svelte:head>
	<title>{determinedStatus} - Error | {safeConfig.siteName}</title>
	<meta
		name="description"
		content="{determinedStatus} Error: {errorMessages[determinedStatus] || 'Something went wrong.'}"
	/>
	<meta name="robots" content="noindex" />
	<meta property="og:title" content="{determinedStatus} - Error | {safeConfig.siteName}" />
	<meta
		property="og:description"
		content="{determinedStatus} Error: {errorMessages[determinedStatus] || 'Something went wrong.'}"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:image" content="{safeConfig.baseUrl}/og-image.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="{safeConfig.baseUrl}/twitter-image.jpg" />
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center sm:px-6 md:px-8"
>
	<!-- Animated background elements -->
	<div class="absolute inset-0 z-0">
		<div class="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600"></div>
		<div class="absolute inset-0 opacity-20">
			{#each Array(20) as _, i}
				<div
					class="absolute animate-pulse rounded-full bg-white/10"
					style="
						width: {Math.random() * 10 + 5}vw;
						height: {Math.random() * 10 + 5}vw;
						top: {Math.random() * 100}vh;
						left: {Math.random() * 100}vw;
						opacity: {Math.random() * 0.1 + 0.05};
						animation-delay: {Math.random() * 5}s;
						animation-duration: {Math.random() * 10 + 10}s;
					"
				></div>
			{/each}
		</div>
	</div>

	<!-- Main content -->
	<div
		class="relative z-10 w-full max-w-md scale-100 transform opacity-100 transition-all duration-700 ease-out"
		role="alert"
		aria-live="assertive"
	>
		<!-- Error code display -->
		<div class="relative mb-6">
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="h-64 w-64 animate-ping rounded-full bg-white/5"></div>
			</div>
			<h1 class="relative text-7xl font-extrabold tracking-tight sm:text-8xl md:text-9xl">
				<span class="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
					{determinedStatus}
				</span>
			</h1>
		</div>

		<!-- Error message -->
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-bold text-white sm:text-3xl">
				{errorMessages[determinedStatus] || error?.message || 'Something went wrong.'}
			</h2>

			{#if determinedStatus === 404 && error?.message === 'Not Found'}
				<p class="mb-6 text-lg text-blue-100">
					The URL you requested does not exist or may have been moved.
				</p>
			{:else if error && error.message && error.message !== errorMessages[determinedStatus]}
				<p class="mb-6 text-lg text-blue-100">{error.message}</p>
			{/if}

			<!-- Dynamic element - Current path display -->
			{#if browser}
				<div
					class="mb-6 inline-block rounded-lg border border-blue-700/50 bg-blue-900/50 px-4 py-2 backdrop-blur-sm"
				>
					<p class="text-sm text-blue-200">
						Path: <span class="inline-block max-w-[200px] truncate font-mono sm:max-w-[300px]"
							>{window.location.pathname}</span
						>
					</p>
				</div>
			{/if}
		</div>

		<!-- Action buttons with improved interactivity -->
		<div class="flex flex-col justify-center gap-4 sm:flex-row">
			<a
				href="/"
				class="group rounded-xl bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:shadow-lg hover:shadow-blue-500/20 focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-blue-900 focus:outline-none"
				aria-label="Return to homepage"
			>
				<span class="flex items-center justify-center gap-2">
					<span>Go Home</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-5 w-5 transition-transform group-hover:translate-x-1"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
						/>
					</svg>
				</span>
			</a>
			{#if determinedStatus !== 404}
				<button
					onclick={() => browser && window.location.reload()}
					class="group rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-blue-900 focus:outline-none"
					aria-label="Retry loading the page"
				>
					<span class="flex items-center justify-center gap-2">
						<span>Retry</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-5 w-5 transition-transform duration-500 group-hover:rotate-180"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
							/>
						</svg>
					</span>
				</button>
			{/if}
		</div>

		<!-- Dynamic help suggestion -->
		<p class="mt-8 text-sm text-blue-200 opacity-70">
			{#if determinedStatus === 404}
				Try checking the URL or explore our site map from the homepage.
			{:else if determinedStatus === 403 || determinedStatus === 401}
				Please ensure you're logged in with the correct permissions.
			{:else if determinedStatus === 429}
				Too many requests. Please wait a moment and try again.
			{:else}
				Our team has been notified about this issue.
			{/if}
		</p>
	</div>
</div>
