/**
 * Shared landing page CTA navigation state.
 *
 * Modified for website-only mode: all CTA clicks route to the public contact page.
 */

import { goto } from '$app/navigation';

class LandingNavigationState {
	showChoiceModal = $state(false);

	handleCTA() {
		goto('/contact');
	}

	hasFormInProgress(): boolean {
		return false;
	}

	goToDashboard() {
		goto('/contact');
	}

	resumeApplication() {
		goto('/contact');
	}

	dismiss() {
		this.showChoiceModal = false;
	}
}

export const landingNav = new LandingNavigationState();
