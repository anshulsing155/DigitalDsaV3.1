import { z } from 'zod';

/**
 * Validation schema for the main contact/enquiry form.
 */
export const contactSchema = z.object({
	userSubject: z.string().min(1, 'Subject is required'),
	userName: z.string().min(1, 'Name is required'),
	userMobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
	feedbackMsg: z.string().min(1, 'Message is required')
});

/**
 * Validation schema for the general feedback form.
 */
export const feedbackSchema = z.object({
	userName: z.string().min(1, 'Name is required'),
	userEmail: z.string().email('Invalid email address'),
	feedbackMsg: z.string().min(1, 'Feedback message is required')
});
