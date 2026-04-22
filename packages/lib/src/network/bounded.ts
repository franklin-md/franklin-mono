import type { Fetch, FetchDecorator } from './types.js';

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export type BoundedOptions = {
	timeoutMs: number;
	maxRedirects: number;
};

// AGENT-TODO: This should be split into 2 layers and therefore 2 files: withRedirect and withTimeout
/**
 * Caps a Fetch with a deadline and a manual redirect loop.
 *
 * - Timeout: races the inner call against `setTimeout`. On overrun, rejects
 *   with a timeout error. The inner fetch is *not* actively aborted — there's
 *   no AbortSignal threaded through the Fetch contract — so the underlying
 *   connection leaks until it closes naturally. Acceptable for agent tool
 *   calls where responses are bounded.
 * - Redirects: on 3xx, re-invokes `next` with a rewritten URL. Other
 *   decorators below (policy, normalize) fire per hop via that re-invocation.
 */
export function withBounded(options: BoundedOptions): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			const work = redirectLoop(next, request, options.maxRedirects);
			const timer = new Promise<never>((_, reject) => {
				const handle = setTimeout(() => {
					reject(new Error(`Request timed out after ${options.timeoutMs}ms`));
				}, options.timeoutMs);
				// unref so the timer doesn't keep Node alive; ignored in browsers
				(handle as unknown as { unref?: () => void }).unref?.();
			});
			return Promise.race([work, timer]);
		};
}

async function redirectLoop(
	next: Fetch,
	request: Parameters<Fetch>[0],
	maxRedirects: number,
): ReturnType<Fetch> {
	let currentUrl = request.url;

	for (let i = 0; i <= maxRedirects; i++) {
		const response = await next({ ...request, url: currentUrl });

		if (!REDIRECT_STATUS_CODES.has(response.status)) {
			return response;
		}

		const location = response.headers['location'];
		if (!location) {
			throw new Error('Redirect response missing Location header');
		}

		const resolved = new URL(location, currentUrl);
		if (!['http:', 'https:'].includes(resolved.protocol)) {
			throw new Error('Only HTTP and HTTPS URLs are supported');
		}
		currentUrl = resolved.toString();
	}

	throw new Error(
		`Redirect limit exceeded (${maxRedirects}) for "${request.url}"`,
	);
}
