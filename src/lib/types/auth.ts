// Authentication system types and interfaces
export interface User {
	id: string;
	email: string;
	name: string;
	phone: string;
	role: 'user' | 'agent' | 'admin';
	isEmailVerified: boolean;
	isPhoneVerified: boolean;
	profile: UserProfile;
	preferences: UserPreferences;
	createdAt: Date;
	updatedAt: Date;
	lastLoginAt?: Date;
}

export interface UserProfile {
	avatar?: string;
	dateOfBirth?: Date;
	address?: Address;
	occupation?: string;
	income?: number;
	documents?: Document[];
}

export interface Address {
	street: string;
	city: string;
	state: string;
	pincode: string;
	country: string;
}

export interface UserPreferences {
	notifications: NotificationSettings;
	privacy: PrivacySettings;
	language: string;
	theme: 'light' | 'dark';
}

export interface NotificationSettings {
	email: boolean;
	sms: boolean;
	push: boolean;
	marketing: boolean;
}

export interface PrivacySettings {
	profileVisibility: 'public' | 'private';
	dataSharing: boolean;
	analytics: boolean;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: User | null;
	token: string | null;
	loading: boolean;
	error: string | null;
	sessionExpiry: number | null;
}

export interface Session {
	id: string;
	userId: string;
	token: string;
	refreshToken: string;
	deviceFingerprint: string;
	deviceInfo: DeviceInfo;
	ipAddress: string;
	userAgent: string;
	createdAt: Date;
	expiresAt: Date;
	lastAccessedAt: Date;
	isActive: boolean;
}

export interface DeviceInfo {
	type: 'desktop' | 'mobile' | 'tablet';
	os: string;
	browser: string;
	fingerprint: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
	rememberMe?: boolean;
}

export interface RegistrationData {
	name: string;
	email: string;
	phone: string;
	password: string;
	confirmPassword: string;
	termsAccepted: boolean;
}

export interface AuthResult {
	success: boolean;
	user?: User;
	token?: string;
	refreshToken?: string;
	error?: AuthError;
}

export interface RegistrationResult {
	success: boolean;
	user?: User;
	verificationRequired?: boolean;
	error?: AuthError;
}

export interface VerificationResult {
	success: boolean;
	user?: User;
	error?: AuthError;
}

export interface SessionData {
	token: string;
	refreshToken: string;
	expiresAt: number;
	user: User;
	deviceFingerprint: string;
}

export interface SessionValidation {
	valid: boolean;
	user?: User;
	reason?: string;
}

export enum AuthErrorType {
	INVALID_CREDENTIALS = 'invalid_credentials',
	ACCOUNT_LOCKED = 'account_locked',
	EMAIL_NOT_VERIFIED = 'email_not_verified',
	SESSION_EXPIRED = 'session_expired',
	RATE_LIMITED = 'rate_limited',
	WEAK_PASSWORD = 'weak_password',
	EMAIL_EXISTS = 'email_exists',
	INVALID_TOKEN = 'invalid_token',
	NETWORK_ERROR = 'network_error',
	SERVER_ERROR = 'server_error',
	VALIDATION_ERROR = 'validation_error'
}

export interface AuthError {
	type: AuthErrorType;
	message: string;
	field?: string;
	retryAfter?: number;
	suggestions?: string[];
}

export interface AuthEvent {
	id: string;
	userId?: string;
	type: 'login' | 'logout' | 'register' | 'password_reset' | 'failed_login' | 'email_verification';
	ipAddress: string;
	userAgent: string;
	success: boolean;
	errorMessage?: string;
	metadata?: Record<string, any>;
	timestamp: Date;
}

// Service interfaces
export interface AuthService {
	login(credentials: LoginCredentials): Promise<AuthResult>;
	register(data: RegistrationData): Promise<RegistrationResult>;
	logout(): Promise<void>;
	refreshToken(token: string): Promise<AuthResult>;
	verifyEmail(token: string): Promise<VerificationResult>;
	forgotPassword(email: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
}

export interface SessionService {
	createSession(user: User, deviceInfo: DeviceInfo): Promise<SessionData>;
	validateSession(token: string): Promise<SessionValidation>;
	refreshSession(token: string): Promise<SessionData>;
	invalidateSession(token: string): Promise<void>;
	invalidateAllSessions(userId: string): Promise<void>;
	getActiveSessions(userId: string): Promise<SessionInfo[]>;
}

export interface SessionInfo {
	id: string;
	deviceInfo: DeviceInfo;
	ipAddress: string;
	createdAt: Date;
	lastAccessedAt: Date;
	isCurrent: boolean;
}

// Store interfaces
export interface AuthStore {
	// State
	subscribe: (callback: (state: AuthState) => void) => () => void;

	// Actions
	init(): Promise<void>;
	login(credentials: LoginCredentials): Promise<boolean>;
	register(data: RegistrationData): Promise<boolean>;
	logout(): Promise<void>;
	refreshAuth(): Promise<void>;
	clearError(): void;
	updateUser(userData: Partial<User>): void;
	reset(): void;

	// Getters
	hasRole(role: string): boolean;
	isEmailVerified(): boolean;
	getPermissions(): string[];

	// Session management
	getSessionTimeRemaining(): Promise<number>;
	hasActiveSession(): Promise<boolean>;
	getActiveSessions(): Promise<any[]>;
	logoutAllDevices(): Promise<void>;
}

// Guard interfaces
export interface AuthGuard {
	requireAuth(): boolean;
	requireRole(role: string): boolean;
	requireVerification(): boolean;
	optionalAuth(): boolean;
}

// Validation interfaces
export interface ValidationResult<T = any> {
	success: boolean;
	data?: T;
	errors?: ValidationError[];
}

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}
