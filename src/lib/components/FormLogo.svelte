<script lang="ts">
	import Modal from './Modal.svelte';
	import { deviceState } from '$lib/stores/device.svelte';
	import { Home, Gauge } from '$lib/utils/iconRegistry';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	interface Props {
		mobileFill?: string;
		viewSide?: string;
	}

	let { mobileFill = '#FFFFFF', viewSide = 'xs:absolute right-0  xs:top-1 md:top-3' }: Props =
		$props();

	let showModal = $state(false);
	let dialogBox: HTMLDialogElement | undefined = $state(undefined);

	function gotoHomePage() {
		goto('/');
	}

	function gotoDashboard() {
		goto('/dashboard');
	}

	function handleClose() {
		showModal = false;
		enableScroll();
	}

	function enableScroll() {
		if (!browser) return;
		document.documentElement.style.overflow = '';
		document.body.style.overflow = '';
	}
</script>

<div class={viewSide}>
	<button
		onclick={() => (showModal = true)}
		class="logo z-20 flex cursor-pointer flex-col items-center text-[var(--form-text)]"
	>
		<div class="animate-rotate flex">
			<svg
				class={deviceState.loader ? 'xs:h-[1.5rem] h-[1.2rem] md:h-8' : 'h-16'}
				viewBox="0 0 240 308"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M30.5 169.5H2H1V199C2.45627 205.335 3.18626 207.48 4.5 211.5C10.2202 222.646 13.4274 228.895 19 235C39.5123 255.816 50.7544 265.268 70.5 279.5C87.3287 291.375 97.2975 297.277 116 306.5V274C92.8974 261.06 80.6435 253.672 64 239.5C50.4881 228.981 43.961 221.47 34 205.5L30.5 193C29 180.5 30.5 169.5 30.5 169.5Z"
					class="fill-black dark:fill-white"
				/>
				<path
					d="M124 306.5V274L165.5 247C179.805 236.01 187.611 228.744 201 213C204.175 208.231 210 196 210 194.5V169.5H239V199C233.698 218.887 228.069 228.559 214 243C199.055 258.965 189.501 267.594 167 281.5C163.581 284.496 159.145 287.427 144.5 296C129.927 304.406 129.996 303.717 124 306.5Z"
					class="fill-black dark:fill-white"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M2 22L116 1V265C96.5556 254.068 73 236 73 236C73 236 50.1412 216.703 38 196V44.5L30.5 45.5V139.5H2V22ZM86 36.5L67.5 40V189.5C75.2471 199.395 79.1562 202.72 86 208V36.5Z"
					class="fill-black dark:fill-white"
				/>
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M124 1V265C145.836 252.997 172 232.5 172 232.5C186.975 219.923 193.076 212.553 201 199L203 193V44.5L210 47.5V139.5H239V21L124 1ZM172 40L153.5 36.5V208L172 189.5V40Z"
					class="fill-black dark:fill-white"
				/>
				<path
					d="M30.5 193C29 180.5 30.5 169.5 30.5 169.5H2H1V199C2.45627 205.335 3.18626 207.48 4.5 211.5C10.2202 222.646 13.4274 228.895 19 235C39.5123 255.816 50.7544 265.268 70.5 279.5C87.3287 291.375 97.2975 297.277 116 306.5V274C92.8974 261.06 80.6435 253.672 64 239.5C50.4881 228.981 43.961 221.47 34 205.5M30.5 193C30.5 193 32.6332 200.618 34 205.5M30.5 193L34 205.5M210 169.5H239V199C233.698 218.887 228.069 228.559 214 243C199.055 258.965 189.501 267.594 167 281.5C163.581 284.496 159.145 287.427 144.5 296C129.927 304.406 129.996 303.717 124 306.5V274L165.5 247C179.805 236.01 187.611 228.744 201 213C204.175 208.231 210 196 210 194.5M210 169.5C210 169.5 210 193 210 194.5M210 169.5V194.5M2 22L116 1V265C96.5556 254.068 73 236 73 236C73 236 50.1412 216.703 38 196V44.5L30.5 45.5V139.5H2V22ZM67.5 40L86 36.5V208C79.1562 202.72 75.2471 199.395 67.5 189.5V40ZM124 1V265C145.836 252.997 172 232.5 172 232.5C186.975 219.923 193.076 212.553 201 199L203 193V44.5L210 47.5V139.5H239V21L124 1ZM153.5 36.5L172 40V189.5L153.5 208V36.5Z"
					class="stroke-black dark:stroke-white"
				/>
			</svg>
		</div>

		<div class="flex flex-col items-center justify-center">
			<p class="tinyText text-[var(--form-text)] text-nowrap">Digital DSA</p>
		</div>
	</button>
</div>

{#if showModal}
	<Modal bind:showModal bind:dialog={dialogBox}>
		<div class="flex w-full flex-col gap-5 pt-2">
			<div class="flex flex-col">
				<h2 class="text-labelQuestion !m-0">Where would you like to go?</h2>
				<p class="descriptionText text-[var(--form-text-muted)] !m-0">
					Your form progress is saved. You can return anytime to continue.
				</p>
			</div>

			<div class="flex flex-col gap-3">
				<button type="button" class="logo-nav-btn" onclick={gotoHomePage}>
					<Home size={20} class="text-primary" />
					<div class="text-left">
						<span class="text-labelText font-titleMedium !m-0 text-[var(--form-text-label)]"
							>Home Page</span
						>
						<span class="smallText !m-0 text-[var(--form-text-muted)]"
							>Go to the main landing page</span
						>
					</div>
				</button>

				<button type="button" class="logo-nav-btn" onclick={gotoDashboard}>
					<Gauge size={20} class="text-primary" />
					<div class="text-left">
						<span class="text-labelText font-titleMedium !m-0 text-[var(--form-text-label)]"
							>Dashboard</span
						>
						<span class="smallText !m-0 text-[var(--form-text-muted)]"
							>View your cases and applications</span
						>
					</div>
				</button>
			</div>

			<button
				type="button"
				class="buttonText btnClass bg-ddsa-gradient-primary mt-1 w-full cursor-pointer rounded-lg py-3 text-[var(--bg-header-text)]"
				onclick={handleClose}>Stay on this page</button
			>
		</div>
	</Modal>
{/if}

<style>
	@keyframes rotateAnimation {
		0% {
			transform: rotateY(0deg);
		}
		45% {
			transform: rotateY(360deg);
		}
		100% {
			transform: rotateY(360deg); /* Hold the rotation */
		}
	}

	.animate-rotate {
		animation: rotateAnimation 3.1s linear infinite;
	}

	.btnClass {
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}

	.btnClass:hover {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
		opacity: 0.9;
	}

	.logo-nav-btn {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid var(--form-border, #e5e7eb);
		background: var(--form-bg-card, #fff);
		cursor: pointer;
		transition: all 0.15s ease;
		width: 100%;
		text-align: left;
		color: var(--form-text, #374151);
	}

	.logo-nav-btn:hover {
		border-color: var(--trial-accent, #6366f1);
		background: var(--ddsa-primary-100);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	}

	.logo-nav-title {
		display: block;
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.25;
	}

	.logo-nav-desc {
		display: block;
		font-size: 0.75rem;
		color: var(--form-text-muted, #9ca3af);
		line-height: 1.25;
		margin-top: 2px;
	}
</style>
