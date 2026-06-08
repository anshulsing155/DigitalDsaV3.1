// src/lib/imagekit/server.ts
import ImageKit from '@imagekit/nodejs';

// These are imported from $env/static/private → server-only, build-time safe
// No VITE_ prefix for the private key (critical security requirement)
import { IMAGEKIT_PRIVATE_KEY } from '$env/static/private';

if (!IMAGEKIT_PRIVATE_KEY) {
	throw new Error(
		'Missing ImageKit environment variable. ' +
			'Make sure IMAGEKIT_PRIVATE_KEY is set in your .env file or hosting platform.'
	);
}

const imagekit = new ImageKit({
	privateKey: IMAGEKIT_PRIVATE_KEY
});

export default imagekit;
