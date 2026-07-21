// src/lib/landing-v3/data/features.ts
export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  illustrationType: 'compliance' | 'stats' | 'ledger' | 'recommendations' | 'toggles' | 'sync';
}

export const featuresHeader = {
  title: "A better way to launch a sourcing network",
  description: "DigitalDSA's agent-first sourcing platform brings together everything you need to build, scale, and manage a high-performing loan distribution channel. Match bank criteria, automate payouts, and close files faster.",
  ctaText: "Explore the Platform"
};

export const featuresData: FeatureItem[] = [
  {
    id: "eligibility",
    title: "AI eligibility engine",
    description: "Submit borrower data once and get instant matches against 50+ bank policies. Eliminate manual checking and file rejection.",
    illustrationType: "compliance"
  },
  {
    id: "stats",
    title: "Real-time analytics",
    description: "Track sourcing volumes, average loan amounts, and payout yields in real time with developer-first dashboards.",
    illustrationType: "stats"
  },
  {
    id: "ledger",
    title: "Hierarchical sub-ledgers",
    description: "Automatically split commissions and track payouts for sub-agents or referrals. Fully automated and transparent.",
    illustrationType: "ledger"
  },
  {
    id: "recommendations",
    title: "Approval-probability ranking",
    description: "Our machine learning engine scores applications, recommending the lenders with the highest approval probabilities.",
    illustrationType: "recommendations"
  },
  {
    id: "toggles",
    title: "Instant policy toggles",
    description: "Enable or disable bank integrations, change sourcing thresholds, and adapt to bank guideline revisions in real time.",
    illustrationType: "toggles"
  },
  {
    id: "sync",
    title: "Unified partner API sync",
    description: "Direct bank relationship API connections keep application statuses in perfect, instantaneous sync. No email follow-ups.",
    illustrationType: "sync"
  }
];
