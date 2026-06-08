/**
 * Zone-State Mapping
 * Defines which special restricted zones apply to which Indian states
 */

type ZoneKey = keyof typeof ZONE_STATE_MAPPING;

export const ZONE_STATE_MAPPING = {
	CRZ: [
		'Gujarat',
		'Goa',
		'Kerala',
		'Tamil Nadu',
		'Maharashtra',
		'Odisha',
		'West Bengal',
		'Andhra Pradesh',
		'Puducherry',
		'Daman and Diu',
		'Lakshadweep',
		'Andaman and Nicobar Islands'
	],
	CANTONMENT: [
		'Punjab',
		'Rajasthan',
		'Uttar Pradesh',
		'Maharashtra',
		'Karnataka',
		'Tamil Nadu',
		'Delhi',
		'Haryana',
		'Madhya Pradesh',
		'Telangana',
		'Andhra Pradesh',
		'Gujarat',
		'West Bengal',
		'Assam',
		'Bihar',
		'Uttarakhand',
		'Jammu and Kashmir',
		'Himachal Pradesh',
		'Chandigarh'
	],
	TRIBAL: [
		'Jharkhand',
		'Chhattisgarh',
		'Odisha',
		'Andhra Pradesh',
		'Telangana',
		'Meghalaya',
		'Mizoram',
		'Nagaland',
		'Manipur',
		'Tripura',
		'Assam',
		'Bihar',
		'Madhya Pradesh',
		'Gujarat',
		'Maharashtra',
		'Karnataka'
	]
} as const;

export function isZoneValidForState(zone: string, state: string): boolean {
	if (!zone || zone === 'NONE' || zone === 'UNKNOWN' || !state) return true;
	const validStates = ZONE_STATE_MAPPING[zone as ZoneKey];
	return validStates ? (validStates as readonly string[]).includes(state) : true;
}

export function getZoneStateWarning(zone: string, state: string): string | null {
	if (!zone || zone === 'NONE' || zone === 'UNKNOWN' || !state) return null;
	if (!isZoneValidForState(zone, state)) {
		const zoneLabels: Record<string, string> = {
			CRZ: 'Coastal Regulation Zone (CRZ)',
			CANTONMENT: 'Cantonment Board area',
			TRIBAL: 'Tribal / Adivasi area'
		};
		const zoneLabel = zoneLabels[zone] || zone;
		return `⚠️ ${zoneLabel} is not applicable in ${state}. Please verify the property location.`;
	}
	return null;
}

export function getApplicableZonesForState(state: string): string[] {
	if (!state) return [];
	const applicableZones = ['NONE', 'UNKNOWN'];
	Object.entries(ZONE_STATE_MAPPING).forEach(([zone, states]) => {
		if (zone !== 'NONE' && (states as readonly string[]).includes(state))
			applicableZones.push(zone);
	});
	return applicableZones;
}
