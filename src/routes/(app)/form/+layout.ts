import type { LayoutLoad } from './$types';
import { loadFormFromStorage } from '$lib/storage/formPersistence';
import type { ApplicationData } from '$lib/schemas/applicationDataSchema';

export const load: LayoutLoad = async () => {
	const applicationData: ApplicationData | null = await loadFormFromStorage();
	return {
		applicationData: applicationData || ({ loanType: '' } as ApplicationData)
	};
};
