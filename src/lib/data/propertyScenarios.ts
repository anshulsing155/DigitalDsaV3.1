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

export const propertyScenarios: ScenarioData[] = [
	{
		id: "PERFECT_OWNERSHIP",
		title: "Perfect Legal Ownership",
		description: "Property with registered sale deed in your name with full possession",
		conditions: {
			hasProperty: true,
			documentType: "registered_sale_deed",
			legalOwner: "self",
			hasPossession: true,
			hasDispute: false,
			intent: "check_status"
		},
		riskLevel: "LOW",
		legalStanding: "✅ Complete Legal Ownership - You are the rightful owner",
		urgency: "LOW",
		solutions: [
			"No immediate action required",
			"Keep documents safe and secure",
			"Consider comprehensive property insurance",
			"Update nomination for succession planning",
			"Maintain property tax payments"
		],
		timeframe: "N/A - Maintenance only",
		estimatedCost: "0 - 500 (for document copies)",
		keyRisks: ["Minimal - only document loss risk", "Property tax default risk"],
		nextSteps: [
			"Verify all documents are properly filed",
			"Get certified copies for safety",
			"Consider digital storage and backup",
			"Review property insurance coverage"
		]
	},

	{
		id: "GPA_PURCHASE_HIGH_RISK",
		title: "GPA Based Purchase - High Risk",
		description: "Property purchased through General Power of Attorney without registered sale deed",
		conditions: {
			hasProperty: true,
			documentType: "gpa_agreement",
			legalOwner: "seller_name",
			hasPossession: true,
			hasDispute: false,
			intent: "regularize"
		},
		riskLevel: "HIGH",
		legalStanding: "No Legal Ownership - Only possessory rights",
		urgency: "HIGH",
		solutions: [
			"Immediately get registered sale deed executed",
			"Verify seller's complete title chain",
			"Obtain encumbrance certificate for verification",
			"Execute fresh sale deed with proper stamp duty payment",
			"Clear all pending dues and taxes"
		],
		timeframe: "30-60 days",
		estimatedCost: "25,000 - 1,50,000 (stamp duty + registration + legal fees)",
		keyRisks: [
			"Cannot sell or mortgage property legally",
			"Seller can sell to another party",
			"Banks won't provide loans against property",
			"Future legal disputes with third parties",
			"No protection against seller's creditors"
		],
		nextSteps: [
			"Contact seller immediately for cooperation",
			"Arrange for sale deed registration",
			"Pay applicable stamp duty and registration fees",
			"Update mutation records with revenue department"
		]
	},

	{
		id: "INHERITED_NO_SUCCESSION",
		title: "Inherited Property Without Succession",
		description: "Property inherited from family member without proper legal heir documentation",
		conditions: {
			hasProperty: true,
			documentType: "inherited",
			legalOwner: "parent_spouse",
			hasPossession: true,
			hasDispute: false,
			intent: "transfer"
		},
		riskLevel: "MEDIUM",
		legalStanding: "Partial Rights - Need legal heir documentation",
		urgency: "MEDIUM",
		solutions: [
			"Obtain legal heir certificate from competent authority",
			"Get succession certificate from district court",
			"Execute gift deed or family settlement deed",
			"Update revenue records and mutation",
			"Clear any pending property taxes"
		],
		timeframe: "60-120 days",
		estimatedCost: "15,000 - 75,000",
		keyRisks: [
			"Other family members can claim rights",
			"Cannot transfer without proper documentation",
			"Delayed legal processes",
			"Potential family disputes"
		],
		nextSteps: [
			"Apply for legal heir certificate",
			"Gather family consent documents",
			"File for succession certificate if required",
			"Execute proper transfer deed"
		]
	},

	{
		id: "BUILDER_UNREGISTERED",
		title: "Builder Purchase - Unregistered",
		description: "Property purchased from builder with only agreement, awaiting conveyance deed",
		conditions: {
			hasProperty: true,
			documentType: "builder_buyer_agreement",
			legalOwner: "seller_name",
			hasPossession: true,
			hasDispute: false,
			intent: "regularize"
		},
		riskLevel: "HIGH",
		legalStanding: "No Legal Title - Only contractual rights",
		urgency: "HIGH",
		solutions: [
			"Demand registered sale deed from builder immediately",
			"Check builder's approvals and NOCs thoroughly",
			"Verify clear title with builder's documents",
			"Execute conveyance deed with proper registration",
			"Ensure RERA compliance and registration"
		],
		timeframe: "45-90 days",
		estimatedCost: "50,000 - 2,00,000",
		keyRisks: [
			"Builder financial distress or bankruptcy",
			"Pending approvals and clearances",
			"Multiple sales of same unit",
			"RERA compliance issues",
			"Construction quality problems"
		],
		nextSteps: [
			"Issue legal notice to builder for conveyance",
			"Check RERA registration and compliance",
			"Verify all statutory clearances",
			"Execute conveyance deed at earliest"
		]
	},

	{
		id: "DISPUTED_PROPERTY",
		title: "Property with Legal Dispute",
		description: "Property ownership under legal challenge with ongoing court proceedings",
		conditions: {
			hasProperty: true,
			documentType: "registered_sale_deed",
			legalOwner: "self",
			hasPossession: true,
			hasDispute: true,
			intent: "get_advice"
		},
		riskLevel: "CRITICAL",
		legalStanding: "Ownership Under Challenge - Legal intervention required",
		urgency: "IMMEDIATE",
		solutions: [
			"Hire experienced property lawyer immediately",
			"File counter-case or written statement as needed",
			"Collect all supporting documents and evidence",
			"Consider out-of-court settlement if viable",
			"Maintain detailed records of all proceedings"
		],
		timeframe: "6 months - 3 years",
		estimatedCost: "1,00,000 - 10,00,000",
		keyRisks: [
			"Property may be attached by court",
			"Cannot sell until dispute resolved",
			"High legal costs and time consumption",
			"Uncertain outcome",
			"Stress and mental harassment"
		],
		nextSteps: [
			"Engage senior advocate immediately",
			"File appropriate legal response",
			"Gather all evidence and documents",
			"Explore mediation and settlement options"
		]
	},

	{
		id: "MUTATION_ONLY",
		title: "Mutation Only - No Sale Deed",
		description: "Property showing in revenue records but no registered sale deed available",
		conditions: {
			hasProperty: true,
			documentType: "mutation_only",
			legalOwner: "self",
			hasPossession: true,
			hasDispute: false,
			intent: "regularize"
		},
		riskLevel: "CRITICAL",
		legalStanding: "No Legal Ownership - Mutation doesn't confer title",
		urgency: "IMMEDIATE",
		solutions: [
			"Trace back to original registered sale deed",
			"Execute fresh sale deed with proper title chain",
			"Clear all encumbrances and pending dues",
			"Get title validated by experienced lawyer",
			"Ensure proper stamp duty payment"
		],
		timeframe: "90-180 days",
		estimatedCost: "75,000 - 3,00,000",
		keyRisks: [
			"Complete lack of legal title",
			"Original seller may not cooperate",
			"Complex title chain issues",
			"High stamp duty burden",
			"Revenue department complications"
		],
		nextSteps: [
			"Conduct comprehensive title search",
			"Identify rightful seller or grantor",
			"Execute proper registered sale deed",
			"Clear all legal formalities"
		]
	},

	{
		id: "PLANNING_TO_BUY",
		title: "Planning to Buy - Due Diligence",
		description: "Prospective buyer seeking guidance for safe property purchase",
		conditions: {
			hasProperty: false,
			documentType: "",
			legalOwner: "",
			hasPossession: false,
			hasDispute: false,
			intent: "get_advice"
		},
		riskLevel: "LOW",
		legalStanding: "Safe Position - Can ensure proper purchase",
		urgency: "LOW",
		solutions: [
			"Conduct thorough due diligence before purchase",
			"Verify seller's complete title chain",
			"Check for encumbrances and pending dues",
			"Ensure registered sale deed execution only",
			"Verify all statutory approvals and NOCs"
		],
		timeframe: "15-30 days for verification",
		estimatedCost: "5,00,000 - 25,000 (for verification)",
		keyRisks: ["Minimal - prevention is possible with proper due diligence"],
		nextSteps: [
			"Get comprehensive title search done",
			"Verify all NOCs and statutory approvals",
			"Check encumbrance certificate thoroughly",
			"Ensure proper documentation and registration"
		]
	},

	{
		id: "SELLING_NO_DOCS",
		title: "Want to Sell - No Proper Documents",
		description: "Planning to sell property but lacking proper legal documentation",
		conditions: {
			hasProperty: true,
			documentType: "gpa_agreement",
			legalOwner: "seller_name",
			hasPossession: true,
			hasDispute: false,
			intent: "sell"
		},
		riskLevel: "CRITICAL",
		legalStanding: " Cannot Sell - No legal title to transfer",
		urgency: "IMMEDIATE",
		solutions: [
			"STOP all sale proceedings immediately",
			"First get registered sale deed in your name",
			"Clear complete title chain",
			"Pay all pending dues and taxes",
			"Then proceed with sale to buyer"
		],
		timeframe: "60-120 days before you can sell",
		estimatedCost: "1,00,000 - 5,00,000",
		keyRisks: [
			"Buyer can cancel and claim damages",
			"Legal action by disappointed buyer",
			"Title defect issues",
			"Financial losses and reputation damage"
		],
		nextSteps: [
			"Halt all sale activities immediately",
			"Regularize ownership documentation first",
			"Get clear and marketable title",
			"Then market the property properly"
		]
	},

	{
		id: "NO_POSSESSION",
		title: "No Possession Despite Payment",
		description: "Paid for property but builder/seller not giving possession",
		conditions: {
			hasProperty: true,
			documentType: "builder_buyer_agreement",
			legalOwner: "seller_name",
			hasPossession: false,
			hasDispute: false,
			intent: "get_advice"
		},
		riskLevel: "HIGH",
		legalStanding: " Contractual Rights Only - No ownership or possession",
		urgency: "HIGH",
		solutions: [
			"Issue legal notice for immediate possession",
			"Check project completion and approval status",
			"File complaint with RERA authority",
			"Consider legal action for possession and damages",
			"Explore consumer court remedies"
		],
		timeframe: "90-180 days",
		estimatedCost: "50,000 - 2,00,000",
		keyRisks: [
			"Project may be permanently stalled",
			"Builder financial distress",
			"No physical or legal control",
			"Investment completely at risk"
		],
		nextSteps: [
			"Demand possession with legal notice",
			"File RERA complaint immediately",
			"Issue legal notice for breach",
			"Consider consumer court case"
		]
	},

	{
		id: "FAMILY_TRANSFER",
		title: "Family Transfer Needed",
		description: "Property in family member's name, need to transfer to yourself",
		conditions: {
			hasProperty: true,
			documentType: "registered_sale_deed",
			legalOwner: "parent_spouse",
			hasPossession: true,
			hasDispute: false,
			intent: "transfer"
		},
		riskLevel: "LOW",
		legalStanding: " Legal Owner (Family) - Transfer possible",
		urgency: "LOW",
		solutions: [
			"Execute gift deed for family transfer",
			"Or execute family settlement deed",
			"Pay applicable stamp duty as per state laws",
			"Update mutation records with revenue department",
			"Consider tax implications of transfer"
		],
		timeframe: "15-30 days",
		estimatedCost: "10,000 - 1,00,000 (depends on property value)",
		keyRisks: [
			"Stamp duty implications",
			"Income tax consequences",
			"Potential family disputes"
		],
		nextSteps: [
			"Choose appropriate transfer method",
			"Calculate stamp duty liability",
			"Execute transfer deed properly",
			"Update all revenue records"
		]
	}
];

