# Issue Resolution Protocol

**Usage:** Paste this (or say "follow ISSUE-RESOLUTION-PROTOCOL") when sharing screenshot(s) of issues.

---

**Resolve all issues visible in the attached screenshot(s):**

1. **Catalog ALL issues first** — Before touching any code, list every issue visible in the screenshot(s). Understand how they relate to each other. Do NOT start fixing until the full picture is clear.

2. **Design a unified fix** — Find a single cohesive solution that addresses all issues together, not individual patches stacked on each other. If fixing issue B would undo or conflict with the fix for issue A, rethink the approach. Go back and rework if needed — a clean unified solution is always preferred over layered patches.

3. **Pick the simplest approach** that is:
   - Consistent across all 6 loan types (secured + unsecured)
   - Consistent across both applicant types (Individual + Company)
   - Working in both dark and light mode
   - Using existing components, theme colors, and project patterns — no new abstractions or hardcoded styles

4. **Check cross-loan parity** — If the fix touches shared logic or a pattern repeated across loan routes, apply it everywhere. If purely local, fix just the affected route.

5. **Push back when needed** — If my request conflicts with project conventions, architecture decisions, theme consistency, or something we already decided earlier — tell me. If you have a better solution than what I suggested, confront me with it. Don't always agree silently.

6. **Present the plan in plain language before implementing** — Explain what you're going to do in simple, non-technical terms so I can follow. If there are multiple approaches, present them as options with pros and cons for each. Let me pick. Then implement.

7. **Review your own work before finishing** — After implementing, re-check against the original screenshot(s):
   - Is every cataloged issue resolved?
   - Does this fix introduce any NEW issues (layout shifts, broken states, edge cases)?
   - Does it regress anything that was already working before? Think about what this change touches and verify those areas still behave correctly.
   - Is the solution cohesive or patchy? If patchy, stop and refactor before moving on.

8. **Validate** — Run `pnpm run check` (zero errors) and relevant unit tests. Verify no showWhen / isNextEnabled / completion logic is silently broken.

9. **Don't commit automatically** — Let me review the changes first, then I'll ask you to commit.
