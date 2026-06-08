// Decode a JWT from accessToken cookie (no signature verification).
// Used during D.1 smoke to figure out which identity the live login flow
// puts in the JWT.
const token = process.argv[2];
if (!token) {
	console.error('Usage: node scripts/d1-smoke-decode-jwt.mjs <jwt>');
	process.exit(1);
}
const [, payload] = token.split('.');
if (!payload) {
	console.error('Not a JWT');
	process.exit(1);
}
const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
console.log(JSON.stringify(JSON.parse(decoded), null, 2));
