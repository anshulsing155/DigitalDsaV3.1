/**
 * Session duration constants — single source of truth for cookie maxAge and DB expiry.
 */

export const REFRESH_TOKEN_DAYS = 30;
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_DAYS * 24 * 60 * 60; // seconds
export const ACCESS_COOKIE_MAX_AGE = 15 * 60; // 15 minutes in seconds
