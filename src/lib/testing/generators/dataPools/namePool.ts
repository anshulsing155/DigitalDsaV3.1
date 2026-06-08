/**
 * Name Pool - Region-tagged Indian names for realistic demographic matching
 */

export interface NameEntry {
	first: string;
	last: string;
	region: 'north' | 'south' | 'west' | 'east';
	gender: 'male' | 'female';
}

export const MALE_NAMES: NameEntry[] = [
	// North India
	{ first: 'Rajesh', last: 'Sharma', region: 'north', gender: 'male' },
	{ first: 'Amit', last: 'Gupta', region: 'north', gender: 'male' },
	{ first: 'Vijay', last: 'Singh', region: 'north', gender: 'male' },
	{ first: 'Sanjay', last: 'Verma', region: 'north', gender: 'male' },
	{ first: 'Arun', last: 'Agarwal', region: 'north', gender: 'male' },
	{ first: 'Harish', last: 'Tiwari', region: 'north', gender: 'male' },
	{ first: 'Manoj', last: 'Mishra', region: 'north', gender: 'male' },
	{ first: 'Deepak', last: 'Saxena', region: 'north', gender: 'male' },
	{ first: 'Rakesh', last: 'Chauhan', region: 'north', gender: 'male' },
	{ first: 'Suresh', last: 'Pandey', region: 'north', gender: 'male' },
	{ first: 'Rahul', last: 'Kapoor', region: 'north', gender: 'male' },
	{ first: 'Vikram', last: 'Malhotra', region: 'north', gender: 'male' },
	{ first: 'Ashok', last: 'Jha', region: 'north', gender: 'male' },
	{ first: 'Pankaj', last: 'Srivastava', region: 'north', gender: 'male' },
	{ first: 'Nikhil', last: 'Choudhary', region: 'north', gender: 'male' },
	// South India
	{ first: 'Venkatesh', last: 'Reddy', region: 'south', gender: 'male' },
	{ first: 'Subramaniam', last: 'Iyer', region: 'south', gender: 'male' },
	{ first: 'Aravind', last: 'Nair', region: 'south', gender: 'male' },
	{ first: 'Karthik', last: 'Rao', region: 'south', gender: 'male' },
	{ first: 'Prasad', last: 'Menon', region: 'south', gender: 'male' },
	{ first: 'Ramesh', last: 'Naidu', region: 'south', gender: 'male' },
	{ first: 'Srinivas', last: 'Pillai', region: 'south', gender: 'male' },
	{ first: 'Arun Prakash', last: 'Reddy', region: 'south', gender: 'male' },
	{ first: 'Ganesh', last: 'Krishnan', region: 'south', gender: 'male' },
	{ first: 'Mohan', last: 'Rajan', region: 'south', gender: 'male' },
	{ first: 'Vishnu', last: 'Kumar', region: 'south', gender: 'male' },
	{ first: 'Hari', last: 'Subramanian', region: 'south', gender: 'male' },
	{ first: 'Balaji', last: 'Shankar', region: 'south', gender: 'male' },
	{ first: 'Dinesh', last: 'Gowda', region: 'south', gender: 'male' },
	{ first: 'Girish', last: 'Hegde', region: 'south', gender: 'male' },
	// West India
	{ first: 'Kiran', last: 'Patel', region: 'west', gender: 'male' },
	{ first: 'Ashwin', last: 'Shah', region: 'west', gender: 'male' },
	{ first: 'Jayesh', last: 'Desai', region: 'west', gender: 'male' },
	{ first: 'Varun', last: 'Joshi', region: 'west', gender: 'male' },
	{ first: 'Rohan', last: 'Mehta', region: 'west', gender: 'male' },
	{ first: 'Nilesh', last: 'Kulkarni', region: 'west', gender: 'male' },
	{ first: 'Hitesh', last: 'Dave', region: 'west', gender: 'male' },
	{ first: 'Tushar', last: 'Parekh', region: 'west', gender: 'male' },
	{ first: 'Chirag', last: 'Thakkar', region: 'west', gender: 'male' },
	{ first: 'Mayur', last: 'Bhatt', region: 'west', gender: 'male' },
	{ first: 'Pranav', last: 'Deshmukh', region: 'west', gender: 'male' },
	{ first: 'Yash', last: 'Doshi', region: 'west', gender: 'male' },
	{ first: 'Sachin', last: 'Patil', region: 'west', gender: 'male' },
	{ first: 'Hemant', last: 'Kothari', region: 'west', gender: 'male' },
	{ first: 'Gaurav', last: 'Trivedi', region: 'west', gender: 'male' },
	// East India
	{ first: 'Arnab', last: 'Chatterjee', region: 'east', gender: 'male' },
	{ first: 'Debashis', last: 'Das', region: 'east', gender: 'male' },
	{ first: 'Subir', last: 'Bose', region: 'east', gender: 'male' },
	{ first: 'Anirban', last: 'Sen', region: 'east', gender: 'male' },
	{ first: 'Partha', last: 'Banerjee', region: 'east', gender: 'male' },
	{ first: 'Soumya', last: 'Mukherjee', region: 'east', gender: 'male' },
	{ first: 'Rajat', last: 'Ghosh', region: 'east', gender: 'male' },
	{ first: 'Siddharth', last: 'Roy', region: 'east', gender: 'male' },
	{ first: 'Biplab', last: 'Sarkar', region: 'east', gender: 'male' },
	{ first: 'Kaushik', last: 'Dutta', region: 'east', gender: 'male' },
	{ first: 'Tarun', last: 'Saha', region: 'east', gender: 'male' },
	{ first: 'Alok', last: 'Prasad', region: 'east', gender: 'male' },
	{ first: 'Manish', last: 'Mahato', region: 'east', gender: 'male' },
	{ first: 'Govind', last: 'Tiwari', region: 'east', gender: 'male' },
	{ first: 'Ranjan', last: 'Mishra', region: 'east', gender: 'male' }
];

