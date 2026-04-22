import type { Fetch } from '@franklin/lib';
import { fetch as undiciFetch } from 'undici';

const DEFAULT_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB

/**
 * Platform transport for the Obsidian plugin. Routes through Undici so the
 * plugin uses Node's HTTP stack rather than the renderer's browser fetch.
 *
 * Redirects are kept in `manual` mode here so this transport returns 3xx
 * responses raw. That lets the outer `withBounded` decorator own the redirect
 * loop and re-run normalization + policy checks on every hop.
 */
export const obsidianFetch: Fetch = async (request) => {
	const url = new URL(request.url);
	const response = await undiciFetch(url, {
		method: request.method,
		redirect: 'manual',
		credentials: 'omit',
		headers: request.headers,
		body: request.body,
	});
	const body = await readBodyWithLimit(
		response.body as ReadableStream<Uint8Array> | null,
	);

	return {
		url: response.url || url.toString(),
		status: response.status,
		statusText: response.statusText,
		headers: headersToRecord(response.headers),
		body,
	};
};

async function readBodyWithLimit(
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

	const output = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return output;
}

function headersToRecord(
	headers: Readonly<{
		forEach: (callback: (value: string, key: string) => void) => void;
	}>,
): Record<string, string> {
	const result: Record<string, string> = {};
	headers.forEach((value, key) => {
		result[key] = value;
	});
	return result;
}
