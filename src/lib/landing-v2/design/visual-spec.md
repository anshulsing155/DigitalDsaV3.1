# Visual Specification - DigitalDSA Landing Page V2

This document establishes the precise guidelines, design constraints, and styling tokens for the V2 "Sourcing Ledger" interface.

---

## 🎨 Color Palette & Accents
*   **Base Canvas:** `#000000` (Dark Mode background) and `#f5f5f7` (Light Mode background).
*   **Secondary Surface:** `#0c0c0e` (Dark Mode card background) and `#ffffff` (Light Mode card background).
*   **Muted Text:** `hsl(240, 5%, 65%)` (Dark Mode) and `hsl(240, 5%, 45%)` (Light Mode).
*   **Success Indicator:** `hsl(142, 70%, 45%)` (Emerald Green `#10b981`).
*   **Action Indicator:** `hsl(188, 86%, 53%)` (Teal/Cyan `#06b6d4`).

---

## 📐 Grid System & Spacing
*   **Max Width:** `max-w-5xl` (1024px centered grid).
*   **Horizontal Padding:** `px-6` (24px) for layouts.
*   **Vertical Padding:** `py-36` (144px) sections padding to optimize whitespace.
*   **Card Spacing:** `gap-6` (24px) grids and lists.

---

## ✒️ Typography Scale
*   **Hero Display:** `text-6xl sm:text-8xl font-bold tracking-tight leading-[1.05]`
*   **Section Heading:** `text-4xl sm:text-5xl font-bold tracking-tight`
*   **Feature Title:** `text-lg font-bold tracking-normal`
*   **Body Copy:** `text-sm font-normal leading-relaxed`
*   **Monospaced Data:** `font-mono text-xs tracking-wider uppercase`

---

## 🔳 Borders & Shadows
*   **Border Radius:** `rounded-2xl` (16px) for cards, `rounded-3xl` (24px) for showcase screens, and `rounded-full` for pill buttons.
*   **Border Stroke:** `border border-zinc-900` (Dark) and `border-zinc-200` (Light).
*   **Shadows:** `shadow-sm` on light panels. Minimal decorative box-shadows to ensure high speed.

---

## 🎬 Motion Principles
*   **Base Duration:** `180ms` to `220ms` for micro-interactions (e.g. card lifts and scale states).
*   **Hover Behavior:** Cards lift exactly `2px` on hover with a smooth ease-out: `transition-transform duration-200 hover:-translate-y-0.5`.
*   **Reveal Transitions:** Timing staggered at `0.15s` via GSAP `power4.out`.