export const FEMALE_NAMES: NameEntry[] = [
	// North India
	{ first: 'Priya', last: 'Sharma', region: 'north', gender: 'female' },
	{ first: 'Neha', last: 'Gupta', region: 'north', gender: 'female' },
	{ first: 'Swati', last: 'Singh', region: 'north', gender: 'female' },
	{ first: 'Pooja', last: 'Verma', region: 'north', gender: 'female' },
	{ first: 'Ritu', last: 'Agarwal', region: 'north', gender: 'female' },
	{ first: 'Anita', last: 'Tiwari', region: 'north', gender: 'female' },
	{ first: 'Tanya', last: 'Kapoor', region: 'north', gender: 'female' },
	{ first: 'Sunita', last: 'Mishra', region: 'north', gender: 'female' },
	{ first: 'Nisha', last: 'Saxena', region: 'north', gender: 'female' },
	{ first: 'Kavya', last: 'Pandey', region: 'north', gender: 'female' },
	{ first: 'Shikha', last: 'Chauhan', region: 'north', gender: 'female' },
	{ first: 'Rashmi', last: 'Srivastava', region: 'north', gender: 'female' },
	{ first: 'Deepti', last: 'Jha', region: 'north', gender: 'female' },
	{ first: 'Shalini', last: 'Choudhary', region: 'north', gender: 'female' },
	{ first: 'Manisha', last: 'Malhotra', region: 'north', gender: 'female' },
	// South India
	{ first: 'Meera', last: 'Reddy', region: 'south', gender: 'female' },
	{ first: 'Kavita', last: 'Iyer', region: 'south', gender: 'female' },
	{ first: 'Lakshmi', last: 'Nair', region: 'south', gender: 'female' },
	{ first: 'Divya', last: 'Rao', region: 'south', gender: 'female' },
	{ first: 'Sudha', last: 'Menon', region: 'south', gender: 'female' },
	{ first: 'Revathi', last: 'Naidu', region: 'south', gender: 'female' },
	{ first: 'Padma', last: 'Pillai', region: 'south', gender: 'female' },
	{ first: 'Ananya', last: 'Krishnan', region: 'south', gender: 'female' },
	{ first: 'Shruti', last: 'Rajan', region: 'south', gender: 'female' },
	{ first: 'Gayathri', last: 'Subramanian', region: 'south', gender: 'female' },
	{ first: 'Asha', last: 'Gowda', region: 'south', gender: 'female' },
	{ first: 'Bhavana', last: 'Hegde', region: 'south', gender: 'female' },
	{ first: 'Deepa', last: 'Shankar', region: 'south', gender: 'female' },
	{ first: 'Jyothi', last: 'Kumar', region: 'south', gender: 'female' },
	{ first: 'Smitha', last: 'Prasad', region: 'south', gender: 'female' },
	// West India
	{ first: 'Anjali', last: 'Patel', region: 'west', gender: 'female' },
	{ first: 'Sneha', last: 'Shah', region: 'west', gender: 'female' },
	{ first: 'Hetal', last: 'Desai', region: 'west', gender: 'female' },
	{ first: 'Komal', last: 'Joshi', region: 'west', gender: 'female' },
	{ first: 'Mansi', last: 'Mehta', region: 'west', gender: 'female' },
	{ first: 'Riddhi', last: 'Kulkarni', region: 'west', gender: 'female' },
	{ first: 'Nidhi', last: 'Dave', region: 'west', gender: 'female' },
	{ first: 'Payal', last: 'Parekh', region: 'west', gender: 'female' },
	{ first: 'Kruti', last: 'Thakkar', region: 'west', gender: 'female' },
	{ first: 'Disha', last: 'Bhatt', region: 'west', gender: 'female' },
	{ first: 'Shraddha', last: 'Deshmukh', region: 'west', gender: 'female' },
	{ first: 'Vaishali', last: 'Doshi', region: 'west', gender: 'female' },
	{ first: 'Sarita', last: 'Patil', region: 'west', gender: 'female' },
	{ first: 'Jinal', last: 'Kothari', region: 'west', gender: 'female' },
	{ first: 'Purvi', last: 'Trivedi', region: 'west', gender: 'female' },
	// East India
	{ first: 'Moumita', last: 'Chatterjee', region: 'east', gender: 'female' },
	{ first: 'Suchitra', last: 'Das', region: 'east', gender: 'female' },
	{ first: 'Tanushree', last: 'Bose', region: 'east', gender: 'female' },
	{ first: 'Ipsita', last: 'Sen', region: 'east', gender: 'female' },
	{ first: 'Rituparna', last: 'Banerjee', region: 'east', gender: 'female' },
	{ first: 'Sayantani', last: 'Mukherjee', region: 'east', gender: 'female' },
	{ first: 'Aparajita', last: 'Ghosh', region: 'east', gender: 'female' },
	{ first: 'Pallavi', last: 'Roy', region: 'east', gender: 'female' },
	{ first: 'Mitali', last: 'Sarkar', region: 'east', gender: 'female' },
	{ first: 'Susmita', last: 'Dutta', region: 'east', gender: 'female' },
	{ first: 'Lopamudra', last: 'Saha', region: 'east', gender: 'female' },
	{ first: 'Anuradha', last: 'Prasad', region: 'east', gender: 'female' },
	{ first: 'Rupa', last: 'Mahato', region: 'east', gender: 'female' },
	{ first: 'Sadhana', last: 'Tiwari', region: 'east', gender: 'female' },
	{ first: 'Kumari', last: 'Mishra', region: 'east', gender: 'female' }
];

export interface SeededRandom {
	next(): number;
	range(min: number, max: number): number;
	choice<T>(arr: readonly T[]): T;
	boolean(probability?: number): boolean;
}

export function pickName(
	rng: SeededRandom,
	gender: 'male' | 'female',
	regionHint?: string
): { first: string; last: string } {
	const pool = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;

	if (regionHint) {
		const regionFiltered = pool.filter((n) => n.region === regionHint);
		if (regionFiltered.length > 0) {
			const entry = rng.choice(regionFiltered);
			return { first: entry.first, last: entry.last };
		}
	}

	const entry = rng.choice(pool);
	return { first: entry.first, last: entry.last };
}
