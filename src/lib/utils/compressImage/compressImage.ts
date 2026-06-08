export async function compressImage(file: File, quality = 0.7): Promise<File> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;

			const MAX_WIDTH = 1280;
			const scale = Math.min(1, MAX_WIDTH / image.width);

			canvas.width = image.width * scale;
			canvas.height = image.height * scale;

			ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

			canvas.toBlob(
				(blob) => {
					if (!blob) return reject('Compression failed');
					resolve(new File([blob], file.name, { type: file.type }));
				},
				file.type,
				quality
			);
		};
		image.onerror = reject;
		image.src = URL.createObjectURL(file);
	});
}
