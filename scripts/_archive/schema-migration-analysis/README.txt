Schema Migration Analysis Scripts
==================================
Created: Session 26 (2026-03-14)
Purpose: One-time analysis scripts used during the JSON-to-TypeScript
         schema composition migration (all 6 loan types).
Status:  Migration complete. These scripts are no longer needed.
         The JSON schemas they read have been deleted.

Files
-----
analyze-schemas.cjs
  Reads all 5 JSON schemas (LAP, Plot, Personal, Business, Professional),
  catalogs question variants (showWhen patterns, loanType references,
  shared vs unique questions). Used to plan the TypeScript composition
  layer and identify shared infrastructure for src/lib/config/schema/.

analyze-schemas.js
  Earlier version of the same analysis. Focused specifically on which
  questions reference loanType in their showWhen conditions, used to
  design the JSON-Logic helper patterns (jl object in jsonLogicHelpers.ts).

find-pages.cjs
  Inspects page-level showWhen conditions across all schemas to map
  which pages are conditional on loanType. Used to plan the pages.ts
  builder functions and determine per-loan-type page visibility.

Related committed scripts (still in scripts/):
  convert-schema-to-ts.cjs     - Automated JSON->TS conversion
  validate-schema-migration.cjs - Post-migration validation
