// Device fingerprinting utilities for enhanced security
import type { DeviceInfo } from '$lib/types/auth';
import clientLogger from '$lib/utils/clientLogger';
import { browser } from '$app/environment';

export class DeviceFingerprinter {
	private static instance: DeviceFingerprinter;
	private fingerprint: string | null = null;

	static getInstance(): DeviceFingerprinter {
		if (!DeviceFingerprinter.instance) {
			DeviceFingerprinter.instance = new DeviceFingerprinter();
		}
		return DeviceFingerprinter.instance;
	}

	async generateFingerprint(): Promise<string> {
		if (!browser) {
			return 'server-side-fingerprint';
		}

		if (this.fingerprint) {
			return this.fingerprint;
		}

		const components = await this.collectFingerprintComponents();
		this.fingerprint = await this.hashComponents(components);
		return this.fingerprint;
	}

	async getDeviceInfo(): Promise<DeviceInfo> {
		if (!browser) {
			return {
				type: 'desktop',
				os: 'unknown',
				browser: 'unknown',
				fingerprint: 'server-side-fingerprint'
			};
		}

		const fingerprint = await this.generateFingerprint();
		const userAgent = navigator.userAgent;

		return {
			type: this.detectDeviceType(userAgent),
			os: this.detectOS(userAgent),
			browser: this.detectBrowser(userAgent),
			fingerprint
		};
	}

	private async collectFingerprintComponents(): Promise<Record<string, unknown>> {
		const components: Record<string, unknown> = {};

		try {
			// Screen information
			components.screen = {
				width: screen.width,
				height: screen.height,
				colorDepth: screen.colorDepth,
				pixelDepth: screen.pixelDepth
			};

			// Timezone
			components.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

			// Language
			components.language = navigator.language;
			components.languages = navigator.languages;

			// Platform
			components.platform = navigator.platform;

			// User agent
			components.userAgent = navigator.userAgent;

			// Hardware concurrency
			components.hardwareConcurrency = navigator.hardwareConcurrency;

			// Memory (if available)
			if ('deviceMemory' in navigator) {
				components.deviceMemory = (navigator as any).deviceMemory;
			}

			// Canvas fingerprinting
			components.canvas = this.getCanvasFingerprint();

			// WebGL fingerprinting
			components.webgl = this.getWebGLFingerprint();

			// Audio context fingerprinting
			components.audio = await this.getAudioFingerprint();

			// Local storage availability
			components.localStorage = this.testLocalStorage();
			components.sessionStorage = this.testSessionStorage();

			// Cookies enabled
			components.cookiesEnabled = navigator.cookieEnabled;

			// Do Not Track
			components.doNotTrack = navigator.doNotTrack;
		} catch (error) {
			clientLogger.warn({ err: error }, 'Error collecting fingerprint components:');
		}

		return components;
	}

	private getCanvasFingerprint(): string {
		try {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return 'no-canvas';

			canvas.width = 200;
			canvas.height = 50;

			// Draw some text and shapes
			ctx.textBaseline = 'top';
			ctx.font = '14px Arial';
			ctx.fillStyle = '#f60';
			ctx.fillRect(125, 1, 62, 20);
			ctx.fillStyle = '#069';
			ctx.fillText('DigitalDSA 🏦', 2, 15);
			ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
			ctx.fillText('Security Check', 4, 35);

			return canvas.toDataURL();
		} catch (error) {
			return 'canvas-error';
		}
	}

	private getWebGLFingerprint(): string {
		try {
			const canvas = document.createElement('canvas');
			const gl =
				canvas.getContext('webgl') ||
				(canvas.getContext('experimental-webgl') as WebGLRenderingContext);
			if (!gl) return 'no-webgl';

			const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
			if (!debugInfo) return 'no-debug-info';

			const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
			const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

			return `${vendor}~${renderer}`;
		} catch (error) {
			return 'webgl-error';
		}
	}

	private async getAudioFingerprint(): Promise<string> {
		try {
			const ctx = new OfflineAudioContext(1, 4096, 44100);
			const oscillator = ctx.createOscillator();
			oscillator.type = 'triangle';
			oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

			const compressor = ctx.createDynamicsCompressor();
			compressor.threshold.setValueAtTime(-50, ctx.currentTime);
			compressor.knee.setValueAtTime(40, ctx.currentTime);
			compressor.ratio.setValueAtTime(12, ctx.currentTime);
			compressor.attack.setValueAtTime(0, ctx.currentTime);
			compressor.release.setValueAtTime(0.25, ctx.currentTime);

			oscillator.connect(compressor);
			compressor.connect(ctx.destination);
			oscillator.start(0);

			const rendered = await ctx.startRendering();
			const data = rendered.getChannelData(0);
			let fingerprint = 0;
			for (let i = 0; i < data.length; i++) {
				fingerprint += Math.abs(data[i]);
			}
			return fingerprint.toString();
		} catch (error) {
			return 'audio-error';
		}
	}

	private testLocalStorage(): boolean {
		try {
			const test = 'test';
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		} catch (error) {
			return false;
		}
	}

	private testSessionStorage(): boolean {
		try {
			const test = 'test';
			sessionStorage.setItem(test, test);
			sessionStorage.removeItem(test);
			return true;
		} catch (error) {
			return false;
		}
	}

	private async hashComponents(components: Record<string, unknown>): Promise<string> {
		const jsonString = JSON.stringify(components, Object.keys(components).sort());
		const encoder = new TextEncoder();
		const data = encoder.encode(jsonString);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
		if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
			return 'tablet';
		}
		if (
			/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
				userAgent
			)
		) {
			return 'mobile';
		}
		return 'desktop';
	}

	private detectOS(userAgent: string): string {
		if (userAgent.includes('Windows NT 10.0')) return 'Windows 10';
		if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
		if (userAgent.includes('Windows NT 6.2')) return 'Windows 8';
		if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
		if (userAgent.includes('Windows NT 6.0')) return 'Windows Vista';
		if (userAgent.includes('Windows NT 5.1')) return 'Windows XP';
		if (userAgent.includes('Windows')) return 'Windows';
		if (userAgent.includes('Mac OS X')) return 'macOS';
		if (userAgent.includes('Linux')) return 'Linux';
		if (userAgent.includes('Android')) return 'Android';
		if (userAgent.includes('iOS')) return 'iOS';
		return 'Unknown';
	}

	private detectBrowser(userAgent: string): string {
		if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) return 'Chrome';
		if (userAgent.includes('Firefox')) return 'Firefox';
		if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
		if (userAgent.includes('Edge')) return 'Edge';
		if (userAgent.includes('Opera')) return 'Opera';
		if (userAgent.includes('Internet Explorer')) return 'Internet Explorer';
		return 'Unknown';
	}
}

// Export singleton instance
export const deviceFingerprinter = DeviceFingerprinter.getInstance();
