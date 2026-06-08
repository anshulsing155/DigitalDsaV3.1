<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import Eye from 'lucide-svelte/icons/eye';
	import HelpCircle from 'lucide-svelte/icons/help-circle';

	let isRedacted = $state(true);

	function toggleRedact() {
		isRedacted = !isRedacted;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.fromTo(
			'.redact-pad',
			{ scaleX: isRedacted ? 0.9 : 1, opacity: isRedacted ? 0.5 : 1 },
			{ scaleX: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.2)' }
		);
	}
</script>

<section id="privacy-file-builder" class="relative py-24 bg-white dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<div class="absolute top-[20%] left-[-10%] w-[350px] h-[350px] bg-radial from-[rgba(6,182,212,0.02)] to-transparent rounded-full blur-[90px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4 font-sans">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Anti-Bypassing Shield Technology</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				No-PII PDF File Builder
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Protect your client leads from RM bank hopping and portal scrapers. Present fully vetted credit parameters to bank partners without attaching personal identification records.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
			
			<!-- LEFT FILE INTERFACE (7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[520px] transition-colors">
				
				<!-- Interface Title -->
				<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
					<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">Sanitized RM Presenter</span>
					
					<button 
						onclick={toggleRedact}
						class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-200 {isRedacted ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/25' : 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444]/25'}"
					>
						{#if isRedacted}
							<EyeOff class="w-3.5 h-3.5" />
							<span>PII Shielded (Active)</span>
						{:else}
							<Eye class="w-3.5 h-3.5" />
							<span>Expose Private Data</span>
						{/if}
					</button>
				</div>

				<!-- Visual mock sheet with custom blur/blackout blocks -->
				<div class="bg-gray-50 dark:bg-[#18181f] border border-gray-200 dark:border-[#232328] p-5 sm:p-6 rounded-2xl flex flex-col gap-4 text-xs font-sans relative">
					<div class="flex justify-between items-center text-[10px] text-gray-400 dark:text-[#71717a] font-mono border-b border-gray-200 dark:border-[#27272a] pb-2 mb-1">
						<span>DigitalDSA verified credit score sheet</span>
						<span>CASE REF: #DDSA-99120</span>
					</div>

					<!-- Row 1: Applicant Name -->
					<div class="flex justify-between items-center py-1 relative min-h-[32px]">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Applicant Name:</span>
						{#if isRedacted}
							<div class="redact-pad w-40 h-6 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded flex items-center justify-center text-[9px] font-mono text-[#ef4444] font-extrabold tracking-widest animate-pulse select-none select-none blur-[0.6px]">
								🔒 MASKED V1
							</div>
						{:else}
							<span class="text-gray-900 dark:text-white font-mono font-bold">Ramesh Chandra Joshi</span>
						{/if}
					</div>

					<!-- Row 2: PAN Card -->
					<div class="flex justify-between items-center py-1 border-t border-gray-200/50 dark:border-[#1f1f24] pt-3 relative min-h-[32px]">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">PAN Card registration:</span>
						{#if isRedacted}
							<div class="redact-pad w-40 h-6 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded flex items-center justify-center text-[9px] font-mono text-[#ef4444] font-extrabold tracking-widest animate-pulse select-none select-none blur-[0.6px]">
								🔒 MASKED V1
							</div>
						{:else}
							<span class="text-gray-900 dark:text-white font-mono font-bold">ALFPJ8219K</span>
						{/if}
					</div>

					<!-- Row 3: Income parameters -->
					<div class="flex justify-between items-center py-1 border-t border-gray-200/50 dark:border-[#1f1f24] pt-3 relative">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Credit-Adjusted Eligible Income:</span>
						<span class="text-[#10b981] font-mono font-extrabold text-sm">₹1,94,000 <span class="text-[9px] text-[#71717a]">(Monthly Net)</span></span>
					</div>

					<!-- Row 4: Obligations -->
					<div class="flex justify-between items-center py-1 border-t border-gray-200/50 dark:border-[#1f1f24] pt-3 relative">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Active CIBIL EMI Obligations:</span>
						<span class="text-gray-900 dark:text-white font-mono font-bold">₹22,000</span>
					</div>

					<!-- Row 5: Credit Score -->
					<div class="flex justify-between items-center py-1 border-t border-gray-200/50 dark:border-[#1f1f24] pt-3 relative">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Verified CIBIL Score:</span>
						<span class="text-gray-900 dark:text-white font-mono font-bold">784 <span class="text-[9px] text-[#10b981]">(Excellent)</span></span>
					</div>
				</div>

				<!-- Handwriting callout -->
				<div class="absolute bottom-16 right-4 select-none hidden sm:block">
					<div class="flex flex-col items-start select-none">
						<span class="handwritten text-xs text-[#ffcc00] max-w-[150px] leading-relaxed bg-white dark:bg-[#0c0c0f] p-2 rounded border border-gray-200 dark:border-[#27272a] shadow-md">
							*RMs see only credit scores. Your client is 100% shielded from direct codes bypasses!
						</span>
						<svg width="34" height="28" viewBox="0 0 34 28" fill="none" class="text-[#ffcc00] rotate-45 ml-4">
							<path d="M2 2C8 10 18 20 32 25" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							<path d="M26 26L32 25L30 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
				</div>

				<div class="mt-6 flex items-start gap-2 text-xs text-gray-400 dark:text-[#71717a] leading-relaxed italic border-t border-gray-200 dark:border-[#27272a] pt-4 select-none">
					<HelpCircle class="w-4 h-4 text-[#ffcc00] flex-shrink-0 mt-0.5" />
					<span>Click the "PII Shielded" toggle at top right to simulate exposing private files during secure bank presentations.</span>
				</div>
			</div>

			<!-- RIGHT VALUE PITCH (5 Cols) -->
			<div class="lg:col-span-5 flex flex-col gap-6 text-left">
				<h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
					Your Client is <span class="text-[#ffcc00]">Your Asset</span>.<br />
					We keep it that way.
				</h3>

				<p class="text-gray-500 dark:text-[#a1a1aa] text-sm sm:text-base leading-relaxed">
					Lenders routinely recruit RMs. When you submit complete borrower details upfront, RMs often share these leads with their internal direct-sales channel. Your code is bypassed, and your hard work is lost.
				</p>

				<div class="flex flex-col gap-4 mt-2">
					<div class="flex gap-3">
						<div class="w-5 h-5 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-[#ffcc00] font-bold font-mono">✓</div>
						<div class="text-xs sm:text-sm text-gray-900 dark:text-white">
							<span class="font-bold block">100% PII Masking:</span>
							<span class="text-gray-500 dark:text-[#a1a1aa]">Borrower name, phone number, PAN, and address are redacted on all exportable PDF sheets.</span>
						</div>
					</div>

					<div class="flex gap-3">
						<div class="w-5 h-5 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-[#ffcc00] font-bold font-mono">✓</div>
						<div class="text-xs sm:text-sm text-gray-900 dark:text-white">
							<span class="font-bold block">Sanitized RM Presenter:</span>
							<span class="text-gray-500 dark:text-[#a1a1aa]">Bank RMs log in and review the case parameters purely on credit numbers. They issue soft approvals *before* you reveal personal files.</span>
						</div>
					</div>

					<div class="flex gap-3">
						<div class="w-5 h-5 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/20 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs text-[#ffcc00] font-bold font-mono">✓</div>
						<div class="text-xs sm:text-sm text-gray-900 dark:text-white">
							<span class="text-[#22d3ee] font-bold bg-[#164e63]/20 px-2.5 py-0.5 rounded border border-[#0891b2]/30 mt-1 inline-block">We never sell leads. We are not a corporate DSA. Your client is safe.</span>
						</div>
					</div>
				</div>
			</div>

		</div>
	</div>
</section>
