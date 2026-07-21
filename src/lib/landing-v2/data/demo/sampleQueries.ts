// src/lib/landing-v2/data/demo/sampleQueries.ts

export interface QueryResponse {
  question: string;
  answers: {
    lender: string;
    status: 'Eligible' | 'Blocked';
    reason: string;
    tat: string;
    payout: string;
  }[];
}

export const sampleQueries: QueryResponse[] = [
  {
    question: "Can a self-employed applicant with CIBIL 705 and LTV 78% qualify for a ₹65L home loan?",
    answers: [
      { lender: "HDFC Private Bank", status: "Eligible", reason: "Meets sub-prime CIBIL tier; LTV limit is <=80%. Payout active.", tat: "5 days", payout: "₹42,250 (0.65%)" },
      { lender: "State Bank of India", status: "Blocked", reason: "Fails classification check. Requires salaried profile for CIBIL <=720.", tat: "—", payout: "—" },
      { lender: "Bajaj NBFC", status: "Eligible", reason: "Passed. Low CIBIL threshold (600+) allows approval with 30% self-employed haircut.", tat: "3 days", payout: "₹52,000 (0.80%)" }
    ]
  },
  {
    question: "Check eligibility for a salaried applicant with CIBIL 680 and ₹45,000 existing EMI on ₹1.5L income.",
    answers: [
      { lender: "HDFC Private Bank", status: "Blocked", reason: "FOIR limit exceeded. Aggregate obligations exceed the 55% ceiling.", tat: "—", payout: "—" },
      { lender: "ICICI Private Bank", status: "Eligible", reason: "Passed. CIBIL score is exactly at the 680 minimum boundary; FOIR is <=50%.", tat: "6 days", payout: "₹60,000 (0.60%)" },
      { lender: "Bajaj NBFC", status: "Eligible", reason: "Passed. Sub-prime policy accommodates up to 65% FOIR threshold margins.", tat: "4 days", payout: "₹80,000 (0.80%)" }
    ]
  }
];
