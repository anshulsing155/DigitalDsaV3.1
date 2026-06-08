import { browser } from '$app/environment';

/**
 * Client-side CSRF token utility
 */
class CSRFClient {
	private tokenCache: string | null = null;
	private readonly cookieName = 'digitaldsa_csrf';
	private readonly headerName = 'x-csrf-token';

	/**
	 * Get CSRF token from cookie
	 */
	private getTokenFromCookie(): string | null {
		if (!browser) return null;

		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === this.cookieName) {
				return decodeURIComponent(value);
			}
		}
		return null;
	}

	/**
	 * Fetch CSRF token from server
	 */
	private async fetchTokenFromServer(): Promise<string | null> {
		try {
			const response = await fetch('/api/csrf', {
				method: 'GET',
				credentials: 'include'
			});

			if (!response.ok) {
				console.error('Failed to fetch CSRF token:', response.status);
				return null;
			}

			const data = await response.json();
			return data.token || null;
		} catch (error) {
			console.error('Error fetching CSRF token:', error);
			return null;
		}
	}

	/**
	 * Get CSRF token (from cache, cookie, or server)
	 */
	async getToken(): Promise<string | null> {
		if (!browser) return null;

		// Try cache first
		if (this.tokenCache) {
			return this.tokenCache;
		}

		// Try cookie
		const cookieToken = this.getTokenFromCookie();
		if (cookieToken) {
			this.tokenCache = cookieToken;
			return cookieToken;
		}

		// Fetch from server
		const serverToken = await this.fetchTokenFromServer();
		if (serverToken) {
			this.tokenCache = serverToken;
			return serverToken;
		}

		return null;
	}

	/**
	 * Clear cached token
	 */
	clearCache(): void {
		this.tokenCache = null;
	}

	/**
	 * Get headers with CSRF token
	 */
	async getHeaders(
		additionalHeaders: Record<string, string> = {}
	): Promise<Record<string, string>> {
		const token = await this.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...additionalHeaders
		};

		if (token) {
			headers[this.headerName] = token;
		}

		return headers;
	}

	/**
	 * Make a fetch request with CSRF token
	 */
	async fetch(url: string, options: RequestInit = {}): Promise<Response> {
		const headers = await this.getHeaders((options.headers as Record<string, string>) || {});

		return fetch(url, {
			...options,
			headers,
			credentials: 'include'
		});
	}
}

// Export singleton instance
export const csrfClient = new CSRFClient();

// Export utility functions
export async function getCSRFToken(): Promise<string | null> {
	return csrfClient.getToken();
}

export async function getCSRFHeaders(
	additionalHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
	return csrfClient.getHeaders(additionalHeaders);
}

export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
	return csrfClient.fetch(url, options);
}
