// Shared context key used by FormShell (provider) and FormNavigationBar (consumer)
// so the dev-only "Save QA Scenario" button can appear inline next to the
// Submit/Show Offers button on the final page of every loan form, without
// having to plumb props through each loan page.

export const DEV_QA_SAVE_CONTEXT_KEY = Symbol('form-wizard:dev-qa-save');

export interface DevQaSaveContext {
	// Opens the QA save modal owned by FormShell.
	open: () => void;
}
