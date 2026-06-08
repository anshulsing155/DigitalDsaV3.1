import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } from '$env/static/private';

export const createTransporter = () => {
	const port = parseInt(SMTP_PORT || '587');
	const secure = SMTP_SECURE === 'true' || port === 465;

	return nodemailer.createTransport({
		host: SMTP_HOST || 'smtp.gmail.com',
		port,
		secure,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS
		}
	});
};
