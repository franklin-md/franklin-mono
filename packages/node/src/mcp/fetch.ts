import { assertAllowed, type NetworkPermissions } from '@franklin/lib';
import { nodeHttpFetch } from '../platform/http/fetch.js';
import { createFetchResponse } from '../platform/http/response.js';

/** Streaming SDK transport; unlike the environment's buffered fetch, this retains SSE bodies. */
export function createMCPFetch(
	getPermissions: () => Promise<NetworkPermissions>,
): typeof fetch {
	return async (input, init) => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		assertAllowed(url, await getPermissions());
		const response = await nodeHttpFetch(input, {
			...init,
			redirect: 'manual',
			credentials: 'omit',
		});
		if (response.status >= 300 && response.status < 400) {
			await response.body?.cancel();
			throw new Error(
				'MCP redirects are not supported. Configure the final endpoint.',
			);
		}
		let bytes = 0;
		const body =
			response.body?.pipeThrough(
				new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
					transform(chunk, controller) {
						bytes += chunk.byteLength;
						if (bytes > 8 * 1024 * 1024)
							throw new Error('MCP response exceeds 8 MiB');
						controller.enqueue(chunk);
					},
				}),
			) ?? null;
		return createFetchResponse(body, {
			url: response.url,
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	};
}
