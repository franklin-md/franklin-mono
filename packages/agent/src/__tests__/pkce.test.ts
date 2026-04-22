import { describe, expect, it } from 'vitest';

import { generatePkceParams } from '../auth/pkce.js';

describe('generatePkceParams', () => {
	it('produces base64url-safe verifier and challenge (no +, /, = characters)', async () => {
		const { verifier, challenge } = await generatePkceParams();
		expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
		expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
	});

	it('produces a hex state string of 32 characters (16 bytes)', async () => {
		const { state } = await generatePkceParams();
		expect(state).toMatch(/^[a-f0-9]{32}$/);
	});

	it('returns distinct verifier, challenge, and state on each call', async () => {
		const a = await generatePkceParams();
		const b = await generatePkceParams();
		expect(a.verifier).not.toBe(b.verifier);
		expect(a.challenge).not.toBe(b.challenge);
		expect(a.state).not.toBe(b.state);
	});

	it('challenge is SHA-256(verifier) encoded as base64url', async () => {
		const { verifier, challenge } = await generatePkceParams();
		const digest = await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode(verifier),
		);
		const expected = toBase64Url(new Uint8Array(digest));
		expect(challenge).toBe(expected);
	});
});

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
