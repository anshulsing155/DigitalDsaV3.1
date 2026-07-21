// src/lib/landing-v3/data/resources.ts
export interface ResourceArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  illustrationType: 'sbi-sync' | 'ledger-architecture' | 'policy-101';
}

export const resourcesHeader = {
  title: "Read the Latest",
  description: "Stay ahead with guides, updates, and deep dives into B2B loan distribution and payout infrastructure."
};

export const resourcesData: ResourceArticle[] = [
  {
    id: "sbi-sync",
    title: "DigitalDSA + SBI: Building the Next Generation of Sourcing Partnerships",
    category: "Announcements",
    readTime: "5 min read",
    illustrationType: "sbi-sync"
  },
  {
    id: "ledger-architecture",
    title: "Transitioning to Modern Ledger Architectures in Lending",
    category: "Technology",
    readTime: "8 min read",
    illustrationType: "ledger-architecture"
  },
  {
    id: "policy-101",
    title: "DSA Sourcing 101: Understanding Policy Matrices and Ratios",
    category: "Guides",
    readTime: "6 min read",
    illustrationType: "policy-101"
  }
];
