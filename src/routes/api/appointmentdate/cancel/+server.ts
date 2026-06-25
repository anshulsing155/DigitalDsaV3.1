import { Applicant } from '$lib/database/mongo';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByMobile, findUserByEmail } from '$lib/server/csfle/index.js';

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { dateSelected, time } = body;

		if (!dateSelected || !time) {
			return json({ success: false, error: 'Missing appointment details to cancel.' }, { status: 400 });
		}

		const loginMobileNo = locals.user.mobileNumber;

		let userDoc = await findUserByMobile(Applicant, loginMobileNo);
		if (!userDoc && locals.user.email) {
			userDoc = await findUserByEmail(Applicant, locals.user.email);
		}

		if (!userDoc) {
			return json({ success: false, error: 'User profile not found in database.' }, { status: 404 });
		}

		// Pull the appointment from the matching user Applications collection
		const updateResult = await Applicant.updateOne(
			{ _id: userDoc._id },
			{
				$pull: {
					AppointmentData: {
						dateSelected,
						time
					}
				}
			}
		);

		if (updateResult.matchedCount === 0) {
			return json({ success: false, error: 'User profile not found in database.' }, { status: 404 });
		}

		return json({ success: true, message: 'Appointment cancelled successfully.' });
	} catch (error) {
		console.error('❌ Error cancelling appointment:', error);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};
