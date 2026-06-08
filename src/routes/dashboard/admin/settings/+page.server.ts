import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { AdminUsers, ApiKeys, SystemConfigs } from '$lib/database/mongo.js';
import { DEFAULT_SYSTEM_CONFIGS } from '$lib/types/policyEngine.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	const mobileNum = locals.user?.mobileNumber;

	const [adminUser, apiKeys, systemConfigs] = await Promise.all([
		mobileNum ? AdminUsers.findOne({ mobileNumber: Number(mobileNum) }) : null,
		ApiKeys.find({}).sort({ created_at: -1 }).project({ encrypted_value: 0 }).toArray(),
		SystemConfigs.find({}).sort({ group: 1, config_key: 1 }).toArray()
	]);

	// Auto-seed system configs if empty
	if (systemConfigs.length === 0) {
		const now = new Date();
		const seeded = DEFAULT_SYSTEM_CONFIGS.map((c) => ({
			...c,
			updated_by: 'system',
			updated_at: now
		}));
		await SystemConfigs.insertMany(seeded as any[]);
		const freshConfigs = await SystemConfigs.find({}).sort({ group: 1, config_key: 1 }).toArray();
		systemConfigs.push(...freshConfigs);
	}

	return {
		admin: adminUser
			? {
					_id: adminUser._id.toString(),
					name: adminUser.name,
					mobileNumber: adminUser.mobileNumber,
					email: adminUser.email || null,
					permissions: adminUser.permissions,
					is_active: adminUser.is_active,
					last_login: adminUser.last_login ? new Date(adminUser.last_login).toISOString() : null,
					created_at: adminUser.created_at ? new Date(adminUser.created_at).toISOString() : null,
					// E.2 — surface 2FA status for the Admin2faSection component.
					// Secret + hashes are deliberately NOT sent to the client.
					twofa: {
						enabled: adminUser.twofa?.enabled === true,
						enrolled_at: adminUser.twofa?.enrolled_at
							? new Date(adminUser.twofa.enrolled_at).toISOString()
							: null,
						recovery_codes_remaining: adminUser.twofa?.recovery_code_hashes?.length ?? 0
					}
				}
			: null,
		apiKeys: apiKeys.map((k) => ({
			_id: k._id.toString(),
			key_id: k.key_id,
			provider: k.provider,
			label: k.label,
			last_four: k.last_four,
			is_active: k.is_active,
			last_used: k.last_used ? new Date(k.last_used).toISOString() : null,
			created_at: k.created_at ? new Date(k.created_at).toISOString() : null
		})),
		systemConfigs: systemConfigs.map((c) => ({
			_id: c._id.toString(),
			config_key: c.config_key,
			value: c.value,
			label: c.label,
			description: c.description,
			group: c.group,
			value_type: c.value_type,
			updated_by: c.updated_by,
			updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : null
		}))
	};
};
