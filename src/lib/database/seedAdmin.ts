/**
 * Admin User Seed Script
 * ══════════════════════════════════════════════════════════════════
 * Creates the first admin user in the adminUsers collection.
 * Run via: pnpm run seed:admin
 *
 * Usage:
 *   ADMIN_NAME="Your Name" ADMIN_MOBILE="9876543210" pnpm run seed:admin
 *
 * Requires MONGODB_URI in .env
 * ══════════════════════════════════════════════════════════════════
 */

import { MongoClient } from 'mongodb';
import type { AdminUser, AdminPermissions } from '$lib/types/adminUser.js';

async function seedAdmin() {
	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) {
		console.error('MONGODB_URI environment variable is required');
		process.exit(1);
	}

	const name = process.env.ADMIN_NAME;
	const mobile = process.env.ADMIN_MOBILE;

	if (!name || !mobile) {
		console.error('Usage: ADMIN_NAME="Name" ADMIN_MOBILE="9876543210" pnpm run seed:admin');
		process.exit(1);
	}

	const mobileNumber = Number(mobile);
	if (isNaN(mobileNumber) || String(mobileNumber).length < 10) {
		console.error('Invalid mobile number. Must be at least 10 digits.');
		process.exit(1);
	}

	const client = new MongoClient(mongoUri);

	try {
		await client.connect();
		const db = client.db('digitaldsa');
		const adminUsers = db.collection<AdminUser>('adminUsers');

		// Check if admin already exists
		const existing = await adminUsers.findOne({ mobileNumber });
		if (existing) {
			console.log(`Admin user already exists: ${existing.name} (${existing.mobileNumber})`);
			process.exit(0);
		}

		const isSuperAdmin = process.env.IS_SUPER === 'true';

		const permissions: AdminPermissions = {
			user_management: true,
			rule_authoring: true,
			system_settings: true,
			qa_view: true,
			qa_write: true,
			qa_run: true
		};

		const adminDoc: Omit<AdminUser, '_id'> = {
			name,
			mobileNumber,
			permissions,
			is_super_admin: isSuperAdmin,
			is_active: true,
			created_at: new Date(),
			updated_at: new Date()
		};

		const result = await adminUsers.insertOne(adminDoc as AdminUser);

		// Ensure unique index exists
		await adminUsers.createIndex({ mobileNumber: 1 }, { unique: true });

		console.log(`Admin user created successfully:`);
		console.log(`  Name: ${name}`);
		console.log(`  Mobile: ${mobileNumber}`);
		console.log(`  ID: ${result.insertedId.toString()}`);
		console.log(`  Super Admin: ${isSuperAdmin}`);
		console.log(`  Permissions: all enabled`);
		console.log(`\nLogin via the regular /login page with this phone number.`);
	} catch (error) {
		console.error('Seed error:', error);
		process.exit(1);
	} finally {
		await client.close();
	}
}

seedAdmin();
