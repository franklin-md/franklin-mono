import type { Fetch } from '@franklin/lib';
import { requestUrl } from 'obsidian';

/**
 * Platform transport for the Obsidian plugin. Routes through Obsidian's native
 * request API because Undici does not run correctly in this renderer runtime.
 *
 * TODO(FRA-244): `requestUrl()` auto-follows redirects before control returns
 * here, which bypasses `withRedirect()`'s per-hop normalization, policy checks,
 * and redirect limits. Replace this stopgap with a rawer HTTP/1.1 client that
 * can surface 3xx responses unchanged.
 */
export const obsidianFetch: Fetch = async (request) => {
	const url = new URL(request.url);
	const response = await requestUrl({
		url: url.toString(),
		method: request.method,
		headers: request.headers,
		contentType: getHeaderValue(request.headers, 'content-type'),
		body: bodyToArrayBuffer(request.body),
		throw: false,
	});

	return {
		url: url.toString(),
		status: response.status,
		statusText: '',
		headers: headersToRecord(response.headers),
		body: new Uint8Array(response.arrayBuffer),
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
