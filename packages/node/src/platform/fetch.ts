import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';
import type { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { setTimeout, clearTimeout } from 'node:timers';

import { nodeHttpFetch } from './http/fetch.js';

export interface NodePlatformFetchOptions {
	agent?: NodeFetchRequestInit['agent'];
}

/**
 * Default Node platform transport. Wraps the shared fetch-like Node HTTP
 * implementation with manual redirect handling (the `withRedirect` decorator
 * owns the loop) and credentials omitted.
 */
export function createNodePlatformFetch(
	defaultInit: RequestInit = {},
	options: NodePlatformFetchOptions = {},
): Fetch {
	return async (request) => {
		const { idleTimeoutMs } = request;
		if (
			idleTimeoutMs !== undefined &&
			(!Number.isSafeInteger(idleTimeoutMs) ||
				idleTimeoutMs <= 0 ||
				idleTimeoutMs > 2_147_483_647)
		)
			throw new RangeError(
				'Inactivity timeout must be between 1 and 2147483647ms',
			);
		const remaining =
			request.deadline === undefined
				? undefined
				: request.deadline - Date.now();
		if (
			remaining !== undefined &&
			(!Number.isFinite(remaining) || remaining <= 0)
		) {
			throw deadlineExceeded();
		}
		const controller = new AbortController();
		let timeoutError: Error | undefined;
		let receivedBytes = 0;
		let expectedBytes: number | undefined;
		const abort = (error: Error) => {
			if (controller.signal.aborted) return;
			timeoutError = error;
			controller.abort();
		};
		const timer =
			remaining === undefined
				? undefined
				: setTimeout(() => {
						abort(deadlineExceeded());
					}, remaining);
		const idleTimer =
			idleTimeoutMs === undefined
				? undefined
				: setTimeout(() => {
						abort(
							new Error(
								`Download stopped: no data for ${idleTimeoutMs}ms (received ${receivedBytes}${expectedBytes === undefined ? '' : ` of ${expectedBytes}`} bytes)`,
							),
						);
					}, idleTimeoutMs);
		try {
			const init: RequestInit = {
				...defaultInit,
				method: request.method,
				redirect: 'manual',
				credentials: 'omit',
				headers: request.headers,
				body: request.body,
				signal: defaultInit.signal
					? AbortSignal.any([defaultInit.signal, controller.signal])
					: controller.signal,
			};
			if (options.agent) {
				Object.assign(init, { agent: options.agent });
			}

			const response = await nodeHttpFetch(request.url, init);
			const length = response.headers.get('content-length');
			// Streams may be decoded while Content-Length describes compressed bytes.
			// Only report a total when it can be compared with the bytes we consume.
			if (
				length !== null &&
				!response.headers.get('content-encoding') &&
				Number.isSafeInteger(Number(length)) &&
				Number(length) >= 0
			)
				expectedBytes = Number(length);
			// Node timers are deliberate: renderer globals return browser timer IDs.
			// refresh() resets this timer without allocating a handle per chunk.
			// See https://nodejs.org/api/timers.html#timeoutrefresh
			idleTimer?.refresh();

			const body = await readBodyWithLimit(
				response.body,
				request.maxResponseBytes,
				(received) => {
					receivedBytes = received;
					idleTimer?.refresh();
				},
			);

			return {
				url: response.url || request.url,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				body,
			};
		} catch (error) {
			controller.abort();
			if (timeoutError) throw timeoutError;
			throw error;
		} finally {
			if (timer !== undefined) clearTimeout(timer);
			if (idleTimer !== undefined) clearTimeout(idleTimer);
		}
	};
}

export const nodePlatformFetch: Fetch = createNodePlatformFetch();

function deadlineExceeded(): Error {
	return new Error('Request deadline exceeded');
}
