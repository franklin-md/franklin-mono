const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB

/**
 * Stream-reads a WHATWG body with a hard byte cap, cancelling the reader once
 * the cap is reached. Used by platform transports to avoid allocating
 * pathologically large responses.
 */
export async function readBodyWithLimit(
	body: ReadableStream<Uint8Array> | null,
	maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<Uint8Array> {
	if (!body) {
		return new Uint8Array();
	}

	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	let truncated = false;

	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;

		if (total + value.byteLength > maxBytes) {
			const remaining = maxBytes - total;
			if (remaining > 0) {
				chunks.push(value.slice(0, remaining));
				total += remaining;
			}
			truncated = true;
			break;
		}

		total += value.byteLength;
		chunks.push(value);
	}

	if (truncated) {
		try {
			await reader.cancel();
		} catch {
			// Ignore cancellation errors from partially-consumed streams.
		}
	}

	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}
