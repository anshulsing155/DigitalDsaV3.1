<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import Play from 'lucide-svelte/icons/play';

	let heroRef: HTMLElement | undefined = $state(undefined);
	let animationScene = $state<1 | 2 | 3 | 4 | 5>(1);

	function handleCTA() {
		landingNav.handleCTA();
	}

	function handleGuestDemo() {
		window.location.href = '/test-dashboard';
	}

	onMount(() => {
		if (!heroRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			animationScene = 5;
			return;
		}

		// Main GSAP cinematic load sequence
		const loadTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		loadTl.fromTo('.hero-badge', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.6 })
			.fromTo('.hero-title-segment', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, '-=0.4')
			.fromTo('.hero-sub-text', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.5')
			.fromTo('.hero-action-buttons', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.4')
			.fromTo('.hero-storyboard', { opacity: 0, scale: 0.98, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.9 }, '-=0.3');

		// ── 10-SECOND CINEMATIC STORYBOARD TIMELINE ──
		const storyTl = gsap.timeline({ repeat: -1 });

		storyTl
			// Scene 1: Input Chaos (0s - 2s)
			.call(() => { animationScene = 1; })
			.fromTo('.chaos-node-item', { scale: 0.2, opacity: 0, x: () => gsap.utils.random(-150, 150), y: () => gsap.utils.random(-150, 150) }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.5)', stagger: 0.08 })
			.wait(1.4)

			// Scene 2: Policy Maze Confusion (2s - 4s)
			.call(() => { animationScene = 2; })
			.fromTo('.maze-node-item', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06 })
			.to('.chaos-node-item', { x: '+=20', y: '-=20', duration: 1.5, ease: 'sine.inOut', repeat: 1, yoyo: true }, '-=0.4')
			.wait(1.2)

			// Scene 3: Sucked into Cockpit (4s - 6s)
			.call(() => { animationScene = 3; })
			.to('.chaos-node-item, .maze-node-item', { x: 0, y: 0, scale: 0.2, opacity: 0, duration: 0.6, ease: 'power2.in' })
			.fromTo('.central-console', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.2)' }, '-=0.3')
			.wait(1.2)

			// Scene 4: Intelligent Auto-processing (6s - 8s)
			.call(() => { animationScene = 4; })
			.fromTo('.processing-check-item', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.15 })
			.wait(1.4)

			// Scene 5: Visual Approval (8s - 10s)
			.call(() => { animationScene = 5; })
			.to('.central-console', { opacity: 0.3, duration: 0.4 })
			.fromTo('.final-greenlight-card', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' }, '-=0.2')
			.wait(1.8);

		return () => {
			loadTl.kill();
			storyTl.kill();
		};
	});
</script>

