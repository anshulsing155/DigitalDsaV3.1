// Updated scenarios based on the 5 November 2024 Supreme Court ruling
// Key ruling: Registration alone is insufficient by itself—you must also establish the legal basis for ownership

export interface UpdatedCourtScenario {
  id: string;
  code: string;
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
  courtRulingImpact: string;
  solutions: string[];
  timeframe: string;
  estimatedCost: string;
  keyRisks: string[];
  nextSteps: string[];
  legalReference?: string;
}

export const updatedCourtRulingScenarios: UpdatedCourtScenario[] = [
  {
    id: "UC_01",
    code: "UC-01",
    title: "Registered Sale Deed with Possession & Payment Proof",
    description: "Property with registered sale deed in your name plus possession and payment proof - fully compliant with Supreme Court guidelines",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "check_status"
    },
    riskLevel: "LOW",
    legalStanding: "✅ Complete Legal Ownership - Fully protected by law",
    urgency: "LOW",
    courtRulingImpact: "Valid ownership; registration combined with supporting documents is confirmed by the Supreme Court as valid title",
    solutions: [
      "Ensure mutation is updated in revenue records",
      "Keep all documents safely secured",
      "Consider digital backup of property documentation",
      "Update any utility bills to reflect ownership",
      "Maintain property tax payments regularly"
    ],
    timeframe: "N/A - Maintenance only",
    estimatedCost: "₹0 - ₹1,00,000 (stamp duty, registration, legal fees)",
    keyRisks: [
      "Minimal risk - only document loss or damage", 
      "Property tax default risk if not maintained"
    ],
    nextSteps: [
      "Verify all property records are consistently updated",
      "Get certified copies for safety",
      "Maintain digital backup of property papers",
      "Ensure mutation and utility records show your name"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024, Civil Appeal No. 78629/1992): 'Registration combined with legal basis for ownership and possession establishes valid title.'"
  },
  
  {
    id: "UC_02",
    code: "UC-02",
    title: "Sale Deed Registered in Another's Name but You Have Possession",
    description: "Property with registered sale deed in someone else's name, but you are in possession",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "transfer"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Partial Legal Standing - Possession without registered ownership in your name",
    urgency: "MEDIUM",
    courtRulingImpact: "Registration alone is not enough; you must establish legal right through proper transfer documentation",
    solutions: [
      "Draft and execute a Gift Deed or Sale Deed in your favor",
      "Pay applicable stamp duty and registration fees",
      "Register the transfer deed properly",
      "Update mutation records after registration",
      "Document payment history and possession evidence"
    ],
    timeframe: "30-60 days",
    estimatedCost: "₹20,000 - ₹1,50,000 (depends on property value)",
    keyRisks: [
      "Current legal owner could dispute your claim",
      "Stamp duty and capital gains tax implications",
      "Property might face challenges during future transfers",
      "Possession without registered ownership has limited legal protection"
    ],
    nextSteps: [
      "Discuss transfer with current legal owner",
      "Consult lawyer for appropriate transfer document",
      "Calculate stamp duty and registration fees",
      "Execute and register transfer deed",
      "Update revenue records after registration"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'Registration must be accompanied by legal right to the property; mere registration is insufficient.'"
  },
  
  {
    id: "UC_03",
    code: "UC-03",
    title: "Only GPA or Agreement to Sell with Possession",
    description: "Property possession based only on GPA or unregistered Agreement to Sell document",
    conditions: {
      hasProperty: true,
      documentType: "gpa_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Supreme Court invalidates such transactions",
    urgency: "HIGH",
    courtRulingImpact: "Invalid ownership per SC; GPA or Agreement to Sell without registration provides no title",
    solutions: [
      "Execute a registered Sale Deed through owner immediately",
      "Gather all payment proof and possession documents",
      "Pay proper stamp duty and registration fees",
      "Verify clear title chain before registration",
      "Document possession history with evidence"
    ],
    timeframe: "30-90 days (critical)",
    estimatedCost: "₹75,000 - ₹2,50,000 (stamp duty, registration, legal fees)",
    keyRisks: [
      "No legal title under Supreme Court rulings",
      "Original owner could deny transaction or sell to others",
      "Banks will not provide loans or mortgages",
      "No protection against third-party claims",
      "Cannot legally sell or transfer the property"
    ],
    nextSteps: [
      "Contact the legal owner immediately for registration",
      "Draft proper sale deed with legal assistance",
      "Gather all payment proofs and possession evidence",
      "Pay stamp duty and register properly",
      "Update mutation records after registration"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'GPA or Agreement to Sell without registration cannot confer ownership. Registration plus legal basis for right is essential.'"
  },
  
  {
    id: "UC_04",
    code: "UC-04",
    title: "Builder-Buyer Agreement Only with Occupation",
    description: "Property bought from builder with only Builder-Buyer agreement, registry pending, but in occupation",
    conditions: {
      hasProperty: true,
      documentType: "builder_buyer_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Title - Only contractual rights against builder",
    urgency: "HIGH",
    courtRulingImpact: "Registration process incomplete; builder-buyer agreement alone doesn't transfer ownership",
    solutions: [
      "Press builder to register conveyance/sale deed immediately",
      "Send formal demand notice for registration",
      "File complaint with RERA if builder delays",
      "Consider consumer court action if necessary",
      "Document all communications with builder"
    ],
    timeframe: "60-180 days",
    estimatedCost: "₹50,000 - ₹2,00,000 (legal fees and registration)",
    keyRisks: [
      "Builder could face financial distress/bankruptcy",
      "Multiple sales of same property possible",
      "No legal title despite possession",
      "Property might have regulatory/approval issues",
      "Legal recourse might be lengthy"
    ],
    nextSteps: [
      "Send formal notice to builder demanding registration",
      "Check RERA compliance and builder status",
      "Gather all payment proof and contract documents",
      "File RERA complaint if builder non-responsive",
      "Consult property lawyer for legal options"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024) + RERA Act: 'Builder must execute registered conveyance deed in favor of buyer; agreement to sell is not sufficient for ownership.'"
  },
  
  {
    id: "UC_05",
    code: "UC-05",
    title: "Inherited Property with Mutation Only",
    description: "Property inherited but only mutation done, no formal transfer deed executed",
    conditions: {
      hasProperty: true,
      documentType: "inherited",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Partial Rights - Mutation shows administrative record but not complete legal title",
    urgency: "MEDIUM",
    courtRulingImpact: "Possession and mutation are factors, but formal title documentation is incomplete per Supreme Court",
    solutions: [
      "Apply for legal heir certificate from competent authority",
      "Execute registered succession/partition deed",
      "Ensure all legal heirs consent or relinquish rights",
      "Update mutation records after legal documentation",
      "Document the chain of inheritance clearly"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹30,000 - ₹80,000",
    keyRisks: [
      "Other legal heirs may contest ownership",
      "Incomplete succession documentation challenges",
      "Future property transactions may be impeded",
      "Banks may refuse loans without proper documentation"
    ],
    nextSteps: [
      "Apply for legal heir/succession certificate",
      "Collect death certificate and property documents",
      "Draft partition/succession deed with lawyer",
      "Register the deed with proper stamp duty",
      "Update revenue records after registration"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'Mutation alone is insufficient; proper legal succession documentation is required for complete title.'"
  },
  
  {
    id: "UC_06",
    code: "UC-06",
    title: "Will-Based Claim Without Probate",
    description: "Property claim based on Will but probate and registration pending",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Incomplete Rights - Will requires probate and registration",
    urgency: "MEDIUM",
    courtRulingImpact: "Will is insufficient until probate and registration completed per Supreme Court requirements",
    solutions: [
      "Apply for probate of the Will in relevant court",
      "Complete succession certificate process if needed",
      "Address any objections from other potential heirs",
      "Register transfer after probate completion",
      "Update mutation records with probate order"
    ],
    timeframe: "6-12 months (court dependent)",
    estimatedCost: "₹40,000 - ₹1,50,000 (legal and court fees)",
    keyRisks: [
      "Will could be contested by other claimants",
      "Lengthy legal process with uncertain outcome",
      "Property transactions blocked during probate",
      "Cannot mortgage or sell until succession completed"
    ],
    nextSteps: [
      "Consult lawyer specialized in probate matters",
      "File probate petition with all supporting documents",
      "Notify all potential legal heirs as required",
      "Complete court process for succession",
      "Register transfer and update revenue records"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024) + Indian Succession Act: 'Will must be properly probated and registered to complete legal transfer of property.'"
  },
  
  {
    id: "UC_07",
    code: "UC-07",
    title: "Registered Sale Deed Without Mutation",
    description: "Registered Sale Deed present, but mutation not updated in revenue records",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "LOW",
    legalStanding: "Legal Owner - Administrative update needed",
    urgency: "LOW",
    courtRulingImpact: "Ownership valid with registered deed; mutation is administrative requirement",
    solutions: [
      "File mutation request with municipal/revenue office",
      "Submit registered sale deed with application",
      "Pay applicable fees for mutation process",
      "Follow up with revenue officials regularly",
      "Update property tax records simultaneously"
    ],
    timeframe: "30-90 days",
    estimatedCost: "₹2,000 - ₹10,000",
    keyRisks: [
      "Property tax bills may go to previous owner",
      "Administrative complications in records",
      "Minor delays in utility transfers and updates",
      "Discrepancy between legal and revenue records"
    ],
    nextSteps: [
      "Submit mutation application with all documents",
      "Pay required fees for the process",
      "Follow up weekly on application status",
      "Update address in all property documents",
      "Ensure tax records reflect new ownership"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'Mutation is administrative record but registration is primary evidence of ownership when coupled with legal right.'"
  },
  
  {
    id: "UC_08",
    code: "UC-08",
    title: "Sale Deed Lost but Registry Record Intact",
    description: "Sale deed physically lost but registry record exists with payment evidence",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "LOW",
    legalStanding: "Legal Owner - Documentation issue only",
    urgency: "LOW",
    courtRulingImpact: "Ownership valid per registry record; document loss doesn't affect legal standing",
    solutions: [
      "File FIR for lost property documents",
      "Apply for certified copy from registrar's office",
      "Publish public notice in newspapers (optional)",
      "Maintain registry extract and payment proofs",
      "Keep certified copy securely"
    ],
    timeframe: "15-45 days",
    estimatedCost: "₹2,00,000 - ₹10,00,000",
    keyRisks: [
      "Minor administrative delays in future transactions",
      "Additional verification steps when selling/mortgaging",
      "Temporary challenges in document verification"
    ],
    nextSteps: [
      "File police complaint for lost document",
      "Apply for certified copy from sub-registrar",
      "Keep payment proofs and possession evidence",
      "Create digital backup of all obtained documents",
      "Consider indemnity bond if required"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'Registry record is sufficient evidence when original document is lost, if supported by other evidence of legal right.'"
  },
  
  {
    id: "UC_09",
    code: "UC-09",
    title: "Adverse Possession Claim Under 12 Years",
    description: "Property possession claim without documentation for less than 12 years",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: true,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Title - Possession period insufficient for adverse claim",
    urgency: "HIGH",
    courtRulingImpact: "Supreme Court recognizes adverse possession only after 12+ years of open, continuous possession",
    solutions: [
      "Contact legal owner to formalize ownership",
      "Negotiate settlement for proper sale deed",
      "Document all evidence of possession period",
      "Consider legal opinion on possession status",
      "Register proper deed if agreement reached"
    ],
    timeframe: "Uncertain (depends on cooperation)",
    estimatedCost: "₹1,00,000 - ₹5,00,000 (legal and settlement)",
    keyRisks: [
      "Eviction possible with no legal recourse",
      "No legal defense against true owner's claim",
      "Cannot sell, mortgage or transfer property",
      "Investment completely at risk",
      "Adverse possession claims usually fail"
    ],
    nextSteps: [
      "Consult specialized adverse possession lawyer",
      "Document all evidence of possession and payment",
      "Consider out-of-court settlement with true owner",
      "Prepare for potential legal challenges",
      "Secure possession evidence while negotiating"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024) + Limitation Act: 'Adverse possession requires 12+ years of continuous, open possession hostile to the true owner's rights.'"
  },
  
  {
    id: "UC_10",
    code: "UC-10",
    title: "Government Allotment Letter Only",
    description: "Property with government allotment/allotment letter only, no conveyance deed",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Allottee Rights Only - Not complete legal ownership",
    urgency: "MEDIUM",
    courtRulingImpact: "Allotment ≠ ownership; registry and conveyance deed required per Supreme Court",
    solutions: [
      "Apply for conveyance deed from allotting authority",
      "Ensure all allotment conditions are fulfilled",
      "Pay applicable conversion/registration fees",
      "Complete registration process after conveyance",
      "Update revenue records after registration"
    ],
    timeframe: "90-180 days",
    estimatedCost: "₹50,000 - ₹1,50,000",
    keyRisks: [
      "Allotment could be cancelled for violations",
      "Authority may impose additional conditions",
      "Delays in government processing",
      "Building/usage restrictions may apply"
    ],
    nextSteps: [
      "Apply to authority for conveyance deed issuance",
      "Pay all outstanding dues to the authority",
      "Submit proof of adhering to all conditions",
      "Complete conveyance deed registration",
      "Update property records in all departments"
    ],
    legalReference: "Supreme Court Judgment (5 Nov 2024): 'Government allotment is preliminary right; complete ownership requires proper conveyance deed and registration.'"
  }
];

// Helper function to match a form submission to the most appropriate scenario
export function matchUpdatedCourtScenario(formData: any): UpdatedCourtScenario | null {
  // First try for exact match
  let matchingScenario = updatedCourtRulingScenarios.find(scenario => {
    return (
      scenario.conditions.hasProperty === formData.hasProperty &&
      scenario.conditions.documentType === formData.documentType &&
      scenario.conditions.legalOwner === formData.legalOwner &&
      scenario.conditions.hasPossession === formData.hasPossession &&
      scenario.conditions.hasDispute === formData.hasDispute &&
      scenario.conditions.intent === formData.intent
    );
  });

  // If no exact match, try partial match based on most critical factors
  // Order of importance: documentType > legalOwner > hasDispute > hasPossession > intent
  if (!matchingScenario) {
    matchingScenario = updatedCourtRulingScenarios.find(scenario => {
      return (
        scenario.conditions.documentType === formData.documentType &&
        scenario.conditions.legalOwner === formData.legalOwner &&
        scenario.conditions.hasDispute === formData.hasDispute
      );
    });
  }

  // If still no match, try with just documentType and legalOwner
  if (!matchingScenario) {
    matchingScenario = updatedCourtRulingScenarios.find(scenario => {
      return (
        scenario.conditions.documentType === formData.documentType &&
        scenario.conditions.legalOwner === formData.legalOwner
      );
    });
  }

  // Last resort - match just on document type
  if (!matchingScenario) {
    matchingScenario = updatedCourtRulingScenarios.find(scenario => {
      return scenario.conditions.documentType === formData.documentType;
    });
  }

  return matchingScenario;
}

// Get court ruling reference and impact for a specific scenario code
export function getUpdatedCourtReference(scenarioCode: string): { reference: string, impact: string } | null {
  const scenario = updatedCourtRulingScenarios.find(s => s.code === scenarioCode);
  if (scenario) {
    return {
      reference: scenario.legalReference || '',
      impact: scenario.courtRulingImpact || ''
    };
  }
  return null;
}
