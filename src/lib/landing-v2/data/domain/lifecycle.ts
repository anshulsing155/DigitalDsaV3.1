// src/lib/landing-v2/data/domain/lifecycle.ts

export interface LifecycleStage {
  step: string;
  title: string;
  description: string;
  dashboardLabel: string;
  dashboardDetail: string;
}

export const lifecycleStages: LifecycleStage[] = [
  { step: '01', title: 'Lead Sourced', description: 'Enter applicant data on-the-go.', dashboardLabel: 'Active Lead Case', dashboardDetail: 'CASE-9081 registered. KYC verification triggered.' },
  { step: '02', title: 'Eligibility Check', description: 'Immediate initial policy filters check.', dashboardLabel: 'Underwriting Checklist', dashboardDetail: 'Score: 760 CIBIL. Debt-to-income calculated.' },
  { step: '03', title: 'Document Verification', description: 'Parse PAN, tax filings, and bank sheets.', dashboardLabel: 'PII Scrubbing Terminal', dashboardDetail: 'Phone & email fields redacted for matching logs.' },
  { step: '04', title: 'AI Lender Match', description: 'Runes algorithm checks rules for 50+ policies.', dashboardLabel: 'Eligibility Matcher Console', dashboardDetail: 'HDFC Selected (Match Confidence: 98%).' },
  { step: '05', title: 'RM Allocation', description: 'Assign the file to designated relationship managers.', dashboardLabel: 'Lender Handover Hub', dashboardDetail: 'File routed directly to RM-HDFC-PNE-2.' },
  { step: '06', title: 'Bank Underwriting', description: 'Lender checks files via API integration pipelines.', dashboardLabel: 'Bank API Portal check', dashboardDetail: 'Query resolver: Bank RM approved document sets.' },
  { step: '07', title: 'Sanction Issued', description: 'Secure official digital sanction letter prints.', dashboardLabel: 'Disbursement Queue', dashboardDetail: 'Sanction letter issued. Valid for 90 days.' },
  { step: '08', title: 'Disbursement', description: 'Execute final bank loan disbursements.', dashboardLabel: 'Payout Registry', dashboardDetail: 'Disbursement value ₹75,00,000 completed.' },
  { step: '09', title: 'Commission Payout', description: 'Track commission payout yields on ledger dashboards.', dashboardLabel: 'Ledger Audit Balance', dashboardDetail: 'Commission Payout ₹42,250 scheduled.' }
];
