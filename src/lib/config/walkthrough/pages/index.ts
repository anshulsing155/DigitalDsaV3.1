import type { PageTourId, WalkthroughStep } from '../types';
import { PROFILE_TOUR_STEPS } from './profileTour';
import { CASES_TOUR_STEPS } from './casesTour';
import { CRM_TOUR_STEPS } from './crmTour';
import { COMMUNICATION_TOUR_STEPS } from './communicationTour';
import { ANALYTICS_TOUR_STEPS } from './analyticsTour';
import { TEAM_TOUR_STEPS } from './teamTour';
import { SHARED_LINKS_TOUR_STEPS } from './sharedLinksTour';

export const PAGE_TOUR_REGISTRY: Record<PageTourId, WalkthroughStep[]> = {
	profile: PROFILE_TOUR_STEPS,
	cases: CASES_TOUR_STEPS,
	crm: CRM_TOUR_STEPS,
	communication: COMMUNICATION_TOUR_STEPS,
	analytics: ANALYTICS_TOUR_STEPS,
	team: TEAM_TOUR_STEPS,
	'shared-links': SHARED_LINKS_TOUR_STEPS
};
