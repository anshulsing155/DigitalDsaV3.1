<script lang="ts">
	import {
		Shield,
		FileText,
		CheckCircle,
		ArrowRight,
		Award,
		Lock
	} from "lucide-svelte";
	import { goto } from "$app/navigation";
	import Seo from "$lib/components/website/Seo.svelte";

	function navigateToAssessment() {
		goto("/assessment");
	}

	function navigateToScenarios() {
		goto("/scenarios");
	}
</script>

<Seo
	type="WebPage"
	title="Property Ownership Risk Assessment – Secure Your Rights"
	image="/images/home-scheme.jpg"
	description="Verify your property title safety instantly based on Supreme Court of India guidelines. Identify risks and discover legal regularisation steps."
	keywords="Property ownership risk, Property title security, Supreme Court property rulings, GPA agreement safety, Registered sale deed check, Property legal advice India"
/>

<div class="min-h-screen bg-[var(--landing-bg)] text-[var(--form-text)] font-sans">
	<!-- Hero Section -->
	<section class="relative bg-gradient-to-br from-[var(--landing-bg)] via-white to-yellow-50/30 py-20 overflow-hidden border-b border-[var(--form-border)]">
		<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
				<div class="space-y-8">
					<div class="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-800 text-sm font-medium">
						<Award class="w-4 h-4 mr-2" />
						India's First Landmark-Precedent Evaluator
					</div>

					<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
						Protect Your
						<span class="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
							Property Rights
						</span>
						Legally
					</h1>

					<p class="text-lg sm:text-xl text-[var(--form-text-secondary)] leading-relaxed max-w-2xl">
						Get an instant assessment and clear, actionable legal advice for your property's legal structure.
						Fully mapped against the landmark <strong>Suraj Lamp case (2011)</strong> and the latest **November 2024 Supreme Court rulings**.
					</p>

					<div class="flex flex-col sm:flex-row gap-4 pt-2">
						<button
							onclick={navigateToAssessment}
							class="group bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center border border-black/10"
						>
							Start Free Assessment
							<ArrowRight class="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
						</button>

						<button
							onclick={navigateToScenarios}
							class="border-2 border-gray-300 text-[var(--form-text)] px-8 py-4 rounded-xl font-semibold text-lg hover:border-yellow-400 hover:text-yellow-600 transition-all duration-300 flex items-center justify-center"
						>
							<FileText class="mr-2 h-5 w-5" />
							View Legal Scenarios
						</button>
					</div>

					<div class="flex items-center space-x-8 pt-4">
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-5 h-5 text-green-500" />
							<span class="text-sm font-medium text-[var(--form-text-secondary)]">100% Free Analysis</span>
						</div>
						<div class="flex items-center space-x-2">
							<Shield class="w-5 h-5 text-blue-500" />
							<span class="text-sm font-medium text-[var(--form-text-secondary)]">Supreme Court Precedent Mapped</span>
						</div>
					</div>
				</div>

				<div class="relative">
					<div class="absolute inset-0 bg-yellow-400/10 rounded-3xl transform rotate-3 scale-105"></div>
					<div class="relative bg-white rounded-3xl shadow-xl p-8 border border-[var(--form-border)]">
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h3 class="text-xl font-bold text-gray-900">
									Interactive Risk Profiler
								</h3>
								<div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
									<Shield class="w-6 h-6 text-green-600" />
								</div>
							</div>

							<div class="space-y-4">
								<div class="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
									<span class="text-gray-700 font-medium text-sm">Sale Deed Verification</span>
									<span class="text-green-600 font-bold text-xs uppercase tracking-wider">✓ Included</span>
								</div>
								<div class="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
									<span class="text-gray-700 font-medium text-sm">GPA & Will Legitimacy</span>
									<span class="text-yellow-600 font-bold text-xs uppercase tracking-wider">⚡ Mapped</span>
								</div>
								<div class="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
									<span class="text-gray-700 font-medium text-sm">Instant PDF Report</span>
									<span class="text-blue-600 font-bold text-xs uppercase tracking-wider">📥 Free Download</span>
								</div>
							</div>

							<button
								onclick={navigateToAssessment}
								class="w-full bg-black text-white hover:bg-gray-800 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
							>
								<Lock class="w-4 h-4 text-yellow-400" />
								Assess My Property
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Legal Context Section -->
	<section class="py-20 bg-gray-50">
		<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center mb-12">
				<h2 class="text-3xl font-bold text-gray-900">Critical Indian Property Regulations</h2>
				<p class="text-gray-600 mt-3">Why checking your property documents against landmark rulings is mandatory</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="bg-white p-8 rounded-2xl border border-[var(--form-border)] shadow-sm space-y-4">
					<div class="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-semibold uppercase tracking-wider">
						Suraj Lamp Ruling (2011)
					</div>
					<h3 class="text-xl font-bold text-gray-900">No Ownership via GPA / Wills</h3>
					<p class="text-gray-600 leading-relaxed">
						The Supreme Court held that Power of Attorney (GPA), Agreement to Sell, or Wills do not transfer title.
						Properties held under these arrangements require regularisation via registered deeds.
					</p>
				</div>

				<div class="bg-white p-8 rounded-2xl border border-[var(--form-border)] shadow-sm space-y-4">
					<div class="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-md text-xs font-semibold uppercase tracking-wider">
						November 2024 Ruling
					</div>
					<h3 class="text-xl font-bold text-gray-900">Registration Alone is Not Title</h3>
					<p class="text-gray-600 leading-relaxed">
						A landmark judgment stating that mere registration of a document does not prove ownership unless the transferor
						had a clear legal right to sell and the buyer holds actual possession with payment proof.
					</p>
				</div>
			</div>
		</div>
	</section>
</div>
