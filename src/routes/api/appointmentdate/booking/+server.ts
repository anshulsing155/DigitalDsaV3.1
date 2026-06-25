import { Applicant } from '$lib/database/mongo';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByMobile, findUserByEmail } from '$lib/server/csfle/index.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const usersWithAppointments = await Applicant.find(
			{ AppointmentData: { $exists: true, $ne: [] } },
			{ projection: { AppointmentData: 1 } }
		).toArray();

		const appointmentsByDate = new Map<string, Array<{ time: string }>>();

		for (const user of usersWithAppointments) {
			const appointments = Array.isArray((user as any).AppointmentData)
				? (user as any).AppointmentData
				: [];

			for (const appointment of appointments) {
				if (!appointment?.dateSelected || !appointment?.time) continue;
				if (isDateOrTimeExpired(appointment)) continue;

				const dateAppointments = appointmentsByDate.get(appointment.dateSelected) ?? [];
				dateAppointments.push({ time: appointment.time });
				appointmentsByDate.set(appointment.dateSelected, dateAppointments);
			}
		}

		return json(
			Array.from(appointmentsByDate.entries()).map(([dateSelected, AppointmentData]) => ({
				dateSelected,
				AppointmentData
			}))
		);
	} catch (error) {
		console.error('Error loading appointment availability:', error);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			name,
			emailId,
			mobileNo,
			dateSelected,
			time,
			typeOfAppointment,
			purposeOfAppointment
		} = body;

		if (!name || !emailId || !mobileNo || !dateSelected || !time || !typeOfAppointment) {
			return json({ success: false, error: 'Missing required booking fields.' }, { status: 400 });
		}

		// Conflict Check: Check if slot is already booked by anyone
		const conflict = await Applicant.findOne({
			AppointmentData: {
				$elemMatch: {
					dateSelected,
					time
				}
			}
		});

		if (conflict) {
			return json(
				{ success: false, error: 'This time slot has already been booked. Please choose another slot.' },
				{ status: 409 }
			);
		}

		const loginMobileNo = locals.user.mobileNumber;

		// Store the appointment inside the user's document
		const appointment = {
			name,
			emailId,
			mobileNo,
			dateSelected,
			time,
			typeOfAppointment,
			loginEmail: locals.user.email || emailId,
			loginMobileNo: String(loginMobileNo),
			purposeOfAppointment,
			bookedAt: new Date()
		};

		let userDoc = await findUserByMobile(Applicant, loginMobileNo);
		if (!userDoc && locals.user.email) {
			userDoc = await findUserByEmail(Applicant, locals.user.email);
		}

		if (!userDoc) {
			return json({ success: false, error: 'User profile not found in database.' }, { status: 404 });
		}

		const updateResult = await Applicant.updateOne(
			{ _id: userDoc._id },
			{ $push: { AppointmentData: appointment } }
		);

		if (updateResult.matchedCount === 0) {
			return json({ success: false, error: 'User profile not found in database.' }, { status: 404 });
		}

		return json({ success: true, message: 'Appointment booked successfully.' });
	} catch (error) {
		console.error('❌ Error booking appointment:', error);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};

function isDateOrTimeExpired(appointment: any): boolean {
	try {
		const [year, month, day] = appointment.dateSelected.split('-').map(Number);
		const [time, ampm] = appointment.time.split(' ');
		const [hour, minute] = time.split(':').map(Number);

		let hoursIn24Format = hour;
		if (ampm?.toLowerCase() === 'pm' && hoursIn24Format !== 12) hoursIn24Format += 12;
		if (ampm?.toLowerCase() === 'am' && hoursIn24Format === 12) hoursIn24Format = 0;

		const appointmentDate = new Date(year, month - 1, day, hoursIn24Format, minute);
		return new Date() > appointmentDate;
	} catch {
		return true;
	}
}