import { matchSupremeCourtScenario, getSupremeCourtReference } from './supremeCourtScenarios';

// Risk Assessment Logic
export function assessPropertyRisk(formData: any): ScenarioData {
	// First check for Supreme Court scenario matches
	const supremeCourtMatch = matchSupremeCourtScenario(formData);
	
	if (supremeCourtMatch) {
		// Convert Supreme Court scenario to ScenarioData format
		return {
			id: supremeCourtMatch.id,
			title: supremeCourtMatch.title,
			description: supremeCourtMatch.description,
			conditions: supremeCourtMatch.conditions,
			riskLevel: supremeCourtMatch.riskLevel,
			legalStanding: `${supremeCourtMatch.legalStanding} (${supremeCourtMatch.supremeCourtImpact})`,
			urgency: supremeCourtMatch.urgency,
			solutions: supremeCourtMatch.solutions,
			timeframe: supremeCourtMatch.timeframe,
			estimatedCost: supremeCourtMatch.estimatedCost,
			keyRisks: supremeCourtMatch.keyRisks,
			nextSteps: supremeCourtMatch.nextSteps
		};
	}

	// If no Supreme Court match, try the original scenarios
	// Find matching scenario based on form inputs
	const matchingScenario = propertyScenarios.find(scenario => {
		return (
			scenario.conditions.hasProperty === formData.hasProperty &&
			scenario.conditions.documentType === formData.documentType &&
			scenario.conditions.legalOwner === formData.legalOwner &&
			scenario.conditions.hasPossession === formData.hasPossession &&
			scenario.conditions.hasDispute === formData.hasDispute &&
			scenario.conditions.intent === formData.intent
		);
	});

	// If exact match not found, provide generic assessment
	if (!matchingScenario) {
		return {
			id: "CUSTOM_ASSESSMENT",
			title: "Custom Property Assessment",
			description: "Customized assessment based on your specific situation",
			conditions: formData,
			riskLevel: determineRiskLevel(formData),
			legalStanding: determineLegalStanding(formData),
			urgency: determineUrgency(formData),
			solutions: getGenericSolutions(formData),
			timeframe: "30-90 days",
			estimatedCost: "₹25,000 - ₹1,50,000",
			keyRisks: getGenericRisks(formData),
			nextSteps: getGenericNextSteps(formData)
		};
	}

	return matchingScenario;
}

