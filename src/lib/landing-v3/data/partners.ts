// src/lib/landing-v3/data/partners.ts
export interface PartnerLogo {
  name: string;
  symbol: string; // Used to render unique SVG icons representing bank shapes
}

export const partnersData: PartnerLogo[] = [
  { name: "State Bank of India", symbol: "SBI" },
  { name: "HDFC Bank", symbol: "HDFC" },
  { name: "ICICI Bank", symbol: "ICICI" },
  { name: "Axis Bank", symbol: "AXIS" },
  { name: "Bajaj Finserv", symbol: "BAJAJ" },
  { name: "IDFC First", symbol: "IDFC" }
];
