import type { ObjectId } from 'mongodb';

export interface DeviceRecord {
	_id?: ObjectId;
	userId: ObjectId;
	userCollection: 'userApplications' | 'DsaApplications' | 'rmApplications';
	fingerprint: string;
	deviceInfo: {
		type: 'desktop' | 'mobile' | 'tablet';
		os: string;
		browser: string;
	};
	firstSeen: Date;
	lastSeen: Date;
	loginCount: number;
	flags: string[];
}
