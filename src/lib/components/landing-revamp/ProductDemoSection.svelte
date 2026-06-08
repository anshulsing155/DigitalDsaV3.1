<script lang="ts">
	/**
	 * ProductDemoSection — Animated product walkthrough for the landing page.
	 *
	 * Shows a mock browser window with a cursor that moves between form fields,
	 * types values, clicks "Evaluate", watches a progress bar fill, and sees
	 * lender result cards appear. Loops every ~20 seconds.
	 *
	 * Technical: Pure HTML/CSS mockup + JS-driven animation. No API calls,
	 * no iframe, no real app. IntersectionObserver starts/stops the loop.
	 * prefers-reduced-motion shows a static results screenshot.
	 */
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import SectionWrapper from './shared/SectionWrapper.svelte';
	import SectionTitle from './shared/SectionTitle.svelte';
	import PrimaryButton from './shared/PrimaryButton.svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';

	function handleCTA() {
		landingNav.handleCTA();
	}

	// ── Fixture Data ─────────────────────────────────────────────
	const DEMO_FIELDS = [
		{ label: 'Applicant Name', value: 'Rajesh Sharma', type: 'text' as const },
		{ label: 'Loan Type', value: 'Home Loan', type: 'select' as const },
		{ label: 'Property Cost', value: '₹95,00,000', type: 'text' as const },
		{ label: 'Loan Amount', value: '₹76,00,000', type: 'text' as const },
		{ label: 'City', value: 'Mumbai', type: 'select' as const },
		{ label: 'Monthly Income', value: '₹1,85,000', type: 'text' as const }
	];

	const EVAL_STEPS = [
		'Profiling income...',
		'Matching 50+ bank profiles...',
		'Calculating best offers...'
	];

	const RESULT_CARDS = [
		{
			rank: 1,
			bank: 'HDFC',
			amount: '₹71.2L',
			roi: '8.50%',
			emi: '₹61,200',
			light: 'green' as const,
			badge: 'BEST AMOUNT'
		},
		{
			rank: 2,
			bank: 'SBI',
			amount: '₹68.5L',
			roi: '8.25%',
			emi: '₹58,900',
			light: 'green' as const,
			badge: 'BEST RATE'
		},
		{
			rank: 3,
			bank: 'ICICI',
			amount: '₹55.0L',
			roi: '9.10%',
			emi: '₹50,100',
			light: 'amber' as const,
			badge: null
		}
	];

	// ── Pre-calculated cursor Y positions (percentage of viewport height) ──
	// Each field row is ~14% of viewport, starting at ~18% (after panel title)
	const FIELD_CURSOR_POSITIONS = [
		{ x: 72, y: 18 }, // Applicant Name — right side of input area
		{ x: 72, y: 30 }, // Loan Type
		{ x: 72, y: 42 }, // Property Cost
		{ x: 72, y: 54 }, // Loan Amount
		{ x: 72, y: 66 }, // City
		{ x: 72, y: 78 } // Monthly Income
	];
	const BUTTON_CURSOR_POSITION = { x: 50, y: 92 };

	// ── Animation State ──────────────────────────────────────────
	let phase = $state<'form' | 'evaluating' | 'results' | 'pause' | 'idle'>('idle');
	let activeFieldIndex = $state(-1);
	let typedChars = $state(0);
	let filledFields = $state<boolean[]>(new Array(DEMO_FIELDS.length).fill(false));
	let showTextCursor = $state(false);
	let evaluateClicked = $state(false);

	// Mouse cursor position (percentage of viewport)
	let cursorX = $state(50);
	let cursorY = $state(50);
	let cursorVisible = $state(false);
	let cursorClicking = $state(false);

	// Evaluation state
	let evalProgress = $state(0);
	let evalStepStatuses = $state<Array<'pending' | 'active' | 'complete'>>([
		'pending',
		'pending',
		'pending'
	]);

	// Results state
	let visibleCards = $state(0);
	let showBestGlow = $state(false);

	// Visibility + motion
	let reducedMotion = $state(false);
	let isVisible = $state(false);
	let cancelled = $state(false);

	// Viewport fade
	let viewportOpacity = $state(1);

	// ── Refs ─────────────────────────────────────────────────────
	let sectionRef: HTMLElement | undefined = $state(undefined);
	let containerRef: HTMLDivElement | undefined = $state(undefined);

	// ── Helpers ──────────────────────────────────────────────────

	/** Promise-based delay that respects cancellation */
	function delay(ms: number): Promise<void> {
		return new Promise((resolve) => {
			const id = setTimeout(() => {
				resolve();
			}, ms);
			timeoutIds.push(id);
		});
	}

	let timeoutIds: ReturnType<typeof setTimeout>[] = [];

	/** Get the display text for a field (partial typing or full) */
	function getFieldDisplay(fieldIndex: number): string {
		if (filledFields[fieldIndex]) return DEMO_FIELDS[fieldIndex].value;
		if (fieldIndex === activeFieldIndex) {
			return DEMO_FIELDS[fieldIndex].value.slice(0, typedChars);
		}
		return '';
	}

	/** Reset all animation state for a fresh loop */
	function resetState() {
		phase = 'idle';
		activeFieldIndex = -1;
		typedChars = 0;
		filledFields = new Array(DEMO_FIELDS.length).fill(false);
		showTextCursor = false;
		evaluateClicked = false;
		cursorVisible = false;
		cursorClicking = false;
		cursorX = 50;
		cursorY = 50;
		evalProgress = 0;
		evalStepStatuses = ['pending', 'pending', 'pending'];
		visibleCards = 0;
		showBestGlow = false;
		viewportOpacity = 1;
	}

	// ── Animation Loop ───────────────────────────────────────────

	async function runDemoLoop() {
		while (isVisible && !cancelled && !reducedMotion) {
			resetState();
			await delay(500);
			if (cancelled) break;

			// ── PHASE 1: FORM INPUT ──────────────────────────
			phase = 'form';
			cursorVisible = true;
			await delay(400);

			for (let i = 0; i < DEMO_FIELDS.length; i++) {
				if (cancelled) break;

				// Move cursor to field
				const pos = FIELD_CURSOR_POSITIONS[i];
				cursorX = pos.x;
				cursorY = pos.y;
				await delay(350);
				if (cancelled) break;

				// Click into field
				cursorClicking = true;
				await delay(150);
				cursorClicking = false;
				activeFieldIndex = i;
				showTextCursor = true;
				await delay(200);

				if (DEMO_FIELDS[i].type === 'select') {
					// Dropdown: brief pause then value appears
					await delay(500);
					if (cancelled) break;
					filledFields[i] = true;
					filledFields = [...filledFields]; // trigger reactivity
					showTextCursor = false;
					await delay(200);
				} else {
					// Type character by character
					const value = DEMO_FIELDS[i].value;
					typedChars = 0;
					for (let c = 0; c < value.length; c++) {
						if (cancelled) break;
						typedChars = c + 1;
						await delay(70);
					}
					if (cancelled) break;
					filledFields[i] = true;
					filledFields = [...filledFields];
					showTextCursor = false;
					await delay(150);
				}
			}
			if (cancelled) break;

			activeFieldIndex = -1;
			await delay(300);

			// Move cursor to evaluate button
			cursorX = BUTTON_CURSOR_POSITION.x;
			cursorY = BUTTON_CURSOR_POSITION.y;
			await delay(350);
			if (cancelled) break;

			// Click evaluate
			cursorClicking = true;
			evaluateClicked = true;
			await delay(200);
			cursorClicking = false;

			// ── PHASE 2: EVALUATION ──────────────────────────
			phase = 'evaluating';
			cursorVisible = false;
			evaluateClicked = false;
			await delay(300);
			if (cancelled) break;

			// Step 1: Profiling income
			evalStepStatuses = ['active', 'pending', 'pending'];
			const progressAnimation1 = animateProgress(0, 35, 1200);
			await progressAnimation1;
			if (cancelled) break;
			evalStepStatuses = ['complete', 'pending', 'pending'];

			// Step 2: Matching bank profiles
			evalStepStatuses = ['complete', 'active', 'pending'];
			const progressAnimation2 = animateProgress(35, 70, 1200);
			await progressAnimation2;
			if (cancelled) break;
			evalStepStatuses = ['complete', 'complete', 'pending'];

			// Step 3: Calculating offers
			evalStepStatuses = ['complete', 'complete', 'active'];
			const progressAnimation3 = animateProgress(70, 100, 800);
			await progressAnimation3;
			if (cancelled) break;
			evalStepStatuses = ['complete', 'complete', 'complete'];
			await delay(400);

			// ── PHASE 3: RESULTS ─────────────────────────────
			phase = 'results';
			if (cancelled) break;

			// Stagger card entrances
			visibleCards = 1;
			await delay(450);
			if (cancelled) break;
			visibleCards = 2;
			await delay(450);
			if (cancelled) break;
			visibleCards = 3;
			await delay(600);
			if (cancelled) break;

			// Gold glow on best card
			showBestGlow = true;

			// ── PHASE 4: PAUSE + RESET ───────────────────────
			phase = 'pause';
			await delay(3000);
			if (cancelled) break;

			// Fade out
			viewportOpacity = 0;
			await delay(800);
			if (cancelled) break;

			// Reset for next loop
			resetState();
			await delay(200);
		}
	}

	/** Smoothly animate the progress bar from `from` to `to` over `duration` ms */
	function animateProgress(from: number, to: number, duration: number): Promise<void> {
		return new Promise((resolve) => {
			const startTime = performance.now();
			function tick() {
				if (cancelled) {
					resolve();
					return;
				}
				const elapsed = performance.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				// Ease-out quad
				const eased = 1 - (1 - progress) * (1 - progress);
				evalProgress = from + (to - from) * eased;
				if (progress < 1) {
					requestAnimationFrame(tick);
				} else {
					evalProgress = to;
					resolve();
				}
			}
			requestAnimationFrame(tick);
		});
	}

	// ── Lifecycle ────────────────────────────────────────────────

	onMount(() => {
		// Check reduced motion preference
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (reducedMotion) {
			// Show static results screenshot
			phase = 'results';
			visibleCards = 3;
			showBestGlow = true;
			return;
		}

		// GSAP entrance animation
		if (containerRef) {
			const target = containerRef;
			const ctx = gsap.context(() => {
				gsap.fromTo(
					target,
					{ opacity: 0, y: 40 },
					{
						opacity: 1,
						y: 0,
						duration: 0.7,
						ease: 'power3.out',
						scrollTrigger: {
							trigger: target,
							start: 'top 85%',
							toggleActions: 'play none none none'
						}
					}
				);
			}, containerRef);

			// Cleanup GSAP on unmount
			const cleanupGsap = () => ctx.revert();

			// IntersectionObserver for animation loop control
			const observer = new IntersectionObserver(
				(entries) => {
					const entry = entries[0];
					if (entry.isIntersecting && !isVisible) {
						isVisible = true;
						cancelled = false;
						runDemoLoop();
					} else if (!entry.isIntersecting && isVisible) {
						isVisible = false;
						cancelled = true;
						// Clear pending timeouts
						timeoutIds.forEach(clearTimeout);
						timeoutIds = [];
						resetState();
					}
				},
				{ threshold: 0.15 }
			);

			if (sectionRef) observer.observe(sectionRef);

			return () => {
				cancelled = true;
				isVisible = false;
				timeoutIds.forEach(clearTimeout);
				timeoutIds = [];
				cleanupGsap();
				if (sectionRef) observer.unobserve(sectionRef);
				observer.disconnect();
			};
		}
	});
