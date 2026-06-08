import * as faceDetection from '@mediapipe/face_detection';

export async function checkBrightness(image: HTMLImageElement) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = image.width;
	canvas.height = image.height;
	ctx.drawImage(image, 0, 0);

	const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	let sum = 0;

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i],
			g = data[i + 1],
			b = data[i + 2];
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		sum += luminance;
	}

	const brightness = sum / (data.length / 4);
	return brightness >= 60; // threshold
}

export async function checkBlur(image: HTMLImageElement) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = image.width;
	canvas.height = image.height;
	ctx.drawImage(image, 0, 0);

	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	let variance = 0,
		mean = 0;

	for (let i = 0; i < imgData.length; i += 4) {
		mean += imgData[i];
	}
	mean /= imgData.length / 4;

	for (let i = 0; i < imgData.length; i += 4) {
		variance += Math.pow(imgData[i] - mean, 2);
	}
	variance /= imgData.length / 4;

	return variance >= 300; // lower variance → blur
}

interface FaceDetectionResults {
	detections?: unknown[];
}

export async function checkFacePresence(image: HTMLImageElement) {
	return new Promise<boolean>((resolve) => {
		const detector = new faceDetection.FaceDetection({
			locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
		});
		detector.setOptions({ model: 'short', minDetectionConfidence: 0.6 });
		detector.onResults((res: FaceDetectionResults) => resolve((res.detections?.length ?? 0) > 0));

		const canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const ctx = canvas.getContext('2d')!;
		ctx.drawImage(image, 0, 0);

		detector.send({ image: canvas });
	});
}
