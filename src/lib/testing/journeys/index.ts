/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Journey Declarations: barrel
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports every canonical journey as a named constant.
 *
 * Step 4 coverage (all 37 scenarios):
 *   - Home Loan (6): HL-NEW-SAL-CLEAN, HL-NEW-SE-PRO, HL-NEW-PENS,
 *                    HL-BT-ONLY, HL-BT-TOPUP, HL-TOPUP
 *   - LAP (5):       LAP-NEW-TERM, LAP-BT-TERM, LAP-TOPUP-TERM,
 *                    LAP-BT-TOPUP, LAP-DOD-NEW
 *   - Plot (5):      PLOT-ONLY, PLOT-CONSTRUCTION, PLOT-EQUITY,
 *                    PLOT-CONSTRUCTION-ONLY, PLOT-BT
 *   - Personal (3):  PL-FRESH-YES-OBLIG, PL-CONSOL, PL-NO-OBLIG
 *   - Business (3):  BL-FRESH-YES-OBLIG, BL-CONSOL, BL-NO-OBLIG
 *   - Professional (3): PROF-FRESH-YES-OBLIG, PROF-CONSOL, PROF-NO-OBLIG
 *   - Edge (12): AGE-23, AGE-68, BT-CREDIT-LINES, CIBIL-580, CIBIL-650,
 *                COMPANY-PVT, GOVT-SAL, HIGH-FOIR, HIGH-VALUE, NRI,
 *                PROF-LAWYER-DC, 3-APPLICANTS
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
	HL_NEW_SAL_CLEAN_JOURNEY,
	HL_NEW_SE_PRO_JOURNEY,
	HL_NEW_PENS_JOURNEY,
	HL_BT_ONLY_JOURNEY,
	HL_BT_TOPUP_JOURNEY,
	HL_TOPUP_JOURNEY
} from './homeLoan.js';
export {
	LAP_NEW_TERM_JOURNEY,
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY
} from './lapLoan.js';
export {
	PLOT_ONLY_JOURNEY,
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_EQUITY_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY
} from './plotLoan.js';
export {
	PL_FRESH_YES_OBLIG_JOURNEY,
	PL_CONSOL_JOURNEY,
	PL_NO_OBLIG_JOURNEY
} from './personalLoan.js';
export {
	BL_FRESH_YES_OBLIG_JOURNEY,
	BL_CONSOL_JOURNEY,
	BL_NO_OBLIG_JOURNEY
} from './businessLoan.js';
export {
	PROF_FRESH_YES_OBLIG_JOURNEY,
	PROF_CONSOL_JOURNEY,
	PROF_NO_OBLIG_JOURNEY
} from './professionalLoan.js';
export {
	EDGE_AGE_23_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_CIBIL_580_JOURNEY,
	EDGE_CIBIL_650_JOURNEY,
	EDGE_COMPANY_PVT_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY,
	EDGE_HIGH_FOIR_JOURNEY,
	EDGE_HIGH_VALUE_JOURNEY,
	EDGE_NRI_JOURNEY,
	EDGE_PROF_LAWYER_DC_JOURNEY,
	EDGE_3_APPLICANTS_JOURNEY
} from './edge.js';
