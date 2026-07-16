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
	import Seo from '$lib/components/Seo.svelte';
	import content from "$lib/data/website/ownershipRiskAssessment.json";

	function navigateToAssessment() {
		goto("/assessment");
	}

	function navigateToScenarios() {
		goto("/scenarios");
	}
</script>

<Seo
	type={content.seo.type}
	title={content.seo.title}
	image={content.seo.image}
	description={content.seo.description}
	keywords={content.seo.keywords}
/>

<div class="min-h-screen bg-[var(--landing-bg)] text-[var(--form-text)] font-sans">
	<!-- Hero Section -->
	<section class="relative bg-gradient-to-br from-[var(--landing-bg)] via-white to-yellow-50/30 py-20 overflow-hidden border-b border-[var(--form-border)]">
		<div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
				<div class="space-y-8">
					<div class="inline-flex items-center px-4 py-2 bg-yellow-100 rounded-full text-yellow-800 text-sm font-medium">
						<Award class="w-4 h-4 mr-2" />
						{content.badge}
					</div>

					<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
						{content.title}
						<span class="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
							{content.titleHighlight}
						</span>
						{content.titleSuffix}
					</h1>

					<p class="text-lg sm:text-xl text-[var(--form-text-secondary)] leading-relaxed max-w-2xl">
						{content.description}
					</p>

					<div class="flex flex-col sm:flex-row gap-4 pt-2">
						<button
							onclick={navigateToAssessment}
							class="group bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center border border-black/10"
						>
							{content.buttons.start}
							<ArrowRight class="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
						</button>

						<button
							onclick={navigateToScenarios}
							class="border-2 border-gray-300 text-[var(--form-text)] px-8 py-4 rounded-xl font-semibold text-lg hover:border-yellow-400 hover:text-yellow-600 transition-all duration-300 flex items-center justify-center"
						>
							<FileText class="mr-2 h-5 w-5" />
							{content.buttons.scenarios}
						</button>
					</div>

					<div class="flex items-center space-x-8 pt-4">
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-5 h-5 text-green-500" />
							<span class="text-sm font-medium text-[var(--form-text-secondary)]">{content.trustItems[0]}</span>
						</div>
						<div class="flex items-center space-x-2">
							<Shield class="w-5 h-5 text-blue-500" />
							<span class="text-sm font-medium text-[var(--form-text-secondary)]">{content.trustItems[1]}</span>
						</div>
					</div>
				</div>

				<div class="relative">
					<div class="absolute inset-0 bg-yellow-400/10 rounded-3xl transform rotate-3 scale-105"></div>
					<div class="relative bg-white rounded-3xl shadow-xl p-8 border border-[var(--form-border)]">
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h3 class="text-xl font-bold text-gray-900">
									{content.profiler.title}
								</h3>
								<div class="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
									<Shield class="w-6 h-6 text-green-600" />
								</div>
							</div>

							<div class="space-y-4">
								{#each content.profiler.items as item}
									<div class="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
										<span class="text-gray-700 font-medium text-sm">{item.label}</span>
										<span class={item.badgeClass}>{item.badge}</span>
									</div>
								{/each}
							</div>

							<button
								onclick={navigateToAssessment}
								class="w-full bg-black text-white hover:bg-gray-800 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2"
							>
								<Lock class="w-4 h-4 text-yellow-400" />
								{content.buttons.assess}
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
				<h2 class="text-3xl font-bold text-gray-900">{content.regulations.title}</h2>
				<p class="text-gray-600 mt-3">{content.regulations.description}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				{#each content.regulations.items as reg}
					<div class="bg-white p-8 rounded-2xl border border-[var(--form-border)] shadow-sm space-y-4">
						<div class={reg.badgeClass}>
							{reg.badge}
						</div>
						<h3 class="text-xl font-bold text-gray-900">{reg.title}</h3>
						<p class="text-gray-600 leading-relaxed">
							{reg.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>
</div>
