// src/lib/landing-v2/motion/timings.ts

export const timings = {
  duration: {
    fast: 0.18,       // 180ms (for micro-interactions)
    normal: 0.22,     // 220ms (for hover transitions)
    slow: 0.4,        // 400ms (for layout state swaps)
    timeline: 1.0     // 1000ms (for sequential scroll reveals)
  },
  ease: {
    reveal: 'power4.out',
    interactive: 'power2.out'
  }
};
