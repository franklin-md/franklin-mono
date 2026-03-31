export async function sha256Hex(data: Uint8Array): Promise<string> {
	const hashBuffer = await globalThis.crypto.subtle.digest(
		'SHA-256',
		data.buffer as ArrayBuffer,
	);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
