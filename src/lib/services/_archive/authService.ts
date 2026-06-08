// Authentication service implementation
import type {
	AuthService,
	LoginCredentials,
	RegistrationData,
	AuthResult,
	RegistrationResult,
	VerificationResult,
	AuthError
} from '$lib/types/auth';
import { AuthErrorType } from '$lib/types/auth';
import { validateInput, loginSchema, registrationSchema } from '$lib/schemas/authSchemas';
import { secureFetch } from '$lib/utils/csrf';
import logger from '$lib/utils/clientLogger';

interface ServerErrorResponse {
	message?: string;
	error?: string;
	field?: string;
	suggestions?: string[];
	retryAfter?: number;
}

class AuthServiceImpl implements AuthService {
	private baseUrl = '/api/auth';

	async login(credentials: LoginCredentials): Promise<AuthResult> {
		try {
			// Validate input
			const validation = validateInput(loginSchema, credentials);
			if (!validation.success) {
				return {
					success: false,
					error: {
						type: AuthErrorType.VALIDATION_ERROR,
						message: 'Invalid input data',
						field: validation.errors?.[0]?.field,
						suggestions: validation.errors?.map((e) => e.message)
					}
				};
			}

			const response = await fetch(`${this.baseUrl}/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(validation.data)
			});

			const data = await response.json();

			if (response.ok) {
				return {
					success: true,
					user: data.user,
					token: data.token,
					refreshToken: data.refreshToken
				};
			} else {
				return {
					success: false,
					error: this.mapServerError(data, response.status)
				};
			}
		} catch (error) {
			logger.error('AuthService: login error', error);
			return {
				success: false,
				error: {
					type: AuthErrorType.NETWORK_ERROR,
					message: 'Network error. Please check your connection and try again.'
				}
			};
		}
	}

	async register(data: RegistrationData): Promise<RegistrationResult> {
		try {
			// Validate input
			const validation = validateInput(registrationSchema, data);
			if (!validation.success) {
				return {
					success: false,
					error: {
						type: AuthErrorType.VALIDATION_ERROR,
						message: 'Invalid input data',
						field: validation.errors?.[0]?.field,
						suggestions: validation.errors?.map((e) => e.message)
					}
				};
			}

			const response = await fetch(`${this.baseUrl}/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(validation.data)
			});

			const responseData = await response.json();

			if (response.ok) {
				return {
					success: true,
					user: responseData.user,
					verificationRequired: responseData.verificationRequired ?? true
				};
			} else {
				return {
					success: false,
					error: this.mapServerError(responseData, response.status)
				};
			}
		} catch (error) {
			logger.error('AuthService: registration error', error);
			return {
				success: false,
				error: {
					type: AuthErrorType.NETWORK_ERROR,
					message: 'Network error. Please check your connection and try again.'
				}
			};
		}
	}

	async logout(): Promise<void> {
		try {
			await secureFetch(`${this.baseUrl}/logout`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch (error) {
			logger.error('AuthService: logout error', error);
			// Don't throw error for logout - always clear local session
		}
	}

	async refreshToken(token: string): Promise<AuthResult> {
		try {
			const response = await secureFetch(`${this.baseUrl}/refresh`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			const data = await response.json();

			if (response.ok) {
				return {
					success: true,
					user: data.user,
					token: data.token,
					refreshToken: data.refreshToken
				};
			} else {
				return {
					success: false,
					error: this.mapServerError(data, response.status)
				};
			}
		} catch (error) {
			logger.error('AuthService: token refresh error', error);
			return {
				success: false,
				error: {
					type: AuthErrorType.NETWORK_ERROR,
					message: 'Failed to refresh session. Please log in again.'
				}
			};
		}
	}

	async verifyEmail(token: string): Promise<VerificationResult> {
		try {
			const response = await fetch(`${this.baseUrl}/verify-email`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token })
			});

			const data = await response.json();

			if (response.ok) {
				return {
					success: true,
					user: data.user
				};
			} else {
				return {
					success: false,
					error: this.mapServerError(data, response.status)
				};
			}
		} catch (error) {
			logger.error('AuthService: email verification error', error);
			return {
				success: false,
				error: {
					type: AuthErrorType.NETWORK_ERROR,
					message: 'Network error. Please try again.'
				}
			};
		}
	}

	async forgotPassword(email: string): Promise<void> {
		try {
			const response = await secureFetch(`${this.baseUrl}/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to send password reset email');
			}
		} catch (error) {
			logger.error('AuthService: forgot-password error', error);
			throw error;
		}
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		try {
			const response = await secureFetch(`${this.baseUrl}/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password: newPassword })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to reset password');
			}
		} catch (error) {
			logger.error('AuthService: reset-password error', error);
			throw error;
		}
	}

	private mapServerError(data: ServerErrorResponse, status: number): AuthError {
		// Map server errors to client error types
		switch (status) {
			case 400:
				return {
					type: AuthErrorType.VALIDATION_ERROR,
					message: data.message || 'Invalid request data',
					field: data.field,
					suggestions: data.suggestions
				};
			case 401:
				return {
					type: AuthErrorType.INVALID_CREDENTIALS,
					message: data.message || 'Invalid email or password'
				};
			case 403:
				if (data.message?.includes('not verified') || data.error === 'Email not verified') {
					return {
						type: AuthErrorType.EMAIL_NOT_VERIFIED,
						message: 'Please verify your email address before logging in'
					};
				}
				return {
					type: AuthErrorType.ACCOUNT_LOCKED,
					message: data.message || 'Account access denied'
				};
			case 409:
				return {
					type: AuthErrorType.EMAIL_EXISTS,
					message: 'An account with this email already exists'
				};
			case 429:
				return {
					type: AuthErrorType.RATE_LIMITED,
					message: 'Too many attempts. Please try again later.',
					retryAfter: data.retryAfter
				};
			case 500:
			default:
				return {
					type: AuthErrorType.SERVER_ERROR,
					message: 'Server error. Please try again later.'
				};
		}
	}
}

// Export singleton instance
export const authService = new AuthServiceImpl();
