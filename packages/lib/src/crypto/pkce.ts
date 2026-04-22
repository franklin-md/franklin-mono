import { base64url, hex } from '../utils/encoding.js';

import { randomBytes } from './seed.js';

export type PkceParams = {
	verifier: string;
	challenge: string;
	state: string;
};

export async function generatePkceParams(): Promise<PkceParams> {
	const verifier = base64url(randomBytes(32));
	const state = hex(randomBytes(16));
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(verifier),
	);
	const challenge = base64url(new Uint8Array(digest));
	return { verifier, challenge, state };
}
