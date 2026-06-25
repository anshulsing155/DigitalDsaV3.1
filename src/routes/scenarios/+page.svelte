<script lang="ts">
	import { propertyScenarios } from '$lib/data/propertyScenarios';
	import { generatePDFReport } from '$lib/utils/pdfGenerator';
	import { Search, Filter, AlertTriangle, CheckCircle, Clock, DollarSign, FileText, Scale, Download, ArrowLeft, Home } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	interface ScenarioData {
		id: string;
		title: string;
		description: string;
		conditions: {
			hasProperty: boolean;
			documentType: string;
			legalOwner: string;
			hasPossession: boolean;
			hasDispute: boolean;
			intent: string;
		};
		riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
		legalStanding: string;
		urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
		solutions: string[];
		timeframe: string;
		estimatedCost: string;
		keyRisks: string[];
		nextSteps: string[];
	}

	let searchTerm = $state('');
	let selectedRiskLevel = $state('');
	let selectedUrgency = $state('');
	let isGeneratingPDF = $state('');

	let filteredScenarios = $derived(
		propertyScenarios.filter(scenario => {
			const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesRisk = !selectedRiskLevel || scenario.riskLevel === selectedRiskLevel;
			const matchesUrgency = !selectedUrgency || scenario.urgency === selectedUrgency;
			
			return matchesSearch && matchesRisk && matchesUrgency;
		})
	);

	function navigateToHome() {
		goto('/');
	}

	async function handleGenerateScenarioPDF(scenario: ScenarioData) {
		isGeneratingPDF = scenario.id;
		
		try {
			await new Promise(resolve => setTimeout(resolve, 500));
			await generatePDFReport(scenario);
		} catch (error) {
			console.error('PDF generation failed:', error);
		} finally {
			isGeneratingPDF = '';
		}
	}

	function getRiskColor(level: string) {
		switch (level) {
			case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
			case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
			case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getUrgencyIcon(urgency: string) {
		switch (urgency) {
			case 'LOW': return Clock;
			case 'MEDIUM': return Clock;
			case 'HIGH': return AlertTriangle;
			case 'IMMEDIATE': return AlertTriangle;
			default: return Clock;
		}
	}

	function getUrgencyColor(urgency: string) {
		switch (urgency) {
			case 'LOW': return 'text-green-500';
			case 'MEDIUM': return 'text-yellow-500';
			case 'HIGH': return 'text-orange-500';
			case 'IMMEDIATE': return 'text-red-500';
			default: return 'text-gray-500';
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b sticky top-0 z-50">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<div class="flex items-center gap-4">
					<button
						onclick={navigateToHome}
						class="flex items-center gap-2 text-gray-600 hover:text-yellow-600 transition-colors cursor-pointer"
					>
						<ArrowLeft class="w-5 h-5" />
						<span class="font-medium">Back to Home</span>
					</button>
					<div class="w-px h-6 bg-gray-300"></div>
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center justify-center">
							<Home class="w-6 h-6 text-gray-900" />
						</div>
						<div>
							<h1 class="text-xl sm:text-2xl font-bold text-gray-900">
								PropertyGuard Scenarios
							</h1>
							<p class="text-sm text-gray-600 hidden sm:block">
								Complete Ownership Guide & Solutions
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
				<FileText class="w-8 h-8 text-yellow-600" />
			</div>
			<h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
				Property Ownership Scenarios Guide
			</h1>
			<p class="text-lg text-gray-600 max-w-3xl mx-auto">
				Comprehensive analysis of all possible property ownership scenarios based on Supreme Court guidelines 
				and legal precedents. Find your situation and get expert recommendations.
			</p>
		</div>

		<!-- Search and Filters -->
		<div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
			<div class="flex flex-col lg:flex-row gap-4">
				<!-- Search -->
				<div class="flex-1 relative">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
					<input
						type="text"
						placeholder="Search scenarios..."
						bind:value={searchTerm}
						class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
					/>
				</div>

				<!-- Risk Level Filter -->
				<div class="relative">
					<Filter class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
					<select
						bind:value={selectedRiskLevel}
						class="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
					>
						<option value="">All Risk Levels</option>
						<option value="LOW">Low Risk</option>
						<option value="MEDIUM">Medium Risk</option>
						<option value="HIGH">High Risk</option>
						<option value="CRITICAL">Critical Risk</option>
					</select>
				</div>

				<!-- Urgency Filter -->
				<div class="relative">
					<Clock class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
					<select
						bind:value={selectedUrgency}
						class="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
					>
						<option value="">All Urgency Levels</option>
						<option value="LOW">Low Urgency</option>
						<option value="MEDIUM">Medium Urgency</option>
						<option value="HIGH">High Urgency</option>
						<option value="IMMEDIATE">Immediate</option>
					</select>
				</div>
			</div>

			<!-- Results Count -->
			<div class="mt-4 text-sm text-gray-600">
				Showing {filteredScenarios.length} of {propertyScenarios.length} scenarios
			</div>
		</div>

		<!-- Scenarios Grid -->
		<div class="grid gap-8">
			{#each filteredScenarios as scenario (scenario.id)}
				{@const UrgencyIcon = getUrgencyIcon(scenario.urgency)}
				<div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
					<!-- Header -->
					<div class="p-6 border-b border-gray-100">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div class="flex-1">
								<h3 class="text-xl font-bold text-gray-900 mb-2">{scenario.title}</h3>
								<p class="text-gray-600">{scenario.description}</p>
							</div>
							<div class="flex flex-col sm:flex-row gap-3">
								<span class={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getRiskColor(scenario.riskLevel)} text-center`}>
									{scenario.riskLevel} RISK
								</span>
								<div class={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border-2 border-gray-200 bg-gray-50`}>
									<UrgencyIcon class={`w-4 h-4 ${getUrgencyColor(scenario.urgency)}`} />
									{scenario.urgency}
								</div>
								<button
									onclick={() => handleGenerateScenarioPDF(scenario)}
									disabled={isGeneratingPDF === scenario.id}
									class="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-full text-sm font-semibold hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
								>
									{#if isGeneratingPDF === scenario.id}
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
										Generating...
									{:else}
										<Download class="w-4 h-4" />
										PDF Report
									{/if}
								</button>
							</div>
						</div>
					</div>

					<!-- Content -->
					<div class="p-6">
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<!-- Left Column -->
							<div class="space-y-6">
								<!-- Legal Standing -->
								<div class="p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
									<div class="flex items-center gap-3 mb-2">
										<Scale class="w-5 h-5 text-gray-600" />
										<h4 class="font-semibold text-gray-900">Legal Standing</h4>
									</div>
									<p class="text-gray-700 font-medium">{scenario.legalStanding}</p>
								</div>

								<!-- Timeline & Cost -->
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div class="p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50">
										<div class="flex items-center gap-2 mb-2">
											<Clock class="w-4 h-4 text-yellow-600" />
											<h4 class="font-semibold text-yellow-800">Timeframe</h4>
										</div>
										<p class="text-yellow-700 font-medium">{scenario.timeframe}</p>
									</div>
									<div class="p-4 rounded-xl border-2 border-green-200 bg-green-50">
										<div class="flex items-center gap-2 mb-2">
											<DollarSign class="w-4 h-4 text-green-600" />
											<h4 class="font-semibold text-green-800">Est. Cost</h4>
										</div>
										<p class="text-green-700 font-medium">{scenario.estimatedCost}</p>
									</div>
								</div>

								<!-- Key Risks -->
								<div class="p-4 rounded-xl border-2 border-red-200 bg-red-50">
									<h4 class="font-semibold text-red-800 mb-3 flex items-center gap-2">
										<AlertTriangle class="w-5 h-5" />
										Key Risks
									</h4>
									<ul class="space-y-2">
										{#each scenario.keyRisks as risk, index}
											<li class="flex items-start gap-2 text-red-700">
												<div class="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
												<span class="text-sm">{risk}</span>
											</li>
										{/each}
									</ul>
								</div>
							</div>

							<!-- Right Column -->
							<div class="space-y-6">
								<!-- Recommended Solutions -->
								<div class="p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50">
									<h4 class="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
										<CheckCircle class="w-5 h-5" />
										Recommended Solutions
									</h4>
									<ul class="space-y-3">
										{#each scenario.solutions as solution, index}
											<li class="flex items-start gap-3 text-yellow-700">
												<CheckCircle class="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
												<span class="text-sm font-medium">{solution}</span>
											</li>
										{/each}
									</ul>
								</div>

								<!-- Next Steps -->
								<div class="p-4 rounded-xl border-2 border-green-200 bg-green-50">
									<h4 class="font-semibold text-green-800 mb-3 flex items-center gap-2">
										<FileText class="w-5 h-5" />
										Immediate Next Steps
									</h4>
									<ol class="space-y-3">
										{#each scenario.nextSteps as step, index}
											<li class="flex items-start gap-3 text-green-700">
												<div class="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
													{index + 1}
												</div>
												<span class="text-sm font-medium">{step}</span>
											</li>
										{/each}
									</ol>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- No Results -->
		{#if filteredScenarios.length === 0}
			<div class="text-center py-12">
				<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Search class="w-8 h-8 text-gray-400" />
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">No scenarios found</h3>
				<p class="text-gray-600">Try adjusting your search terms or filters</p>
			</div>
		{/if}

		<!-- CTA Section -->
		<div class="mt-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 text-gray-900 text-center">
			<h3 class="text-2xl font-bold mb-4">Need Personalized Legal Advice?</h3>
			<p class="text-lg mb-6 opacity-90">
				Connect with experienced property lawyers for detailed consultation and legal assistance tailored to your specific situation.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<button class="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors cursor-pointer">
					Consult Legal Expert
				</button>
				<button class="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-900 hover:text-white transition-colors cursor-pointer">
					Download Complete Guide
				</button>
			</div>
		</div>
	</div>
</div>
