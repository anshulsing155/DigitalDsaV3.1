// Supreme Court rulings-based property ownership scenarios
// Based on the landmark case: Suraj Lamp & Industries Pvt. Ltd. v. State of Haryana (2011)

export interface SupremeCourtScenario {
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
  supremeCourtImpact: string;
  solutions: string[];
  timeframe: string;
  estimatedCost: string;
  keyRisks: string[];
  nextSteps: string[];
  legalReference?: string;
}

export const supremeCourtPropertyScenarios: SupremeCourtScenario[] = [
  {
    id: "SC_01",
    code: "SC-01",
    title: "Registered Sale Deed in Buyer's Name",
    description: "Property with registered sale deed in your name - fully compliant with Supreme Court guidelines",
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
    supremeCourtImpact: "Compliant with Supreme Court rulings - No impact",
    solutions: [
      "No immediate action needed for title security",
      "Optional: verify mutation status in revenue records",
      "Keep documents safe and secure",
      "Consider comprehensive property insurance",
      "Maintain property tax payments regularly"
    ],
    timeframe: "N/A - Maintenance only",
    estimatedCost: "₹0 - ₹500 (for document copies)",
    keyRisks: [
      "Minimal - only document loss risk", 
      "Property tax default risk"
    ],
    nextSteps: [
      "Verify all documents are properly filed",
      "Get certified copies for safety",
      "Consider digital storage and backup of property papers",
      "Ensure mutation is complete in revenue records"
    ],
    legalReference: "Supreme Court Judgment (Suraj Lamp Industries, 2011): 'Registered sale deed is the only legally valid proof of property ownership.'"
  },
  
  {
    id: "SC_02",
    code: "SC-02",
    title: "Registered Sale Deed in Relative's Name",
    description: "Property with registered sale deed in family member's name, but you are in possession",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "transfer"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Legal Owner is Family Member - You have no legal title",
    urgency: "MEDIUM",
    supremeCourtImpact: "Non-compliant ownership structure - needs regularization",
    solutions: [
      "Execute Gift/Relinquishment deed to transfer property",
      "Pay applicable stamp duty as per state laws",
      "Register the transfer deed properly",
      "Update mutation records after registration",
      "Consider tax implications before transfer"
    ],
    timeframe: "30-45 days",
    estimatedCost: "₹15,000 - ₹1,00,000 (depends on property value)",
    keyRisks: [
      "Family disputes may arise during transfer",
      "Stamp duty and capital gains tax implications",
      "Property may be subject to legal claims by other relatives",
      "Possession without ownership has limited legal protection"
    ],
    nextSteps: [
      "Discuss transfer with legal owner",
      "Consult lawyer for appropriate deed (Gift/Sale/Release)",
      "Calculate stamp duty and registration fees",
      "Execute and register transfer deed",
      "Update revenue records after registration"
    ],
    legalReference: "Transfer of Property Act, 1882: 'Property ownership transfers require registered instrument, especially between family members.'"
  },
  
  {
    id: "SC_03",
    code: "SC-03",
    title: "Unregistered Agreement to Sell",
    description: "Property possession based only on unregistered Agreement to Sell document",
    conditions: {
      hasProperty: true,
      documentType: "gpa_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Supreme Court declares such transactions invalid",
    urgency: "HIGH",
    supremeCourtImpact: "Void per Supreme Court - Agreement to Sell without registration gives no ownership",
    solutions: [
      "Draft & execute a registered Sale Deed immediately",
      "Get seller's cooperation for proper registration",
      "Pay applicable stamp duty and registration fees",
      "Verify clear title chain before registration",
      "Ensure all property tax dues are cleared"
    ],
    timeframe: "30-60 days (critical)",
    estimatedCost: "₹50,000 - ₹2,00,000 (stamp duty, registration, legal fees)",
    keyRisks: [
      "No legal title under Supreme Court rulings",
      "Seller could sell property to someone else",
      "Banks will not finance or mortgage the property",
      "No protection against third-party claims",
      "Cannot legally sell or transfer the property"
    ],
    nextSteps: [
      "Contact seller immediately for registration",
      "Draft proper sale deed with lawyer's help",
      "Verify seller's title and authority to sell",
      "Pay stamp duty and register sale deed",
      "Update mutation records after registration"
    ],
    legalReference: "Suraj Lamp & Industries vs State of Haryana (2011): 'Transactions of immovable properties based on GPA, Agreement to Sell, Will, etc. do not convey title and do not amount to transfer.'"
  },
  
  {
    id: "SC_04",
    code: "SC-04",
    title: "GPA Only Transaction",
    description: "Property purchased using only General Power of Attorney without sale deed",
    conditions: {
      hasProperty: true,
      documentType: "gpa_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Only power of attorney rights",
    urgency: "HIGH",
    supremeCourtImpact: "Invalid per Suraj Lamp ruling - GPA cannot transfer ownership",
    solutions: [
      "Get registered sale deed executed by original owner",
      "Verify title chain completely before registration",
      "Pay full stamp duty and registration fees",
      "Ensure original owner is available and cooperative",
      "Update mutation records after proper registration"
    ],
    timeframe: "45-90 days (urgent)",
    estimatedCost: "₹75,000 - ₹2,50,000 (legal fees, stamp duty, registration)",
    keyRisks: [
      "GPA could be cancelled by original owner",
      "Original owner could sell to another buyer",
      "GPA does not survive death of original owner",
      "No protection against mortgage or liens",
      "Subsequent buyers will face title issues"
    ],
    nextSteps: [
      "Trace and contact the original titleholder",
      "Get legal consultation on GPA validation",
      "Draft proper sale deed for registration",
      "Pay applicable stamp duty and register",
      "Update revenue records after registration"
    ],
    legalReference: "Supreme Court (Suraj Lamp case): 'A power of attorney is not an instrument of transfer in regard to any right, title or interest in an immovable property.'"
  },
  
  {
    id: "SC_05",
    code: "SC-05",
    title: "Will-Based Property Claim",
    description: "Property claim based on Will but no registration or probate done",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "other_family",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "Contingent Rights Only - Will requires probate/legal validation",
    urgency: "HIGH",
    supremeCourtImpact: "Ownership not transferred by Will alone until legally processed",
    solutions: [
      "Apply for probate of Will in relevant court",
      "Obtain succession certificate if needed",
      "Clear objections from other legal heirs",
      "Transfer property via succession process",
      "Update mutation records in revenue department"
    ],
    timeframe: "6-12 months (court dependent)",
    estimatedCost: "₹50,000 - ₹2,00,000 (legal fees, court fees)",
    keyRisks: [
      "Will could be challenged by other claimants",
      "Lengthy legal process with uncertain outcome",
      "Possession may be challenged during process",
      "Cannot sell or mortgage until succession complete"
    ],
    nextSteps: [
      "Get legal opinion on Will's validity",
      "File probate petition in appropriate court",
      "Notify all potential legal heirs",
      "Complete legal succession process",
      "Update revenue records after court order"
    ],
    legalReference: "Indian Succession Act: 'A Will does not automatically transfer ownership until proper legal procedures are completed.'"
  },
  
  {
    id: "SC_06",
    code: "SC-06",
    title: "Builder-Buyer Agreement Without Registry",
    description: "Property bought from builder but only agreement exists, no sale deed registered yet",
    conditions: {
      hasProperty: true,
      documentType: "builder_buyer_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Only contractual rights against builder",
    urgency: "HIGH",
    supremeCourtImpact: "Incomplete transaction - Builder-Buyer Agreement doesn't transfer ownership",
    solutions: [
      "Demand registered sale deed/conveyance deed from builder",
      "Check builder's title and legal authority to sell",
      "Verify property has all regulatory approvals",
      "Ensure property is free from encumbrances",
      "Complete registration with proper stamp duty"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹1,00,000 - ₹3,00,000",
    keyRisks: [
      "Builder could face financial distress/bankruptcy",
      "Multiple sales of same property possible",
      "No protection against builder's creditors",
      "Property might have regulatory issues"
    ],
    nextSteps: [
      "Send formal demand notice to builder",
      "Check RERA compliance and builder status",
      "Engage lawyer for sale deed execution",
      "Pay stamp duty and register deed",
      "File RERA complaint if builder non-cooperative"
    ],
    legalReference: "Real Estate (Regulation and Development) Act, 2016: 'Builders must execute registered conveyance deed in favor of buyer.'"
  },
  
  {
    id: "SC_07",
    code: "SC-07",
    title: "Inherited Property with Mutation",
    description: "Property inherited through succession, mutation done, but no sale deed",
    conditions: {
      hasProperty: true,
      documentType: "inherited",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "check_status"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Partial Legal Standing - Succession needs formal documentation",
    urgency: "MEDIUM",
    supremeCourtImpact: "Exempt from sale deed requirement if proper legal heir documentation exists",
    solutions: [
      "Obtain legal heirship certificate from court",
      "Verify mutation entry is correct and complete",
      "Consider registered family settlement deed",
      "Ensure all co-heirs have consented/relinquished claims",
      "Keep all death certificates and succession documents"
    ],
    timeframe: "30-90 days",
    estimatedCost: "₹15,000 - ₹50,000",
    keyRisks: [
      "Claims from other potential heirs possible",
      "Incomplete succession documentation",
      "Title challenges during future sale",
      "Mortgage/loan difficulties without clear title"
    ],
    nextSteps: [
      "Verify mutation reflects correct ownership share",
      "Apply for succession/legal heir certificate",
      "Document consent of all legal heirs",
      "Consider a family settlement deed if multiple heirs"
    ],
    legalReference: "Indian Succession Act: 'Property passes to legal heirs as per applicable succession laws upon death of owner.'"
  },
  
  {
    id: "SC_08",
    code: "SC-08",
    title: "Unregistered Gift Deed",
    description: "Property received as gift but gift deed not registered properly",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Unregistered gift is invalid",
    urgency: "HIGH",
    supremeCourtImpact: "Gift not valid unless registered with proper stamp duty",
    solutions: [
      "Execute a fresh registered Gift Deed immediately",
      "Pay applicable stamp duty as per state laws",
      "Ensure donor has clear title to gift property",
      "Check for any restrictions on gift transfer",
      "Register gift deed with proper witnesses"
    ],
    timeframe: "15-45 days",
    estimatedCost: "₹25,000 - ₹75,000 (plus stamp duty based on property value)",
    keyRisks: [
      "Gift could be challenged by donor",
      "Other family members might contest",
      "No legal ownership without registration",
      "Tax implications for both donor and donee"
    ],
    nextSteps: [
      "Draft proper gift deed with legal assistance",
      "Get donor's consent and participation",
      "Pay stamp duty and registration fees",
      "Register gift deed at sub-registrar office",
      "Update revenue records after registration"
    ],
    legalReference: "Transfer of Property Act, Section 123: 'Gift of immovable property must be by registered instrument signed by the donor and attested by at least two witnesses.'"
  },
  
  {
    id: "SC_09",
    code: "SC-09",
    title: "Notarized Agreement Only",
    description: "Property possession based only on notarized agreement without registration",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Ownership - Notarization doesn't replace registration",
    urgency: "HIGH",
    supremeCourtImpact: "Not valid per Supreme Court - Notarized documents don't transfer title",
    solutions: [
      "Execute proper registered sale deed immediately",
      "Pay full stamp duty and registration fees",
      "Ensure seller still agrees to cooperate",
      "Verify clear title chain before registration",
      "Update revenue records after registration"
    ],
    timeframe: "30-60 days (urgent)",
    estimatedCost: "₹50,000 - ₹2,00,000 (legal fees, stamp duty)",
    keyRisks: [
      "Seller could deny transaction or demand more money",
      "No legal protection against third-party claims",
      "Cannot legally sell or mortgage the property",
      "Seller could sell to another buyer legally"
    ],
    nextSteps: [
      "Contact seller for proper sale deed execution",
      "Prepare for full stamp duty payment",
      "Draft sale deed with legal assistance",
      "Complete registration at sub-registrar office",
      "Apply for mutation in revenue records"
    ],
    legalReference: "Registration Act, 1908: 'Documents related to immovable property transactions must be registered to be legally valid.'"
  },
  
  {
    id: "SC_10",
    code: "SC-10",
    title: "Registry Denied Due to Disputes/Dues",
    description: "Sale deed executed but registration rejected due to outstanding dues or disputes",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: true,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "Incomplete Ownership - Registration pending due to issues",
    urgency: "HIGH",
    supremeCourtImpact: "Transfer incomplete until registered properly",
    solutions: [
      "Clear all pending dues and disputes immediately",
      "Obtain no-objection certificates from relevant authorities",
      "Re-submit for registration with proper documentation",
      "Consider legal action if disputes are unjustified",
      "Ensure seller cooperation through entire process"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹1,00,000 - ₹3,00,000 (including dispute resolution)",
    keyRisks: [
      "Registration might be permanently rejected",
      "Seller could backtrack on commitment",
      "Disputes might escalate during resolution",
      "Property could be attached by authorities for dues"
    ],
    nextSteps: [
      "Identify exact reason for registration rejection",
      "Clear all dues with proof of payment",
      "Resolve disputes through appropriate channels",
      "Re-apply for registration with complete documents",
      "Get property mutation done after registration"
    ],
    legalReference: "Registration Act, 1908: 'Registration may be refused if property has encumbrances or legal restrictions.'"
  },
  
  {
    id: "SC_11",
    code: "SC-11",
    title: "Paid But Not Registered Property",
    description: "Full payment made to seller but property still registered in seller's name",
    conditions: {
      hasProperty: true,
      documentType: "gpa_agreement",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "No Legal Title - Only contractual claim against seller",
    urgency: "HIGH",
    supremeCourtImpact: "No legal ownership without registered deed despite payment",
    solutions: [
      "Get registered sale deed executed immediately",
      "If seller uncooperative, send legal notice",
      "Consider specific performance suit in court",
      "Document all payments and communications",
      "Complete registration with proper stamp duty"
    ],
    timeframe: "30-60 days (if cooperative); 1-3 years (if litigation)",
    estimatedCost: "₹50,000 - ₹3,00,000",
    keyRisks: [
      "Risk of fraudulent resale by seller",
      "No legal defense against third-party claims",
      "No eligibility for home loans or mortgages",
      "Possession could be challenged legally"
    ],
    nextSteps: [
      "Send formal notice to seller for registration",
      "Prepare complete sale deed documents",
      "Arrange for stamp duty and registration fees",
      "File court case if seller refuses to cooperate",
      "Secure all proofs of payment and agreements"
    ],
    legalReference: "Supreme Court: 'Mere payment of consideration does not transfer ownership without registration.'"
  },
  
  {
    id: "SC_12",
    code: "SC-12",
    title: "Court Decree Without Registration",
    description: "Property awarded by court decree but not yet registered in your name",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Decree Holder Rights - Needs execution for complete ownership",
    urgency: "MEDIUM",
    supremeCourtImpact: "Court decree must be executed via proper registration",
    solutions: [
      "Apply for execution of decree in court",
      "Get decree registered at sub-registrar office",
      "Pay applicable stamp duty and registration fees",
      "Update revenue records with court order",
      "Ensure mutation reflects court decision"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹30,000 - ₹1,00,000",
    keyRisks: [
      "Decree could be appealed in higher court",
      "Execution delays common in legal system",
      "Registration complications with older decrees",
      "Third party might claim during execution"
    ],
    nextSteps: [
      "File execution petition if not already done",
      "Submit decree for registration with proper fees",
      "Get order for revenue officials to update records",
      "Complete mutation process with court order",
      "Secure certified copies of all documents"
    ],
    legalReference: "Civil Procedure Code: 'Court decrees regarding immovable property must be executed through proper registration.'"
  },
  
  {
    id: "SC_13",
    code: "SC-13",
    title: "Government Allotment Letter Only",
    description: "Property allotted by government authority with only allotment letter, no sale deed",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "seller_name",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Allottee Rights Only - Not complete ownership",
    urgency: "MEDIUM",
    supremeCourtImpact: "Allotment ≠ ownership until conveyance deed registered",
    solutions: [
      "Apply for conveyance deed from allotting authority",
      "Submit all required documentation and fees",
      "Pay applicable stamp duty for registration",
      "Register conveyance deed at sub-registrar office",
      "Update mutation records after registration"
    ],
    timeframe: "90-180 days",
    estimatedCost: "₹50,000 - ₹1,50,000",
    keyRisks: [
      "Authority may impose additional conditions",
      "Delays common in government processes",
      "Allotment could be cancelled for violations",
      "Building/usage restrictions may apply"
    ],
    nextSteps: [
      "Apply to authority for conveyance deed",
      "Ensure all allotment conditions are fulfilled",
      "Pay all dues to the allotting authority",
      "Complete conveyance deed registration",
      "Update property records in all departments"
    ],
    legalReference: "Various State Land/Development Authority Acts: 'Allotment letter grants provisional rights until final conveyance.'"
  },
  
  {
    id: "SC_14",
    code: "SC-14",
    title: "Power of Attorney Used for Third-Party Sale",
    description: "Property purchased from someone holding only power of attorney from original owner",
    conditions: {
      hasProperty: true,
      documentType: "gpa_agreement",
      legalOwner: "other_family",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "CRITICAL",
    legalStanding: "No Legal Ownership - GPA sales declared invalid by Supreme Court",
    urgency: "IMMEDIATE",
    supremeCourtImpact: "Such sales explicitly invalidated by Suraj Lamp judgment",
    solutions: [
      "Trace and contact the actual original owner",
      "Get proper sale deed executed by original owner",
      "If original owner deceased, contact legal heirs",
      "Consider legal recourse against GPA holder",
      "Complete proper registration with actual owner"
    ],
    timeframe: "6-24 months (complex process)",
    estimatedCost: "₹2,00,000 - ₹10,00,000",
    keyRisks: [
      "Original owner may disavow transaction",
      "Multiple sales by GPA holder possible",
      "Complete investment loss possible",
      "Possession could be legally challenged",
      "No legal remedy if original owner uncooperative"
    ],
    nextSteps: [
      "Conduct thorough title investigation",
      "Trace chain of ownership to actual owner",
      "Verify original GPA and its limitations",
      "Pursue original owner for deed execution",
      "Consult property litigation specialist"
    ],
    legalReference: "Supreme Court in Suraj Lamp: 'A GPA holder cannot validly transfer title to a third party. Such transactions are not legally valid.'"
  },
  
  {
    id: "SC_15",
    code: "SC-15",
    title: "Adverse Possession Claim",
    description: "Property possessed for many years without documents, claiming adverse possession",
    conditions: {
      hasProperty: true,
      documentType: "other",
      legalOwner: "other_family",
      hasPossession: true,
      hasDispute: true,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "Disputed Possession - Court validation required",
    urgency: "MEDIUM",
    supremeCourtImpact: "Valid only after 12+ years of open, continuous possession",
    solutions: [
      "Gather evidence of continuous possession (12+ years)",
      "File declaratory suit for adverse possession",
      "Prove possession was open, continuous, exclusive",
      "Establish that possession was against true owner",
      "Get court decree establishing ownership"
    ],
    timeframe: "3-7 years (litigation process)",
    estimatedCost: "₹2,00,000 - ₹10,00,000",
    keyRisks: [
      "Very difficult to prove in court",
      "True owner can contest the claim",
      "Cannot sell/mortgage during pending case",
      "High risk of eviction if case lost"
    ],
    nextSteps: [
      "Collect all possession evidence (bills, tax receipts)",
      "Document history of possession with witnesses",
      "Consult specialized adverse possession lawyer",
      "Consider settlement with true owner if possible",
      "Prepare for lengthy legal battle"
    ],
    legalReference: "Limitation Act, 1963: 'A person in possession of immovable property for 12+ years continuously may claim ownership if possession was hostile to the actual owner.'"
  },
  
  {
    id: "SC_16",
    code: "SC-16",
    title: "Agricultural Land Conversion Issue",
    description: "Agricultural land purchased but sale done before conversion to non-agricultural",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "Questionable Title - May violate land ceiling/conversion laws",
    urgency: "HIGH",
    supremeCourtImpact: "May be void based on state agricultural land laws",
    solutions: [
      "Apply for post-facto land conversion if possible",
      "Check state-specific agricultural land laws",
      "Obtain NOC from revenue/agricultural department",
      "Regularize by paying applicable conversion fees",
      "Re-execute sale deed if necessary after conversion"
    ],
    timeframe: "6-18 months",
    estimatedCost: "₹1,00,000 - ₹5,00,000",
    keyRisks: [
      "Sale could be declared void by authorities",
      "Heavy penalties for land use violations",
      "Property might revert to original owner",
      "Building permissions may be denied"
    ],
    nextSteps: [
      "Check current land classification status",
      "Apply for proper conversion with authorities",
      "Pay conversion fees and penalties if applicable",
      "Regularize title with proper documentation",
      "Ensure compliance with all land ceiling acts"
    ],
    legalReference: "State Land Revenue Codes: 'Agricultural land cannot be transferred for non-agricultural use without prior conversion approval.'"
  },
  
  {
    id: "SC_17",
    code: "SC-17",
    title: "Corporate Purchase Issues",
    description: "Property purchased via company/trust without proper board resolution/authority",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "other_family",
      hasPossession: true,
      hasDispute: false,
      intent: "regularize"
    },
    riskLevel: "HIGH",
    legalStanding: "Irregular Corporate Title - Authority issues",
    urgency: "HIGH",
    supremeCourtImpact: "Invalid title, lacking proper corporate authorization",
    solutions: [
      "Get proper board resolution passed retroactively",
      "Ensure compliance with company's MOA/AOA",
      "Execute fresh deed with proper authorization",
      "Update corporate records to reflect property",
      "Register fresh deed with proper authority"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹1,00,000 - ₹3,00,000",
    keyRisks: [
      "Transaction could be ultra vires the company",
      "Stakeholders/shareholders could challenge",
      "Tax authorities may question transaction",
      "Personal liability for unauthorized actions"
    ],
    nextSteps: [
      "Review company/trust documents for authorization",
      "Hold proper board/trustee meeting for ratification",
      "Document proper authorization clearly",
      "Execute fresh deed if necessary",
      "Update corporate asset register"
    ],
    legalReference: "Companies Act: 'Property transactions by companies require proper authorization as per Articles of Association.'"
  },
  
  {
    id: "SC_18",
    code: "SC-18",
    title: "Multiple Heir Inheritance",
    description: "Inherited property with multiple legal heirs but no partition deed executed",
    conditions: {
      hasProperty: true,
      documentType: "inherited",
      legalOwner: "parent_spouse",
      hasPossession: true,
      hasDispute: false,
      intent: "transfer"
    },
    riskLevel: "MEDIUM",
    legalStanding: "Partial/Joint Ownership - Unclear individual rights",
    urgency: "MEDIUM",
    supremeCourtImpact: "Joint ownership valid, but sale impossible without all owners",
    solutions: [
      "Execute registered Partition Deed among all heirs",
      "OR get Relinquishment Deeds from other heirs",
      "Ensure proper stamp duty payment on market value",
      "Register partition/relinquishment deeds",
      "Update mutation records after partition"
    ],
    timeframe: "60-120 days",
    estimatedCost: "₹50,000 - ₹2,00,000",
    keyRisks: [
      "Disagreement among heirs during partition",
      "Some heirs may refuse to cooperate",
      "Partition ratio disputes common",
      "Property might not be physically divisible"
    ],
    nextSteps: [
      "Identify all legal heirs with documentation",
      "Hold family meeting to discuss partition",
      "Draft partition deed with legal assistance",
      "Get all heirs to execute the deed",
      "Register partition deed and update records"
    ],
    legalReference: "Hindu Succession Act/Indian Succession Act: 'Multiple legal heirs inherit property jointly unless partitioned.'"
  },
  
  {
    id: "SC_19",
    code: "SC-19",
    title: "Sale Deed Without Mutation",
    description: "Registered Sale Deed completed but mutation not done in revenue records",
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
    supremeCourtImpact: "Mutation not ownership, but essential for records",
    solutions: [
      "Apply for mutation in revenue records immediately",
      "Submit registered sale deed with application",
      "Pay applicable fees for mutation process",
      "Follow up with revenue officials regularly",
      "Ensure property tax records are also updated"
    ],
    timeframe: "30-90 days",
    estimatedCost: "₹2,00,000 - ₹10,00,000",
    keyRisks: [
      "Property tax notices to previous owner",
      "Administrative complications in records",
      "Utility connection transfer issues",
      "Minor delays in future property transactions"
    ],
    nextSteps: [
      "Apply for mutation at revenue office",
      "Submit sale deed and identity documents",
      "Pay required fees for the process",
      "Track application status regularly",
      "Update address in all property documents"
    ],
    legalReference: "Various State Revenue Codes: 'Mutation is administrative process for tax records and does not confer or affect title.'"
  },
  
  {
    id: "SC_20",
    code: "SC-20",
    title: "Lost Sale Deed",
    description: "Sale Deed lost but registry record exists proving ownership",
    conditions: {
      hasProperty: true,
      documentType: "registered_sale_deed",
      legalOwner: "self",
      hasPossession: true,
      hasDispute: false,
      intent: "check_status"
    },
    riskLevel: "LOW",
    legalStanding: "Legal Owner - Documentation issue only",
    urgency: "LOW",
    supremeCourtImpact: "Ownership valid if registry confirmed in records",
    solutions: [
      "File FIR for lost document immediately",
      "Apply for certified copy from registrar's office",
      "Publish public notice in newspapers",
      "Get indemnity bond prepared if required",
      "Keep registry extract as proof of ownership"
    ],
    timeframe: "15-30 days",
    estimatedCost: "₹5,000 - ₹15,000",
    keyRisks: [
      "Delays in future property transactions",
      "Additional verification during sale/mortgage",
      "Minor administrative complications"
    ],
    nextSteps: [
      "File police complaint for lost document",
      "Apply for certified copy with all details",
      "Publish loss notice in local newspaper",
      "Keep extract of registration as backup",
      "Store new certified copy securely"
    ],
    legalReference: "Registration Act: 'Certified copies of registered documents have same evidentiary value as originals.'"
  }
];

// Helper function to match a form submission to the most appropriate scenario
export function matchSupremeCourtScenario(formData: any): SupremeCourtScenario | null {
  // First try for exact match
  let matchingScenario = supremeCourtPropertyScenarios.find(scenario => {
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
    matchingScenario = supremeCourtPropertyScenarios.find(scenario => {
      return (
        scenario.conditions.documentType === formData.documentType &&
        scenario.conditions.legalOwner === formData.legalOwner &&
        scenario.conditions.hasDispute === formData.hasDispute
      );
    });
  }

  // If still no match, try with just documentType and legalOwner
  if (!matchingScenario) {
    matchingScenario = supremeCourtPropertyScenarios.find(scenario => {
      return (
        scenario.conditions.documentType === formData.documentType &&
        scenario.conditions.legalOwner === formData.legalOwner
      );
    });
  }

  // Last resort - match just on document type
  if (!matchingScenario) {
    matchingScenario = supremeCourtPropertyScenarios.find(scenario => {
      return scenario.conditions.documentType === formData.documentType;
    });
  }

  return matchingScenario;
}

// Get Supreme Court reference and impact for a specific scenario code
export function getSupremeCourtReference(scenarioCode: string): { reference: string, impact: string } | null {
  const scenario = supremeCourtPropertyScenarios.find(s => s.code === scenarioCode);
  if (scenario) {
    return {
      reference: scenario.legalReference || '',
      impact: scenario.supremeCourtImpact || ''
    };
  }
  return null;
}
