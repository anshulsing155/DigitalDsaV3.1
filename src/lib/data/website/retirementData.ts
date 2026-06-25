export interface RetirementArticleData {
  seo: {
    title: string;
    image: string;
    description: string;
    keywords: string;
  };
  heading: string;
  intro: string[];
  coverImage: string;
  coverAlt: string;
  sections: Array<
    | {
        type: 'table';
        title: string;
        intro?: string;
        headers: string[];
        rows: Array<Record<string, string[]>>;
      }
    | {
        type: 'list';
        title: string;
        intro?: string;
        items: Array<{ heading?: string; desc: string }>;
      }
    | {
        type: 'text';
        title: string;
        paragraphs: string[];
      }
  >;
}

import fd from './retirement/fd.json';
import fdLaddering from './retirement/fd-laddering.json';
import fixIncome from './retirement/fix-income.json';
import nps from './retirement/nps.json';
import pomis from './retirement/pomis.json';
import rbiFloating from './retirement/rbi-floating.json';
import scss from './retirement/scss.json';
import indexFunds from './retirement/index-funds.json';
import stocks from './retirement/stocks.json';
import swp from './retirement/swp.json';
import annuityPlans from './retirement/annuity-plans.json';
import immediateAnnuities from './retirement/immediate-annuities.json';

export const retirementArticles: Record<string, Record<string, RetirementArticleData>> = {
  fixDeposit: {
    fd: fd as unknown as RetirementArticleData,
    'fd-laddering': fdLaddering as unknown as RetirementArticleData,
    'fix-income': fixIncome as unknown as RetirementArticleData
  },
  govSchemes: {
    nps: nps as unknown as RetirementArticleData,
    pomis: pomis as unknown as RetirementArticleData,
    'rbi-floating': rbiFloating as unknown as RetirementArticleData,
    scss: scss as unknown as RetirementArticleData
  },
  lowRisk: {
    'index-funds': indexFunds as unknown as RetirementArticleData,
    stocks: stocks as unknown as RetirementArticleData,
    swp: swp as unknown as RetirementArticleData
  },
  pension: {
    'annuity-plans': annuityPlans as unknown as RetirementArticleData,
    'immediate-annuities': immediateAnnuities as unknown as RetirementArticleData
  }
};

export function getRetirementArticleData(category: string, slug: string): RetirementArticleData | null {
  // Support both ladering and laddering spelling
  let lookupSlug = slug;
  if (slug === 'fd-ladering') {
    lookupSlug = 'fd-laddering';
  }
  
  const categoryData = retirementArticles[category];
  if (!categoryData) return null;
  return categoryData[lookupSlug] || null;
}