</script>

<section bind:this={sectionRef} id="product-demo">
	<SectionWrapper background="alt">
		<SectionTitle
			title="Real credit assessment. Not a 2-minute guess."
			subtitle="See what 15 minutes of bank-grade intelligence delivers."
		/>

		<div bind:this={containerRef} class="demo-layout">
			<!-- ═══════════════════════════════════════════════════ -->
			<!-- MOCK BROWSER WINDOW                                -->
			<!-- ═══════════════════════════════════════════════════ -->
			<div
				class="demo-window"
				role="img"
				aria-label="Animated demonstration: filling a client profile, evaluating against 50+ bank profiles, and seeing matched results from HDFC, SBI, and ICICI"
			>
				<!-- Title bar with macOS dots -->
				<div class="demo-titlebar" aria-hidden="true">
					<span class="tb-dot tb-red"></span>
					<span class="tb-dot tb-yellow"></span>
					<span class="tb-dot tb-green"></span>
					<span class="tb-text">DigitalDSA Pro</span>
				</div>

				<!-- Viewport (fixed height, phases crossfade) -->
				<div class="demo-viewport" style="opacity: {viewportOpacity};">
					<!-- Animated cursor -->
					{#if cursorVisible}
						<div
							class="demo-cursor"
							class:clicking={cursorClicking}
							style="left: {cursorX}%; top: {cursorY}%;"
							aria-hidden="true"
						></div>
					{/if}

					<!-- ── FORM PHASE ──────────────────────── -->
					{#if phase === 'form' || phase === 'idle'}
						<div class="demo-panel">
							<p class="panel-title">Client Profile</p>
							<div class="form-fields">
								{#each DEMO_FIELDS as field, i}
									<div
										class="form-row"
										class:field-active={i === activeFieldIndex}
										class:field-filled={filledFields[i]}
									>
										<span class="field-label">{field.label}</span>
										<div class="field-input" class:field-select={field.type === 'select'}>
											<span class="field-value">{getFieldDisplay(i)}</span>
											{#if i === activeFieldIndex && showTextCursor && !filledFields[i]}
												<span class="text-cursor" aria-hidden="true"></span>
											{/if}
											{#if field.type === 'select' && filledFields[i]}
												<span class="select-chevron" aria-hidden="true">▾</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
							<div class="eval-btn" class:btn-clicked={evaluateClicked}>Evaluate 50+ Banks →</div>
						</div>
					{/if}

					<!-- ── EVALUATING PHASE ────────────────── -->
					{#if phase === 'evaluating'}
						<div class="demo-panel eval-panel">
							<p class="panel-title">Evaluating...</p>

							<div class="progress-track">
								<div class="progress-fill" style="width: {evalProgress}%;"></div>
							</div>
							<p class="progress-label">{Math.round(evalProgress)}%</p>

							<div class="eval-steps">
								{#each EVAL_STEPS as step, i}
									<div
										class="eval-step"
										class:step-active={evalStepStatuses[i] === 'active'}
										class:step-complete={evalStepStatuses[i] === 'complete'}
									>
										<span class="step-dot" aria-hidden="true">
											{#if evalStepStatuses[i] === 'complete'}✓{:else if evalStepStatuses[i] === 'active'}●{:else}○{/if}
										</span>
										<span class="step-text">{step}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- ── RESULTS PHASE ───────────────────── -->
					{#if phase === 'results' || phase === 'pause'}
						<div class="demo-panel results-panel">
							<p class="panel-title">Results — 3 banks matched</p>

							<div class="result-cards">
								{#each RESULT_CARDS as card, i}
									{#if i < visibleCards}
										<div
											class="result-card light-{card.light}"
											class:best-glow={i === 0 && showBestGlow}
										>
											<div class="rc-header">
												<span class="rc-rank">#{card.rank}</span>
												<span class="rc-bank">{card.bank}</span>
												<span class="rc-dot dot-{card.light}" aria-hidden="true"></span>
												{#if card.badge}
													<span class="rc-badge">{card.badge}</span>
												{/if}
											</div>
											<div class="rc-metrics">
												<div class="rc-metric">
													<span class="rc-val">{card.amount}</span>
													<span class="rc-key">Amount</span>
												</div>
												<div class="rc-metric">
													<span class="rc-val">{card.roi}</span>
													<span class="rc-key">ROI</span>
												</div>
												<div class="rc-metric">
													<span class="rc-val">{card.emi}</span>
													<span class="rc-key">EMI/mo</span>
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- ═══════════════════════════════════════════════════ -->
			<!-- SIDEBAR ANNOTATIONS                                -->
			<!-- ═══════════════════════════════════════════════════ -->
			<div class="demo-annotations">
				<div class="annotation">
					<span class="annotation-number">50+</span>
					<span class="annotation-label">Bank profiles evaluated</span>
				</div>
				<div class="annotation">
					<span class="annotation-number">12</span>
					<span class="annotation-label">Income types profiled</span>
				</div>
				<div class="annotation">
					<span class="annotation-number">~15</span>
					<span class="annotation-label">Minutes. Real answers.</span>
				</div>
			</div>
		</div>

		<!-- CTA below demo -->
		<div class="demo-cta">
			<PrimaryButton onclick={handleCTA}>Try it free &rarr;</PrimaryButton>
		</div>
	</SectionWrapper>
</section>

<style>
	/* ── Layout ──────────────────────────────────────────────── */

	.demo-layout {
		display: flex;
		align-items: flex-start;
		gap: 2rem;
		max-width: 60rem;
		margin: 0 auto;
	}

	.demo-window {
		flex: 1;
		min-width: 0;
		border-radius: 1rem;
		border: 1px solid var(--landing-glass-border);
		background: var(--landing-glass-bg);
		backdrop-filter: blur(var(--landing-glass-blur));
		-webkit-backdrop-filter: blur(var(--landing-glass-blur));
		box-shadow: var(--landing-shadow-card);
		overflow: hidden;
	}

	.demo-annotations {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		flex-shrink: 0;
		width: 11rem;
		padding-top: 3rem;
	}

	.demo-cta {
		text-align: center;
		margin-top: 2.5rem;
	}

	/* ── Title Bar ────────────────────────────────────────────── */

	.demo-titlebar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 0.875rem;
		background: rgba(0, 0, 0, 0.06);
		border-bottom: 1px solid var(--landing-glass-border);
	}

	.tb-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.tb-red {
		background: #ff5f57;
	}
	.tb-yellow {
		background: #febc2e;
	}
	.tb-green {
		background: #28c840;
	}

	.tb-text {
		margin-left: 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--landing-text-muted);
		letter-spacing: 0.02em;
	}

	/* ── Viewport ─────────────────────────────────────────────── */

	.demo-viewport {
		position: relative;
		height: 26rem;
		overflow: hidden;
		transition: opacity 0.6s ease;
	}

	/* ── Animated Cursor ──────────────────────────────────────── */

	.demo-cursor {
		position: absolute;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--landing-accent, #ffcc00);
		box-shadow:
			0 0 10px rgba(255, 204, 0, 0.5),
			0 0 20px rgba(255, 204, 0, 0.2);
		pointer-events: none;
		z-index: 10;
		transition:
			left 0.3s ease-out,
			top 0.3s ease-out;
		transform: translate(-50%, -50%);
	}

	.demo-cursor.clicking {
		animation: cursor-click 0.15s ease-out;
	}

	@keyframes cursor-click {
		0%,
		100% {
			transform: translate(-50%, -50%) scale(1);
		}
		50% {
			transform: translate(-50%, -50%) scale(1.5);
		}
	}

	/* ── Panels (shared base for form/eval/results) ───────────── */

	.demo-panel {
		position: absolute;
		inset: 0;
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		animation: panel-enter 0.35s ease-out;
	}

	@keyframes panel-enter {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.panel-title {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--landing-text, #1a1a1a);
		margin-bottom: 1rem;
		letter-spacing: 0.02em;
	}

	/* ── Form Fields ──────────────────────────────────────────── */

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 0;
		flex: 1;
	}

	.form-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
		transition: border-color 0.15s;
	}

	.form-row.field-active {
		border-left: 3px solid var(--landing-accent, #ffcc00);
		padding-left: 0.5rem;
		margin-left: -0.5rem;
	}

	.field-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--landing-text-muted, #888);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		flex-shrink: 0;
		width: 40%;
	}

	.field-input {
		flex: 1;
		display: flex;
		align-items: center;
		min-height: 1.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--landing-text, #1a1a1a);
	}

	.field-value {
		white-space: nowrap;
	}

	.field-select .select-chevron {
		margin-left: auto;
		font-size: 0.625rem;
		color: var(--landing-text-muted);
	}

	/* Blinking text cursor */
	.text-cursor {
		display: inline-block;
		width: 2px;
		height: 1em;
		background: var(--landing-accent, #ffcc00);
		margin-left: 1px;
		animation: blink-cursor 0.8s step-end infinite;
	}

	@keyframes blink-cursor {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	/* ── Evaluate Button ──────────────────────────────────────── */

	.eval-btn {
		margin-top: auto;
		padding: 0.625rem 1.25rem;
		text-align: center;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--landing-accent-text, #1a1a1a);
		background: var(--landing-accent, #ffcc00);
		border-radius: 0.5rem;
		transition:
			transform 0.15s,
			box-shadow 0.15s;
	}

	.eval-btn.btn-clicked {
		transform: scale(0.96);
		box-shadow: 0 0 16px rgba(255, 204, 0, 0.4);
	}

	/* ── Evaluation Panel ─────────────────────────────────────── */

	.eval-panel {
		justify-content: center;
		align-items: center;
		gap: 1.5rem;
	}

	.progress-track {
		width: 80%;
		height: 6px;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 3px;
		background: linear-gradient(
			90deg,
			var(--landing-accent, #ffcc00),
			var(--landing-accent-hover, #e6b800)
		);
		transition: width 0.1s linear;
	}

	.progress-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--landing-text-muted);
		text-align: center;
	}

	.eval-steps {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 80%;
	}

	.eval-step {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--landing-text-muted);
		transition: color 0.2s;
	}

	.eval-step.step-active {
		color: var(--landing-text, #1a1a1a);
		font-weight: 600;
	}

	.eval-step.step-complete {
		color: #22c55e;
	}

	.step-dot {
		font-size: 0.625rem;
		width: 1rem;
		text-align: center;
		flex-shrink: 0;
	}

	.step-active .step-dot {
		animation: pulse-step 1s ease-in-out infinite;
		color: var(--landing-accent);
	}

	@keyframes pulse-step {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.3);
		}
	}

	/* ── Results Panel ────────────────────────────────────────── */

	.results-panel {
		gap: 0.5rem;
	}

	.result-cards {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.result-card {
		border-radius: 0.5rem;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: rgba(255, 255, 255, 0.8);
		padding: 0.625rem 0.875rem;
		animation: card-slide-in 0.4s ease-out;
		transition: box-shadow 0.3s ease;
	}

	@keyframes card-slide-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.result-card.light-green {
		border-left: 3px solid #22c55e;
	}

	.result-card.light-amber {
		border-left: 3px solid #f59e0b;
	}

	.result-card.best-glow {
		box-shadow:
			0 0 20px rgba(255, 204, 0, 0.15),
			0 0 40px rgba(255, 204, 0, 0.08);
		animation: gold-glow-pulse 2s ease-in-out infinite;
	}

	@keyframes gold-glow-pulse {
		0%,
		100% {
			box-shadow: 0 0 16px rgba(255, 204, 0, 0.12);
		}
		50% {
			box-shadow: 0 0 32px rgba(255, 204, 0, 0.25);
		}
	}

	/* Result card header */
	.rc-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.375rem;
	}

	.rc-rank {
		font-size: 0.625rem;
		font-weight: 800;
		color: var(--landing-text-muted);
	}

	.rc-bank {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--landing-text, #1a1a1a);
	}

	.rc-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.dot-green {
		background: #22c55e;
	}
	.dot-amber {
		background: #f59e0b;
	}

	.rc-badge {
		margin-left: auto;
		font-size: 0.5625rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.125rem 0.375rem;
		border-radius: 0.1875rem;
		background: var(--landing-accent-subtle, rgba(255, 204, 0, 0.1));
		color: var(--landing-accent-accessible, #1a1a1a);
	}

	/* Result card metrics */
	.rc-metrics {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.25rem;
		text-align: center;
	}

	.rc-val {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--landing-text, #1a1a1a);
		font-family: var(--font-title);
	}

	.rc-key {
		display: block;
		font-size: 0.5625rem;
		font-weight: 600;
		color: var(--landing-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* ── Annotations Sidebar ──────────────────────────────────── */

	.annotation {
		text-align: center;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 1px solid var(--landing-glass-border);
		background: var(--landing-glass-bg);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.annotation-number {
		display: block;
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--landing-text, #1a1a1a);
		font-family: var(--font-title);
		line-height: 1.1;
	}

	.annotation-label {
		display: block;
		font-size: 0.75rem;
		color: var(--landing-text-muted);
		margin-top: 0.25rem;
		line-height: 1.3;
	}

	/* ── Responsive ───────────────────────────────────────────── */

	@media (max-width: 768px) {
		.demo-layout {
			flex-direction: column;
			gap: 1.5rem;
		}

		.demo-annotations {
			flex-direction: row;
			width: 100%;
			justify-content: center;
			gap: 0.75rem;
			padding-top: 0;
		}

		.annotation {
			flex: 1;
			padding: 0.75rem 0.5rem;
		}

		.annotation-number {
			font-size: 1.25rem;
		}

		.annotation-label {
			font-size: 0.6875rem;
		}

		.demo-viewport {
			height: 22rem;
		}

		.demo-panel {
			padding: 1rem;
		}

		.field-label {
			font-size: 0.625rem;
		}

		.field-input {
			font-size: 0.75rem;
		}

		.rc-val {
			font-size: 0.75rem;
		}

		.rc-bank {
			font-size: 0.75rem;
		}

		.eval-steps {
			width: 90%;
		}
	}

	@media (max-width: 480px) {
		.demo-viewport {
			height: 20rem;
		}

		.form-row {
			padding: 0.375rem 0;
		}

		.result-card {
			padding: 0.5rem 0.625rem;
		}
	}
</style>
