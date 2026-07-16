/**
 * Utility functions for the authentication system
 */

import { browser } from '$app/environment';

import clientLogger from '$lib/utils/clientLogger';

/**
 * Generate a unique ID with fallback for environments where crypto.randomUUID() is unavailable
 * (older Android WebView, HTTP localhost, Safari private browsing pre-iOS 14).
 */
export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// Fallback: timestamp + random suffix — not cryptographic but sufficient for DOM IDs
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Format mobile number for display
export function formatMobileNumber(mobile: string): string {
	if (!mobile || mobile.length !== 10) return mobile;
	return `${mobile.slice(0, 5)} ${mobile.slice(5)}`;
}

// Validate mobile number format
export function isValidMobileNumber(mobile: string): boolean {
	return /^\d{10}$/.test(mobile);
}

// Validate email format
export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Format time remaining for OTP expiry
export function formatTimeRemaining(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Old generateId(length) replaced by the UUID-based generateId() above

// Debounce function for input validation
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

// Format error messages from Zod validation
export function formatZodError(error: any): Record<string, string> {
	const formattedErrors: Record<string, string> = {};

	if (error?.issues) {
		error.issues.forEach((issue: any) => {
			const path = issue.path.join('.');
			formattedErrors[path] = issue.message;
		});
	}

	return formattedErrors;
}

// Check if user is on mobile device
export function isMobileDevice(): boolean {
	if (!browser) return false;
	return window.innerWidth <= 768;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		} else {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const success = document.execCommand('copy');
			textArea.remove();
			return success;
		}
	} catch (error) {
		clientLogger.error({ err: error }, 'Failed to copy text:');
		return false;
	}
}

// Format date for display
export function formatDate(date: Date | string): string {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// Sanitize user input
export function sanitizeInput(input: string): string {
	return input.trim().replace(/[<>]/g, '');
}

// Check if string is empty or only whitespace
export function isEmpty(str: string | null | undefined): boolean {
	return !str || str.trim().length === 0;
}

// Capitalize first letter of each word
export function capitalizeWords(str: string): string {
	return str.replace(/\b\w/g, (l) => l.toUpperCase());
}


