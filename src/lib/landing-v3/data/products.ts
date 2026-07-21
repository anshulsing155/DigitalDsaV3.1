// src/lib/landing-v3/data/products.ts
export interface LoanProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  visualType: 'home' | 'personal' | 'business' | 'lap';
}

export const productsHeader = {
  title: "Ready-to-Source Products",
  description: "Deploy instant sourcing workflows for major loan products. We handle bank integrations, guideline matrices, and telemetry so you can focus on building relationships."
};

export const productsData: LoanProduct[] = [
  {
    id: "home-loan",
    name: "Home Loan",
    tagline: "Secure competitive mortgage rates",
    description: "Connect buyers to top tier housing finances with integrated property appraisal tools, automated eligibility checks, and expedited processing.",
    visualType: "home"
  },
  {
    id: "personal-loan",
    name: "Personal Loan",
    tagline: "Instant unsecured credit pipelines",
    description: "Enable short-TAT personal loans with instant CIBIL pull, e-KYC integration, and direct API disbursement confirmations.",
    visualType: "personal"
  },
  {
    id: "business-loan",
    name: "Business Loan",
    tagline: "Fuel corporate growth pathways",
    description: "Provide working capital and term loans for SMEs by analyzing GST returns, bank statements, and business matrices in under 5 minutes.",
    visualType: "business"
  },
  {
    id: "lap",
    name: "Loan Against Property",
    tagline: "Unlock high-value asset liquidity",
    description: "Offer collateralized loans with property valuation modules, multi-lender appraisal overlays, and clear title check workflows.",
    visualType: "lap"
  }
];
