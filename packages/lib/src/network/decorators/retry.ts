import { randomDelay } from '../../utils/random.js';
import { wait } from '../../utils/async/wait.js';
import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

export type RetryOptions = {
	maxAttempts: number;
	delayMsRange: [number, number];
};

/**
 * Retries the inner fetch up to `maxAttempts` times on thrown error. A random
 * delay within `delayMsRange` is waited between attempts. On non-2xx the
 * response is returned as-is — callers that want to retry on status codes
 * should wrap this with a layer that throws on those statuses, or filter
 * their own responses.
 */
export function withRetry(options: RetryOptions): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			let lastError: unknown;
			for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
				if (attempt > 0) {
					await wait(randomDelay(options.delayMsRange));
				}
				try {
					return await next(request);
				} catch (error) {
					lastError = error;
				}
			}
			throw lastError instanceof Error ? lastError : new Error('Unknown error');
		};
}
