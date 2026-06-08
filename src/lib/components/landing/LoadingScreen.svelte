<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { deviceState } from '$lib/stores/device.svelte';

	interface Props {
		mobileFill?: string;
		onloaded?: () => void;
	}
	let { mobileFill = 'black', onloaded }: Props = $props();

	let progress = $state(0);
	let isVisible = $state(true);

	let loadingInterval: ReturnType<typeof setInterval> | null = null;
	let completionTimeout: ReturnType<typeof setTimeout> | null = null;

	const loadingMessages = [
		'Loading DigitalDSA...',
		'Syncing lender policies...',
		'Setting up secure connection...',
		'Preparing your workspace...',
		'Almost ready...'
	];

	const loadingText = $derived.by(() => {
		if (progress < 20) return loadingMessages[0];
		if (progress < 45) return loadingMessages[1];
		if (progress < 70) return loadingMessages[2];
		if (progress < 90) return loadingMessages[3];
		return loadingMessages[4];
	});

	const simulateLoading = () => {
		loadingInterval = setInterval(() => {
			let increment = progress < 60 ? Math.random() * 2 + 1 : Math.random() * 1 + 0.5;
			progress += increment;

			if (progress >= 100) {
				progress = 100;
				if (loadingInterval) {
					clearInterval(loadingInterval);
					loadingInterval = null;
				}
				completionTimeout = setTimeout(() => {
					isVisible = false;
					onloaded?.();
				}, 500);
			}
		}, 80);
	};

	$effect(() => {
		simulateLoading();

		return () => {
			if (loadingInterval) {
				clearInterval(loadingInterval);
				loadingInterval = null;
			}
			if (completionTimeout) {
				clearTimeout(completionTimeout);
				completionTimeout = null;
			}
		};
	});
</script>

