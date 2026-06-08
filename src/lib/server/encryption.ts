/**
 * AES-256-GCM encryption utilities for API key storage.
 * Keys are encrypted at rest and NEVER exposed to the client.
 *
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error('ENCRYPTION_KEY environment variable is not set');
	}
	// Key must be exactly 32 bytes for AES-256
	const keyBuffer = Buffer.from(key, 'base64');
	if (keyBuffer.length !== 32) {
		throw new Error('ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
	}
	return keyBuffer;
}

/** Encrypt a plaintext string. Returns "iv:authTag:ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

	let encrypted = cipher.update(plaintext, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	const authTag = cipher.getAuthTag();

	return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/** Decrypt a "iv:authTag:ciphertext" string back to plaintext. */
export function decrypt(encryptedValue: string): string {
	const key = getEncryptionKey();
	const [ivB64, authTagB64, ciphertextB64] = encryptedValue.split(':');

	if (!ivB64 || !authTagB64 || !ciphertextB64) {
		throw new Error('Invalid encrypted value format');
	}

	const iv = Buffer.from(ivB64, 'base64');
	const authTag = Buffer.from(authTagB64, 'base64');

	const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(ciphertextB64, 'base64', 'utf8');
	decrypted += decipher.final('utf8');

	return decrypted;
}

/** Extract the last 4 characters from a plaintext key for masked display. */
export function getLastFour(plaintext: string): string {
	if (plaintext.length <= 4) return plaintext;
	return plaintext.slice(-4);
}