// Helper functions for custom assessment
function determineRiskLevel(formData: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
	if (formData.hasDispute) return 'CRITICAL';
	if (formData.documentType === 'mutation_only') return 'CRITICAL';
	if (formData.documentType === 'gpa_agreement' && formData.legalOwner !== 'self') return 'HIGH';
	if (formData.documentType === 'builder_buyer_agreement' && !formData.hasPossession) return 'HIGH';
	if (formData.documentType === 'registered_sale_deed' && formData.legalOwner === 'self') return 'LOW';
	return 'MEDIUM';
}

function determineLegalStanding(formData: any): string {
	if (formData.documentType === 'registered_sale_deed' && formData.legalOwner === 'self') {
		return 'Complete Legal Ownership';
	}
	if (formData.documentType === 'gpa_agreement') {
		return 'No Legal Ownership - Only possessory rights';
	}
	if (formData.hasDispute) {
		return 'Ownership Under Challenge';
	}
	return 'Partial/Unclear Ownership Rights';
}

function determineUrgency(formData: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE' {
	if (formData.hasDispute) return 'IMMEDIATE';
	if (formData.intent === 'sell' && formData.documentType !== 'registered_sale_deed') return 'IMMEDIATE';
	if (formData.documentType === 'mutation_only') return 'IMMEDIATE';
	if (formData.documentType === 'gpa_agreement') return 'HIGH';
	return 'MEDIUM';
}

