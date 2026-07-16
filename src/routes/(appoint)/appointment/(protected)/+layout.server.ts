import { Applicant } from '$lib/database/mongo';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { findUserByMobile, findUserByEmail } from '$lib/server/csfle/index.js';

interface Appointment {
    dateSelected: string;
    time: string;
    [key: string]: unknown;
}

interface ApplicantData {
    AppointmentData?: Appointment[];
}

export const load: LayoutServerLoad = async ({
    locals,
    url
}) => {
    const mobileNumber = locals.user?.mobileNumber;

    if (!mobileNumber) {
        return {
            user: locals.user || null,
            activeAppointments: []
        };
    }

    try {
        let userDoc = await findUserByMobile(Applicant, mobileNumber);
        if (!userDoc && locals.user.email) {
            userDoc = await findUserByEmail(Applicant, locals.user.email);
        }

        const appointments =
            (userDoc as any)?.AppointmentData ?? [];

        const activeAppointments = appointments.filter(
            (appointment) =>
                !isAppointmentExpired(appointment)
        );

        return {
            user: locals.user,
            activeAppointments
        };
    } catch (error) {
        console.error(
            '[Appointment Layout] Failed to load appointments:',
            error
        );

        return {
            user: locals.user,
            activeAppointments: []
        };
    }
};

/**
 * Returns true if appointment has expired.
 */
function isAppointmentExpired(appointment: any): boolean {
    try {
        const currentDate = new Date();

        // Parse the date from the appointment
        const [year, month, day] = appointment.dateSelected.split('-').map(Number); // Assuming date format is YYYY-MM-DD

        // Extract the time and AM/PM
        const [time, ampm] = appointment.time.split(' '); // Assuming time format is HH:mm AM/PM
        const [hour, minute] = time.split(':').map(Number); // Split hour and minute

        // Convert the time to 24-hour format
        let hoursIn24Format = hour;
        if (ampm.toLowerCase() === 'pm' && hoursIn24Format !== 12) {
            hoursIn24Format += 12;
        }
        if (ampm.toLowerCase() === 'am' && hoursIn24Format === 12) {
            hoursIn24Format = 0;
        }

        // Create a Date object for the appointment
        const appointmentDate = new Date(
            year,
            month - 1,
            day,
            hoursIn24Format,
            minute,
            0,
            0
        );

        // Compare the appointment date with the current date
        return currentDate > appointmentDate; // Returns true if expired
    } catch (error) {
        console.error('Error checking date or time expiry:', error);
        return true; // Treat as expired in case of an error
    }
}