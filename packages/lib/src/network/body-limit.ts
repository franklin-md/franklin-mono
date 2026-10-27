const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB

/**
 * Stream-reads a WHATWG body with a hard byte cap. Reject rather than returning
 * truncated bytes: a partial PDF or JSON document must not look like a success.
 * Optional progress reports the consumed byte count; empty chunks do not count.
 */
export async function readBodyWithLimit(
	body: ReadableStream<Uint8Array> | null,
	maxBytes: number = DEFAULT_MAX_BYTES,
	onProgress?: (receivedBytes: number) => void,
): Promise<Uint8Array> {
	if (!body) {
		return new Uint8Array();
	}
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
		await body.cancel();
		throw new RangeError('Response byte limit must be a positive safe integer');
	}

	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;

			if (total + value.byteLength > maxBytes) {
				try {
					await reader.cancel();
				} catch {
					/* The transport also aborts failed reads. */
				}
				throw new Error(`Response exceeds ${maxBytes} bytes`);
			}

			total += value.byteLength;
			if (value.byteLength > 0) onProgress?.(total);
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}
