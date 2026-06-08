import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { verifyRefreshToken, generateTokenPair } from '$lib/services/jwtService';
import { Applicant } from '$lib/database/mongo';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		const refreshToken = cookies.get('refreshToken');
		if (!refreshToken) return json({ success: false }, { status: 401 });

		// Validate refresh token
		const decoded = verifyRefreshToken(refreshToken);
		if (!decoded.valid || !decoded.payload) return json({ success: false }, { status: 401 });

		// Refresh token payload → { userId, tokenId }
		const { userId } = decoded.payload;

		const user = await Applicant.findOne({ _id: new ObjectId(userId) });
		if (!user) return json({ success: false }, { status: 401 });

		// ✅ Issue new access+refresh pair
		const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(
			user._id.toString(),
			user.email || '',
			user.mobileNumber,
			user.name || '',
			crypto.randomUUID() // new tokenId
		);

		// Store tokens in cookies
		cookies.set('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: 60 * 15,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'strict'
		});

		cookies.set('refreshToken', newRefreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: 60 * 60 * 24 * 7,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'strict'
		});

		// Keep role for SSR redirects
		cookies.set('role', user.role ?? 'user', {
			path: '/',
			maxAge: 60 * 60 * 24 * 7,
			secure: process.env.NODE_ENV !== 'development',
			sameSite: 'strict'
		});

		return json({ success: true, accessToken, refreshToken: newRefreshToken });
	} catch (err: unknown) {
		return json({ success: false }, { status: 401 });
	}
};
