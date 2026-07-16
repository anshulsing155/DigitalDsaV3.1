import type { Collection } from 'mongodb';

/**
 * Plaintext fallback helper for finding user by mobile number.
 */
export async function findUserByMobile(collection: Collection<any>, mobile: string | number): Promise<any> {
	const mobileNumber = typeof mobile === 'string' ? parseInt(mobile, 10) : mobile;
	if (isNaN(mobileNumber as number)) {
		return collection.findOne({ mobileNumber: mobile });
	}
	return collection.findOne({
		$or: [
			{ mobileNumber: mobileNumber },
			{ mobileNumber: String(mobile) }
		]
	});
}

/**
 * Plaintext fallback helper for finding user by email address.
 */
export async function findUserByEmail(collection: Collection<any>, email: string): Promise<any> {
	if (!email) return null;
	return collection.findOne({ email });
}
