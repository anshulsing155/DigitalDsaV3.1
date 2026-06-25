import { Applicant } from '$lib/database/mongo';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Find all applicants having non-empty AppointmentData array
		const applicants = await Applicant.find({
			AppointmentData: { $exists: true, $not: { $size: 0 } }
		} as any).toArray();

		const grouped: Record<string, any[]> = {};

		for (const applicant of applicants) {
			const appointments = Array.isArray((applicant as any).AppointmentData)
				? (applicant as any).AppointmentData
				: [];
			for (const appointment of appointments) {
				if (isDateOrTimeExpired(appointment)) continue;

				const dateSelected = appointment.dateSelected;
				if (!grouped[dateSelected]) {
					grouped[dateSelected] = [];
				}
				grouped[dateSelected].push(appointment);
			}
		}

		// Convert grouped dictionary to expected array format:
		// Array<{ dateSelected: string, AppointmentData: any[] }>
		const result = Object.entries(grouped).map(([dateSelected, data]) => ({
			dateSelected,
			AppointmentData: data
		}));

		return json(result);
	} catch (error) {
		console.error('❌ Error fetching available appointment dates:', error);
		return json({ success: false, error: 'Internal Server Error' }, { status: 500 });
	}
};

function isDateOrTimeExpired(appointment: any): boolean {
	try {
		const currentDate = new Date();

		// Parse the date (assuming format: YYYY-MM-DD)
		const [year, month, day] = appointment.dateSelected.split('-').map(Number);
		if (!year || !month || !day) return true;

		// Parse the time (assuming format: HH:mm AM/PM)
		const [time, ampm] = appointment.time.split(' ');
		const [hour, minute] = time.split(':').map(Number);
		if (isNaN(hour) || isNaN(minute)) return true;

		// Convert to 24-hour format
		let hoursIn24Format = hour;
		if (ampm.toLowerCase() === 'pm' && hoursIn24Format !== 12) hoursIn24Format += 12;
		if (ampm.toLowerCase() === 'am' && hoursIn24Format === 12) hoursIn24Format = 0;

		const appointmentDate = new Date(year, month - 1, day, hoursIn24Format, minute);

		return currentDate > appointmentDate;
	} catch (error) {
		return true; // Treat as expired on error
	}
}
