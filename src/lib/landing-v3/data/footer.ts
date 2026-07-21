// src/lib/landing-v3/data/footer.ts
export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export const footerBrand = {
  name: "DigitalDSA",
  description: "Intelligent B2B Loan Distribution infrastructure built for India's Direct Selling Agents (DSAs) and bank Relationship Managers.",
  copyright: "© 2026 DigitalDSA, Inc. All rights reserved."
};

export const footerSections: FooterSection[] = [
  {
    title: "Products",
    links: [
      { label: "Home Loans", href: "#home-loan" },
      { label: "Personal Loans", href: "#personal-loan" },
      { label: "Business Loans", href: "#business-loan" },
      { label: "LAP", href: "#lap" }
    ]
  },
  {
    title: "Platform",
    links: [
      { label: "AI Eligibility", href: "#eligibility" },
      { label: "Commission Ledger", href: "#ledger" },
      { label: "Developer APIs", href: "#modern-stack" },
      { label: "Security & Compliance", href: "#security" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#blog" },
      { label: "Policy Matrices", href: "#matrices" },
      { label: "API Docs", href: "#api-docs" },
      { label: "Help Center", href: "#help" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Contact Us", href: "#contact" },
      { label: "Legal", href: "#legal" }
    ]
  }
];
