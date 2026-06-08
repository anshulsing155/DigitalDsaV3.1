import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.eyantrik.digitaldsa',
	appName: 'DigitalDSA',
	webDir: 'build',
	server: {
		androidScheme: 'https',
		url: 'https://digitaldsa.com',
		cleartext: false
	},

	plugins: {
		SplashScreen: {
			launchShowDuration: 2000,
			launchAutoHide: true,
			launchFadeOutDuration: 3000,
			backgroundColor: '#0D92F4',
			androidSplashResourceName: 'splash',
			androidScaleType: 'CENTER_CROP',
			showSpinner: false,
			androidSpinnerStyle: 'small',
			iosSpinnerStyle: 'small',
			spinnerColor: '#999999',
			splashFullScreen: true,
			splashImmersive: true,
			layoutName: 'launch_screen',
			useDialog: true
		}
	}
};

export default config;
