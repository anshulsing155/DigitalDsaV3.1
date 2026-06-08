export interface DsaOnboardingType {
	name: string;
	age: string;
	gender: string;
	businessType: string;
	phone: string;
	email: string;
	otp: string;
	otpVerified: boolean;
	location: {
		address: string;
		city: string;
		state: string;
		pincode: string;
	};
	loanTypes: string[];
	banks: string[];
	preferredRMs: string[];
	dsaCodes: string[];
	rmDetails: {
		name: string;
		email: string;
		phone: string;
	};
	imageDetails: {
		url: string;
		photo: string;
		previewUrl: string;
		photoUploading: boolean;
		photoError: string;
	};
	documentDetails: {
		panNumber: string;
		gstNumber: string;
	};
	kyc: File | null;
}
