/**
 * Shared landing page CTA navigation state.
 *
 * When an authenticated user clicks a CTA and has an active form
 * in sessionStorage, we show a choice modal instead of navigating
 * straight to the dashboard.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { ROUTES } from '$lib/config/routes.js';
import { authState } from '$lib/state/auth.svelte';

class LandingNavigationState {
	showChoiceModal = $state(false);

	handleCTA() {
		if (!authState.isAuthenticated) {
			goto('/login');
			return;
		}

		if (this.hasFormInProgress()) {
			this.showChoiceModal = true;
		} else {
			goto(ROUTES.DASHBOARD.ROOT);
		}
	}

	hasFormInProgress(): boolean {
		if (!browser) return false;
		try {
			const loanData = sessionStorage.getItem('home-loan-data');
			if (loanData) {
				const parsed = JSON.parse(loanData);
				return !!parsed?.loanName;
			}
		} catch {
			// ignore parse errors
		}
		return false;
	}

	goToDashboard() {
		this.showChoiceModal = false;
		goto(ROUTES.DASHBOARD.ROOT);
	}

	resumeApplication() {
		this.showChoiceModal = false;
		goto(ROUTES.FORM.HOW_CAN_WE_HELP);
	}

	dismiss() {
		this.showChoiceModal = false;
	}
}

export const landingNav = new LandingNavigationState();
