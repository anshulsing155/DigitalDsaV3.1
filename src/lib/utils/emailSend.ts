/**
 * Application-Submit Email Templates
 *
 * Specialized email functions for the applied-application flow.
 * Delegates actual sending to the canonical `sendEmail()` in `$lib/server/email.ts`.
 */

import { sendEmail } from '$lib/server/email.js';
import { FROM_EMAIL } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { escapeHtml } from '$lib/utils/sanitize.js';
import logger from '$lib/server/logger.js';
import { PUBLIC_APP_BASE_URL } from '$lib/config/publicAppUrl';
import fs from 'fs';
import path from 'path';

const ADMIN_EMAIL = env.ADMIN_EMAIL || FROM_EMAIL;

/**
 * Send thank-you email to user after application submission.
 * Returns true if sent successfully, false otherwise.
 */
export const sendUserEmail = async (userEmail: string, userName: string): Promise<boolean> => {
	const result = await sendEmail({
		from: `"DigitalDSA" <${FROM_EMAIL}>`,
		replyTo: ADMIN_EMAIL,
		to: userEmail,
		subject: 'Thank You for Your Application — DigitalDSA',
		html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 40px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <table style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <tr>
                 <td style="background-color: #2563eb; padding: 20px 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 1px;">DigitalDSA</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; color: #333333;">
                    <h2 style="margin-top: 0;">Hi ${escapeHtml(userName)},</h2>
                    <p style="font-size: 16px; line-height: 1.6;">
                      Thank you for submitting your application with <strong>DigitalDSA</strong>.
                      Our team has received your details and is currently reviewing them.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                      You'll hear from us soon regarding the next steps in your loan application process.
                    </p>
                    <div style="margin: 30px 0; text-align: center;">
                      <a href="${PUBLIC_APP_BASE_URL}"
                        style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Visit DigitalDSA
                      </a>
                    </div>
                    <p style="font-size: 15px; color: #555555;">
                      Best regards,<br/>
                      <strong>The DigitalDSA Team</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                    &copy; ${new Date().getFullYear()} DigitalDSA. All rights reserved.<br/>
                    <a href="${PUBLIC_APP_BASE_URL}" style="color: #2563eb; text-decoration: none;">www.digitaldsa.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `
	});

	if (!result.success) {
		logger.error({ error: result.error, to: userEmail }, 'Failed to send user application email');
	}

	return result.success;
};

/**
 * Send admin notification email with JSON + PDF attachments.
 * Returns true if sent successfully, false otherwise.
 *
 * Temp files are cleaned up in a finally block to prevent PII leaks on crash.
 */
export const sendAdminEmail = async (fullData: Record<string, unknown>): Promise<boolean> => {
	const timestamp = Date.now();
	const tempDir = path.join(process.cwd(), 'temp');

	if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

	const jsonPath = path.join(tempDir, `application_${timestamp}.json`);
	const pdfPath = path.join(tempDir, `application_${timestamp}.pdf`);

	try {
		fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2));

		// Sanitize text for PDF (replace unsupported chars like >=, <=, etc.)
		const sanitizeText = (input: string): string => {
			return input.replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/…/g, '...').replace(/₹/g, 'Rs');
		};

		// Lazy-load pdf-lib — avoids pulling ~180 KB into every module that imports emailSend
		const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

		const pdfDoc = await PDFDocument.create();
		let page = pdfDoc.addPage();
		let { height } = page.getSize();
		let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
		const fontSize = 10;
		const rawText = JSON.stringify(fullData, null, 2);
		const text = sanitizeText(rawText);

		const lines = text.split('\n');
		let y = height - 40;

		for (const line of lines) {
			page.drawText(line, { x: 20, y, size: fontSize, font, color: rgb(0, 0, 0) });
			y -= fontSize + 4;
			if (y < 40) {
				page = pdfDoc.addPage();
				({ height } = page.getSize());
				y = height - 40;
				font = await pdfDoc.embedFont(StandardFonts.Helvetica);
			}
		}

		const pdfBytes = await pdfDoc.save();
		fs.writeFileSync(pdfPath, pdfBytes);

		const result = await sendEmail({
			from: `"DigitalDSA Notifications" <${FROM_EMAIL}>`,
			to: ADMIN_EMAIL,
			subject: 'New Application Submitted — DigitalDSA',
			html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8f9fb; padding: 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table style="max-width: 600px; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="background-color: #2563eb; padding: 20px 0; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 14px; letter-spacing: 1px;">DigitalDSA</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; color: #333333;">
                      <h2 style="margin-top: 0; font-size: 20px;">New Application Received</h2>
                      <p style="font-size: 16px; line-height: 1.6;">
                        Hello Admin,
                      </p>
                      <p style="font-size: 16px; line-height: 1.6;">
                        A new application has been submitted via the <strong>DigitalDSA</strong> platform.
                        Please find the attached JSON and PDF files for detailed applicant data.
                      </p>
                      <p style="font-size: 15px; color: #555555;">
                        Best regards,<br/>
                        <strong>DigitalDSA System</strong>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 13px; color: #777;">
                      &copy; ${new Date().getFullYear()} DigitalDSA. Confidential — For internal use only.<br/>
                      <a href="${PUBLIC_APP_BASE_URL}" style="color: #2563eb; text-decoration: none;">www.digitaldsa.com</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
			attachments: [
				{ filename: `application_${timestamp}.json`, path: jsonPath },
				{ filename: `application_${timestamp}.pdf`, path: pdfPath }
			]
		});

		if (!result.success) {
			logger.error({ error: result.error }, 'Failed to send admin application email');
		}

		return result.success;
	} finally {
		// Always clean up temp files — prevents PII leaking on disk if process crashes mid-send
		try {
			if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
		} catch {
			/* ignore cleanup errors */
		}
		try {
			if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
		} catch {
			/* ignore cleanup errors */
		}
	}
};