<section bind:this={heroRef} id="hero" class="relative min-h-[96vh] flex flex-col items-center justify-center pt-28 pb-16 overflow-hidden bg-[#F9FAFB] dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] px-4 md:px-8 border-b border-gray-200/85 dark:border-[#1f1f23] transition-colors duration-300">
	<!-- High-end structural grid backdrop -->
	<div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:24px_24px] opacity-35 dark:opacity-20 pointer-events-none" aria-hidden="true"></div>
	
	<div class="w-full max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
		<!-- Award-winning top badge -->
		<div class="hero-badge flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-6 shadow-sm select-none transition-colors">
			<Sparkles class="w-3.5 h-3.5 text-[#ffcc00] animate-pulse" />
			<span>The Bloomberg Terminal for Retail Loan Professionals</span>
		</div>

		<!-- Main Headline -->
		<div class="relative max-w-5xl mb-6 select-none leading-none">
			<h1 class="hero-title-segment font-sans text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.02]">
				Stop Guessing. <br class="hidden sm:inline" />
				Know Exactly Which Bank <br class="hidden sm:inline" />
				Will Approve The Case.
			</h1>
		</div>

		<!-- Subheadline -->
		<p class="hero-sub-text text-base sm:text-lg md:text-xl text-gray-500 dark:text-[#a1a1aa] max-w-3xl mb-8 leading-relaxed">
			The Operating System For Modern Loan DSAs
		</p>

		<!-- Action Buttons -->
		<div class="hero-action-buttons flex flex-col sm:flex-row gap-4 mb-16 justify-center w-full max-w-md">
			<button 
				onclick={handleGuestDemo}
				class="px-8 py-4 rounded-xl bg-[#2563eb] dark:bg-[#ffcc00] text-white dark:text-[#050505] font-bold text-base hover:scale-[1.03] active:scale-[0.98] shadow-md dark:shadow-[0_0_30px_rgba(255,204,0,0.25)] transition-all duration-200"
			>
				Try Free Demo
			</button>
			<button 
				onclick={handleCTA}
				class="px-8 py-4 rounded-xl bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-white font-semibold text-base border border-gray-200 dark:border-[#27272a] hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2 transition-all duration-200"
			>
				<Play class="w-4 h-4" />
				<span>Watch 30 Sec Workflow</span>
			</button>
		</div>

		<!-- ── MASTER CINEMATIC 10-SECOND STORYBOARD CONTAINER ── -->
		<div class="hero-storyboard w-full max-w-4xl aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/9] rounded-3xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#0D0D0D] overflow-hidden shadow-lg dark:shadow-[0_25px_60px_rgba(0,0,0,0.65)] relative flex items-center justify-center p-6 transition-colors">
			
			<!-- Background Stage Indicators (手书 human annotation details) -->
			<div class="absolute top-4 left-4 text-[10px] font-mono text-gray-400 dark:text-[#71717a] font-bold tracking-wider select-none">
				⚡ CINEMATIC OS BROADCAST &middot; SECONDS LOOP
			</div>

			<!-- SCENE 1: Chaos of Inputs -->
			{#if animationScene === 1}
				<div class="absolute inset-0 flex items-center justify-center p-8 select-none">
					<div class="absolute text-sm font-bold text-gray-400 dark:text-gray-500 select-none animate-pulse mb-32 font-mono">
						[SCENE 1: THE CRUMPLED DATA DESK CHAOS]
					</div>
					<div class="flex flex-wrap gap-4 items-center justify-center max-w-2xl relative z-10">
						<div class="chaos-node-item px-4 py-2 bg-red-100 dark:bg-red-950/30 text-[var(--color-error)] dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold shadow-md">
							💬 Blurred WhatsApp Screenshot
						</div>
						<div class="chaos-node-item px-4 py-2 bg-red-100 dark:bg-red-950/30 text-[var(--color-error)] dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold shadow-md">
							📂 Scattered PDFs
						</div>
						<div class="chaos-node-item px-4 py-2 bg-red-100 dark:bg-red-950/30 text-[var(--color-error)] dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold shadow-md">
							📧 Lost RM Emails
						</div>
						<div class="chaos-node-item px-4 py-2 bg-red-100 dark:bg-red-950/30 text-[var(--color-error)] dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold shadow-md">
							📊 Broken Excels
						</div>
					</div>
				</div>
			{/if}

			<!-- SCENE 2: The Policy Maze -->
			{#if animationScene === 2}
				<div class="absolute inset-0 flex items-center justify-center p-8 select-none">
					<div class="absolute text-sm font-bold text-gray-400 dark:text-gray-500 select-none animate-pulse mb-32 font-mono">
						[SCENE 2: 50+ BANKS, VARYING GUIDELINES, CHURN]
					</div>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl relative z-10">
						<div class="maze-node-item p-3 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-center rounded-2xl">
							<div class="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">HDFC HL</div>
							<div class="text-xs text-gray-900 dark:text-white font-bold mt-1">LTV Mismatch</div>
						</div>
						<div class="maze-node-item p-3 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-center rounded-2xl">
							<div class="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">SBI POLICIES</div>
							<div class="text-xs text-gray-900 dark:text-white font-bold mt-1">Vintage Reject</div>
						</div>
						<div class="maze-node-item p-3 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-center rounded-2xl">
							<div class="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">ICICI LAP</div>
							<div class="text-xs text-gray-900 dark:text-white font-bold mt-1">Gunthewari Denied</div>
						</div>
						<div class="maze-node-item p-3 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-center rounded-2xl">
							<div class="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">RM NETWORKS</div>
							<div class="text-xs text-gray-900 dark:text-white font-bold mt-1">Inactive Codes</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- SCENE 3: Sucking into central console -->
			{#if animationScene === 3}
				<div class="absolute inset-0 flex items-center justify-center p-8 select-none">
					<div class="absolute text-sm font-bold text-gray-400 dark:text-gray-500 select-none animate-pulse mb-32 font-mono">
						[SCENE 3: CONSOLIDATING DATA INTO DIGITAL DSA]
					</div>
					<div class="central-console w-72 p-4 bg-gray-50 dark:bg-[#15151c] border-2 border-dashed border-[#2563eb] dark:border-[#ffcc00] rounded-3xl text-center shadow-2xl relative z-10">
						<span class="text-[9px] font-mono text-[#2563eb] dark:text-[#ffcc00] font-bold block mb-1">CENTRAL INGESTION</span>
						<span class="text-xs font-extrabold text-gray-900 dark:text-white">Structuring borrower parameters...</span>
					</div>
				</div>
			{/if}

			<!-- SCENE 4: Auto-processing checklist -->
			{#if animationScene === 4}
				<div class="absolute inset-0 flex items-center justify-center p-8 select-none">
					<div class="absolute text-sm font-bold text-gray-400 dark:text-gray-500 select-none animate-pulse mb-32 font-mono">
						[SCENE 4: RESOLVING CREDIT GUIDELINES]
					</div>
					<div class="central-console w-80 p-5 bg-gray-50 dark:bg-[#15151c] border border-gray-200 dark:border-[#27272a] rounded-3xl flex flex-col gap-2 relative z-10 shadow-2xl">
						<div class="processing-check-item flex items-center gap-2 text-xs text-gray-900 dark:text-white font-semibold">
							<span class="text-[#10b981] font-bold font-mono">✓</span>
							<span>Aggregate income haircuts resolved</span>
						</div>
						<div class="processing-check-item flex items-center gap-2 text-xs text-gray-900 dark:text-white font-semibold">
							<span class="text-[#10b981] font-bold font-mono">✓</span>
							<span>Mumbai geographical outliers mapped</span>
						</div>
						<div class="processing-check-item flex items-center gap-2 text-xs text-gray-900 dark:text-white font-semibold">
							<span class="text-[#10b981] font-bold font-mono">✓</span>
							<span>Sensitive PII elements redacted</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- SCENE 5: Approved visual result -->
			{#if animationScene === 5}
				<div class="absolute inset-0 flex items-center justify-center p-8 select-none">
					<!-- Blurred cockpit silhouette behind -->
					<div class="w-80 p-5 bg-gray-50 dark:bg-[#15151c] border border-gray-200 dark:border-[#27272a] rounded-3xl flex flex-col gap-2 relative opacity-30 select-none">
						<div class="flex items-center gap-2 text-xs text-gray-400">
							<span>Calculating eligibility...</span>
						</div>
					</div>

					<!-- Glowing success card overlay -->
					<div class="final-greenlight-card absolute w-80 p-6 bg-white dark:bg-[#0c0c0f] border-2 border-[#10b981] rounded-3xl flex flex-col gap-4 text-left shadow-2xl relative z-30 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
						<div class="flex justify-between items-center border-b border-gray-200 dark:border-[#1f1f24] pb-2">
							<span class="text-xs font-bold text-gray-900 dark:text-white">Matches Discovered</span>
							<span class="text-[10px] bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 px-2 py-0.5 rounded font-bold font-mono animate-pulse">92% MATCH SCORE</span>
						</div>
						<div class="flex justify-between items-center text-xs">
							<span class="text-gray-500 dark:text-[#a1a1aa] font-medium">Matched Lender:</span>
							<span class="text-gray-900 dark:text-white font-bold font-mono">HDFC Home Loan</span>
						</div>
						<div class="flex justify-between items-center text-xs border-t border-gray-100 dark:border-[#1f1f24] pt-2">
							<span class="text-gray-500 dark:text-[#a1a1aa] font-medium">Approval Route:</span>
							<span class="text-[#10b981] font-extrabold font-mono uppercase tracking-wider">APPROVED CODE READY</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Dynamic handwriting margin note telling the whole story -->
			<div class="absolute bottom-4 right-8 z-30 select-none hidden xl:block">
				<div class="flex flex-col items-start rotate-3">
					<span class="handwritten text-[10px] text-[#ffcc00] bg-white dark:bg-[#050505] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-lg max-w-[210px] leading-relaxed text-left">
						*From scattered screen alerts to verified bank sanctions in 10 seconds!
					</span>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#ffcc00] rotate-45 ml-4 mt-0.5">
						<path d="M2 2C6 8 12 16 22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<path d="M16 22L22 22L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			</div>
		</div>

	</div>
</section>