{#if isVisible}
	<div class="loading-overlay" transition:fade={{ duration: 300 }}>
		<div class="loading-card">
			<!-- Tagline -->
			<div class="loading-tagline" in:fly={{ y: -20, duration: 500, delay: 100 }}>
				<span>Intelligence for Loan Professionals</span>
			</div>

			<!-- Logo Spinner -->
			<div class="loading-spinner-wrap">
				<div class="spinner-container">
					<div class="spinner-track"></div>
					<div class="spinner-ring"></div>
					<div class="spinner-inner">
						<div class="logo-wrap">
							<button aria-label="DigitalDSA logo" class="logo-btn">
								<div class="logo-rotate">
									<svg
										class="logo-svg"
										viewBox="0 0 240 308"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M30.5 169.5H2H1V199C2.45627 205.335 3.18626 207.48 4.5 211.5C10.2202 222.646 13.4274 228.895 19 235C39.5123 255.816 50.7544 265.268 70.5 279.5C87.3287 291.375 97.2975 297.277 116 306.5V274C92.8974 261.06 80.6435 253.672 64 239.5C50.4881 228.981 43.961 221.47 34 205.5L30.5 193C29 180.5 30.5 169.5 30.5 169.5Z"
											style="fill: {deviceState.isMobile ? mobileFill : 'var(--color-primary)'}"
										/>
										<path
											d="M124 306.5V274L165.5 247C179.805 236.01 187.611 228.744 201 213C204.175 208.231 210 196 210 194.5V169.5H239V199C233.698 218.887 228.069 228.559 214 243C199.055 258.965 189.501 267.594 167 281.5C163.581 284.496 159.145 287.427 144.5 296C129.927 304.406 129.996 303.717 124 306.5Z"
											style="fill: {deviceState.isMobile ? mobileFill : 'var(--color-primary)'}"
										/>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M2 22L116 1V265C96.5556 254.068 73 236 73 236C73 236 50.1412 216.703 38 196V44.5L30.5 45.5V139.5H2V22ZM86 36.5L67.5 40V189.5C75.2471 199.395 79.1562 202.72 86 208V36.5Z"
											style="fill: {deviceState.isMobile ? mobileFill : 'var(--color-primary)'}"
										/>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M124 1V265C145.836 252.997 172 232.5 172 232.5C186.975 219.923 193.076 212.553 201 199L203 193V44.5L210 47.5V139.5H239V21L124 1ZM172 40L153.5 36.5V208L172 189.5V40Z"
											style="fill: {deviceState.isMobile ? mobileFill : 'var(--color-primary)'}"
										/>
										<path
											d="M30.5 193C29 180.5 30.5 169.5 30.5 169.5H2H1V199C2.45627 205.335 3.18626 207.48 4.5 211.5C10.2202 222.646 13.4274 228.895 19 235C39.5123 255.816 50.7544 265.268 70.5 279.5C87.3287 291.375 97.2975 297.277 116 306.5V274C92.8974 261.06 80.6435 253.672 64 239.5C50.4881 228.981 43.961 221.47 34 205.5M30.5 193C30.5 193 32.6332 200.618 34 205.5M30.5 193L34 205.5M210 169.5H239V199C233.698 218.887 228.069 228.559 214 243C199.055 258.965 189.501 267.594 167 281.5C163.581 284.496 159.145 287.427 144.5 296C129.927 304.406 129.996 303.717 124 306.5V274L165.5 247C179.805 236.01 187.611 228.744 201 213C204.175 208.231 210 196 210 194.5M210 169.5C210 169.5 210 193 210 194.5M210 169.5V194.5M2 22L116 1V265C96.5556 254.068 73 236 73 236C73 236 50.1412 216.703 38 196V44.5L30.5 45.5V139.5H2V22ZM67.5 40L86 36.5V208C79.1562 202.72 75.2471 199.395 67.5 189.5V40ZM124 1V265C145.836 252.997 172 232.5 172 232.5C186.975 219.923 193.076 212.553 201 199L203 193V44.5L210 47.5V139.5H239V21L124 1ZM153.5 36.5L172 40V189.5L153.5 208V36.5Z"
											stroke="var(--color-primary)"
										/>
									</svg>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="loading-progress">
				<div class="progress-track">
					<div class="progress-fill" style="width: {progress}%;"></div>
				</div>
				<div class="progress-percent">{Math.round(progress)}%</div>
			</div>

			<!-- Loading Message -->
			<div class="loading-message">
				{#key loadingText}
					<span class="loading-message-text" in:fade={{ duration: 400 }}>{loadingText}</span>
				{/key}
			</div>

			<!-- Features Grid -->
			<div class="loading-features" in:fly={{ y: 20, duration: 500, delay: 200 }}>
				{#each [{ label: 'Bank-Grade Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }, { label: '52 Lender Policies', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' }, { label: 'Real-Time Matching', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }, { label: 'RM Network Access', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }] as feature}
					<div class="feature-item">
						<div class="feature-dot"></div>
						<span class="feature-label">{feature.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		background: var(--landing-bg);
	}

	.loading-card {
		text-align: center;
		margin: 0 auto;
		padding: 2rem;
		border-radius: 1.5rem;
		background: var(--landing-bg-card);
		border: 1px solid var(--landing-border);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		animation: cardFloat 4s ease-in-out infinite;
	}

	@media (min-width: 768px) {
		.loading-card {
			padding: 3rem 4rem;
		}
	}

	@keyframes cardFloat {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}

	/* Tagline */
	.loading-tagline {
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		color: var(--landing-text-secondary);
		letter-spacing: 0.03em;
	}

	/* Spinner */
	.loading-spinner-wrap {
		margin-bottom: 1.5rem;
	}

	.spinner-container {
		position: relative;
		width: 6rem;
		height: 6rem;
		margin: 0 auto 1rem;
	}

	.spinner-track {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		border: 4px solid color-mix(in srgb, var(--landing-accent) 20%, transparent);
	}

	.spinner-ring {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		border: 4px solid var(--landing-accent);
		border-top-color: transparent;
		animation: spinRing 1s linear infinite;
	}

	@keyframes spinRing {
		to {
			transform: rotate(360deg);
		}
	}

	.spinner-inner {
		position: absolute;
		inset: 0.5rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--landing-accent) 10%, transparent);
	}

	.logo-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo-btn {
		display: flex;
		align-items: center;
		flex-direction: column;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
		color: var(--landing-accent-accessible);
	}

	.logo-rotate {
		display: flex;
		animation: logoRotate 3.1s linear infinite;
	}

	@keyframes logoRotate {
		0% {
			transform: rotateY(0deg);
		}
		45% {
			transform: rotateY(360deg);
		}
		100% {
			transform: rotateY(360deg);
		}
	}

	.logo-svg {
		height: 2rem;
	}

	@media (min-width: 768px) {
		.logo-svg {
			height: 2.5rem;
		}
	}

	/* Progress */
	.loading-progress {
		margin-bottom: 1rem;
	}

	.progress-track {
		width: 100%;
		height: 0.625rem;
		border-radius: 9999px;
		overflow: hidden;
		background: var(--landing-border);
	}

	.progress-fill {
		height: 100%;
		border-radius: 9999px;
		background: var(--landing-accent);
		transition: width 0.3s ease-out;
	}

	.progress-percent {
		font-size: 0.875rem;
		margin-top: 0.5rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		color: var(--landing-text-secondary);
	}

	/* Loading Message */
	.loading-message {
		font-size: 1rem;
		font-weight: 500;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--landing-text-secondary);
	}

	.loading-message-text {
		display: inline-block;
	}

	/* Features */
	.loading-features {
		margin-top: 2.5rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding: 0 1rem;
	}

	@media (min-width: 640px) {
		.loading-features {
			padding: 0 2.5rem;
		}
	}

	.feature-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--landing-text-secondary);
	}

	.feature-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--landing-accent);
		box-shadow: 0 0 6px var(--landing-accent);
		flex-shrink: 0;
	}

	.feature-label {
		font-size: 0.75rem;
	}
</style>
