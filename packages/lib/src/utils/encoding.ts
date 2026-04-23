export function base64url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export function base64urlToBase64(segment: string): string {
	const padded = segment.padEnd(
		segment.length + ((4 - (segment.length % 4)) % 4),
		'=',
	);
	return padded.replace(/-/g, '+').replace(/_/g, '/');
}

export function hex(bytes: Uint8Array): string {
	let out = '';
	for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
	return out;
}
