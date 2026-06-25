<script lang="ts">
	import { assessPropertyRisk } from "$lib/data/propertyScenarios";
	import { generatePDFReport } from "$lib/utils/pdfGenerator";
	import {
		AlertTriangle,
		CheckCircle,
		Clock,
		DollarSign,
		FileText,
		FileUser,
		FileCheck,
		Home,
		Scale,
		Users,
		LandPlot,
		ScrollText,
		Download,
		ArrowLeft,
		Lock,
		FileStack,
		UserRoundCheck,
		UsersRound,
		ContactRound,
		Gem,
		BookmarkCheck,
		ArrowRightLeft,
		Podcast,
		ShieldAlert
	} from "lucide-svelte";
	import FormLogo from "$lib/components/FormLogo.svelte";
	import Seo from "$lib/components/website/Seo.svelte";

	interface FormData {
		hasProperty: boolean | null;
		documentType: string;
		legalOwner: string;
		hasPossession: boolean | null;
		hasDispute: boolean | null;
		intent: string;
	}

	interface AssessmentResult {
		id: string;
		conditions: FormData;
		riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
		urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
		legalStanding?: string;
		timeframe?: string;
		estimatedCost?: string;
		keyRisks?: string[];
		solutions?: string[];
		nextSteps?: string[];
		supremeCourtReference?: string;
		supremeCourtImpact?: string;
		courtRulingReference?: string;
		courtRulingImpact?: string;
		scenarioCode?: string;
	}

	let formData = $state<FormData>({
		hasProperty: null,
		documentType: "",
		legalOwner: "",
		hasPossession: null,
		hasDispute: null,
		intent: ""
	});

	let assessment = $state<AssessmentResult | null>(null);
	let isLoading = $state(false);
	let isGeneratingPDF = $state(false);
	let errors = $state<Record<string, string>>({});
	let paymentSuccessful = $state(true);

	function navigateToHome() {
		if (typeof window !== "undefined") {
			window.history.back();
		}
	}

	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (formData.hasProperty !== null && !formData.documentType) {
			newErrors.documentType = "Please select the type of document you have";
		}

		if (formData.hasProperty !== null && !formData.legalOwner) {
			newErrors.legalOwner = "Please specify who is the legal owner";
		}

		if (!formData.intent) {
			newErrors.intent = "Please select your primary intent";
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		isLoading = true;

		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			const result = assessPropertyRisk(formData as any);

			let supremeCourtReference: string | null = null;
			let supremeCourtImpact: string | null = null;

			if (result.id.startsWith("SC_")) {
				const { getSupremeCourtReference } = await import("$lib/data/supremeCourtScenarios");
				const scReference = getSupremeCourtReference(result.id.replace("SC_", "SC-"));
				if (scReference) {
					supremeCourtReference = scReference.reference;
					supremeCourtImpact = scReference.impact;
				}
			}

			let courtRulingReference = result.courtRulingReference || null;
			let courtRulingImpact = result.courtRulingImpact || null;
			let scenarioCode = result.scenarioCode || null;

			assessment = {
				id: result.id,
				conditions: result.conditions as any,
				riskLevel: result.riskLevel,
				urgency: result.urgency,
				legalStanding: result.legalStanding,
				timeframe: result.timeframe,
				estimatedCost: result.estimatedCost,
				keyRisks: result.keyRisks,
				solutions: result.solutions,
				nextSteps: result.nextSteps,
				supremeCourtReference: supremeCourtReference || undefined,
				supremeCourtImpact: supremeCourtImpact || undefined,
				courtRulingReference: courtRulingReference || undefined,
				courtRulingImpact: courtRulingImpact || undefined,
				scenarioCode: scenarioCode || undefined
			};

			setTimeout(() => {
				document.getElementById("assessment-results")?.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
			}, 100);
		} catch (error) {
			console.error("Assessment failed:", error);
			errors = { general: "Assessment failed. Please try again." };
		} finally {
			isLoading = false;
		}
	}

	async function handleGeneratePDF() {
		if (!assessment || !paymentSuccessful) return;

		isGeneratingPDF = true;

		try {
			await new Promise((resolve) => setTimeout(resolve, 500));
			generatePDFReport(assessment);
		} catch (error) {
			console.error("PDF generation failed:", error);
			errors = {
				...errors,
				pdf: "Failed to generate PDF. Please try again."
			};
		} finally {
			isGeneratingPDF = false;
		}
	}

	function handleInputChange(field: keyof FormData, value: any) {
		formData = { ...formData, [field]: value };
		if (errors[field]) {
			const { [field]: removed, ...rest } = errors;
			errors = rest;
		}

		// Scroll to the next question section
		setTimeout(() => {
			let nextSectionId: string | null = null;
			if (field === "hasProperty" && value !== null) {
				nextSectionId = "document-type";
			} else if (field === "documentType" && value) {
				nextSectionId = "legal-owner";
			} else if (field === "legalOwner" && value) {
				nextSectionId = "has-possession";
			} else if (field === "hasPossession" && value !== null) {
				nextSectionId = "has-dispute";
			} else if (field === "hasDispute" && value !== null) {
				nextSectionId = "intent";
			} else if (field === "intent" && value !== null) {
				nextSectionId = "submit";
			}

			if (nextSectionId) {
				const nextSection = document.getElementById(nextSectionId);
				if (nextSection) {
					nextSection.scrollIntoView({
						behavior: "smooth",
						block: "start"
					});
				}
			}
		}, 100);
	}

	function getRiskColor(level: string) {
		switch (level) {
			case "LOW":
				return "text-green-600 bg-green-50 border-green-200";
			case "MEDIUM":
				return "text-yellow-600 bg-yellow-50 border-yellow-200";
			case "HIGH":
				return "text-orange-600 bg-orange-50 border-orange-200";
			case "CRITICAL":
				return "text-red-600 bg-red-50 border-red-200";
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	}

	function getUrgencyColor(urgency: string) {
		switch (urgency) {
			case "LOW":
				return "text-green-500";
			case "MEDIUM":
				return "text-yellow-500";
			case "HIGH":
				return "text-orange-500";
			case "IMMEDIATE":
				return "text-red-600";
			default:
				return "text-gray-500";
		}
	}
</script>

<Seo
	type="WebPage"
	title="Property Ownership Risk Assessment Form"
	image="/images/home-scheme.jpg"
	description="Verify your property title status against Supreme Court of India guidelines."
	keywords="property risk assessment form, property title test, Suraj Lamp ruling check"
/>

<div class="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-gray-50 font-sans py-8">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
		<button
			onclick={navigateToHome}
			class="inline-flex items-center gap-2 text-sm text-[var(--form-text-secondary)] hover:text-black mb-6 transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			Go Back
		</button>

		<div class="bg-white rounded-2xl shadow-xl border border-[var(--form-border)] overflow-hidden relative">
			<div class="flex flex-col px-6 py-6 bg-gray-50 border-b border-[var(--form-border)] relative">
				<div class="absolute right-6 top-6 hidden sm:block">
					<FormLogo />
				</div>
				<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
					Property Risk Assessment
				</h1>
				<p class="text-sm text-[var(--form-text-secondary)] mt-1">
					Analyze document validity under Indian property laws.
				</p>
			</div>

			<form onsubmit={handleSubmit} class="p-6 space-y-8">
				{#if errors.general}
					<div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
						<AlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0" />
						<p class="text-sm text-red-700 font-medium">{errors.general}</p>
					</div>
				{/if}

				<!-- Question 1: Do you own/possess property -->
				<div id="has-property" class="space-y-4">
					<label class="block text-base font-semibold text-gray-900">
						Do you currently own or possess a property?
					</label>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<button
							type="button"
							onclick={() => handleInputChange("hasProperty", true)}
							class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasProperty === true ? 'border-green-500 bg-green-50/50 text-green-700' : 'border-gray-200 text-gray-700'}"
						>
							<Home class="w-5 h-5 shrink-0" />
							<span class="font-medium">I own and also possess property</span>
						</button>
						<button
							type="button"
							onclick={() => handleInputChange("hasProperty", false)}
							class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasProperty === false ? 'border-yellow-500 bg-yellow-50/50 text-yellow-700' : 'border-gray-200 text-gray-700'}"
						>
							<Users class="w-5 h-5 shrink-0" />
							<span class="font-medium">I own but do not possess property</span>
						</button>
					</div>
				</div>

				<!-- Question 2: Document Type -->
				{#if formData.hasProperty !== null}
					<div id="document-type" class="space-y-4 pt-4 border-t border-gray-100">
						<label class="block text-base font-semibold text-gray-900">
							What type of document do you have? *
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each [
								{ value: "registered_sale_deed", label: "Registered Sale Deed", icon: FileText },
								{ value: "gpa_agreement", label: "GPA/Agreement to Sell", icon: FileUser },
								{ value: "builder_buyer_agreement", label: "Builder-Buyer Agreement", icon: FileCheck },
								{ value: "inherited", label: "Inherited Property", icon: LandPlot },
								{ value: "mutation_only", label: "Only Mutation/Patta", icon: ScrollText },
								{ value: "other", label: "Other Documents", icon: FileStack }
							] as { value, label, icon }}
								<button
									type="button"
									onclick={() => handleInputChange("documentType", value)}
									class="px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.documentType === value ? 'border-yellow-500 bg-yellow-50/50 text-yellow-800 font-medium' : 'border-gray-200 text-gray-700'}"
								>
									<svelte:component this={icon} class="w-5 h-5 shrink-0 text-gray-500" />
									<span>{label}</span>
								</button>
							{/each}
						</div>
						{#if errors.documentType}
							<p class="text-red-600 text-xs flex items-center gap-1.5 mt-1 font-medium">
								<AlertTriangle class="w-4 h-4" />
								{errors.documentType}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Question 3: Legal Owner -->
				{#if formData.documentType}
					<div id="legal-owner" class="space-y-4 pt-4 border-t border-gray-100">
						<label class="block text-base font-semibold text-gray-900">
							Who is the legal owner as per documents? *
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each [
								{ value: "self", label: "Myself", icon: UserRoundCheck },
								{ value: "parent_spouse", label: "Parent/Spouse", icon: UsersRound },
								{ value: "seller_name", label: "Seller's Name", icon: ContactRound },
								{ value: "other_family", label: "Other Family Member", icon: Gem }
							] as { value, label, icon }}
								<button
									type="button"
									onclick={() => handleInputChange("legalOwner", value)}
									class="px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.legalOwner === value ? 'border-yellow-500 bg-yellow-50/50 text-yellow-800 font-medium' : 'border-gray-200 text-gray-700'}"
								>
									<svelte:component this={icon} class="w-5 h-5 shrink-0 text-gray-500" />
									<span>{label}</span>
								</button>
							{/each}
						</div>
						{#if errors.legalOwner}
							<p class="text-red-600 text-xs flex items-center gap-1.5 mt-1 font-medium">
								<AlertTriangle class="w-4 h-4" />
								{errors.legalOwner}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Question 4: Physical Possession -->
				{#if formData.legalOwner}
					<div id="has-possession" class="space-y-4 pt-4 border-t border-gray-100">
						<label class="block text-base font-semibold text-gray-900">
							Do you have physical possession of the property?
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<button
								type="button"
								onclick={() => handleInputChange("hasPossession", true)}
								class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasPossession === true ? 'border-green-500 bg-green-50/50 text-green-700' : 'border-gray-200 text-gray-700'}"
							>
								<CheckCircle class="w-5 h-5 shrink-0" />
								<span class="font-medium">Yes, I have possession</span>
							</button>
							<button
								type="button"
								onclick={() => handleInputChange("hasPossession", false)}
								class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasPossession === false ? 'border-red-500 bg-red-50/50 text-red-700' : 'border-gray-200 text-gray-700'}"
							>
								<Clock class="w-5 h-5 shrink-0" />
								<span class="font-medium">No, awaiting possession</span>
							</button>
						</div>
					</div>
				{/if}

				<!-- Question 5: Ongoing disputes -->
				{#if formData.hasPossession !== null}
					<div id="has-dispute" class="space-y-4 pt-4 border-t border-gray-100">
						<label class="block text-base font-semibold text-gray-900">
							Is there any ongoing legal dispute regarding this property?
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<button
								type="button"
								onclick={() => handleInputChange("hasDispute", false)}
								class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasDispute === false ? 'border-green-500 bg-green-50/50 text-green-700' : 'border-gray-200 text-gray-700'}"
							>
								<CheckCircle class="w-5 h-5 shrink-0" />
								<span class="font-medium">No disputes</span>
							</button>
							<button
								type="button"
								onclick={() => handleInputChange("hasDispute", true)}
								class="px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.hasDispute === true ? 'border-red-500 bg-red-50/50 text-red-700' : 'border-gray-200 text-gray-700'}"
							>
								<AlertTriangle class="w-5 h-5 shrink-0" />
								<span class="font-medium">Yes, there are disputes</span>
							</button>
						</div>
					</div>
				{/if}

				<!-- Question 6: Intent -->
				{#if formData.hasDispute !== null}
					<div id="intent" class="space-y-4 pt-4 border-t border-gray-100">
						<label class="block text-base font-semibold text-gray-900">
							What is your primary intent? *
						</label>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each [
								{ value: "check_status", label: "Check ownership status", icon: BookmarkCheck },
								{ value: "regularize", label: "Regularize ownership", icon: FileCheck },
								{ value: "sell", label: "Sell the property", icon: Home },
								{ value: "transfer", label: "Transfer to family", icon: ArrowRightLeft },
								{ value: "get_advice", label: "Get legal advice", icon: Podcast }
							] as { value, label, icon }}
								<button
									type="button"
									onclick={() => handleInputChange("intent", value)}
									class="px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 hover:border-gray-300 {formData.intent === value ? 'border-yellow-500 bg-yellow-50/50 text-yellow-800 font-medium' : 'border-gray-200 text-gray-700'}"
								>
									<svelte:component this={icon} class="w-5 h-5 shrink-0 text-gray-500" />
									<span>{label}</span>
								</button>
							{/each}
						</div>
						{#if errors.intent}
							<p class="text-red-600 text-xs flex items-center gap-1.5 mt-1 font-medium">
								<AlertTriangle class="w-4 h-4" />
								{errors.intent}
							</p>
						{/if}
					</div>
				{/if}

				<!-- Submit Button -->
				{#if formData.intent}
					<div id="submit" class="pt-6 border-t border-gray-100">
						<button
							type="submit"
							disabled={isLoading}
							class="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
						>
							{#if isLoading}
								<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
								Analyzing Legal standing...
							{:else}
								<Scale class="w-5 h-5" />
								Get Instant Risk Assessment
							{/if}
						</button>
					</div>
				{/if}
			</form>
		</div>

		<!-- Result Section -->
		{#if assessment}
			<div id="assessment-results" class="mt-12 bg-white rounded-2xl shadow-xl border border-[var(--form-border)] overflow-hidden">
				<div class="bg-black text-white px-6 py-5 flex items-center justify-between">
					<h2 class="text-lg font-bold flex items-center gap-2">
						<FileText class="w-5 h-5 text-yellow-400" />
						Risk Evaluation Result
					</h2>
					<button
						onclick={handleGeneratePDF}
						disabled={isGeneratingPDF}
						class="px-4 py-2 bg-yellow-400 text-black rounded-lg text-sm font-semibold hover:bg-yellow-500 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5"
					>
						{#if isGeneratingPDF}
							<div class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black"></div>
							Generating...
						{:else}
							<Download class="w-4 h-4" />
							Download PDF Report
						{/if}
					</button>
				</div>

				<div class="p-6 space-y-8">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="p-5 rounded-xl border-2 {getRiskColor(assessment.riskLevel)}">
							<div class="flex items-center gap-2 mb-2">
								<ShieldAlert class="w-5 h-5" />
								<span class="text-xs uppercase tracking-wider font-semibold">Ownership Threat Profile</span>
							</div>
							<p class="text-2xl font-bold">{assessment.riskLevel} RISK</p>
							<p class="text-sm mt-1.5 opacity-90 leading-relaxed">
								{#if assessment.riskLevel === "LOW"}Your document structure is standard and represents complete, legally compliant property ownership.{/if}
								{#if assessment.riskLevel === "MEDIUM"}Administrative or slight documentation gaps need to be regularized.{/if}
								{#if assessment.riskLevel === "HIGH"}Significant legal risks identified. Transfer deeds or proper registries are missing.{/if}
								{#if assessment.riskLevel === "CRITICAL"}Extremely high exposure. Ownership lacks backing of a valid sale deed or violates Supreme Court rules.{/if}
							</p>
						</div>

						<div class="p-5 rounded-xl border border-[var(--form-border)] bg-gray-50 flex flex-col justify-between">
							<div>
								<div class="flex items-center gap-2 mb-2 text-gray-700">
									<Scale class="w-5 h-5" />
									<span class="text-xs uppercase tracking-wider font-semibold">Judicial Standing</span>
								</div>
								<p class="text-gray-800 text-sm leading-relaxed">{assessment.legalStanding}</p>
							</div>
							{#if assessment.supremeCourtReference}
								<div class="mt-4 p-3.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
									<h4 class="font-bold text-yellow-800 mb-1 flex items-center gap-1">
										<CheckCircle class="w-3.5 h-3.5" />
										Suraj Lamp Precedent
									</h4>
									<p class="text-yellow-700 leading-normal">{assessment.supremeCourtReference}</p>
								</div>
							{/if}
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="p-5 rounded-xl border border-[var(--form-border)] bg-gray-50">
							<div class="flex items-center gap-2 text-gray-700 mb-2">
								<Clock class="w-5 h-5 {getUrgencyColor(assessment.urgency)}" />
								<span class="text-xs uppercase tracking-wider font-semibold">Urgency of Regularisation</span>
							</div>
							<p class="text-xl font-bold">{assessment.urgency}</p>
							<p class="text-xs text-[var(--form-text-secondary)] mt-1">Recommended timeframe for complete title resolution.</p>
						</div>

						<div class="p-5 rounded-xl border border-[var(--form-border)] bg-gray-50">
							<div class="flex items-center gap-2 text-gray-700 mb-2">
								<DollarSign class="w-5 h-5" />
								<span class="text-xs uppercase tracking-wider font-semibold">Budgetary Estimation</span>
							</div>
							<p class="text-xl font-bold">{assessment.estimatedCost}</p>
							<p class="text-xs text-[var(--form-text-secondary)] mt-1">Indicative cost for stamp duty and legal charges.</p>
						</div>
					</div>

					{#if assessment.keyRisks && assessment.keyRisks.length > 0}
						<div class="p-5 rounded-xl border border-red-200 bg-red-50/50">
							<h3 class="text-base font-bold text-red-900 mb-3 flex items-center gap-2">
								<AlertTriangle class="w-5 h-5 text-red-600" />
								Key Risks Identified
							</h3>
							<ul class="space-y-2 text-sm text-red-800">
								{#each assessment.keyRisks as risk}
									<li class="flex items-start gap-2.5">
										<span class="text-red-500 mt-1">•</span>
										<span>{risk}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if assessment.solutions && assessment.solutions.length > 0}
						<div class="p-5 rounded-xl border border-yellow-200 bg-yellow-50/40">
							<h3 class="text-base font-bold text-yellow-900 mb-3 flex items-center gap-2">
								<CheckCircle class="w-5 h-5 text-yellow-600" />
								Recommended Solutions
							</h3>
							<ul class="space-y-2 text-sm text-yellow-800">
								{#each assessment.solutions as solution}
									<li class="flex items-start gap-2.5">
										<span class="text-yellow-600 mt-1">✓</span>
										<span>{solution}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if assessment.nextSteps && assessment.nextSteps.length > 0}
						<div class="p-5 rounded-xl border border-green-200 bg-green-50/40">
							<h3 class="text-base font-bold text-green-950 mb-3 flex items-center gap-2">
								<FileText class="w-5 h-5 text-green-700" />
								Immediate Next Steps
							</h3>
							<ol class="space-y-3.5 text-sm text-green-900">
								{#each assessment.nextSteps as step, index}
									<li class="flex items-start gap-3">
										<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white text-[11px] font-bold mt-0.5">
											{index + 1}
										</span>
										<span class="leading-relaxed">{step}</span>
									</li>
								{/each}
							</ol>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
