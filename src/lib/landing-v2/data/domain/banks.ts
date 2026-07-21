// src/lib/landing-v2/data/domain/banks.ts

export interface BankProfile {
  name: string;
  payoutHL: string; // Home Loan Payout
  payoutLAP: string; // Loan Against Property Payout
  tat: string;
  minCibil: number;
}

export const bankProfiles: BankProfile[] = [
  { name: 'State Bank of India', payoutHL: '0.40%', payoutLAP: '0.50%', tat: '8 days', minCibil: 720 },
  { name: 'HDFC Private Bank', payoutHL: '0.65%', payoutLAP: '0.70%', tat: '5 days', minCibil: 700 },
  { name: 'ICICI Private Bank', payoutHL: '0.60%', payoutLAP: '0.65%', tat: '6 days', minCibil: 680 },
  { name: 'Bajaj Finance NBFC', payoutHL: '0.80%', payoutLAP: '0.90%', tat: '3 days', minCibil: 600 }
];
