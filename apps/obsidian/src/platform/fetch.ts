import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';
import { fetch as undiciFetch } from 'undici';

/**
 * Platform transport for the Obsidian plugin. Routes through Undici so the
 * plugin uses Node's HTTP stack rather than the renderer's browser fetch.
 *
 * Redirects are kept in `manual` mode here so this transport returns 3xx
 * responses raw. That lets the outer `withRedirect` decorator own the loop
 * and re-run normalization + policy checks on every hop.
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
