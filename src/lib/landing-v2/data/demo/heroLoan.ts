// src/lib/landing-v2/data/demo/heroLoan.ts

export interface HeroTimelineNode {
  label: string;
  isPassed: boolean;
  isCurrent?: boolean;
}

export const heroCockpitData = {
  caseId: 'CASE-9081',
  product: 'Home Loan',
  amount: '₹62,50,000',
  cibil: '742 CIBIL',
  tat: '5 Days',
  commission: '₹42,300',
  confidence: '98%',
  timeline: [
    { label: 'Lead Sourced', isPassed: true },
    { label: 'Eligibility Verified', isPassed: true },
    { label: 'AI Policy Match', isPassed: true },
    { label: 'HDFC Selected', isPassed: true },
    { label: 'RM Assigned Handover', isPassed: true, isCurrent: true },
    { label: 'Sanction Approved', isPassed: false }
  ] as HeroTimelineNode[]
};
