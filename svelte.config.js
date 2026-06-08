// import adapter from '@sveltejs/adapter-static';
import adapter from '@sveltejs/adapter-auto';
// import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
// import path from 'path'; // ✅ Needed for alias resolution

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
