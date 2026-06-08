import pincode_IN_all from '$lib/config/pincode_IN_all.json';
import pincode_IN_Selected from '$lib/config/pincode_IN_Selected.json';
import type { Answers } from '$lib/types/formTypes';

export function getStateOptions() {
	return Object.keys(pincode_IN_Selected).map((state) => ({
		label: state,
		value: state
	}));
}

export function getAllStateOptions() {
	return Object.keys(pincode_IN_all).map((state) => ({
		label: state,
		value: state
	}));
}

export function getCityOptionsForState(
	state: string | undefined
): Array<{ label: string; value: string }> {
	if (!state || typeof state !== 'string') return [];
	const cities = Object.keys(pincode_IN_Selected[state as keyof typeof pincode_IN_Selected] || {});
	return cities.map((city) => ({ label: city, value: city }));
}

export function getCityOptionsForAllState(
	state: string | undefined
): Array<{ label: string; value: string }> {
	if (!state || typeof state !== 'string') return [];
	const cities = Object.keys(pincode_IN_all[state as keyof typeof pincode_IN_all] || {});
	return cities.map((city) => ({ label: city, value: city }));
}

export function getPropertyCityOptions(currentAnswers: Answers) {
	return getCityOptionsForState(currentAnswers['propertyStateName']?.toString());
}

export function getResidenceCityOptions(currentAnswers: Answers) {
	const propertyCity = currentAnswers['propertyCityName']?.trim().toLowerCase();
	return getCityOptionsForAllState(currentAnswers['residenceStateName']?.toString()).filter(
		(city) => city.value.trim().toLowerCase() !== propertyCity
	);
}
