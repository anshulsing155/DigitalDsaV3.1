// src/lib/landing-v2/design/tokens.ts

export const tokens = {
  colors: {
    dark: {
      bg: 'bg-[#090d16]',
      canvas: '#090d16',
      surface: 'bg-[#111726]',
      border: 'border-slate-800/60',
      text: 'text-[#f8fafc]',
      textMuted: 'text-[#94a3b8]'
    },
    light: {
      bg: 'bg-[#f8fafc]',
      canvas: '#f8fafc',
      surface: 'bg-[#ffffff]',
      border: 'border-slate-200/80',
      text: 'text-[#111827]',
      textMuted: 'text-[#6b7280]'
    },
    success: {
      text: 'text-[#00a76f]',
      border: 'border-[#00a76f]/30',
      bg: 'bg-[#00a76f]/10'
    },
    accent: {
      text: 'text-[#0f62fe]',
      border: 'border-[#0f62fe]/30',
      bg: 'bg-[#0f62fe]/10'
    }
  },
  spacing: {
    sectionPadding: 'py-44 px-6',
    gridGap: 'gap-12 lg:gap-16',
    cardPadding: 'p-8 md:p-10'
  },
  typography: {
    // Massive Stripe-grade display sans-serif
    display: 'font-sans text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]',
    heading: 'font-sans text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12]',
    subheading: 'font-sans text-base sm:text-lg font-normal leading-relaxed text-[#6b7280] dark:text-[#94a3b8]',
    body: 'font-sans text-xs sm:text-sm font-normal leading-relaxed text-[#6b7280] dark:text-[#94a3b8]',
    mono: 'font-mono text-[9px] tracking-widest uppercase font-bold text-[#0f62fe]'
  },
  radius: {
    card: 'rounded-[28px]',
    showcase: 'rounded-[40px]',
    pill: 'rounded-full'
  },
  shadow: {
    card: 'shadow-sm'
  },
  
  // The 4 Card Variant Classes by Theme
  variants: {
    dark: {
      cardGlass: 'backdrop-blur-md bg-[#111726]/75 border border-slate-800/60 rounded-[28px] shadow-[0_4px_30px_rgba(0,0,0,0.3)]',
      cardSolid: 'bg-[#111726]/60 border border-slate-800/30 rounded-[28px]',
      cardElevated: 'bg-[#151d2f] shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-800/50 rounded-[28px]',
      cardOutline: 'border border-slate-800/60 bg-transparent rounded-[28px]'
    },
    light: {
      cardGlass: 'backdrop-blur-md bg-[#ffffff]/80 border border-slate-200/80 rounded-[28px] shadow-[0_8px_30px_rgba(15,98,254,0.015)]',
      cardSolid: 'bg-[#f1f5f9]/70 border border-slate-200/40 rounded-[28px]',
      cardElevated: 'bg-[#ffffff] shadow-[0_16px_48px_rgba(15,98,254,0.025)] border border-slate-200/70 rounded-[28px]',
      cardOutline: 'border border-slate-200/80 bg-transparent rounded-[28px]'
    }
  }
};
