/**
 * City Pool - Indian cities with tier, state, region, and property cost ranges
 */

export interface CityEntry {
	city: string;
	state: string;
	region: 'north' | 'south' | 'west' | 'east';
	tier: 1 | 2 | 3;
	flatRange: [number, number];
	houseRange: [number, number];
	plotRange: [number, number];
	commercialRange: [number, number];
	salaryMultiplier: number;
}

export const CITIES: CityEntry[] = [
	// Tier 1 — Metro cities
	{
		city: 'Mumbai',
		state: 'Maharashtra',
		region: 'west',
		tier: 1,
		flatRange: [8000000, 25000000],
		houseRange: [15000000, 40000000],
		plotRange: [5000000, 20000000],
		commercialRange: [12000000, 50000000],
		salaryMultiplier: 1.0
	},
	{
		city: 'New Delhi',
		state: 'Delhi',
		region: 'north',
		tier: 1,
		flatRange: [6000000, 20000000],
		houseRange: [12000000, 35000000],
		plotRange: [4000000, 18000000],
		commercialRange: [10000000, 40000000],
		salaryMultiplier: 1.0
	},
	{
		city: 'Bangalore',
		state: 'Karnataka',
		region: 'south',
		tier: 1,
		flatRange: [5000000, 20000000],
		houseRange: [10000000, 30000000],
		plotRange: [3000000, 15000000],
		commercialRange: [8000000, 35000000],
		salaryMultiplier: 1.0
	},
	{
		city: 'Hyderabad',
		state: 'Telangana',
		region: 'south',
		tier: 1,
		flatRange: [4000000, 15000000],
		houseRange: [8000000, 25000000],
		plotRange: [2500000, 12000000],
		commercialRange: [7000000, 30000000],
		salaryMultiplier: 0.95
	},
	{
		city: 'Chennai',
		state: 'Tamil Nadu',
		region: 'south',
		tier: 1,
		flatRange: [4000000, 15000000],
		houseRange: [8000000, 25000000],
		plotRange: [2500000, 12000000],
		commercialRange: [7000000, 28000000],
		salaryMultiplier: 0.9
	},
	{
		city: 'Pune',
		state: 'Maharashtra',
		region: 'west',
		tier: 1,
		flatRange: [4000000, 15000000],
		houseRange: [8000000, 22000000],
		plotRange: [2500000, 10000000],
		commercialRange: [6000000, 25000000],
		salaryMultiplier: 0.9
	},
	{
		city: 'Kolkata',
		state: 'West Bengal',
		region: 'east',
		tier: 1,
		flatRange: [3000000, 12000000],
		houseRange: [6000000, 20000000],
		plotRange: [2000000, 10000000],
		commercialRange: [5000000, 20000000],
		salaryMultiplier: 0.85
	},
	{
		city: 'Ahmedabad',
		state: 'Gujarat',
		region: 'west',
		tier: 1,
		flatRange: [3000000, 12000000],
		houseRange: [6000000, 20000000],
		plotRange: [2000000, 10000000],
		commercialRange: [5000000, 22000000],
		salaryMultiplier: 0.85
	},

	// Tier 2 — Major cities
	{
		city: 'Jaipur',
		state: 'Rajasthan',
		region: 'north',
		tier: 2,
		flatRange: [2500000, 8000000],
		houseRange: [4000000, 12000000],
		plotRange: [1500000, 6000000],
		commercialRange: [3000000, 12000000],
		salaryMultiplier: 0.7
	},
	{
		city: 'Surat',
		state: 'Gujarat',
		region: 'west',
		tier: 2,
		flatRange: [2000000, 7000000],
		houseRange: [3500000, 10000000],
		plotRange: [1200000, 5000000],
		commercialRange: [3000000, 12000000],
		salaryMultiplier: 0.7
	},
	{
		city: 'Lucknow',
		state: 'Uttar Pradesh',
		region: 'north',
		tier: 2,
		flatRange: [2000000, 7000000],
		houseRange: [3500000, 10000000],
		plotRange: [1200000, 5000000],
		commercialRange: [2500000, 10000000],
		salaryMultiplier: 0.65
	},
	{
		city: 'Chandigarh',
		state: 'Chandigarh',
		region: 'north',
		tier: 2,
		flatRange: [3000000, 10000000],
		houseRange: [5000000, 15000000],
		plotRange: [2000000, 8000000],
		commercialRange: [4000000, 15000000],
		salaryMultiplier: 0.8
	},
	{
		city: 'Indore',
		state: 'Madhya Pradesh',
		region: 'north',
		tier: 2,
		flatRange: [2000000, 6000000],
		houseRange: [3000000, 9000000],
		plotRange: [1000000, 4000000],
		commercialRange: [2500000, 10000000],
		salaryMultiplier: 0.65
	},
	{
		city: 'Nagpur',
		state: 'Maharashtra',
		region: 'west',
		tier: 2,
		flatRange: [2000000, 6000000],
		houseRange: [3000000, 9000000],
		plotRange: [1000000, 4000000],
		commercialRange: [2500000, 10000000],
		salaryMultiplier: 0.65
	},
	{
		city: 'Coimbatore',
		state: 'Tamil Nadu',
		region: 'south',
		tier: 2,
		flatRange: [2500000, 7000000],
		houseRange: [3500000, 10000000],
		plotRange: [1500000, 5000000],
		commercialRange: [3000000, 12000000],
		salaryMultiplier: 0.7
	},
	{
		city: 'Vizag',
		state: 'Andhra Pradesh',
		region: 'south',
		tier: 2,
		flatRange: [2000000, 6000000],
		houseRange: [3000000, 9000000],
		plotRange: [1200000, 4000000],
		commercialRange: [2500000, 10000000],
		salaryMultiplier: 0.65
	},
	{
		city: 'Kochi',
		state: 'Kerala',
		region: 'south',
		tier: 2,
		flatRange: [2500000, 8000000],
		houseRange: [4000000, 12000000],
		plotRange: [1500000, 6000000],
		commercialRange: [3000000, 12000000],
		salaryMultiplier: 0.75
	},
	{
		city: 'Bhopal',
		state: 'Madhya Pradesh',
		region: 'north',
		tier: 2,
		flatRange: [1800000, 5500000],
		houseRange: [2800000, 8000000],
		plotRange: [1000000, 3500000],
		commercialRange: [2000000, 8000000],
		salaryMultiplier: 0.6
	},
	{
		city: 'Vadodara',
		state: 'Gujarat',
		region: 'west',
		tier: 2,
		flatRange: [2000000, 6000000],
		houseRange: [3000000, 9000000],
		plotRange: [1200000, 4000000],
		commercialRange: [2500000, 10000000],
		salaryMultiplier: 0.65
	},
	{
		city: 'Mysore',
		state: 'Karnataka',
		region: 'south',
		tier: 2,
		flatRange: [2000000, 6000000],
		houseRange: [3000000, 8000000],
		plotRange: [1000000, 4000000],
		commercialRange: [2000000, 8000000],
		salaryMultiplier: 0.6
	},

	// Tier 3 — Emerging cities
	{
		city: 'Patna',
		state: 'Bihar',
		region: 'east',
		tier: 3,
		flatRange: [1500000, 5000000],
		houseRange: [2000000, 7000000],
		plotRange: [800000, 3000000],
		commercialRange: [1500000, 6000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Ranchi',
		state: 'Jharkhand',
		region: 'east',
		tier: 3,
		flatRange: [1200000, 4000000],
		houseRange: [1800000, 6000000],
		plotRange: [700000, 2500000],
		commercialRange: [1200000, 5000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Bhubaneswar',
		state: 'Odisha',
		region: 'east',
		tier: 3,
		flatRange: [1500000, 5000000],
		houseRange: [2000000, 7000000],
		plotRange: [800000, 3000000],
		commercialRange: [1500000, 6000000],
		salaryMultiplier: 0.55
	},
	{
		city: 'Dehradun',
		state: 'Uttarakhand',
		region: 'north',
		tier: 3,
		flatRange: [1800000, 5500000],
		houseRange: [2500000, 8000000],
		plotRange: [1000000, 4000000],
		commercialRange: [1800000, 7000000],
		salaryMultiplier: 0.55
	},
	{
		city: 'Guwahati',
		state: 'Assam',
		region: 'east',
		tier: 3,
		flatRange: [1200000, 4000000],
		houseRange: [1800000, 6000000],
		plotRange: [700000, 2500000],
		commercialRange: [1200000, 5000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Raipur',
		state: 'Chhattisgarh',
		region: 'east',
		tier: 3,
		flatRange: [1200000, 4000000],
		houseRange: [1800000, 6000000],
		plotRange: [700000, 2500000],
		commercialRange: [1200000, 5000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Jodhpur',
		state: 'Rajasthan',
		region: 'north',
		tier: 3,
		flatRange: [1500000, 4500000],
		houseRange: [2000000, 6000000],
		plotRange: [800000, 3000000],
		commercialRange: [1500000, 6000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Agra',
		state: 'Uttar Pradesh',
		region: 'north',
		tier: 3,
		flatRange: [1200000, 4000000],
		houseRange: [1800000, 6000000],
		plotRange: [700000, 2500000],
		commercialRange: [1200000, 5000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Varanasi',
		state: 'Uttar Pradesh',
		region: 'north',
		tier: 3,
		flatRange: [1200000, 4000000],
		houseRange: [1800000, 6000000],
		plotRange: [700000, 2500000],
		commercialRange: [1200000, 5000000],
		salaryMultiplier: 0.5
	},
	{
		city: 'Aurangabad',
		state: 'Maharashtra',
		region: 'west',
		tier: 3,
		flatRange: [1500000, 4500000],
		houseRange: [2000000, 6000000],
		plotRange: [800000, 3000000],
		commercialRange: [1500000, 6000000],
		salaryMultiplier: 0.5
	}
];

export function getCitiesByTier(tier: 1 | 2 | 3): CityEntry[] {
	return CITIES.filter((c) => c.tier === tier);
}

export function getCitiesByRegion(region: string): CityEntry[] {
	return CITIES.filter((c) => c.region === region);
}

export function getCityByName(cityName: string): CityEntry | undefined {
	return CITIES.find((c) => c.city === cityName);
}

export function getPropertyCostRange(city: CityEntry, propertyType: string): [number, number] {
	switch (propertyType) {
		case 'Flat':
			return city.flatRange;
		case 'Independent House':
			return city.houseRange;
		case 'Villa':
			return city.houseRange;
		case 'Plot':
			return city.plotRange;
		case 'Commercial':
			return city.commercialRange;
		default:
			return city.flatRange;
	}
}
