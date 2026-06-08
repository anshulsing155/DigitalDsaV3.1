// gsap is published as a CommonJS module. Named imports `{ gsap }` work in
// Vite dev (interop magic) but throw "Named export 'gsap' not found" in
// Vercel's strict-ESM serverless runtime — which is why production SSR of
// '/' was returning 500 while dev/preview rendered fine.
//
// Use default imports + an interop fallback so this works under both:
//   - Node strict ESM (Vercel prod):  default = the gsap object directly
//   - Bundler interop (Vite preview): default = { gsap, ... }
import gsapPkg from 'gsap';
import ScrollTriggerPkg from 'gsap/dist/ScrollTrigger';

const gsap = ((gsapPkg as any).gsap ?? gsapPkg) as typeof import('gsap').gsap;

// ScrollTriggerPkg can be undefined in Vite dev SSR (the CJS interop doesn't resolve
// the subpath during server-side evaluation). Guard before dereferencing.
const ScrollTrigger = (ScrollTriggerPkg != null
	? (ScrollTriggerPkg as any).ScrollTrigger ?? ScrollTriggerPkg
	: undefined) as typeof import('gsap/dist/ScrollTrigger').ScrollTrigger;

if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
