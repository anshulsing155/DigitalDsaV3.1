import { Applicant } from '$lib/database/mongo';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByMobile, findUserByEmail } from '$lib/server/csfle/index.js';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			dateSelected,
			time,
			newDate,
			newTime,
			newTypeAppointment
		} = body;

		if (!dateSelected || !time || !newDate || !newTime || !newTypeAppointment) {
			return json({ success: false, error: 'Missing required rescheduling fields.' }, { status: 400 });
		}

		const isSameSlot = dateSelected === newDate && time === newTime;
		const conflict = isSameSlot
			? null
			: await Applicant.findOne({
					AppointmentData: {
						$elemMatch: {
							dateSelected: newDate,
							time: newTime
						}
					}
				});

		if (conflict) {
			return json(
				{ success: false, error: 'The new time slot has already been booked. Please choose another slot.' },
				{ status: 409 }
			);
		}

		const loginMobileNo = locals.user.mobileNumber;

		let userDoc = await findUserByMobile(Applicant, loginMobileNo);
		if (!userDoc && locals.user.email) {
			userDoc = await findUserByEmail(Applicant, locals.user.email);
		}

		if (!userDoc) {
			return json({ success: false, error: 'Active appointment not found.' }, { status: 404 });
		}

		// Find the user and update the array element matching the old slot to the new slot details
		const updateResult = await Applicant.updateOne(
			{
				_id: userDoc._id,
				'AppointmentData.dateSelected': dateSelected,
				'AppointmentData.time': time
			},
			{
				$set: {
					'AppointmentData.$.dateSelected': newDate,
					'AppointmentData.$.time': newTime,
					'AppointmentData.$.typeOfAppointment': newTypeAppointment,
					'AppointmentData.$.rescheduledAt': new Date()
				}
			}
		);

		if (updateResult.matchedCount === 0) {
			return json({ success: false, error: 'Active appointment not found.' }, { status: 404 });
		}

		return json({ success: true, message: 'Appointment rescheduled successfully.' });
	} catch (error) {
		console.error('❌ Error rescheduling appointment:', error);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};