function getGenericSolutions(formData: any): string[] {
	const solutions = [];
	
	if (formData.documentType !== 'registered_sale_deed') {
		solutions.push('Get registered sale deed executed immediately');
	}
	if (formData.hasDispute) {
		solutions.push('Engage legal counsel for dispute resolution');
	}
	if (formData.legalOwner !== 'self') {
		solutions.push('Execute proper transfer deed');
	}
	if (!formData.hasPossession) {
		solutions.push('Take legal steps for possession');
	}
	
	return solutions.length > 0 ? solutions : ['Consult legal expert for detailed analysis'];
}

function getGenericRisks(formData: any): string[] {
	const risks = [];
	
	if (formData.documentType === 'gpa_agreement') {
		risks.push('Cannot sell/mortgage property', 'Seller can sell to another party');
	}
	if (formData.hasDispute) {
		risks.push('Property may be attached', 'High legal costs');
	}
	if (!formData.hasPossession) {
		risks.push('No physical control', 'Investment at risk');
	}
	
	return risks.length > 0 ? risks : ['Potential legal complications'];
}

function getGenericNextSteps(formData: any): string[] {
	return [
		'Conduct comprehensive legal review',
		'Gather all relevant documents',
		'Consult property law expert',
		'Take corrective action as advised'
	];
}